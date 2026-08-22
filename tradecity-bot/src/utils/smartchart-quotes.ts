import type { TQuote } from '@deriv-com/smartcharts-champion';

function derivEpoch(epoch: number): number {
    if (epoch > 1e12) return Math.floor(epoch / 1000);
    return epoch;
}

/** SmartCharts champion expects ISO Date strings and tick/ohlc payloads for live updates. */
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
    ohlc?: { open?: number; high?: number; low?: number; close?: number }
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

export function quoteEpoch(date: string | number | undefined): number {
    if (date === undefined || date === null || date === '') return 0;
    if (typeof date === 'number') return derivEpoch(date);
    if (String(date).includes('T')) return Math.floor(new Date(String(date)).getTime() / 1000);
    const n = Number(date);
    return Number.isFinite(n) ? derivEpoch(n) : 0;
}
