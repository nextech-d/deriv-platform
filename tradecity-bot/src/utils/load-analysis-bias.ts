import { ApiHelpers, load } from '@/external/bot-skeleton';
import { save_types } from '@/external/bot-skeleton/constants/save-type';
import { STRATEGIES } from '@/pages/bot-builder/quick-strategy/config';
import { addDynamicBlockToDOM } from '@/utils/xml-dom-quick-strategy';
import type { AnalysisMode } from '@/utils/analysis-tool';

export interface AnalysisBiasSeed {
    symbol: string;
    mode: AnalysisMode;
    side: 'CALL' | 'PUT';
    barrier?: number;
    digitTarget?: number;
    label: string;
}

interface ResolvedSeed {
    tradetype: string;
    contractType: string;
    lastDigitPrediction: number;
}

const CONTRACT_TYPES: Record<string, { call: string; put: string }> = {
    callput: { call: 'CALL', put: 'PUT' },
    evenodd: { call: 'DIGITEVEN', put: 'DIGITODD' },
    overunder: { call: 'DIGITOVER', put: 'DIGITUNDER' },
    matchesdiffers: { call: 'DIGITMATCH', put: 'DIGITDIFF' },
};

/** Mirrors the legacy analysisBiasToSnapshot mapping. */
function resolveSeed(bias: AnalysisBiasSeed): ResolvedSeed {
    const barrier = bias.barrier ?? 4;
    const digitTarget = bias.digitTarget ?? 5;

    let tradetype = 'callput';
    let lastDigitPrediction = digitTarget;

    if (bias.mode === 'parity') {
        tradetype = 'evenodd';
    } else if (bias.mode === 'barrier') {
        tradetype = 'overunder';
        lastDigitPrediction = barrier;
    } else if (bias.mode === 'matches') {
        tradetype = 'matchesdiffers';
        lastDigitPrediction = digitTarget;
    }

    const pair = CONTRACT_TYPES[tradetype]!;
    return {
        tradetype,
        contractType: bias.side === 'CALL' ? pair.call : pair.put,
        lastDigitPrediction,
    };
}

const modifyValueInputs = (strategy_dom: HTMLElement, key: string, value: number) => {
    strategy_dom?.querySelectorAll(`value[strategy_value="${key}"]`)?.forEach(el => {
        (el as HTMLElement).innerHTML = `<shadow type="math_number"><field name="NUM">${value}</field></shadow>`;
    });
};

const modifyFieldDropdownValues = (strategy_dom: HTMLElement, name: string, value: string) => {
    strategy_dom?.querySelectorAll(`field[name="${name.toUpperCase()}_LIST"]`)?.forEach(el => {
        (el as HTMLElement).innerHTML = value;
    });
};

/** Seed the Blockly workspace from an analysis bias and return true when loaded. */
export async function loadAnalysisBiasInBuilder(bias: AnalysisBiasSeed): Promise<boolean> {
    const { contracts_for } = (ApiHelpers?.instance ?? {}) as {
        contracts_for?: {
            getMarketBySymbol: (symbol: string) => Promise<string>;
            getSubmarketBySymbol: (symbol: string) => Promise<string>;
            getTradeTypeCategoryByTradeType: (trade_type: string) => Promise<string>;
        };
    };
    const workspace = (Blockly as unknown as { derivWorkspace?: unknown }).derivWorkspace;

    if (!contracts_for || !workspace) {
        console.warn('[AnalysisTool] Blockly or contracts API not ready');
        return false;
    }

    const seed = resolveSeed(bias);
    const market = await contracts_for.getMarketBySymbol(bias.symbol);
    const submarket = await contracts_for.getSubmarketBySymbol(bias.symbol);
    const trade_type_cat = await contracts_for.getTradeTypeCategoryByTradeType(seed.tradetype);
    const selected_strategy = STRATEGIES().MARTINGALE;

    const strategy_xml = await import(/* webpackChunkName: `[request]` */ `../xml/${selected_strategy.name}.xml`);
    const strategy_dom = window.Blockly.utils.xml.textToDom(strategy_xml.default) as unknown as HTMLElement;
    addDynamicBlockToDOM('PREDICTION', 'last_digit_prediction', trade_type_cat, strategy_dom);

    const fields: Record<string, string> = {
        market,
        submarket,
        symbol: bias.symbol,
        tradetypecat: trade_type_cat,
        tradetype: seed.tradetype,
        type: seed.contractType,
        durationtype: 't',
    };

    Object.entries(fields).forEach(([key, value]) => modifyFieldDropdownValues(strategy_dom, key, value));

    modifyValueInputs(strategy_dom, 'duration', 1);
    modifyValueInputs(strategy_dom, 'stake', 0.6);
    modifyValueInputs(strategy_dom, 'last_digit_prediction', seed.lastDigitPrediction);

    await load({
        block_string: window.Blockly.Xml.domToText(strategy_dom),
        file_name: `Analysis · ${bias.label}`,
        workspace,
        from: save_types.UNSAVED,
        drop_event: null,
        strategy_id: null,
        showIncompatibleStrategyDialog: null,
    });

    return true;
}
