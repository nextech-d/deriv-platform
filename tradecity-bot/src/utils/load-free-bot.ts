import type { FreeBotStrategy } from '@/constants/free-bots';
import { load } from '@/external/bot-skeleton';
import { save_types } from '@/external/bot-skeleton/constants/save-type';

const TIER_XML = {
    free: () => import('../xml/trading-bots/standard.xml'),
    premium: () => import('../xml/trading-bots/premium.xml'),
} as const;

/**
 * Per-entry overrides, keyed by catalog id. Every other entry in a tier shares
 * that tier's pack above; an id listed here loads its own strategy instead.
 * Kept here rather than on FreeBotStrategy so the catalog stays import-free.
 */
const STRATEGY_XML: Partial<Record<string, () => Promise<unknown>>> = {
    // JD100 digit-differs on 2 ticks, not the shared standard pack.
    'poverty-x-ai': () => import('../xml/trading-bots/poverty_x.xml'),
};

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
    const xml_module = await (STRATEGY_XML[strategy.id] ?? TIER_XML[tier])();
    const block_string = xmlFromModule(xml_module as { default?: string } | string);
    if (!block_string.trim()) {
        console.warn('[TradingBots] Empty strategy XML for', strategy.id, tier);
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
