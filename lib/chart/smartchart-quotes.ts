import type { TQuote } from "@deriv-com/smartcharts-champion";
import { derivEpoch } from "@/lib/chart/candles";

/** SmartCharts champion expects ISO Date strings and a tick/ohlc payload for live updates. */
export function smartChartTickQuote(epoch: number, quote: number): TQuote {
  const seconds = derivEpoch(epoch);
  const dt = new Date(seconds * 1000);
  return {
    Date: dt.toISOString(),
    Close: quote,
    DT: dt,
    tick: {
      quote,
      epoch: seconds,
    },
  };
}

export function smartChartCandleQuote(
  epoch: number,
  quote: number,
  ohlc?: { open?: number; high?: number; low?: number; close?: number },
): TQuote {
  const seconds = derivEpoch(epoch);
  const dt = new Date(seconds * 1000);
  const open = ohlc?.open ?? quote;
  const high = ohlc?.high ?? quote;
  const low = ohlc?.low ?? quote;
  const close = ohlc?.close ?? quote;
  return {
    Date: dt.toISOString(),
    Open: open,
    High: high,
    Low: low,
    Close: close,
    DT: dt,
    ohlc: {
      open,
      high,
      low,
      close,
      epoch: seconds,
      open_time: seconds,
    },
  };
}
