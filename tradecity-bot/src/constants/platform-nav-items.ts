/**
 * TradeCity platform menu labels — matches legacy deriv-platform nav order.
 * Placeholder only; no routing or tab wiring.
 */
export type PlatformNavId =
    | 'dashboard'
    | 'bot-builder'
    | 'free-bots'
    | 'd-trader'
    | 'analysis-tool'
    | 'signal-center'
    | 'money-management'
    | 'copy-trading'
    | 'edging'
    | 'edging-2'
    | 'fast-trader'
    | 'chart'
    | 'ultimate-bot'
    | 'bulk-trader';

export interface PlatformNavItem {
    id: PlatformNavId;
    label: string;
}

/** Visual dividers after these items (legacy ProductNavbar split markers). */
export const PLATFORM_NAV_SPLIT_AFTER = new Set<PlatformNavId>(['free-bots', 'copy-trading', 'edging-2']);

export const PLATFORM_NAV_ITEMS: PlatformNavItem[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'bot-builder', label: 'Bot Builder' },
    { id: 'free-bots', label: 'Free Bots' },
    { id: 'd-trader', label: 'D-Trader' },
    { id: 'analysis-tool', label: 'Analysis Tool' },
    { id: 'signal-center', label: 'Signal Center' },
    { id: 'money-management', label: 'Money Management' },
    { id: 'copy-trading', label: 'Copy Trader' },
    { id: 'edging', label: 'Edging' },
    { id: 'edging-2', label: 'Edging 2' },
    { id: 'fast-trader', label: 'Fast Trader' },
    { id: 'chart', label: 'Charts' },
    { id: 'ultimate-bot', label: 'Ultimate Bot' },
    { id: 'bulk-trader', label: 'Bulk Trader' },
];
