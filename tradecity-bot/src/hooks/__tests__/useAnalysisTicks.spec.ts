import { act, renderHook } from '@testing-library/react';
import { api_base } from '@/external/bot-skeleton';
import { useAnalysisTicks } from '../useAnalysisTicks';

const listeners: Array<(msg: { data: Record<string, unknown> }) => void> = [];

jest.mock('@/external/bot-skeleton', () => ({
    api_base: {
        api: {
            send: jest.fn(),
            forget: jest.fn(),
            onMessage: jest.fn(() => ({
                subscribe: (callback: (msg: { data: Record<string, unknown> }) => void) => {
                    listeners.push(callback);
                    return { unsubscribe: jest.fn() };
                },
            })),
        },
        pip_sizes: { R_100: 2 },
    },
}));

describe('useAnalysisTicks', () => {
    let frames: Array<FrameRequestCallback>;

    beforeEach(() => {
        listeners.length = 0;
        frames = [];
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
            frames.push(callback);
            return frames.length;
        });
        jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
        (api_base.api.send as jest.Mock).mockResolvedValue({
            subscription: { id: 'sub-1' },
            history: { prices: ['100.00'], times: [1] },
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    const flushPaint = () => {
        const pending = [...frames];
        frames.length = 0;
        act(() => {
            pending.forEach(frame => frame(0));
        });
    };

    const emitTick = (quote: number, epoch: number) => {
        listeners.forEach(listener =>
            listener({
                data: {
                    msg_type: 'tick',
                    tick: { symbol: 'R_100', quote, epoch },
                },
            })
        );
    };

    it('keeps every tick in data and paints once per frame', async () => {
        const { result } = renderHook(() => useAnalysisTicks(['R_100']));

        await act(async () => {
            await Promise.resolve();
        });
        flushPaint();

        expect(result.current.quotes).toEqual([{ quote: 100, epoch: 1, symbol: 'R_100' }]);

        emitTick(101, 2);
        emitTick(102, 3);
        emitTick(103, 4);
        expect(result.current.quotes.map(item => item.quote)).toEqual([100]);

        flushPaint();
        expect(result.current.quotes.map(item => item.quote)).toEqual([100, 101, 102, 103]);
        expect(frames).toHaveLength(0);
    });

    it('paints ticks that use underlying_symbol and ask', async () => {
        (api_base.api.send as jest.Mock).mockResolvedValue({
            subscription: { id: 'sub-2' },
            history: { prices: [], times: [] },
        });

        const { result } = renderHook(() => useAnalysisTicks(['1HZ100V']));

        await act(async () => {
            await Promise.resolve();
        });

        listeners.forEach(listener =>
            listener({
                data: {
                    msg_type: 'tick',
                    tick: { underlying_symbol: '1HZ100V', ask: 800.5, bid: 800.4, epoch: 2 },
                },
            })
        );
        flushPaint();

        expect(result.current.quotes).toEqual([{ quote: 800.5, epoch: 2, symbol: '1HZ100V' }]);
    });
});
