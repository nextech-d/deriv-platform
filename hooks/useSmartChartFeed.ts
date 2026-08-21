"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type {
  TGetQuotes,
  TGranularity,
  TQuote,
  TSubscribeQuotes,
  TUnsubscribeQuotes,
} from "@deriv-com/smartcharts-champion";
import { derivEpoch } from "@/lib/chart/candles";
import type { TickEvent } from "@/lib/ws/protocol";

const VALID_GRANULARITIES = new Set<number>([
  0, 60, 120, 180, 300, 600, 900, 1800, 3600, 7200, 14400, 28800, 86400,
]);

function asGranularity(value: number): TGranularity {
  return (VALID_GRANULARITIES.has(value) ? value : 0) as TGranularity;
}

/** SmartCharts passes { symbol, style, granularity? } into unsubscribeQuotes — ticks omit granularity. */
export function streamGranularityFromRequest(request?: {
  symbol?: string;
  granularity?: number | string;
  style?: string;
}): number | null {
  if (!request?.symbol) return null;
  if (request.granularity !== undefined && request.granularity !== null && request.granularity !== "") {
    return asGranularity(Number(request.granularity));
  }
  if (request.style === "ticks") return 0;
  return null;
}

export interface SmartChartFeedSource {
  symbol?: string;
  fetchChartQuotes?: (params: {
    symbol: string;
    granularity: number;
    count?: number;
    start?: number;
    end?: number | "latest";
  }) => Promise<{
    prices?: number[];
    times?: number[];
    candles?: Array<{
      open: number;
      high: number;
      low: number;
      close: number;
      epoch: number;
    }>;
  }>;
  subscribeChartStream?: (
    params: { symbol: string; granularity: number },
    onQuote: (payload: {
      symbol: string;
      granularity: number;
      epoch: number;
      quote: number;
      open?: number;
      high?: number;
      low?: number;
      close?: number;
    }) => void,
  ) => () => void;
  /** Worker tick history — bridged into SmartCharts when WS stream callbacks miss a beat. */
  liveTicks?: TickEvent[];
  demoTicks?: TickEvent[];
}

function demoHistoryFromTicks(ticks: TickEvent[], symbol: string) {
  const filtered = ticks
    .filter((tick) => tick.symbol === symbol)
    .map((tick) => ({ quote: tick.quote, epoch: derivEpoch(tick.epoch) }))
    .filter((tick) => tick.epoch > 0)
    .sort((a, b) => a.epoch - b.epoch);
  return {
    prices: filtered.map((tick) => tick.quote),
    times: filtered.map((tick) => tick.epoch),
  };
}

function pushTickQuote(callback: (quote: TQuote) => void, epoch: number, quote: number, ohlc?: {
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}) {
  if (ohlc) {
    callback({
      Date: String(epoch),
      Open: ohlc.open ?? quote,
      High: ohlc.high ?? quote,
      Low: ohlc.low ?? quote,
      Close: ohlc.close ?? quote,
      DT: new Date(epoch * 1000),
    } satisfies TQuote);
    return;
  }
  callback({
    Date: String(epoch),
    Close: quote,
    DT: new Date(epoch * 1000),
  } satisfies TQuote);
}

export function useSmartChartFeed(source: SmartChartFeedSource) {
  const streamCleanupRef = useRef(new Map<string, () => void>());
  const liveCallbacksRef = useRef(new Map<string, { granularity: number; callback: (quote: TQuote) => void }>());
  const lastLiveEpochRef = useRef(new Map<string, number>());

  const getQuotes: TGetQuotes = useCallback(
    async ({ symbol, granularity, count, start, end }) => {
      const g = asGranularity(granularity);

      if (source.fetchChartQuotes) {
        try {
          const result = await source.fetchChartQuotes({
            symbol,
            granularity: g,
            count,
            start,
            end,
          });

          if (g === 0) {
            return {
              history: {
                prices: result.prices ?? [],
                times: (result.times ?? []).map((time) => derivEpoch(time)),
              },
            };
          }

          return {
            candles: (result.candles ?? []).map((candle) => ({
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
              epoch: derivEpoch(candle.epoch),
            })),
          };
        } catch {
          return g === 0
            ? { history: { prices: [], times: [] } }
            : { candles: [] };
        }
      }

      if (g === 0 && source.demoTicks?.length) {
        const history = demoHistoryFromTicks(source.demoTicks, symbol);
        return { history };
      }

      throw new Error("Chart feed unavailable");
    },
    [source.demoTicks, source.fetchChartQuotes],
  );

  const subscribeQuotes: TSubscribeQuotes = useCallback(
    (params, callback) => {
      const granularity = asGranularity(params.granularity);
      const key = `${params.symbol}:${granularity}`;

      liveCallbacksRef.current.set(key, { granularity, callback });

      if (source.subscribeChartStream) {
        streamCleanupRef.current.get(key)?.();
        const cleanup = source.subscribeChartStream(
          { symbol: params.symbol, granularity },
          (payload) => {
            const epoch = derivEpoch(payload.epoch);
            if (granularity === 0) {
              pushTickQuote(callback, epoch, payload.quote);
              return;
            }
            pushTickQuote(callback, epoch, payload.quote, {
              open: payload.open,
              high: payload.high,
              low: payload.low,
              close: payload.close,
            });
          },
        );
        streamCleanupRef.current.set(key, cleanup);
      }

      if (granularity !== 0 || !source.demoTicks?.length || source.subscribeChartStream) {
        return () => {
          liveCallbacksRef.current.delete(key);
          streamCleanupRef.current.get(key)?.();
          streamCleanupRef.current.delete(key);
        };
      }

      let lastEpoch = 0;
      const timer = window.setInterval(() => {
        const latest = [...source.demoTicks!]
          .filter((tick) => tick.symbol === params.symbol)
          .sort((a, b) => derivEpoch(a.epoch) - derivEpoch(b.epoch))
          .at(-1);
        if (!latest) return;
        const epoch = derivEpoch(latest.epoch);
        if (epoch <= lastEpoch) return;
        lastEpoch = epoch;
        pushTickQuote(callback, epoch, latest.quote);
      }, 1000);

      return () => {
        window.clearInterval(timer);
        liveCallbacksRef.current.delete(key);
      };
    },
    [source.demoTicks, source.subscribeChartStream],
  );

  const unsubscribeQuotes: TUnsubscribeQuotes = useCallback((request) => {
    if (!request?.symbol) {
      for (const cleanup of streamCleanupRef.current.values()) cleanup();
      streamCleanupRef.current.clear();
      liveCallbacksRef.current.clear();
      return;
    }

    const granularity = streamGranularityFromRequest(
      request as { symbol?: string; granularity?: number | string; style?: string },
    );

    if (granularity === null) {
      for (const [key, cleanup] of streamCleanupRef.current.entries()) {
        if (key.startsWith(`${request.symbol}:`)) {
          cleanup();
          streamCleanupRef.current.delete(key);
        }
      }
      for (const key of [...liveCallbacksRef.current.keys()]) {
        if (key.startsWith(`${request.symbol}:`)) liveCallbacksRef.current.delete(key);
      }
      return;
    }

    const key = `${request.symbol}:${granularity}`;
    liveCallbacksRef.current.delete(key);
    streamCleanupRef.current.get(key)?.();
    streamCleanupRef.current.delete(key);
  }, []);

  // Bridge dashboard tick history into SmartCharts live callbacks (tick charts).
  useEffect(() => {
    const symbol = source.symbol;
    const ticks = source.liveTicks;
    if (!symbol || !ticks?.length) return;

    const latest = [...ticks]
      .filter((tick) => tick.symbol === symbol)
      .sort((a, b) => derivEpoch(a.epoch) - derivEpoch(b.epoch))
      .at(-1);
    if (!latest) return;

    const epoch = derivEpoch(latest.epoch);
    if (!epoch) return;
    const prev = lastLiveEpochRef.current.get(symbol) ?? 0;
    if (epoch <= prev) return;
    lastLiveEpochRef.current.set(symbol, epoch);

    for (const [key, entry] of liveCallbacksRef.current.entries()) {
      if (!key.startsWith(`${symbol}:`) || entry.granularity !== 0) continue;
      pushTickQuote(entry.callback, epoch, latest.quote);
    }
  }, [source.liveTicks, source.symbol]);

  return useMemo(
    () => ({ getQuotes, subscribeQuotes, unsubscribeQuotes }),
    [getQuotes, subscribeQuotes, unsubscribeQuotes],
  );
}
