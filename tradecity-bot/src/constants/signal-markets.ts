export interface SignalMarket {
    id: string;
    label: string;
}

/** Signal Center market dropdown — same list and order as the Tools Hub. */
export const SIGNAL_MARKETS: SignalMarket[] = [
    { id: 'R_10', label: 'Volatility 10 Index' },
    { id: 'R_25', label: 'Volatility 25 Index' },
    { id: 'R_50', label: 'Volatility 50 Index' },
    { id: 'R_75', label: 'Volatility 75 Index' },
    { id: 'R_100', label: 'Volatility 100 Index' },
    { id: '1HZ10V', label: 'Volatility 10 (1s) Index' },
    { id: '1HZ25V', label: 'Volatility 25 (1s) Index' },
    { id: '1HZ50V', label: 'Volatility 50 (1s) Index' },
    { id: '1HZ75V', label: 'Volatility 75 (1s) Index' },
    { id: '1HZ100V', label: 'Volatility 100 (1s) Index' },
    { id: 'CRASH300N', label: 'CRASH 300 Index' },
    { id: 'CRASH500', label: 'CRASH 500 Index' },
    { id: 'CRASH1000', label: 'CRASH 1000 Index' },
    { id: 'BOOM300N', label: 'BOOM 300 Index' },
    { id: 'BOOM500', label: 'BOOM 500 Index' },
    { id: 'BOOM1000', label: 'BOOM 1000 Index' },
    { id: 'JD10', label: 'Jump 10 Index' },
    { id: 'JD25', label: 'Jump 25 Index' },
    { id: 'JD50', label: 'Jump 50 Index' },
    { id: 'JD75', label: 'Jump 75 Index' },
    { id: 'JD100', label: 'Jump 100 Index' },
    { id: 'stpRNG', label: 'Step Index' },
];

const MARKET_LABELS = new Map(SIGNAL_MARKETS.map(market => [market.id, market.label]));

export const signalMarketLabel = (id: string): string => MARKET_LABELS.get(id) ?? id;
