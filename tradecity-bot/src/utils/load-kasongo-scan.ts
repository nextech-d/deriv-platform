import { ApiHelpers, load } from '@/external/bot-skeleton';
import { save_types } from '@/external/bot-skeleton/constants/save-type';

/**
 * Loads the Kasongo AI strategy (src/xml/trading-bots/premium.xml) into Bot
 * Builder and overwrites only the slots a Deep Scan can legitimately fill.
 *
 * Deep Scan is a digits over/under scanner; Kasongo is an RSI-driven risefall
 * strategy that chooses CALL/PUT itself in `before_purchase`. The scan's
 * contractType, barrier, lastDigit and mode therefore have no slot here and are
 * deliberately discarded — for this path the scan acts as a symbol picker.
 * The digits path still lives in loadAnalysisBiasInBuilder, which this does not
 * touch.
 */

/** Variable that Kasongo's tradeOptions AMOUNT reads through a variables_get. */
const INITIAL_AMOUNT_VARIABLE = 'Initial Amount';

const BUILDER_READY_MS = 8000;

export interface KasongoScanSeed {
    symbol: string;
    stake?: number;
    label?: string;
}

function xmlFromModule(mod: { default?: string } | string): string {
    if (typeof mod === 'string') return mod;
    if (typeof mod.default === 'string') return mod.default;
    return String(mod);
}

function sleep(ms: number) {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<null>(resolve => {
                timer = setTimeout(() => resolve(null), ms);
            }),
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

/** A block's own <field name="..">, ignoring fields on any nested block. */
function directField(block: Element, name: string): Element | null {
    for (const child of Array.from(block.children)) {
        if (child.tagName === 'field' && child.getAttribute('name') === name) return child;
    }
    return null;
}

/** A block's own <value name="..">, ignoring values on any nested block. */
function directValue(block: Element, name: string): Element | null {
    for (const child of Array.from(block.children)) {
        if (child.tagName === 'value' && child.getAttribute('name') === name) return child;
    }
    return null;
}

/**
 * The `variables_set` that assigns `variable_name`, or null.
 * Matched on the block's own VAR field so a nested variables_get cannot match.
 */
function findVariableAssignment(doc: Document, variable_name: string): Element | null {
    const candidates = doc.querySelectorAll('block[type="variables_set"]');
    for (const candidate of Array.from(candidates)) {
        const field = directField(candidate, 'VAR');
        if (field?.textContent?.trim() === variable_name) return candidate;
    }
    return null;
}

/**
 * Apply scan results to the Kasongo XML.
 *
 * Returns the XML unchanged rather than throwing when a slot is missing: a
 * partially seeded strategy the user can still fix by hand beats a failed load.
 *
 * The stake is written to the `Initial Amount` variables_set, NOT to the
 * tradeOptions AMOUNT input. AMOUNT holds a variables_get that the martingale in
 * `after_purchase` feeds by reassigning that variable; replacing it with a
 * literal would leave the ladder updating a variable the trade block no longer
 * reads, and the stake would silently stop sizing up.
 */
export function applyScanToKasongoXml(block_string: string, seed: KasongoScanSeed): string {
    const doc = new DOMParser().parseFromString(block_string, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) {
        console.warn('[LoadScan] Kasongo XML failed to parse; loading it unmodified');
        return block_string;
    }

    // Target the trade block itself, not every SYMBOL_LIST in the document.
    const trade_block = doc.querySelector('block[type="trade"]');
    if (!trade_block) {
        console.warn('[LoadScan] No trade block in Kasongo XML; loading it unmodified');
        return block_string;
    }

    if (seed.symbol) {
        const symbol_field = directField(trade_block, 'SYMBOL_LIST');
        if (symbol_field) symbol_field.textContent = seed.symbol;
        else console.warn('[LoadScan] Kasongo trade block has no SYMBOL_LIST field');
    }

    if (typeof seed.stake === 'number' && Number.isFinite(seed.stake) && seed.stake > 0) {
        const assignment = findVariableAssignment(doc, INITIAL_AMOUNT_VARIABLE);
        const number_field = assignment
            ? directValue(assignment, 'VALUE')?.querySelector('block[type="math_number"] > field[name="NUM"]')
            : null;
        if (number_field) number_field.textContent = String(seed.stake);
        else console.warn(`[LoadScan] No math_number assignment for "${INITIAL_AMOUNT_VARIABLE}"; stake unchanged`);
    }

    return new XMLSerializer().serializeToString(doc);
}

/** Overwrite MARKET_LIST/SUBMARKET_LIST only when the symbol resolves elsewhere. */
export function applyMarketToKasongoXml(block_string: string, market: string, submarket: string): string {
    const doc = new DOMParser().parseFromString(block_string, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) return block_string;

    const trade_block = doc.querySelector('block[type="trade"]');
    if (!trade_block) return block_string;

    const market_field = directField(trade_block, 'MARKET_LIST');
    const submarket_field = directField(trade_block, 'SUBMARKET_LIST');
    if (!market_field || !submarket_field) return block_string;

    market_field.textContent = market;
    submarket_field.textContent = submarket;
    return new XMLSerializer().serializeToString(doc);
}

/** Read the trade block's current market pair, for comparison before overriding. */
function readMarketPair(block_string: string): { market: string; submarket: string } | null {
    const doc = new DOMParser().parseFromString(block_string, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) return null;
    const trade_block = doc.querySelector('block[type="trade"]');
    if (!trade_block) return null;
    return {
        market: directField(trade_block, 'MARKET_LIST')?.textContent?.trim() ?? '',
        submarket: directField(trade_block, 'SUBMARKET_LIST')?.textContent?.trim() ?? '',
    };
}

/**
 * Resolve the symbol's market pair, or null to keep Kasongo's own values.
 * Null on every failure path: an unavailable lookup must not block the load, and
 * writing a market that does not contain the symbol makes Run fail validation.
 */
async function resolveMarketOverride(
    symbol: string,
    current: { market: string; submarket: string } | null
): Promise<{ market: string; submarket: string } | null> {
    const contracts_for = (
        (ApiHelpers?.instance ?? {}) as {
            contracts_for?: {
                getMarketBySymbol: (symbol: string) => Promise<string>;
                getSubmarketBySymbol: (symbol: string) => Promise<string>;
            };
        }
    ).contracts_for;
    if (!contracts_for) return null;

    try {
        const market = await withTimeout(contracts_for.getMarketBySymbol(symbol), 2500);
        if (!market || market === 'na') return null;
        const submarket = await withTimeout(contracts_for.getSubmarketBySymbol(symbol), 1500);
        if (!submarket || submarket === 'na') return null;
        if (current && market === current.market && submarket === current.submarket) return null;
        return { market, submarket };
    } catch (error) {
        console.warn('[LoadScan] Market lookup failed; keeping Kasongo defaults', error);
        return null;
    }
}

function builderCanvasReady(): boolean {
    const canvas = document.querySelector('.bot-builder--active #scratch_div') as HTMLElement | null;
    if (!canvas) return false;
    const rect = canvas.getBoundingClientRect();
    return rect.width > 40 && rect.height > 40;
}

/** Load Kasongo seeded with the scan's symbol and the user's stake. */
export async function loadKasongoScanInBuilder(seed: KasongoScanSeed): Promise<boolean> {
    const started = Date.now();
    let workspace = window.Blockly?.derivWorkspace;

    while (!workspace || !builderCanvasReady()) {
        if (Date.now() - started >= BUILDER_READY_MS) break;
        // eslint-disable-next-line no-await-in-loop
        await sleep(50);
        workspace = window.Blockly?.derivWorkspace;
    }

    if (!workspace) {
        console.warn('[LoadScan] Blockly workspace is not ready');
        return false;
    }

    const xml_module = await import(/* webpackChunkName: "kasongo-strategy" */ '../xml/trading-bots/premium.xml');
    const block_string = xmlFromModule(xml_module as { default?: string } | string);
    if (!block_string.trim()) {
        console.warn('[LoadScan] Empty Kasongo strategy XML');
        return false;
    }

    let seeded = applyScanToKasongoXml(block_string, seed);
    const override = await resolveMarketOverride(seed.symbol, readMarketPair(seeded));
    if (override) seeded = applyMarketToKasongoXml(seeded, override.market, override.submarket);

    const result = await load({
        block_string: seeded,
        file_name: seed.label ? `Kasongo AI · ${seed.label}` : 'Kasongo AI',
        workspace,
        from: save_types.UNSAVED,
        drop_event: null,
        strategy_id: null,
        showIncompatibleStrategyDialog: null,
    });

    if (result && typeof result === 'object' && 'error' in result) {
        console.warn('[LoadScan] Kasongo load failed', result.error);
        return false;
    }

    return true;
}
