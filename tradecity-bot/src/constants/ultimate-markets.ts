export interface UltimateMarket {
    id: string;
    label: string;
}

/** Ultimate Bot Active Markets table — exact 13 rows and order. */
export const ULTIMATE_BOT_MARKETS: UltimateMarket[] = [
    { id: '1HZ100V', label: 'Volatility 100 (1s) Index' },
    { id: '1HZ10V', label: 'Volatility 10 (1s) Index' },
    { id: '1HZ15V', label: 'Volatility 15 (1s) Index' },
    { id: '1HZ25V', label: 'Volatility 25 (1s) Index' },
    { id: '1HZ30V', label: 'Volatility 30 (1s) Index' },
    { id: '1HZ50V', label: 'Volatility 50 (1s) Index' },
    { id: '1HZ75V', label: 'Volatility 75 (1s) Index' },
    { id: '1HZ90V', label: 'Volatility 90 (1s) Index' },
    { id: 'R_10', label: 'Volatility 10 Index' },
    { id: 'R_100', label: 'Volatility 100 Index' },
    { id: 'R_25', label: 'Volatility 25 Index' },
    { id: 'R_50', label: 'Volatility 50 Index' },
    { id: 'R_75', label: 'Volatility 75 Index' },
];

export const ULTIMATE_BOT_SYMBOLS = ULTIMATE_BOT_MARKETS.map(market => market.id);
