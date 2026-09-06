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

    // Once BOTH ids are known the id is authoritative: match routes, mismatch is
    // somebody else's stream and must not fall through to the symbol check below.
    //
    // Never adopt an id from an unmatched frame. api_base shares this socket and
    // subscribes to balance, transaction and proposal_open_contract, so the first
    // id to arrive after subscribe() is frequently NOT ours. Adopting it delivered
    // that foreign frame to the chart as if it were a quote — verified against live
    // Deriv frames, where a second stream's `history` reached this callback. The
    // adoption self-corrects once the subscribe response lands, so the damage is
    // the contaminated frame, not lasting tick starvation. realSubscriptionId is
    // set from the subscribe response — see subscribe() and resubscribeAll().
    if (subscriptionId && storedSub.realSubscriptionId) {
        if (subscriptionId === storedSub.realSubscriptionId) {
            storedSub.callback(data);
            return true;
        }
        return false;
    }

    // Our id is not known yet (the subscribe response is still in flight), or the
    // frame carries no subscription.id at all — Deriv omits it on some tick/ohlc
    // frames. Match on the symbol we asked for.
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
    // The socket instance the current messageSubscription is bound to. chart_api.api
    // is swapped for a NEW WebSocket on every reconnect (Deriv drops idle sockets after
    // ~60s), which orphans both this listener and the server-side tick subscriptions —
    // the classic "chart goes stale after a minute" bug. Track the instance so we can
    // detect the swap and rebind + re-issue subscriptions on the live socket.
    let boundApi: unknown = null;

    const bindMessageListener = () => {
        if (!chart_api.api) return;
        if (messageSubscription) {
            messageSubscription.unsubscribe();
            messageSubscription = null;
        }
        boundApi = chart_api.api;
        messageSubscription = chart_api.api.onMessage()?.subscribe(({ data }: { data: unknown }) => {
            subscriptions.forEach(storedSub => {
                routeMessageToSubscription(data, storedSub);
            });
        });
    };

    // Re-send every active subscribe request on the current (new) socket. Called after
    // a reconnect so the chart keeps receiving ticks without SmartChart having to
    // re-subscribe. realSubscriptionId is reset so the new server id is captured.
    const resubscribeAll = () => {
        if (!chart_api.api) return;
        subscriptions.forEach(storedSub => {
            storedSub.realSubscriptionId = null;
            chart_api.api
                .send(storedSub.request)
                .then((response: { subscription?: { id?: string } }) => {
                    const subscriptionId = response?.subscription?.id;
                    if (subscriptionId) {
                        storedSub.realSubscriptionId = subscriptionId;
                        storedSub.callback(response);
                    }
                })
                .catch((error: unknown) => logger.error('Re-subscribe after reconnect failed:', error));
        });
    };

    // True when chart_api.api exists but its underlying socket is closing/closed.
    const isSocketDead = () => {
        const rs = (chart_api.api as { connection?: { readyState?: number } })?.connection?.readyState;
        return typeof rs === 'number' && rs > 1; // CLOSING (2) or CLOSED (3)
    };

    // If the socket was swapped out from under us — or chart_api.api itself is a dead
    // instance nobody re-init'd yet — rebind the listener to a live socket and replay
    // subscriptions. Cheap no-op when the socket is unchanged and healthy.
    const syncToLiveSocket = () => {
        if (isSocketDead()) {
            // Force a fresh instance, then rebind once it resolves.
            void chart_api.init(true).then(() => {
                bindMessageListener();
                if (subscriptions.size > 0) resubscribeAll();
            });
            return;
        }
        if (!chart_api.api) return;
        if (boundApi === chart_api.api && messageSubscription) return;
        const had_subscriptions = subscriptions.size > 0;
        bindMessageListener();
        if (had_subscriptions) resubscribeAll();
    };

    const ensureMessageListener = () => {
        if (!chart_api.api) return;
        // Always reconcile against the live socket instead of early-returning on a
        // truthy (but possibly dead) messageSubscription.
        syncToLiveSocket();
    };

    // A silent reconnect swaps chart_api.api without any chart interaction to trigger a
    // reconcile, so ticks would stop with no rebind. This watchdog reconciles the
    // listener/subscriptions against the live socket while any subscription is active.
    // Interval (10s) is well under Deriv's ~60s idle-close window so a swap is picked
    // up quickly. It also re-arms chart_api's keepalive ping to reduce idle drops.
    let reconcileTimer: ReturnType<typeof setInterval> | null = null;

    const stopReconcileWatchdog = () => {
        if (reconcileTimer) {
            clearInterval(reconcileTimer);
            reconcileTimer = null;
        }
    };

    const startReconcileWatchdog = () => {
        if (reconcileTimer) return;
        reconcileTimer = setInterval(() => {
            if (subscriptions.size === 0) {
                stopReconcileWatchdog();
                return;
            }
            chart_api.ensureTimePing?.();
            syncToLiveSocket();
        }, 10000);
    };

    const teardownMessageListener = () => {
        if (messageSubscription) {
            messageSubscription.unsubscribe();
            messageSubscription = null;
        }
        boundApi = null;
        stopReconcileWatchdog();
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
            startReconcileWatchdog();

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
