/**
 * Main tab bar order — legacy TradeCity product menu with Deriv bot tabs wired in.
 * Placeholder tabs render empty panels until desks are implemented.
 */
export type PlatformTabKind =
    | 'dashboard'
    | 'bot_builder'
    | 'free_bots'
    | 'd_trader'
    | 'analysis_tool'
    | 'money_management'
    | 'ultimate_bot'
    | 'bulk_trader'
    | 'fast_trader'
    | 'edging'
    | 'edging_2'
    | 'copy_trader'
    | 'signal_center'
    | 'chart'
    | 'tutorial'
    | 'placeholder';

export interface PlatformTabDefinition {
    id: string;
    hash: string;
    domId: string;
    label: string;
    kind: PlatformTabKind;
    /** Visual divider after this tab (legacy nav grouping). */
    splitAfter?: boolean;
}

export const PLATFORM_TABS: PlatformTabDefinition[] = [
    { id: 'dashboard', hash: 'dashboard', domId: 'id-dbot-dashboard', label: 'Dashboard', kind: 'dashboard' },
    { id: 'bot_builder', hash: 'bot_builder', domId: 'id-bot-builder', label: 'Bot Builder', kind: 'bot_builder' },
    {
        id: 'free_bots',
        hash: 'free_bots',
        domId: 'id-free-bots',
        label: 'Free Bots',
        kind: 'free_bots',
        splitAfter: true,
    },
    { id: 'd_trader', hash: 'd_trader', domId: 'id-d-trader', label: 'D-Trader', kind: 'd_trader' },
    {
        id: 'analysis_tool',
        hash: 'analysis_tool',
        domId: 'id-analysis-tool',
        label: 'Analysis Tool',
        kind: 'analysis_tool',
    },
    {
        id: 'signal_center',
        hash: 'signal_center',
        domId: 'id-signal-center',
        label: 'Signal Center',
        kind: 'signal_center',
    },
    {
        id: 'money_management',
        hash: 'money_management',
        domId: 'id-money-management',
        label: 'Money Management',
        kind: 'money_management',
    },
    {
        id: 'copy_trader',
        hash: 'copy_trader',
        domId: 'id-copy-trader',
        label: 'Copy Trader',
        kind: 'copy_trader',
        splitAfter: true,
    },
    { id: 'edging', hash: 'edging', domId: 'id-edging', label: 'Edging', kind: 'edging' },
    {
        id: 'edging_2',
        hash: 'edging_2',
        domId: 'id-edging-2',
        label: 'Edging 2',
        kind: 'edging_2',
        splitAfter: true,
    },
    { id: 'fast_trader', hash: 'fast_trader', domId: 'id-fast-trader', label: 'Fast Trader', kind: 'fast_trader' },
    { id: 'chart', hash: 'chart', domId: 'id-charts', label: 'Charts', kind: 'chart' },
    { id: 'ultimate_bot', hash: 'ultimate_bot', domId: 'id-ultimate-bot', label: 'Ultimate Bot', kind: 'ultimate_bot' },
    { id: 'bulk_trader', hash: 'bulk_trader', domId: 'id-bulk-trader', label: 'Bulk Trader', kind: 'bulk_trader' },
];

export const TAB_HASHES = PLATFORM_TABS.map(tab => tab.hash);
export const TAB_DOM_IDS = PLATFORM_TABS.map(tab => tab.domId);

export const tabIndexById = (id: string): number => PLATFORM_TABS.findIndex(tab => tab.id === id);

export const tabIndexByHash = (hash: string): number => PLATFORM_TABS.findIndex(tab => tab.hash === hash);
