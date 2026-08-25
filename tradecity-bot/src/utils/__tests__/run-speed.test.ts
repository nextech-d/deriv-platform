import { readRunSpeed, RUN_SPEED_EVENT, RUN_SPEED_KEY, runSpeedDelayMs, runSpeedIdleSeconds, SLOW_RUN_DELAY_MS, writeRunSpeed } from '../run-speed';

describe('runSpeedDelayMs', () => {
    it('maps Fast to no wait and Slow to the execution delay', () => {
        expect(runSpeedDelayMs('fast')).toBe(0);
        expect(runSpeedDelayMs('slow')).toBe(SLOW_RUN_DELAY_MS);
    });
});

describe('runSpeedIdleSeconds', () => {
    it('skips idle wait on Fast and waits one second on Slow', () => {
        expect(runSpeedIdleSeconds('fast')).toBe(0);
        expect(runSpeedIdleSeconds('slow')).toBe(1);
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

    it('notifies listeners when speed changes while running', () => {
        const seen: string[] = [];
        const onSpeed = (event: Event) => seen.push((event as CustomEvent<string>).detail);
        window.addEventListener(RUN_SPEED_EVENT, onSpeed);
        writeRunSpeed('slow');
        writeRunSpeed('fast');
        window.removeEventListener(RUN_SPEED_EVENT, onSpeed);
        expect(seen).toEqual(['slow', 'fast']);
    });
});
