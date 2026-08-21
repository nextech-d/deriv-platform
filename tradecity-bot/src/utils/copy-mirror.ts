import { copyApi } from './copy-trading';

const FLAG_KEY = 'copy_trading_running';

/**
 * Local hint so the common case — copy trading switched off — costs nothing.
 * The server re-checks the real session state on every replay, so a stale flag
 * can never cause an unwanted trade.
 */
export function setCopyRunningHint(running: boolean): void {
    try {
        if (running) sessionStorage.setItem(FLAG_KEY, '1');
        else sessionStorage.removeItem(FLAG_KEY);
    } catch {
        /* storage unavailable */
    }
}

function copyRunningHint(): boolean {
    try {
        return sessionStorage.getItem(FLAG_KEY) === '1';
    } catch {
        return false;
    }
}

/**
 * Replays one contract onto the enabled copy accounts. Fire-and-forget: a copy
 * failure must never disturb the trade the user actually placed.
 */
export function mirrorContract(parameters: Record<string, unknown>, maxPrice?: number): void {
    if (!copyRunningHint()) return;
    void copyApi.replay(parameters, maxPrice).catch(() => {
        /* surfaced on the Copy Trader tab, not here */
    });
}
