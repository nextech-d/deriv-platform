export interface TickPoint {
    quote: number;
    epoch?: number;
    symbol?: string;
}

/** Narrows a mixed-symbol tick feed to one market, tolerating untagged history. */
export function ticksForMarket<T extends TickPoint>(history: T[], symbol: string): T[] {
    const tagged = history.some(tick => tick.symbol);
    return tagged ? history.filter(tick => tick.symbol === symbol) : history;
}

/** The tick a contract settles on: the Nth tick strictly after entry. */
export function exitTickAfter<T extends { epoch?: number }>(ticks: T[], startEpoch: number, duration: number): T | null {
    const later = ticks.filter(tick => (tick.epoch ?? 0) > startEpoch);
    return later[Math.max(1, duration) - 1] ?? null;
}

export function pendingProgress<T extends { epoch?: number }>(
    ticks: T[],
    startEpoch: number,
    duration: number
): { done: number; need: number } {
    const later = ticks.filter(tick => (tick.epoch ?? 0) > startEpoch);
    return { done: Math.min(later.length, duration), need: duration };
}
