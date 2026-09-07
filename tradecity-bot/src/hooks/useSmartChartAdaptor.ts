import { useCallback, useEffect, useRef, useState } from 'react';
import { buildSmartchartsChampionAdapter } from '@/adapters/smartcharts-champion';
import { createServices } from '@/adapters/smartcharts-champion/services';
import { createTransport } from '@/adapters/smartcharts-champion/transport';
import { FALLBACK_CHART_SYMBOLS, FALLBACK_TRADING_TIMES } from '@/constants/chart-symbols';
import chart_api from '@/external/bot-skeleton/services/api/chart-api';
import { quoteEpoch } from '@/utils/smartchart-quotes';
import type { SmartchartsChampionAdapter } from '@/types/smartchart.types';
import type {
    ActiveSymbols,
    TGetQuotes,
    TGranularity,
    TradingTimesMap,
    TSubscribeQuotes,
    TUnsubscribeQuotes,
} from '@deriv-com/smartcharts-champion';

// Logger utility
// Resolved at call time, not bound at module load, so the console can be spied on.
const logger = {
    log: () => {}, // Disabled in production
    warn: (...args: unknown[]) => console.warn('[SmartCharts Hook]', ...args),
    error: (...args: unknown[]) => console.error('[SmartCharts Hook]', ...args),
};

// Type guard for valid granularity values
function isValidGranularity(value: unknown): value is TGranularity {
    const validGranularities = [0, 60, 120, 180, 300, 600, 900, 1800, 3600, 7200, 14400, 28800, 86400];
    return typeof value === 'number' && validGranularities.includes(value);
}

// Must match the key the adapter uses in its own subscription map so the two stay
// in step (see buildSmartchartsChampionAdapter).
function subscriptionKey(symbol: string, granularity: TGranularity) {
    return `${symbol}-${granularity}`;
}

interface UseSmartChartAdaptorReturn {
    adapter: SmartchartsChampionAdapter | null;
    adapterInitialized: boolean;
    chartData: {
        activeSymbols: ActiveSymbols;
        tradingTimes: TradingTimesMap;
    };
    getQuotes: TGetQuotes;
    subscribeQuotes: TSubscribeQuotes;
    unsubscribeQuotes: TUnsubscribeQuotes;
    isLoading: boolean;
    error: Error | null;
}

/**
 * Custom hook for SmartChart Adaptor
 * Handles adapter initialization, data fetching, and subscription management
 * with proper memoization and memory leak prevention
 */
export const useSmartChartAdaptor = (): UseSmartChartAdaptorReturn => {
    // State management
    const [adapter, setAdapter] = useState<SmartchartsChampionAdapter | null>(null);
    const [adapterInitialized, setAdapterInitialized] = useState(false);
    const [chartData, setChartData] = useState<{
        activeSymbols: ActiveSymbols;
        tradingTimes: TradingTimesMap;
    }>({
        activeSymbols: FALLBACK_CHART_SYMBOLS,
        tradingTimes: FALLBACK_TRADING_TIMES as TradingTimesMap,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Refs to track mounted state and prevent memory leaks
    const isMountedRef = useRef(true);
    const cleanupFunctionsRef = useRef<Array<() => void>>([]);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref to store timeout for cleanup
    // Mirrors the adapter's own `symbol-granularity` subscription map so a teardown
    // that finds no matching stream can be reported instead of passing silently. A
    // miss means the server-side subscription is about to be leaked, which is what
    // makes the NEXT subscribe for that symbol come back AlreadySubscribed.
    const activeKeysRef = useRef<Set<string>>(new Set());

    // Track mounted state
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;

            // Clear any pending retry timeouts
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = null;
            }
        };
    }, []);

    // Ensure chart websocket is ready before adapter init
    useEffect(() => {
        void chart_api.init();
    }, []);

    // Initialize adapter once the chart websocket exists. chart_api.init() is
    // async, so a one-shot effect would miss it and leave the chart frozen.
    useEffect(() => {
        if (adapterInitialized) return undefined;

        let cancelled = false;
        let attempts = 0;

        const tryInit = () => {
            if (cancelled || !isMountedRef.current || adapterInitialized) return;

            if (!chart_api.api) {
                attempts += 1;
                if (attempts < 25) {
                    retryTimeoutRef.current = setTimeout(tryInit, 200);
                }
                return;
            }

            try {
                const transport = createTransport();
                const services = createServices();
                const championAdapter = buildSmartchartsChampionAdapter(transport, services, {
                    debug: true,
                    subscriptionTimeout: 30000,
                });

                if (isMountedRef.current) {
                    setAdapter(championAdapter);
                    setAdapterInitialized(true);
                    setError(null);
                }
            } catch (err) {
                if (isMountedRef.current) {
                    setError(err instanceof Error ? err : new Error('Failed to initialize adapter'));
                    setIsLoading(false);
                }
            }
        };

        tryInit();

        return () => {
            cancelled = true;
        };
    }, [adapterInitialized]);

    // Load chart data when adapter is initialized
    useEffect(() => {
        if (!adapter || !adapterInitialized) return;

        let cancelled = false;

        const loadChartData = async (retryCount = 0, maxRetries = 10, delayMs = 200) => {
            try {
                setIsLoading(true);
                const data = await adapter.getChartData();

                if (!cancelled && isMountedRef.current) {
                    if (data.activeSymbols.length === 0 && retryCount < 2) {
                        // Clear any existing timeout
                        if (retryTimeoutRef.current) {
                            clearTimeout(retryTimeoutRef.current);
                        }

                        // Wait for the specified delay before retrying
                        retryTimeoutRef.current = setTimeout(() => {
                            if (!cancelled && isMountedRef.current) {
                                loadChartData(retryCount + 1, maxRetries, delayMs);
                            }
                        }, delayMs);

                        return;
                    }

                    setChartData({
                        activeSymbols:
                            data.activeSymbols.length > 0 ? data.activeSymbols : FALLBACK_CHART_SYMBOLS,
                        tradingTimes:
                            data.activeSymbols.length > 0
                                ? data.tradingTimes
                                : { ...FALLBACK_TRADING_TIMES, ...data.tradingTimes },
                    });
                    setError(null);
                }
            } catch (err) {
                // If we have retries left, try again
                if (!cancelled && isMountedRef.current && retryCount < maxRetries) {
                    // Clear any existing timeout
                    if (retryTimeoutRef.current) {
                        clearTimeout(retryTimeoutRef.current);
                    }

                    retryTimeoutRef.current = setTimeout(() => {
                        if (!cancelled && isMountedRef.current) {
                            loadChartData(retryCount + 1, maxRetries, delayMs);
                        }
                    }, delayMs);

                    return;
                }

                if (!cancelled && isMountedRef.current) {
                    setError(err instanceof Error ? err : new Error('Failed to load chart data'));
                    // Set fallback data to prevent undefined
                    setChartData({
                        activeSymbols: FALLBACK_CHART_SYMBOLS,
                        tradingTimes: FALLBACK_TRADING_TIMES as TradingTimesMap,
                    });
                }
            } finally {
                if (!cancelled && isMountedRef.current) {
                    setIsLoading(false);
                }
            }
        };

        loadChartData();

        // Cleanup function to cancel async operations
        return () => {
            cancelled = true;

            // Clear any pending retry timeouts
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = null;
            }
        };
    }, [adapter, adapterInitialized]);

    // Memoized getQuotes function
    const getQuotes: TGetQuotes = useCallback(
        async params => {
            if (!adapter) {
                return { history: { prices: [], times: [] } };
            }

            const result = await adapter.getQuotes({
                symbol: params.symbol,
                granularity: isValidGranularity(params.granularity) ? params.granularity : 0,
                count: params.count,
                start: params.start,
                end: params.end,
            });

            // Transform adapter result to SmartCharts Champion format
            if (params.granularity === 0) {
                return {
                    history: {
                        prices: result.quotes.map(q => q.Close),
                        times: result.quotes.map(q => quoteEpoch(q.Date)),
                    },
                };
            } else {
                return {
                    candles: result.quotes.map(q => ({
                        open: q.Open || q.Close,
                        high: q.High || q.Close,
                        low: q.Low || q.Close,
                        close: q.Close,
                        epoch: quoteEpoch(q.Date),
                    })),
                };
            }
        },
        [adapter]
    );

    // Memoized subscribeQuotes function
    const subscribeQuotes: TSubscribeQuotes = useCallback(
        (params, callback) => {
            if (!adapter) {
                return () => {};
            }

            const granularity = isValidGranularity(params.granularity) ? params.granularity : 0;
            const key = subscriptionKey(params.symbol, granularity);

            const unsubscribe = adapter.subscribeQuotes(
                {
                    symbol: params.symbol,
                    granularity,
                },
                quote => {
                    if (isMountedRef.current) {
                        callback(quote);
                    }
                }
            );

            activeKeysRef.current.add(key);

            // Create wrapper BEFORE storing/returning to avoid race condition
            const wrappedUnsubscribe = () => {
                unsubscribe();
                activeKeysRef.current.delete(key);
                const index = cleanupFunctionsRef.current.indexOf(wrappedUnsubscribe);
                if (index > -1) {
                    cleanupFunctionsRef.current.splice(index, 1);
                }
            };

            // Store BEFORE returning to avoid race condition
            cleanupFunctionsRef.current.push(wrappedUnsubscribe);

            return wrappedUnsubscribe;
        },
        [adapter]
    );

    // Memoized unsubscribeQuotes function
    //
    // SmartCharts tears a stream down through BinaryAPI.forget(), which hands us the
    // request built by BinaryAPI.createGetQuotesRequest(). That builder only copies
    // `granularity` onto the request when it is truthy — so for a TICK stream
    // (granularity 0) the field is absent, not zero. Branching on
    // `typeof request.granularity !== 'undefined'` therefore sent every single tick
    // teardown down the fallback path, which calls forget_all:['ticks'] on a socket
    // that api_base, ticks_service and the analysis panels all share, and then wipes
    // the transport's subscription map and its message listener. One chart symbol
    // change killed every tick stream in the app; the chart painted history and then
    // never updated.
    //
    // Branch on the symbol alone and treat a missing granularity as 0.
    const unsubscribeQuotes: TUnsubscribeQuotes = useCallback(
        request => {
            if (!adapter) return;

            if (!request?.symbol) {
                // No symbol to act on. Nothing else can be done, but this is not a
                // path SmartCharts should ever take — forget_all is global.
                logger.error('unsubscribeQuotes called without a symbol; forgetting ALL tick streams', request);
                adapter.transport.unsubscribeAll('ticks');
                return;
            }

            const granularity = isValidGranularity(request.granularity) ? request.granularity : 0;
            const key = subscriptionKey(request.symbol, granularity);

            if (!activeKeysRef.current.delete(key)) {
                // The adapter will not find this key either, so nothing gets forgotten
                // and the server-side stream leaks. Say so loudly rather than letting
                // the next subscribe fail with AlreadySubscribed for no visible reason.
                logger.error(
                    'unsubscribeQuotes: no tracked subscription for',
                    key,
                    '- the server-side stream may leak. Known active keys:',
                    Array.from(activeKeysRef.current)
                );
            }

            adapter.unsubscribeQuotes({ symbol: request.symbol, granularity });
        },
        [adapter]
    );

    // Cleanup effect - runs on unmount
    useEffect(() => {
        return () => {
            // Execute all cleanup functions
            cleanupFunctionsRef.current.forEach(cleanup => {
                try {
                    cleanup();
                } catch (err) {
                    logger.error('Error during cleanup:', err);
                }
            });
            cleanupFunctionsRef.current = [];
            activeKeysRef.current.clear();

            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = null;
            }
        };
    }, [adapter]);

    // Return object without useMemo wrapper (callbacks are already memoized)
    return {
        adapter,
        adapterInitialized,
        chartData,
        getQuotes,
        subscribeQuotes,
        unsubscribeQuotes,
        isLoading,
        error,
    };
};
