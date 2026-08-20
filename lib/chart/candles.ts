import type { ChartCandle, TickEvent } from "@/lib/ws/protocol";

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  startEpoch: number;
  tickCount: number;
}

/** Deriv SmartCharts granularities (seconds). 0 = tick chart. */
export type DerivGranularity = 0 | 60 | 120 | 180 | 300 | 600 | 900 | 1800 | 3600 | 14400 | 86400;

export const DERIV_CHART_TIMEFRAMES: Array<{ id: DerivGranularity; label: string }> = [
  { id: 0, label: "Ticks" },
  { id: 60, label: "1m" },
  { id: 120, label: "2m" },
  { id: 180, label: "3m" },
  { id: 300, label: "5m" },
  { id: 600, label: "10m" },
  { id: 900, label: "15m" },
  { id: 1800, label: "30m" },
  { id: 3600, label: "1h" },
];

export function derivEpoch(epoch: number): number {
  if (!Number.isFinite(epoch) || epoch <= 0) return 0;
  return epoch > 1e12 ? Math.floor(epoch / 1000) : Math.floor(epoch);
}

export function candlesFromDeriv(raw: ChartCandle[]): Candle[] {
  return raw.map((candle) => ({
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    startEpoch: derivEpoch(candle.epoch),
    tickCount: 1,
  }));
}

/** Bucket ticks into Deriv time candles when history API is unavailable. */
export function ticksToTimeCandles(ticks: TickEvent[], granularitySec: number): Candle[] {
  if (granularitySec <= 0 || ticks.length === 0) return [];
  const buckets = new Map<number, Candle>();
  for (const tick of ticks) {
    const epoch = derivEpoch(tick.epoch);
    const start = Math.floor(epoch / granularitySec) * granularitySec;
    const prev = buckets.get(start);
    if (!prev) {
      buckets.set(start, {
        open: tick.quote,
        high: tick.quote,
        low: tick.quote,
        close: tick.quote,
        startEpoch: start,
        tickCount: 1,
      });
    } else {
      prev.high = Math.max(prev.high, tick.quote);
      prev.low = Math.min(prev.low, tick.quote);
      prev.close = tick.quote;
      prev.tickCount += 1;
    }
  }
  return [...buckets.values()];
}

export function applyTickToChartCandles(
  candles: ChartCandle[],
  tick: TickEvent,
  granularitySec: number,
): ChartCandle[] {
  return applyTickToCandles(candlesFromDeriv(candles), tick, granularitySec).map((candle) => ({
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    epoch: candle.startEpoch,
  }));
}

export function applyTickToCandles(
  candles: Candle[],
  tick: TickEvent,
  granularitySec: number,
): Candle[] {
  if (granularitySec <= 0) return candles;
  const epoch = derivEpoch(tick.epoch);
  const start = Math.floor(epoch / granularitySec) * granularitySec;
  const last = candles.at(-1);
  if (last && last.startEpoch === start) {
    return [
      ...candles.slice(0, -1),
      {
        ...last,
        high: Math.max(last.high, tick.quote),
        low: Math.min(last.low, tick.quote),
        close: tick.quote,
        tickCount: last.tickCount + 1,
      },
    ];
  }
  if (last && start < last.startEpoch) return candles;
  return [
    ...candles,
    {
      open: tick.quote,
      high: tick.quote,
      low: tick.quote,
      close: tick.quote,
      startEpoch: start,
      tickCount: 1,
    },
  ];
}

export function applyTickToHistory(
  ticks: TickEvent[],
  tick: TickEvent,
  limit = 800,
): TickEvent[] {
  const epoch = derivEpoch(tick.epoch);
  const last = ticks.at(-1);
  if (last && derivEpoch(last.epoch) === epoch) {
    return [...ticks.slice(0, -1), { ...tick, epoch }];
  }
  if (last && epoch < derivEpoch(last.epoch)) return ticks;
  return [...ticks, { ...tick, epoch }].slice(-limit);
}

export function formatChartTime(epoch: number, granularity: number): string {
  const date = new Date(derivEpoch(epoch) * 1000);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  if (granularity >= 86400) {
    return `${date.getDate()}/${date.getMonth() + 1}`;
  }
  if (granularity === 0) {
    const ss = String(date.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
  return `${hh}:${mm}`;
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
