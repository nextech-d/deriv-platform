export type RunSpeed = 'fast' | 'slow';

export const RUN_SPEED_KEY = 'tc-run-speed';
export const SLOW_RUN_DELAY_MS = 2000;

export function readRunSpeed(): RunSpeed {
    if (typeof window === 'undefined') return 'fast';
    try {
        return window.localStorage.getItem(RUN_SPEED_KEY) === 'slow' ? 'slow' : 'fast';
    } catch {
        return 'fast';
    }
}

export function writeRunSpeed(speed: RunSpeed): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(RUN_SPEED_KEY, speed);
    } catch {
        // ignore quota / private-mode failures
    }
}

/** Fast buys on the next ready proposal. Slow waits before each purchase cycle. */
export function runSpeedDelayMs(speed: RunSpeed = readRunSpeed()): number {
    return speed === 'slow' ? SLOW_RUN_DELAY_MS : 0;
}
