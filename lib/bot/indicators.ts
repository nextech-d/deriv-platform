/** Simple moving average over the last `period` quotes (oldest → newest). */
export function sma(quotes: number[], period: number): number | null {
  if (quotes.length < period || period < 1) return null;
  const slice = quotes.slice(-period);
  return slice.reduce((sum, q) => sum + q, 0) / period;
}

/**
 * Wilder RSI over `period` bars.
 * Returns 0–100 or null if insufficient history.
 */
export function rsi(quotes: number[], period = 14): number | null {
  if (quotes.length < period + 1) return null;

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = quotes.length - period; i < quotes.length; i++) {
    const change = quotes[i]! - quotes[i - 1]!;
    if (change >= 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }

  avgGain /= period;
  avgLoss /= period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export type CrossDirection = "bullish" | "bearish" | null;

/** Detect fast SMA crossing slow SMA on the latest bar. */
export function maCrossSignal(
  quotes: number[],
  fastPeriod: number,
  slowPeriod: number,
): CrossDirection {
  if (quotes.length < slowPeriod + 1) return null;

  const prev = quotes.slice(0, -1);
  const fastNow = sma(quotes, fastPeriod);
  const slowNow = sma(quotes, slowPeriod);
  const fastPrev = sma(prev, fastPeriod);
  const slowPrev = sma(prev, slowPeriod);

  if (
    fastNow === null ||
    slowNow === null ||
    fastPrev === null ||
    slowPrev === null
  ) {
    return null;
  }

  if (fastPrev <= slowPrev && fastNow > slowNow) return "bullish";
  if (fastPrev >= slowPrev && fastNow < slowNow) return "bearish";
  return null;
}
