import fs from 'fs';
import path from 'path';
import { applyScanToKasongoXml, loadKasongoScanInBuilder } from '../load-kasongo-scan';

/**
 * `.xml` runs through jest-transform-stub, so the real strategy would never
 * reach the loader. Mock that exact module path with the file from disk: the
 * mock both pins which XML the loader imports and lets the assertions run
 * against the genuine Kasongo blocks.
 */
jest.mock('../../xml/trading-bots/premium.xml', () => ({
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    default: require('fs').readFileSync(
        // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
        require('path').resolve(__dirname, '../../xml/trading-bots/premium.xml'),
        'utf8'
    ),
}));

const mockLoad = jest.fn();
jest.mock('@/external/bot-skeleton', () => ({
    __esModule: true,
    load: (...args: unknown[]) => mockLoad(...args),
    ApiHelpers: { instance: undefined },
}));

const KASONGO_PATH = path.resolve(__dirname, '../../xml/trading-bots/premium.xml');
const KASONGO_XML = fs.readFileSync(KASONGO_PATH, 'utf8');

const parse = (xml: string) => new DOMParser().parseFromString(xml, 'application/xml');

const tradeBlockField = (xml: string, field_name: string): string | null => {
    const trade = parse(xml).querySelector('block[type="trade"]');
    if (!trade) return null;
    for (const child of Array.from(trade.children)) {
        if (child.tagName === 'field' && child.getAttribute('name') === field_name) {
            return child.textContent?.trim() ?? null;
        }
    }
    return null;
};

/** The math_number assigned to a named variable by a variables_set block. */
const variableAssignment = (xml: string, variable_name: string): string | null => {
    const blocks = parse(xml).querySelectorAll('block[type="variables_set"]');
    for (const block of Array.from(blocks)) {
        const var_field = Array.from(block.children).find(
            child => child.tagName === 'field' && child.getAttribute('name') === 'VAR'
        );
        if (var_field?.textContent?.trim() !== variable_name) continue;
        const value = Array.from(block.children).find(
            child => child.tagName === 'value' && child.getAttribute('name') === 'VALUE'
        );
        return value?.querySelector('block[type="math_number"] > field[name="NUM"]')?.textContent?.trim() ?? null;
    }
    return null;
};

/** What the tradeOptions AMOUNT input actually holds. */
const amountInputBlockType = (xml: string): string | null => {
    const options = parse(xml).querySelector('block[type="tradeOptions"]');
    if (!options) return null;
    const value = Array.from(options.children).find(
        child => child.tagName === 'value' && child.getAttribute('name') === 'AMOUNT'
    );
    return value?.querySelector('block')?.getAttribute('type') ?? null;
};

const purchaseList = (xml: string): string[] =>
    Array.from(parse(xml).querySelectorAll('block[type="purchase"] > field[name="PURCHASE_LIST"]')).map(
        node => node.textContent?.trim() ?? ''
    );

describe('the Kasongo source XML', () => {
    it('is the RSI risefall strategy the scan seeds', () => {
        expect(tradeBlockField(KASONGO_XML, 'TRADETYPE_LIST')).toBe('risefall');
        expect(tradeBlockField(KASONGO_XML, 'TRADETYPECAT_LIST')).toBe('callput');
        expect(KASONGO_XML).toContain('RSI');
        expect(purchaseList(KASONGO_XML).sort()).toEqual(['CALL', 'PUT']);
    });
});

describe('applyScanToKasongoXml', () => {
    it('overwrites the trade block symbol', () => {
        expect(tradeBlockField(KASONGO_XML, 'SYMBOL_LIST')).toBe('1HZ10V');

        const seeded = applyScanToKasongoXml(KASONGO_XML, { symbol: 'R_75' });

        expect(tradeBlockField(seeded, 'SYMBOL_LIST')).toBe('R_75');
    });

    it('writes the stake to the Initial Amount assignment, not to AMOUNT', () => {
        expect(variableAssignment(KASONGO_XML, 'Initial Amount')).toBe('2');
        expect(amountInputBlockType(KASONGO_XML)).toBe('variables_get');

        const seeded = applyScanToKasongoXml(KASONGO_XML, { symbol: 'R_75', stake: 7.5 });

        expect(variableAssignment(seeded, 'Initial Amount')).toBe('7.5');
        // The martingale in after_purchase reassigns this variable; if AMOUNT held
        // a literal instead, the ladder would silently stop sizing up.
        expect(amountInputBlockType(seeded)).toBe('variables_get');
    });

    it('leaves the RSI purchase blocks untouched', () => {
        const seeded = applyScanToKasongoXml(KASONGO_XML, { symbol: 'R_100', stake: 3 });

        expect(purchaseList(seeded)).toEqual(purchaseList(KASONGO_XML));
        expect(tradeBlockField(seeded, 'TRADETYPE_LIST')).toBe('risefall');
        expect(tradeBlockField(seeded, 'TRADETYPECAT_LIST')).toBe('callput');
        // The RSI threshold the strategy switches direction on.
        expect(seeded).toContain('41');
    });

    it('only touches the trade block, leaving other blocks and variables intact', () => {
        const seeded = applyScanToKasongoXml(KASONGO_XML, { symbol: 'R_50', stake: 1 });
        const before = parse(KASONGO_XML);
        const after = parse(seeded);

        expect(after.querySelectorAll('block').length).toBe(before.querySelectorAll('block').length);
        expect(Array.from(after.querySelectorAll('variables > variable')).map(v => v.textContent)).toEqual(
            Array.from(before.querySelectorAll('variables > variable')).map(v => v.textContent)
        );
        expect(variableAssignment(seeded, 'Max Acceptable Loss')).toBe(
            variableAssignment(KASONGO_XML, 'Max Acceptable Loss')
        );
    });

    it('ignores a non-positive or absent stake rather than corrupting the ladder', () => {
        expect(variableAssignment(applyScanToKasongoXml(KASONGO_XML, { symbol: 'R_10' }), 'Initial Amount')).toBe('2');
        expect(
            variableAssignment(applyScanToKasongoXml(KASONGO_XML, { symbol: 'R_10', stake: 0 }), 'Initial Amount')
        ).toBe('2');
        expect(
            variableAssignment(applyScanToKasongoXml(KASONGO_XML, { symbol: 'R_10', stake: NaN }), 'Initial Amount')
        ).toBe('2');
    });

    it('returns the input unchanged when the XML has no trade block', () => {
        const foreign = '<xml><block type="text"><field name="TEXT">hi</field></block></xml>';
        expect(applyScanToKasongoXml(foreign, { symbol: 'R_75', stake: 5 })).toBe(foreign);
    });
});

describe('loadKasongoScanInBuilder', () => {
    beforeEach(() => {
        mockLoad.mockReset();
        mockLoad.mockResolvedValue(undefined);
        (window as unknown as { Blockly?: unknown }).Blockly = { derivWorkspace: { id: 'ws' } };
        document.body.innerHTML =
            '<div class="bot-builder--active"><div id="scratch_div" style="width:800px;height:600px"></div></div>';
        const canvas = document.querySelector('#scratch_div') as HTMLElement;
        canvas.getBoundingClientRect = () => ({ width: 800, height: 600 }) as DOMRect;
    });

    it('loads the Kasongo strategy with the scanned symbol applied', async () => {
        const ok = await loadKasongoScanInBuilder({ symbol: 'R_75', stake: 4, label: 'Vol 75' });

        expect(ok).toBe(true);
        expect(mockLoad).toHaveBeenCalledTimes(1);

        const sent = mockLoad.mock.calls[0][0] as { block_string: string; file_name: string };
        // It is Kasongo, not the Quick Strategy martingale template.
        expect(tradeBlockField(sent.block_string, 'TRADETYPE_LIST')).toBe('risefall');
        expect(sent.block_string).toContain('RSI');
        expect(purchaseList(sent.block_string).sort()).toEqual(['CALL', 'PUT']);
        // Seeded from the scan.
        expect(tradeBlockField(sent.block_string, 'SYMBOL_LIST')).toBe('R_75');
        expect(variableAssignment(sent.block_string, 'Initial Amount')).toBe('4');
        expect(amountInputBlockType(sent.block_string)).toBe('variables_get');
        expect(sent.file_name).toBe('Kasongo AI · Vol 75');
    });

    it('reports failure when the shared loader rejects the strategy', async () => {
        mockLoad.mockResolvedValue({ error: 'unsupported elements' });

        await expect(loadKasongoScanInBuilder({ symbol: 'R_75', stake: 4 })).resolves.toBe(false);
    });
});
