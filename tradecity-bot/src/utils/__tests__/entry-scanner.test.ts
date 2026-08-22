import { barriersForMode, pickBestMarket, scoreDigits, scoreMarket, toScanResult } from '../entry-scanner';

describe('barriersForMode', () => {
    it('maps the two recovery pairs', () => {
        expect(barriersForMode('01-08')).toEqual({ over: 1, under: 8 });
        expect(barriersForMode('02-07')).toEqual({ over: 2, under: 7 });
    });
});

describe('scoreDigits', () => {
    it('needs two ticks before it will pick a side', () => {
        expect(scoreDigits([9], 1, 8).side).toBeNull();
        expect(scoreDigits([], 1, 8).ticks).toBe(0);
    });

    it('picks Over 1 when the tape is high and the last two digits confirm', () => {
        const reading = scoreDigits([9, 8, 9, 9], 1, 8);
        expect(reading.side).toBe('over');
        expect(reading.tradeLabel).toBe('Over 1');
        expect(reading.contractType).toBe('DIGITOVER');
        expect(reading.recovered).toBe(true);
        expect(reading.score).toBeGreaterThan(0.5);
    });

    it('picks Under 8 when the tape is low and the last two digits confirm', () => {
        const reading = scoreDigits([0, 1, 0, 0], 1, 8);
        expect(reading.side).toBe('under');
        expect(reading.tradeLabel).toBe('Under 8');
        expect(reading.recovered).toBe(true);
    });

    it('still reports a side without recovery when only the last digit confirms', () => {
        const reading = scoreDigits([9, 9, 9, 9, 0, 9], 1, 8);
        expect(reading.side).toBe('over');
        expect(reading.recovered).toBe(false);
    });
});

describe('pickBestMarket', () => {
    it('prefers a recovered market over a stronger unrecovered one', () => {
        const best = pickBestMarket([
            {
                symbol: 'R_10',
                label: 'Volatility 10 Index',
                side: 'over',
                contractType: 'DIGITOVER',
                barrier: 1,
                tradeLabel: 'Over 1',
                score: 0.99,
                ticks: 3000,
                recovered: false,
            },
            {
                symbol: 'R_100',
                label: 'Volatility 100 Index',
                side: 'under',
                contractType: 'DIGITUNDER',
                barrier: 8,
                tradeLabel: 'Under 8',
                score: 0.7,
                ticks: 3000,
                recovered: true,
            },
        ]);
        expect(best?.symbol).toBe('R_100');
    });

    it('returns null when nothing scored', () => {
        expect(pickBestMarket([])).toBeNull();
    });
});

describe('scoreMarket', () => {
    it('reads last digits from quotes and labels the market', () => {
        const scored = scoreMarket('R_100', [1.19, 1.18, 1.19, 1.19], '01-08');
        expect(scored.label).toContain('Volatility 100');
        expect(scored.side).toBe('over');
        expect(scored.recovered).toBe(true);
        expect(toScanResult(scored, '01-08')?.contractType).toBe('DIGITOVER');
    });
});
