/**
 * Transport layer wrapper for SmartCharts Champion Adapter
 * Wraps the existing chart_api.api to match the TTransport interface
 */

import chart_api from '@/external/bot-skeleton/services/api/chart-api';
import type { TTransport } from './types';

// Logger utility for transport layer
const logger = {
    log: () => {}, // Disabled in production
    warn: console.warn.bind(console, '[SmartCharts Transport]'),
    error: console.error.bind(console, '[SmartCharts Transport]'),
};

type StoredSubscription = {
    request: Record<string, unknown>;
    callback: (response: unknown) => void;
    realSubscriptionId: string | null;
    requestedSymbol?: string;
};

function routeMessageToSubscription(data: unknown, storedSub: StoredSubscription): boolean {
    const subscriptionId = (data as { subscription?: { id?: string } })?.subscription?.id;
    if (subscriptionId) {
        if (!storedSub.realSubscriptionId) {
            storedSub.realSubscriptionId = subscriptionId;
        }
        if (subscriptionId === storedSub.realSubscriptionId) {
            storedSub.callback(data);
            return true;
        }
        return false;
    }

    const msg = data as {
        tick?: { symbol?: string };
        ohlc?: { symbol?: string };
        echo_req?: { ticks_history?: string; ticks?: string };
        msg_type?: string;
    };
    const msgSymbol = msg?.tick?.symbol || msg?.ohlc?.symbol || msg?.echo_req?.ticks_history || msg?.echo_req?.ticks;
    const isQuote = Boolean(msg?.tick || msg?.ohlc) || msg?.msg_type === 'tick' || msg?.msg_type === 'ohlc';
    if (isQuote && storedSub.requestedSymbol && msgSymbol === storedSub.requestedSymbol) {
        storedSub.callback(data);
        return true;
    }

    return false;
}

/**
 * Create transport wrapper around chart_api.api
 * @returns TTransport implementation
 */
export function createTransport(): TTransport {
    const subscriptions = new Map<string, StoredSubscription>();
    let messageSubscription: { unsubscribe: () => void } | null = null;

    const ensureMessageListener = () => {
        if (messageSubscription || !chart_api.api) return;

        messageSubscription = chart_api.api.onMessage()?.subscribe(({ data }: { data: unknown }) => {
            subscriptions.forEach(storedSub => {
                routeMessageToSubscription(data, storedSub);
            });
        });
    };

    const teardownMessageListener = () => {
        if (messageSubscription) {
            messageSubscription.unsubscribe();
            messageSubscription = null;
        }
    };

    return {
        /**
         * Send one-shot API request
         */
        async send(request: Record<string, unknown>): Promise<unknown> {
            if (!chart_api.api) {
                await chart_api.init();
            }
            chart_api.ensureTimePing();
            return chart_api.api.send(request);
        },

        /**
         * Subscribe to streaming data
         * @param request - API request with subscribe: 1
         * @param callback - Callback for streaming updates
         * @returns subscription ID
         */
        subscribe(request: Record<string, unknown>, callback: (response: unknown) => void): string {
            if (!chart_api.api) {
                throw new Error('Chart API not initialized');
            }

            chart_api.ensureTimePing();

            const tempId = `temp-${Date.now()}-${Math.random()}`;
            const subscribeRequest = { ...request, subscribe: 1 };
            const requestedSymbol = (request.ticks_history || request.ticks) as string | undefined;

            subscriptions.set(tempId, {
                request: subscribeRequest,
                callback,
                realSubscriptionId: null,
                requestedSymbol,
            });

            ensureMessageListener();

            chart_api.api
                .send(subscribeRequest)
                .then((response: { subscription?: { id?: string } }) => {
                    const subscriptionId = response?.subscription?.id;

                    if (subscriptionId) {
                        const storedSub = subscriptions.get(tempId);
                        if (storedSub) {
                            storedSub.realSubscriptionId = subscriptionId;
                        }
                        callback(response);
                    } else {
                        logger.error('No subscription ID in response:', response);
                    }
                })
                .catch((error: unknown) => {
                    logger.error('Subscription failed:', error);
                    subscriptions.delete(tempId);
                    if (subscriptions.size === 0) {
                        teardownMessageListener();
                    }
                });

            return tempId;
        },

        /**
         * Unsubscribe from streaming data
         * @param subscriptionId - Subscription ID to cancel (temp ID)
         */
        unsubscribe(subscriptionId: string): void {
            const subscription = subscriptions.get(subscriptionId);

            if (subscription) {
                if (chart_api.api && subscription.realSubscriptionId) {
                    chart_api.api.forget(subscription.realSubscriptionId);
                }
                subscriptions.delete(subscriptionId);
            } else {
                logger.warn('No subscription found for ID:', subscriptionId);
            }

            if (subscriptions.size === 0) {
                teardownMessageListener();
            }
        },

        /**
         * Unsubscribe from all streaming data of a specific type
         * @param msgType - Message type to unsubscribe from (optional)
         */
        unsubscribeAll(msgType?: string): void {
            if (chart_api.api) {
                if (msgType) {
                    chart_api.api.forgetAll(msgType);
                } else {
                    chart_api.api.forgetAll('ticks');
                }
            }

            subscriptions.clear();
            teardownMessageListener();
        },
    };
}
