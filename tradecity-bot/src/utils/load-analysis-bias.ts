import { ApiHelpers, load } from '@/external/bot-skeleton';
import { save_types } from '@/external/bot-skeleton/constants/save-type';
import DBotStore from '@/external/bot-skeleton/scratch/dbot-store';
import { STRATEGIES } from '@/pages/bot-builder/quick-strategy/config';
import type { AnalysisMode } from '@/utils/analysis-tool';
import { addDynamicBlockToDOM } from '@/utils/xml-dom-quick-strategy';

export interface AnalysisBiasSeed {
    symbol: string;
    mode: AnalysisMode;
    side: 'CALL' | 'PUT';
    barrier?: number;
    digitTarget?: number;
    label: string;
    stake?: number;
    size?: number;
    profit?: number;
    loss?: number;
}

export interface AnalysisStrategyFields {
    tradetype: string;
    type: 'both';
    purchase: string;
    durationtype: 't';
    duration: number;
    stake: number;
    last_digit_prediction: number;
    size: number;
    profit: number;
    loss: number;
}

const CONTRACT_TYPES: Record<string, { call: string; put: string }> = {
    callput: { call: 'CALL', put: 'PUT' },
    evenodd: { call: 'DIGITEVEN', put: 'DIGITODD' },
    overunder: { call: 'DIGITOVER', put: 'DIGITUNDER' },
    matchesdiffers: { call: 'DIGITMATCH', put: 'DIGITDIFF' },
};

const BUILDER_READY_MS = 8000;
const SYNTHETIC_MARKET = { market: 'synthetic_index', submarket: 'random_index' };

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

async function resolveMarket(
    contracts_for: {
        getMarketBySymbol: (symbol: string) => Promise<string>;
        getSubmarketBySymbol: (symbol: string) => Promise<string>;
    },
    symbol: string
) {
    try {
        const market = await withTimeout(contracts_for.getMarketBySymbol(symbol), 2500);
        const submarket = market ? await withTimeout(contracts_for.getSubmarketBySymbol(symbol), 1500) : null;
        if (market && market !== 'na' && submarket && submarket !== 'na') {
            return { market, submarket };
        }
    } catch (error) {
        console.warn('[AnalysisTool] Market lookup failed', error);
    }
    return { ...SYNTHETIC_MARKET };
}

function builderCanvasReady(): boolean {
    const canvas = document.querySelector('.bot-builder--active #scratch_div') as HTMLElement | null;
    if (!canvas) return false;
    const rect = canvas.getBoundingClientRect();
    return rect.width > 40 && rect.height > 40;
}

/** Quick Strategy writes TYPE_LIST=both and the actual contract on PURCHASE_LIST. */
export function analysisBiasToStrategyFields(bias: AnalysisBiasSeed): AnalysisStrategyFields {
    const barrier = bias.barrier ?? 4;
    const digitTarget = bias.digitTarget ?? 5;

    let tradetype = 'callput';
    let last_digit_prediction = digitTarget;

    if (bias.mode === 'parity') {
        tradetype = 'evenodd';
    } else if (bias.mode === 'barrier') {
        tradetype = 'overunder';
        last_digit_prediction = barrier;
    } else if (bias.mode === 'matches') {
        tradetype = 'matchesdiffers';
        last_digit_prediction = digitTarget;
    }

    const pair = CONTRACT_TYPES[tradetype]!;
    return {
        tradetype,
        type: 'both',
        purchase: bias.side === 'CALL' ? pair.call : pair.put,
        durationtype: 't',
        duration: 1,
        stake: bias.stake ?? 0.6,
        last_digit_prediction,
        size: bias.size ?? 2,
        profit: bias.profit ?? 5,
        loss: bias.loss ?? 50,
    };
}

const modifyValueInputs = (strategy_dom: HTMLElement, key: string, value: number) => {
    strategy_dom?.querySelectorAll(`value[strategy_value="${key}"]`)?.forEach(el => {
        const node = el as HTMLElement;
        if (key.includes('boolean')) {
            node.innerHTML = value
                ? `<block type="logic_boolean"><field name="BOOL">TRUE</field></block>`
                : `<block type="logic_boolean"><field name="BOOL">FALSE</field></block>`;
            return;
        }
        node.innerHTML = `<shadow type="math_number"><field name="NUM">${value}</field></shadow>`;
    });
};

const modifyFieldDropdownValues = (strategy_dom: HTMLElement, name: string, value: string) => {
    strategy_dom?.querySelectorAll(`field[name="${name.toUpperCase()}_LIST"]`)?.forEach(el => {
        (el as HTMLElement).innerHTML = value;
    });
};

function fitLoadedStrategy(workspace: { cleanUp?: (x?: number, y?: number) => void }) {
    window.Blockly?.svgResize?.(workspace);
    workspace.cleanUp?.();
    const toolbox = DBotStore.instance?.toolbox as
        | { is_workspace_scroll_adjusted?: boolean; adjustWorkspace?: () => void; fitBlocksNow?: () => void }
        | undefined;
    if (toolbox?.fitBlocksNow) {
        toolbox.fitBlocksNow();
    } else if (toolbox?.adjustWorkspace) {
        toolbox.is_workspace_scroll_adjusted = false;
        toolbox.adjustWorkspace();
    }
    window.dispatchEvent(new Event('resize'));
}

/** Seed the Blockly workspace from an analysis bias and return true when loaded. */
export async function loadAnalysisBiasInBuilder(bias: AnalysisBiasSeed): Promise<boolean> {
    const started = Date.now();
    let contracts_for: {
        getMarketBySymbol: (symbol: string) => Promise<string>;
        getSubmarketBySymbol: (symbol: string) => Promise<string>;
        getTradeTypeCategoryByTradeType: (trade_type: string) => string;
    } | undefined;
    let workspace: { cleanUp?: (x?: number, y?: number) => void } | undefined;

    while (Date.now() - started < BUILDER_READY_MS) {
        contracts_for = ((ApiHelpers?.instance ?? {}) as { contracts_for?: typeof contracts_for }).contracts_for;
        workspace = window.Blockly?.derivWorkspace;
        if (contracts_for && workspace && builderCanvasReady()) break;
        await sleep(50);
    }

    if (!contracts_for || !workspace) {
        console.warn('[AnalysisTool] Blockly or contracts API not ready');
        return false;
    }

    const seed = analysisBiasToStrategyFields(bias);
    const { market, submarket } = await resolveMarket(contracts_for, bias.symbol);
    let trade_type_cat = seed.tradetype === 'callput' ? 'callput' : 'digits';
    try {
        trade_type_cat = contracts_for.getTradeTypeCategoryByTradeType(seed.tradetype) || trade_type_cat;
    } catch {
        /* keep fallback */
    }
    const selected_strategy = STRATEGIES().MARTINGALE;

    const strategy_xml = await import(/* webpackChunkName: `[request]` */ `../xml/${selected_strategy.name}.xml`);
    const block_string = xmlFromModule(strategy_xml as { default?: string } | string);
    if (!block_string.trim()) {
        console.warn('[AnalysisTool] Empty strategy XML');
        return false;
    }

    const strategy_dom = window.Blockly.utils.xml.textToDom(block_string) as unknown as HTMLElement;
    addDynamicBlockToDOM('PREDICTION', 'last_digit_prediction', trade_type_cat, strategy_dom);

    const dropdowns: Record<string, string> = {
        market,
        submarket,
        symbol: bias.symbol,
        tradetypecat: trade_type_cat,
        tradetype: seed.tradetype,
        type: seed.type,
        purchase: seed.purchase,
        durationtype: seed.durationtype,
    };
    Object.entries(dropdowns).forEach(([key, value]) => {
        if (value) modifyFieldDropdownValues(strategy_dom, key, value);
    });

    modifyValueInputs(strategy_dom, 'duration', seed.duration);
    modifyValueInputs(strategy_dom, 'stake', seed.stake);
    modifyValueInputs(strategy_dom, 'last_digit_prediction', seed.last_digit_prediction);
    modifyValueInputs(strategy_dom, 'size', seed.size);
    modifyValueInputs(strategy_dom, 'profit', seed.profit);
    modifyValueInputs(strategy_dom, 'loss', seed.loss);

    const result = await load({
        block_string: window.Blockly.Xml.domToText(strategy_dom),
        file_name: `Analysis · ${bias.label}`,
        workspace,
        from: save_types.UNSAVED,
        drop_event: null,
        strategy_id: null,
        showIncompatibleStrategyDialog: null,
    });

    if (result && typeof result === 'object' && 'error' in result) {
        console.warn('[AnalysisTool] Strategy load failed', result.error);
        return false;
    }

    fitLoadedStrategy(workspace);
    window.setTimeout(() => fitLoadedStrategy(workspace), 350);
    return true;
}
