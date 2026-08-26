import { analysisTickQuote, analysisTickSymbol } from '../analysis-tick';

describe('analysis tick fields', () => {
    it('reads symbol or underlying_symbol', () => {
        expect(analysisTickSymbol({ symbol: 'R_100' })).toBe('R_100');
        expect(analysisTickSymbol({ underlying_symbol: '1HZ100V' })).toBe('1HZ100V');
        expect(analysisTickSymbol({})).toBe('');
    });

    it('prefers quote, then ask, then bid', () => {
        expect(analysisTickQuote({ quote: 10, ask: 11, bid: 9 })).toBe(10);
        expect(analysisTickQuote({ ask: 11, bid: 9 })).toBe(11);
        expect(analysisTickQuote({ bid: 9 })).toBe(9);
    });
});
