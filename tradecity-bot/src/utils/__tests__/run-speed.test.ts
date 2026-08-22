import { readRunSpeed, RUN_SPEED_KEY, runSpeedDelayMs, SLOW_RUN_DELAY_MS, writeRunSpeed } from '../run-speed';

describe('runSpeedDelayMs', () => {
    it('maps Fast to no wait and Slow to the execution delay', () => {
        expect(runSpeedDelayMs('fast')).toBe(0);
        expect(runSpeedDelayMs('slow')).toBe(SLOW_RUN_DELAY_MS);
    });
});

describe('readRunSpeed / writeRunSpeed', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it('defaults to Fast and remembers Slow', () => {
        expect(readRunSpeed()).toBe('fast');
        writeRunSpeed('slow');
        expect(window.localStorage.getItem(RUN_SPEED_KEY)).toBe('slow');
        expect(readRunSpeed()).toBe('slow');
    });
});
