/**
 * Regression tests for transport message routing.
 *
 * The chart shares ONE WebSocket with api_base, which subscribes to balance,
 * transaction and proposal_open_contract (api-base.ts subscribe()). Every frame on
 * that socket reaches the transport's single onMessage listener, including frames
 * that belong to somebody else's subscription.
 *
 * These tests pin the two things that must hold while a tick subscription is still
 * waiting for its own subscription id:
 *   1. a foreign subscription id must never be adopted as the tick stream's id, and
 *   2. a genuine tick must still be routed to the chart.
 */

import chart_api from '@/external/bot-skeleton/services/api/chart-api';
import { createTransport } from '../transport';

jest.mock('@/external/bot-skeleton/services/api/chart-api', () => ({
    __esModule: true,
    default: {
        api: null,
        init: jest.fn(),
        ensureTimePing: jest.fn(),
    },
}));

const TICK_SYMBOL = 'R_100';
const BALANCE_SUBSCRIPTION_ID = 'balance-sub-1';
const TICK_SUBSCRIPTION_ID = 'ticks-sub-9';

/** A frame api_base's balance subscribe ack puts on the shared socket. */
const balanceAck = {
    data: {
        msg_type: 'balance',
        echo_req: { balance: 1, subscribe: 1, account: 'all' },
        subscription: { id: BALANCE_SUBSCRIPTION_ID },
        balance: { balance: 10000, currency: 'USD', loginid: 'VRTC123' },
    },
};

/** A genuine tick for the symbol the chart asked for. */
const tickFrame = {
    data: {
        msg_type: 'tick',
        echo_req: { ticks_history: TICK_SYMBOL, subscribe: 1 },
        subscription: { id: TICK_SUBSCRIPTION_ID },
        tick: { symbol: TICK_SYMBOL, quote: 1234.56, epoch: 1756900000 },
    },
};

describe('transport message routing on a shared socket', () => {
    let mockApi: any;
    let messageCallback: (frame: unknown) => void;
    let resolveSend: (response: unknown) => void;
    let rejectSend: (reason: unknown) => void;
    let transport: ReturnType<typeof createTransport>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Hold the subscribe response open so the test can drive the window between
        // send() and its .then() — the window in which realSubscriptionId is null.
        const sendResponse = new Promise((resolve, reject) => {
            resolveSend = resolve;
            rejectSend = reject;
        });

        mockApi = {
            send: jest.fn().mockReturnValue(sendResponse),
            onMessage: jest.fn().mockReturnValue({
                subscribe: (cb: (frame: unknown) => void) => {
                    messageCallback = cb;
                    return { unsubscribe: jest.fn() };
                },
            }),
            forget: jest.fn(),
            forgetAll: jest.fn(),
        };

        chart_api.api = mockApi;
        transport = createTransport();
    });

    afterEach(() => {
        // subscribe() arms a 10s reconcile interval; unsubscribeAll tears it down.
        transport.unsubscribeAll();
        chart_api.api = null;
    });

    it('routes a tick that arrives after a foreign subscription ack', () => {
        const onQuote = jest.fn();
        transport.subscribe({ ticks_history: TICK_SYMBOL }, onQuote);

        // api_base's balance ack lands first, while our id is still unknown.
        messageCallback(balanceAck);
        // Then a real tick for our symbol, carrying its own id.
        messageCallback(tickFrame);

        expect(onQuote).toHaveBeenCalledWith(tickFrame.data);
    });

    it('does not adopt a foreign subscription id, so forget targets only its own stream', async () => {
        const onQuote = jest.fn();
        const subscriptionId = transport.subscribe({ ticks_history: TICK_SYMBOL }, onQuote);

        messageCallback(balanceAck);

        // The chart's own subscribe response finally arrives with the real id.
        resolveSend({ subscription: { id: TICK_SUBSCRIPTION_ID }, echo_req: { ticks_history: TICK_SYMBOL } });
        await Promise.resolve();
        await Promise.resolve();

        transport.unsubscribe(subscriptionId);

        expect(mockApi.forget).toHaveBeenCalledWith(TICK_SUBSCRIPTION_ID);
        expect(mockApi.forget).not.toHaveBeenCalledWith(BALANCE_SUBSCRIPTION_ID);
    });

    it('keeps routing when the server refuses a duplicate subscribe', async () => {
        const onQuote = jest.fn();
        transport.subscribe({ ticks_history: TICK_SYMBOL }, onQuote);

        // A remounted chart already owns the server-side stream for this symbol.
        rejectSend({
            echo_req: { ticks_history: TICK_SYMBOL, style: 'ticks', subscribe: 1 },
            error: { code: 'AlreadySubscribed', message: `You are already subscribed to ${TICK_SYMBOL}` },
            msg_type: 'ticks_history',
        });
        await Promise.resolve();
        await Promise.resolve();

        // Ticks from that existing stream must still reach the chart.
        messageCallback(tickFrame);

        expect(onQuote).toHaveBeenCalledWith(tickFrame.data);
    });

    it('ignores a tick for a symbol it did not subscribe to', () => {
        const onQuote = jest.fn();
        transport.subscribe({ ticks_history: TICK_SYMBOL }, onQuote);

        messageCallback({
            data: {
                msg_type: 'tick',
                echo_req: { ticks_history: 'R_10', subscribe: 1 },
                subscription: { id: 'ticks-sub-other' },
                tick: { symbol: 'R_10', quote: 9.99, epoch: 1756900001 },
            },
        });

        expect(onQuote).not.toHaveBeenCalled();
    });
});
