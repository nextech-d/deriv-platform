/**
 * Unit tests for Transport Layer
 * Tests the transport wrapper around chart_api
 */

import chart_api from '@/external/bot-skeleton/services/api/chart-api';
import { createTransport } from '../transport';

// Mock chart_api
jest.mock('@/external/bot-skeleton/services/api/chart-api', () => ({
    __esModule: true,
    default: {
        api: null,
        init: jest.fn(),
        ensureTimePing: jest.fn(),
    },
}));

describe('Transport Layer', () => {
    let mockApi: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create mock API with RxJS-like observable
        mockApi = {
            send: jest.fn(),
            onMessage: jest.fn(),
            forget: jest.fn(),
            forgetAll: jest.fn(),
        };

        // Set up chart_api.api
        chart_api.api = mockApi;
    });

    afterEach(() => {
        chart_api.api = null;
        // The transport starts a reconnect-reconcile interval while a subscription is
        // active; clear any timers left by tests that subscribe without unsubscribing.
        jest.clearAllTimers();
    });

    describe('createTransport', () => {
        it('should create transport instance', () => {
            const transport = createTransport();

            expect(transport).toBeDefined();
            expect(transport.send).toBeInstanceOf(Function);
            expect(transport.subscribe).toBeInstanceOf(Function);
            expect(transport.unsubscribe).toBeInstanceOf(Function);
            expect(transport.unsubscribeAll).toBeInstanceOf(Function);
        });
    });

    describe('send', () => {
        it('should send API request', async () => {
            const mockResponse = { tick: { quote: 100.5 } };
            mockApi.send.mockResolvedValue(mockResponse);

            const transport = createTransport();
            const request = { ticks: 'R_50' };

            const result = await transport.send(request);

            expect(mockApi.send).toHaveBeenCalledWith(request);
            expect(result).toEqual(mockResponse);
        });

        it('should initialize API if not available', async () => {
            chart_api.api = null;
            const mockResponse = { tick: { quote: 100.5 } };

            (chart_api.init as jest.Mock).mockResolvedValue(undefined);

            // After init, set up the API
            (chart_api.init as jest.Mock).mockImplementation(() => {
                chart_api.api = mockApi;
                mockApi.send.mockResolvedValue(mockResponse);
                return Promise.resolve();
            });

            const transport = createTransport();
            const request = { ticks: 'R_50' };

            const result = await transport.send(request);

            expect(chart_api.init).toHaveBeenCalled();
            expect(result).toEqual(mockResponse);
        });

        it('should handle send errors', async () => {
            const error = new Error('Network error');
            mockApi.send.mockRejectedValue(error);

            const transport = createTransport();
            const request = { ticks: 'R_50' };

            await expect(transport.send(request)).rejects.toThrow('Network error');
        });
    });

    describe('subscribe', () => {
        it('should subscribe to streaming data', () => {
            const mockSubscription = {
                unsubscribe: jest.fn(),
            };

            const mockMessageObservable = {
                subscribe: jest.fn().mockReturnValue(mockSubscription),
            };

            mockApi.onMessage.mockReturnValue(mockMessageObservable);
            mockApi.send.mockResolvedValue({
                subscription: { id: 'sub-123' },
                tick: { quote: 100.5 },
            });

            const transport = createTransport();
            const callback = jest.fn();
            const request = { ticks: 'R_50', subscribe: 1 };

            const subscriptionId = transport.subscribe(request, callback);

            expect(subscriptionId).toBeDefined();
            expect(typeof subscriptionId).toBe('string');
            expect(mockApi.onMessage).toHaveBeenCalled();
            expect(mockMessageObservable.subscribe).toHaveBeenCalled();
        });

        // syncToLiveSocket() replays `subscriptions` whenever it rebinds the listener,
        // and the first subscribe of a transport always rebinds. Registering the entry
        // before that call meant resubscribeAll() sent the request and then subscribe()
        // sent the SAME object again. DerivAPIBasic stamps req_id onto the object it is
        // given, so the duplicate went out byte-identical with the same req_id and the
        // gateway answered both with AlreadySubscribed.
        it('sends the subscribe request exactly once on a first subscribe', () => {
            const mockMessageObservable = {
                subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
            };
            mockApi.onMessage.mockReturnValue(mockMessageObservable);
            mockApi.send.mockResolvedValue({ subscription: { id: 'sub-123' } });

            const transport = createTransport();
            transport.subscribe({ ticks_history: 'R_10', style: 'ticks' }, jest.fn());

            expect(mockApi.send).toHaveBeenCalledTimes(1);
            expect(mockApi.send).toHaveBeenCalledWith(
                expect.objectContaining({ ticks_history: 'R_10', subscribe: 1 })
            );
        });

        it('does not replay a req_id when re-subscribing on a new socket', async () => {
            const mockMessageObservable = {
                subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
            };
            mockApi.onMessage.mockReturnValue(mockMessageObservable);
            // DerivAPIBasic mutates the request it is handed; mimic that here.
            mockApi.send.mockImplementation((request: any) => {
                request.req_id = request.req_id || 21;
                return Promise.resolve({ subscription: { id: 'sub-123' } });
            });

            const transport = createTransport();
            transport.subscribe({ ticks_history: 'R_10', style: 'ticks' }, jest.fn());
            await Promise.resolve();

            expect(mockApi.send.mock.calls[0][0].req_id).toBe(21);

            // Swap the socket so the next reconcile rebinds and replays.
            const secondApi = {
                ...mockApi,
                send: jest.fn().mockResolvedValue({ subscription: { id: 'sub-456' } }),
                onMessage: jest.fn().mockReturnValue(mockMessageObservable),
            };
            chart_api.api = secondApi as any;

            transport.subscribe({ ticks_history: 'R_25', style: 'ticks' }, jest.fn());

            const replayed = secondApi.send.mock.calls.find(
                (call: any[]) => call[0].ticks_history === 'R_10'
            );
            expect(replayed).toBeDefined();
            expect(replayed![0].req_id).toBeUndefined();
        });

        it('should throw error if API not initialized', () => {
            chart_api.api = null;

            const transport = createTransport();
            const callback = jest.fn();
            const request = { ticks: 'R_50', subscribe: 1 };

            expect(() => transport.subscribe(request, callback)).toThrow('Chart API not initialized');
        });

        it('should handle subscription with callback', done => {
            const mockSubscription = {
                unsubscribe: jest.fn(),
            };

            let messageCallback: any;
            const mockMessageObservable = {
                subscribe: jest.fn((cb: any) => {
                    messageCallback = cb;
                    return mockSubscription;
                }),
            };

            mockApi.onMessage.mockReturnValue(mockMessageObservable);
            mockApi.send.mockResolvedValue({
                subscription: { id: 'sub-123' },
                tick: { quote: 100.5 },
            });

            const transport = createTransport();
            const callback = jest.fn();
            const request = { ticks: 'R_50', subscribe: 1 };

            transport.subscribe(request, callback);

            // Wait for async send to complete
            setTimeout(() => {
                // Simulate incoming message
                messageCallback({
                    data: {
                        subscription: { id: 'sub-123' },
                        tick: { quote: 101.0 },
                    },
                });

                expect(callback).toHaveBeenCalledWith({
                    subscription: { id: 'sub-123' },
                    tick: { quote: 101.0 },
                });
                done();
            }, 100);
        });

        it('should handle subscription errors', done => {
            const mockSubscription = {
                unsubscribe: jest.fn(),
            };

            const mockMessageObservable = {
                subscribe: jest.fn().mockReturnValue(mockSubscription),
            };

            mockApi.onMessage.mockReturnValue(mockMessageObservable);
            mockApi.send.mockRejectedValue(new Error('Subscription failed'));

            const transport = createTransport();
            const callback = jest.fn();
            const request = { ticks: 'R_50', subscribe: 1 };

            const subscriptionId = transport.subscribe(request, callback);

            expect(subscriptionId).toBeDefined();

            // Wait for error handling
            setTimeout(() => {
                expect(mockSubscription.unsubscribe).toHaveBeenCalled();
                done();
            }, 100);
        });
    });

    describe('unsubscribe', () => {
        it('should unsubscribe from streaming data', () => {
            const mockSubscription = {
                unsubscribe: jest.fn(),
            };

            const mockMessageObservable = {
                subscribe: jest.fn().mockReturnValue(mockSubscription),
            };

            mockApi.onMessage.mockReturnValue(mockMessageObservable);
            mockApi.send.mockResolvedValue({
                subscription: { id: 'sub-123' },
            });

            const transport = createTransport();
            const callback = jest.fn();
            const request = { ticks: 'R_50', subscribe: 1 };

            const subscriptionId = transport.subscribe(request, callback);

            // Wait for subscription to be set up
            setTimeout(() => {
                transport.unsubscribe(subscriptionId);

                expect(mockSubscription.unsubscribe).toHaveBeenCalled();
                expect(mockApi.forget).toHaveBeenCalledWith('sub-123');
            }, 100);
        });

        it('should handle unsubscribe for non-existent subscription', () => {
            const transport = createTransport();

            // Should not throw
            expect(() => transport.unsubscribe('non-existent-id')).not.toThrow();
        });
    });

    describe('unsubscribeAll', () => {
        it('should unsubscribe from all ticks by default', () => {
            const transport = createTransport();

            transport.unsubscribeAll();

            expect(mockApi.forgetAll).toHaveBeenCalledWith('ticks');
        });

        it('should unsubscribe from specific message type', () => {
            const transport = createTransport();

            transport.unsubscribeAll('candles');

            expect(mockApi.forgetAll).toHaveBeenCalledWith('candles');
        });

        it('should handle unsubscribeAll when API not available', () => {
            chart_api.api = null;

            const transport = createTransport();

            // Should not throw
            expect(() => transport.unsubscribeAll()).not.toThrow();
        });
    });
});
