import { analyzeTrend, edgeConfidence, movingAverage, pct, planRisk } from '../signal-analysis';

describe('pct', () => {
    it('returns a rounded percentage', () => {
        expect(pct(1, 3)).toBe(33.33);
        expect(pct(1, 2)).toBe(50);
    });

    it('treats an empty sample as zero rather than dividing by zero', () => {
        expect(pct(0, 0)).toBe(0);
        expect(pct(5, -1)).toBe(0);
    });
});

describe('edgeConfidence', () => {
    it('scores an even split as no edge', () => {
        expect(edgeConfidence(50)).toBe(0);
    });

    it('scores a one-sided reading as a full edge', () => {
        expect(edgeConfidence(100)).toBe(100);
        expect(edgeConfidence(0)).toBe(100);
    });

    it('scales linearly between the two', () => {
        expect(edgeConfidence(75)).toBe(50);
        expect(edgeConfidence(25)).toBe(50);
    });
});

describe('movingAverage', () => {
    it('averages the trailing span', () => {
        expect(movingAverage([1, 2, 3, 4, 5], 3)).toBe(4);
    });

    it('returns null until the span is filled', () => {
        expect(movingAverage([1, 2], 5)).toBeNull();
        expect(movingAverage([], 1)).toBeNull();
        expect(movingAverage([1, 2, 3], 0)).toBeNull();
    });
});

describe('analyzeTrend', () => {
    const rising = Array.from({ length: 30 }, (_, i) => 100 + i);

    it('reads a monotonic climb as fully bullish', () => {
        const stats = analyzeTrend(rising);
        expect(stats.upPct).toBe(100);
        expect(stats.downPct).toBe(0);
        expect(stats.cross).toBe('bullish');
        expect(stats.streakSide).toBe('up');
        expect(stats.streakLength).toBe(29);
    });

    it('reads a monotonic slide as fully bearish', () => {
        const stats = analyzeTrend([...rising].reverse());
        expect(stats.downPct).toBe(100);
        expect(stats.cross).toBe('bearish');
        expect(stats.streakSide).toBe('down');
    });

    it('splits an alternating series evenly and keeps the streak at one', () => {
        // An odd number of points gives an even number of transitions, so this can split 50/50.
        const stats = analyzeTrend(Array.from({ length: 31 }, (_, i) => (i % 2 ? 101 : 100)));
        expect(stats.upPct).toBe(50);
        expect(stats.downPct).toBe(50);
        expect(stats.streakLength).toBe(1);
    });

    it('reports no volatility for a flat series and no direction', () => {
        const stats = analyzeTrend(Array.from({ length: 30 }, () => 100));
        expect(stats.volatility).toBe(0);
        expect(stats.upCount).toBe(0);
        expect(stats.downCount).toBe(0);
        expect(stats.streakSide).toBeNull();
    });

    it('survives a series too short for either average', () => {
        const stats = analyzeTrend([100]);
        expect(stats.fastMa).toBeNull();
        expect(stats.slowMa).toBeNull();
        expect(stats.cross).toBeNull();
        expect(stats.momentum).toBe(0);
    });
});

describe('planRisk', () => {
    it('walks the doubling ladder until the budget runs out', () => {
        // 10% of 1000 is 100, and 1+2+4+8+16+32 is 63 with 64 out of reach.
        const plan = planRisk(1000, 10, 2, 1);
        expect(plan.riskAmount).toBe(100);
        expect(plan.maxLosses).toBe(6);
        expect(plan.ladderTotal).toBe(63);
        expect(plan.nextStake).toBe(64);
        expect(plan.survives).toBe(true);
    });

    it('divides the budget evenly when the multiplier is one', () => {
        const plan = planRisk(1000, 10, 1, 20);
        expect(plan.maxLosses).toBe(5);
        expect(plan.ladderTotal).toBe(100);
    });

    it('reports no survivable losses when the stake exceeds the budget', () => {
        const plan = planRisk(1000, 1, 2, 50);
        expect(plan.maxLosses).toBe(0);
        expect(plan.ladderTotal).toBe(0);
        expect(plan.survives).toBe(false);
    });

    it('clamps a negative balance to an empty budget', () => {
        const plan = planRisk(-500, 10, 2, 1);
        expect(plan.riskAmount).toBe(0);
        expect(plan.survives).toBe(false);
    });

    it('caps the risk share at one hundred percent', () => {
        expect(planRisk(1000, 250, 1, 100).riskAmount).toBe(1000);
        expect(planRisk(1000, 250, 1, 100).maxLosses).toBe(10);
    });

    it('does not loop forever on a zero stake', () => {
        const plan = planRisk(1000, 100, 2, 0);
        expect(plan.maxLosses).toBe(0);
        expect(plan.survives).toBe(false);
    });

    it('stops walking at the ladder depth cap', () => {
        expect(planRisk(1_000_000, 100, 1, 1).maxLosses).toBe(50);
    });
});
