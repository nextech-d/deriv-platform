import type { TickEvent } from "@/lib/ws/protocol";

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  startEpoch: number;
  tickCount: number;
}

/** Aggregate ticks into OHLC candles by tick-count bucket size */
export function ticksToCandles(
  ticks: TickEvent[],
  bucketSize: number,
): Candle[] {
  if (ticks.length === 0 || bucketSize < 1) return [];

  const candles: Candle[] = [];
  let bucket: TickEvent[] = [];

  for (const tick of ticks) {
    bucket.push(tick);
    if (bucket.length >= bucketSize) {
      candles.push(buildCandle(bucket));
      bucket = [];
    }
  }

  if (bucket.length > 0) {
    candles.push(buildCandle(bucket));
  }

  return candles;
}

function buildCandle(bucket: TickEvent[]): Candle {
  const quotes = bucket.map((t) => t.quote);
  return {
    open: quotes[0]!,
    high: Math.max(...quotes),
    low: Math.min(...quotes),
    close: quotes.at(-1)!,
    startEpoch: bucket[0]!.epoch,
    tickCount: bucket.length,
  };
}

export type ChartTimeframe = 1 | 3 | 5 | 10;

export const TIMEFRAME_LABELS: Record<ChartTimeframe, string> = {
  1: "1t",
  3: "3t",
  5: "5t",
  10: "10t",
};
