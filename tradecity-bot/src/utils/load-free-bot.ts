import type { FreeBotStrategy } from '@/constants/free-bots';
import { ApiHelpers, load } from '@/external/bot-skeleton';
import { save_types } from '@/external/bot-skeleton/constants/save-type';
import { STRATEGIES } from '@/pages/bot-builder/quick-strategy/config';
import { addDynamicBlockToDOM } from '@/utils/xml-dom-quick-strategy';
import { freeBotToSeed } from '@/utils/free-bot-seed';

const modifyValueInputs = (strategy_dom: HTMLElement, key: string, value: number) => {
    const el_value_inputs = strategy_dom?.querySelectorAll(`value[strategy_value="${key}"]`);
    el_value_inputs?.forEach(el_value_input => {
        (el_value_input as HTMLElement).innerHTML = `<shadow type="math_number"><field name="NUM">${value}</field></shadow>`;
    });
};

const modifyFieldDropdownValues = (strategy_dom: HTMLElement, name: string, value: string) => {
    const name_list = `${name.toUpperCase()}_LIST`;
    const el_blocks = strategy_dom?.querySelectorAll(`field[name="${name_list}"]`);
    el_blocks?.forEach(el_block => {
        (el_block as HTMLElement).innerHTML = value;
    });
};

/** Load a free-bot catalog entry into the Blockly workspace (quick-strategy template + seed). */
export async function loadFreeBotInBuilder(strategy: FreeBotStrategy): Promise<boolean> {
    const seed = freeBotToSeed(strategy);
    const { contracts_for } = (ApiHelpers?.instance ?? {}) as {
        contracts_for?: {
            getMarketBySymbol: (symbol: string) => Promise<string>;
            getSubmarketBySymbol: (symbol: string) => Promise<string>;
            getTradeTypeCategoryByTradeType: (trade_type: string) => Promise<string>;
        };
    };
    const workspace = (Blockly as unknown as { derivWorkspace?: unknown }).derivWorkspace;

    if (!contracts_for || !workspace) {
        console.warn('[FreeBots] Blockly or contracts API not ready');
        return false;
    }

    const market = await contracts_for.getMarketBySymbol(seed.symbol);
    const submarket = await contracts_for.getSubmarketBySymbol(seed.symbol);
    const trade_type_cat = await contracts_for.getTradeTypeCategoryByTradeType(seed.tradetype);
    const selected_strategy = STRATEGIES()[seed.quickStrategyKey];

    const strategy_xml = await import(/* webpackChunkName: `[request]` */ `../xml/${selected_strategy.name}.xml`);
    const strategy_dom = window.Blockly.utils.xml.textToDom(strategy_xml.default) as unknown as HTMLElement;
    addDynamicBlockToDOM('PREDICTION', 'last_digit_prediction', trade_type_cat, strategy_dom);

    const fields_to_update: Record<string, string> = {
        market,
        submarket,
        symbol: seed.symbol,
        tradetypecat: trade_type_cat,
        tradetype: seed.tradetype,
        type: seed.contractType,
        durationtype: seed.durationUnit,
        duration: seed.duration,
    };

    Object.entries(fields_to_update).forEach(([key, value]) => {
        modifyFieldDropdownValues(strategy_dom, key, value);
    });

    modifyValueInputs(strategy_dom, 'duration', Number(seed.duration));
    modifyValueInputs(strategy_dom, 'stake', Number(seed.stake));
    modifyValueInputs(strategy_dom, 'last_digit_prediction', seed.lastDigitPrediction);

    await load({
        block_string: window.Blockly.Xml.domToText(strategy_dom),
        file_name: seed.sourceLabel,
        workspace,
        from: save_types.UNSAVED,
        drop_event: null,
        strategy_id: null,
        showIncompatibleStrategyDialog: null,
    });

    return true;
}
