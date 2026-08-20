import type { TickEvent } from "@/lib/ws/protocol";

/** Over 5 & Under 4 — both legs lose only when the exit digit is 4 or 5. */
export const EDGING_LOSE_DIGITS = new Set([4, 5]);
export const EDGING_OVER_BARRIER = 5;
export const EDGING_UNDER_BARRIER = 4;
export const EDGING_MIN_TOTAL = 0.7;
export const EDGING_MIN_LEG = 0.35;
export const EDGING_MAX_DURATION = 10;

export function edgingWins(digit: number): boolean {
  return !EDGING_LOSE_DIGITS.has(digit);
}

export function ticksForMarket(
  history: Array<{ quote: number; epoch?: number; symbol?: string }>,
  symbol: string,
): Array<{ quote: number; epoch?: number; symbol?: string }> {
  const tagged = history.some((tick) => tick.symbol);
  return tagged ? history.filter((tick) => tick.symbol === symbol) : history;
}

export function clampEdgingDuration(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(EDGING_MAX_DURATION, Math.round(value)));
}

export function perLegStake(totalStake: number): number {
  return Math.max(
    EDGING_MIN_LEG,
    Math.round((Math.max(EDGING_MIN_TOTAL, totalStake) / 2) * 100) / 100,
  );
}

/** Replica P/L for a 95% digit payout: cover is one win + one loss, kill is both legs lost. */
export function edgingPnl(
  digit: number,
  totalStake: number,
  payout = 0.95,
): number {
  const per = perLegStake(totalStake);
  if (!edgingWins(digit)) return -per * 2;
  return Number((per * payout - per).toFixed(2));
}

export function exitTickAfter<T extends { epoch?: number }>(
  ticks: T[],
  startEpoch: number,
  duration: number,
): T | null {
  const later = ticks.filter((tick) => (tick.epoch ?? 0) > startEpoch);
  return later[Math.max(1, duration) - 1] ?? null;
}

export function pendingProgress<T extends { epoch?: number }>(
  ticks: T[],
  startEpoch: number,
  duration: number,
): { done: number; need: number } {
  const later = ticks.filter((tick) => (tick.epoch ?? 0) > startEpoch);
  return { done: Math.min(later.length, duration), need: duration };
}
