import { initialParams, SIGNAL_TOOLS, type ParamValues, type SignalTool, toolById } from '../signal-tools';

const digitsToQuotes = (digits: number[]) => digits.map(digit => 100 + digit / 10);

const context = (tool: SignalTool, digits: number[], overrides: ParamValues = {}) => ({
    values: digitsToQuotes(digits),
    digits,
    params: { ...initialParams(tool), ...overrides },
});

const repeat = (pattern: number[], length: number) =>
    Array.from({ length }, (_, i) => pattern[i % pattern.length]!);

describe('the registry', () => {
    it('gives every tool a unique id', () => {
        const ids = SIGNAL_TOOLS.map(tool => tool.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('falls back to the first tool for an unknown id', () => {
        expect(toolById('nope')).toBe(SIGNAL_TOOLS[0]);
    });

    it('reads every tool without throwing on an empty buffer', () => {
        SIGNAL_TOOLS.forEach(tool => {
            expect(() => tool.analyze(context(tool, []))).not.toThrow();
        });
    });

    it('reads every tool without throwing on a full buffer', () => {
        const digits = repeat([0, 3, 7, 2, 9, 4, 1, 8, 5, 6], 250);
        SIGNAL_TOOLS.forEach(tool => {
            const reading = tool.analyze(context(tool, digits));
            expect(typeof reading.headline).toBe('string');
            expect(reading.headline.length).toBeGreaterThan(0);
        });
    });

    it('keeps every confidence inside nought to a hundred', () => {
        const digits = repeat([2, 2, 4, 6, 8, 1, 3], 250);
        SIGNAL_TOOLS.forEach(tool => {
            const { handoff } = tool.analyze(context(tool, digits));
            if (!handoff) return;
            expect(handoff.confidence).toBeGreaterThanOrEqual(0);
            expect(handoff.confidence).toBeLessThanOrEqual(100);
        });
    });
});

describe('even/odd', () => {
    const tool = toolById('even_odd');

    it('calls a fully even sample with maximum confidence', () => {
        const reading = tool.analyze(context(tool, repeat([0, 2, 4, 6, 8], 100)));
        expect(reading.handoff).toMatchObject({ mode: 'parity', side: 'CALL', label: 'Even', confidence: 100 });
    });

    it('puts a fully odd sample', () => {
        const reading = tool.analyze(context(tool, repeat([1, 3, 5, 7, 9], 100)));
        expect(reading.handoff).toMatchObject({ side: 'PUT', label: 'Odd', confidence: 100 });
    });

    it('finds no edge in an even split', () => {
        const reading = tool.analyze(context(tool, repeat([0, 1], 100)));
        expect(reading.handoff?.confidence).toBe(0);
    });
});

describe('over/under', () => {
    const tool = toolById('over_under');

    it('calls over when every digit clears the barrier', () => {
        const reading = tool.analyze(context(tool, repeat([9], 100), { barrier: 4 }));
        expect(reading.handoff).toMatchObject({ mode: 'barrier', side: 'CALL', barrier: 4, confidence: 100 });
    });

    it('puts under when no digit clears the barrier', () => {
        const reading = tool.analyze(context(tool, repeat([0], 100), { barrier: 4 }));
        expect(reading.handoff).toMatchObject({ side: 'PUT', label: 'Under 4' });
    });

    it('honours a barrier the caller moves', () => {
        const reading = tool.analyze(context(tool, repeat([5], 100), { barrier: 8 }));
        expect(reading.handoff).toMatchObject({ side: 'PUT', barrier: 8 });
    });
});

describe('digits', () => {
    const tool = toolById('digits');

    it('calls matches when the target runs hot', () => {
        const reading = tool.analyze(context(tool, repeat([5, 5, 5, 1], 100), { target: 5 }));
        expect(reading.handoff).toMatchObject({ mode: 'matches', side: 'CALL', digitTarget: 5 });
    });

    it('calls differs when the target never lands', () => {
        const reading = tool.analyze(context(tool, repeat([1, 2, 3], 100), { target: 5 }));
        expect(reading.handoff).toMatchObject({ side: 'PUT', label: 'Differs 5' });
    });
});

describe('rise/fall', () => {
    const tool = toolById('rise_fall');

    it('calls a monotonic climb', () => {
        const reading = tool.analyze({
            values: Array.from({ length: 50 }, (_, i) => 100 + i),
            digits: Array.from({ length: 50 }, () => 0),
            params: initialParams(tool),
        });
        expect(reading.handoff).toMatchObject({ side: 'CALL', confidence: 100 });
    });

    it('puts a monotonic slide', () => {
        const reading = tool.analyze({
            values: Array.from({ length: 50 }, (_, i) => 100 - i),
            digits: Array.from({ length: 50 }, () => 0),
            params: initialParams(tool),
        });
        expect(reading.handoff).toMatchObject({ side: 'PUT', confidence: 100 });
    });
});

describe('signal hack', () => {
    const tool = toolById('signal_hack');
    const digits = repeat([0, 2, 4, 6, 8], 100);

    it('asks for a strategy before reading anything', () => {
        const reading = tool.analyze(context(tool, digits));
        expect(reading.headline).toMatch(/select a strategy/i);
        expect(reading.handoff).toBeNull();
    });

    it('switches families with the strategy parameter', () => {
        expect(tool.analyze(context(tool, digits, { strategy: 'even_odd' })).handoff).toMatchObject({ mode: 'parity' });
        expect(tool.analyze(context(tool, digits, { strategy: 'over_under', target: 4 })).handoff).toMatchObject({
            mode: 'barrier',
        });
        expect(tool.analyze(context(tool, digits, { strategy: 'matches_differs' })).handoff).toMatchObject({
            mode: 'matches',
        });
    });

    it('reports touch contracts without offering a hand-off', () => {
        const reading = tool.analyze(context(tool, digits, { strategy: 'touch_no_touch' }));
        expect(reading.handoff).toBeNull();
        expect(reading.rows.length).toBeGreaterThan(0);
    });
});

describe('risk management', () => {
    const tool = toolById('risk_management');

    it('reads from its parameters alone and never offers a hand-off', () => {
        const reading = tool.analyze({
            values: [],
            digits: [],
            params: { balance: 1000, risk: 10, stake: 1, multiplier: 2 },
        });
        expect(reading.handoff).toBeNull();
        expect(reading.headline).toContain('6 consecutive losses');
    });
});
