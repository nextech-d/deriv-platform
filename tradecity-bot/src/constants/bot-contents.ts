type TTabsTitle = {
    [key: string]: string | number;
};

type TDashboardTabIndex = {
    [key: string]: number;
};

export const tabs_title: TTabsTitle = Object.freeze({
    WORKSPACE: 'Workspace',
    CHART: 'Chart',
});

/** Tab indices — must match PLATFORM_TABS order in platform-tabs.ts */
export const DBOT_TABS: TDashboardTabIndex = Object.freeze({
    DASHBOARD: 0,
    BOT_BUILDER: 1,
    FREE_BOTS: 2,
    D_TRADER: 3,
    ANALYSIS_TOOL: 4,
    SIGNAL_CENTER: 5,
    MONEY_MANAGEMENT: 6,
    COPY_TRADER: 7,
    EDGING: 8,
    EDGING_2: 9,
    FAST_TRADER: 10,
    CHART: 11,
    ULTIMATE_BOT: 12,
    BULK_TRADER: 13,
    TUTORIAL: 14,
});

export const MAX_STRATEGIES = 10;

export { TAB_DOM_IDS as TAB_IDS, TAB_HASHES } from './platform-tabs';

export const DEBOUNCE_INTERVAL_TIME = 500;
