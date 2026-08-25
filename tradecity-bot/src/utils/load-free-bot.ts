import type { FreeBotStrategy } from '@/constants/free-bots';
import { load } from '@/external/bot-skeleton';
import { save_types } from '@/external/bot-skeleton/constants/save-type';

const TIER_XML = {
    free: () => import('../xml/trading-bots/standard.xml'),
    premium: () => import('../xml/trading-bots/premium.xml'),
} as const;

const xmlFromModule = (mod: { default?: string } | string): string => {
    if (typeof mod === 'string') return mod;
    if (typeof mod.default === 'string') return mod.default;
    return String(mod);
};

/** Load the Standard or Premium catalog XML into Bot Builder. */
export async function loadFreeBotInBuilder(strategy: FreeBotStrategy): Promise<boolean> {
    const workspace = window.Blockly?.derivWorkspace;
    if (!workspace) {
        console.warn('[TradingBots] Blockly workspace is not ready');
        return false;
    }

    const tier = strategy.category === 'premium' ? 'premium' : 'free';
    const xml_module = await TIER_XML[tier]();
    const block_string = xmlFromModule(xml_module);
    if (!block_string.trim()) {
        console.warn('[TradingBots] Empty strategy XML for', tier);
        return false;
    }

    const result = await load({
        block_string,
        file_name: strategy.name,
        workspace,
        from: save_types.UNSAVED,
        drop_event: null,
        strategy_id: null,
        showIncompatibleStrategyDialog: null,
    });

    if (result && typeof result === 'object' && 'error' in result) {
        return false;
    }

    return true;
}
