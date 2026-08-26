import { useEffect, useMemo, useRef, useState } from 'react';
import { api_base } from '@/external/bot-skeleton';
import { createTickUiBatcher } from '@/utils/tick-ui-batcher';

export interface AnalysisQuote {
    quote: number;
    epoch: number;
    symbol: string;
}

const MAX_TICKS = 1000;

type TApi = {
    send: (request: Record<string, unknown>) => Promise<Record<string, any>>;
    forget: (id: string) => Promise<unknown>;
    onMessage: () => { subscribe: (cb: (msg: { data: Record<string, any> }) => void) => { unsubscribe: () => void } };
};

/**
 * Subscribes to Deriv tick streams for the given symbols and keeps a rolling
 * history per symbol. Only forgets its own subscription ids so a running bot's
 * tick feed is left untouched.
 */
export function useAnalysisTicks(symbols: string[]) {
    const key = useMemo(() => [...new Set(symbols)].sort().join(','), [symbols]);
    const [series, setSeries] = useState<Record<string, AnalysisQuote[]>>({});
    const [pipSizes, setPipSizes] = useState<Record<string, number>>({});
    const seriesRef = useRef<Record<string, AnalysisQuote[]>>({});

    useEffect(() => {
        const api = api_base?.api as TApi | null;
        const wanted = key ? key.split(',') : [];
        if (!api || !wanted.length) return;

        let disposed = false;
        const subscriptionIds: string[] = [];
        const paint = createTickUiBatcher();
        const flushSeries = () => {
            if (!disposed) setSeries(seriesRef.current);
        };

        const messageSubscription = api.onMessage().subscribe(({ data }) => {
            if (disposed || data?.msg_type !== 'tick' || !data.tick) return;
            const { symbol, quote, epoch } = data.tick;
            if (!wanted.includes(symbol)) return;

            const previous = seriesRef.current[symbol] ?? [];
            if (previous.length && previous[previous.length - 1]!.epoch >= Number(epoch)) return;

            const next = [...previous, { quote: Number(quote), epoch: Number(epoch), symbol }].slice(-MAX_TICKS);
            seriesRef.current = { ...seriesRef.current, [symbol]: next };
            paint.schedule(flushSeries);
        });

        wanted.forEach(symbol => {
            api.send({
                ticks_history: symbol,
                subscribe: 1,
                end: 'latest',
                count: MAX_TICKS,
                style: 'ticks',
            })
                .then(response => {
                    if (disposed) {
                        const late = response?.subscription?.id;
                        if (late) api.forget(late);
                        return;
                    }
                    const id = response?.subscription?.id;
                    if (id) subscriptionIds.push(id);

                    const history = response?.history;
                    if (history?.prices?.length) {
                        const seeded: AnalysisQuote[] = history.prices.map((price: string, i: number) => ({
                            quote: Number(price),
                            epoch: Number(history.times[i]),
                            symbol,
                        }));
                        seriesRef.current = { ...seriesRef.current, [symbol]: seeded.slice(-MAX_TICKS) };
                        paint.schedule(flushSeries);
                    }
                })
                .catch(error => {
                    if (error?.error?.code !== 'AlreadySubscribed') {
                        console.warn('[AnalysisTool] tick subscription failed for', symbol, error?.error?.code);
                    }
                });
        });

        setPipSizes((api_base?.pip_sizes ?? {}) as Record<string, number>);

        return () => {
            disposed = true;
            paint.cancel();
            messageSubscription.unsubscribe();
            subscriptionIds.forEach(id => api.forget(id));
        };
    }, [key]);

    const quotes = useMemo(() => Object.values(series).flat(), [series]);

    return { quotes, pipSizes };
}
