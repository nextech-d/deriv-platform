export interface AnalysisMarket {
    id: string;
    label: string;
    shortLabel: string;
}

/** DCIRCLE scan list — the 13 volatility symbols the legacy analysis desk tracked. */
export const ANALYSIS_DCIRCLE_SYMBOLS = [
    '1HZ100V',
    '1HZ10V',
    '1HZ15V',
    '1HZ25V',
    '1HZ30V',
    '1HZ50V',
    '1HZ75V',
    '1HZ90V',
    'R_10',
    'R_100',
    'R_25',
    'R_50',
    'R_75',
] as const;

export const ANALYSIS_MARKETS: AnalysisMarket[] = [
    { id: 'R_10', label: 'Volatility 10 Index', shortLabel: 'Vol 10' },
    { id: 'R_25', label: 'Volatility 25 Index', shortLabel: 'Vol 25' },
    { id: 'R_50', label: 'Volatility 50 Index', shortLabel: 'Vol 50' },
    { id: 'R_75', label: 'Volatility 75 Index', shortLabel: 'Vol 75' },
    { id: 'R_100', label: 'Volatility 100 Index', shortLabel: 'Vol 100' },
    { id: '1HZ10V', label: 'Volatility 10 (1s) Index', shortLabel: 'Vol 10 (1s)' },
    { id: '1HZ15V', label: 'Volatility 15 (1s) Index', shortLabel: 'Vol 15 (1s)' },
    { id: '1HZ25V', label: 'Volatility 25 (1s) Index', shortLabel: 'Vol 25 (1s)' },
    { id: '1HZ30V', label: 'Volatility 30 (1s) Index', shortLabel: 'Vol 30 (1s)' },
    { id: '1HZ50V', label: 'Volatility 50 (1s) Index', shortLabel: 'Vol 50 (1s)' },
    { id: '1HZ75V', label: 'Volatility 75 (1s) Index', shortLabel: 'Vol 75 (1s)' },
    { id: '1HZ90V', label: 'Volatility 90 (1s) Index', shortLabel: 'Vol 90 (1s)' },
    { id: '1HZ100V', label: 'Volatility 100 (1s) Index', shortLabel: 'Vol 100 (1s)' },
];

const MARKET_MAP = new Map(ANALYSIS_MARKETS.map(market => [market.id, market]));

export function analysisMarketMeta(id: string): AnalysisMarket | undefined {
    return MARKET_MAP.get(id);
}
