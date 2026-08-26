import { createTickUiBatcher } from '../tick-ui-batcher';

describe('createTickUiBatcher', () => {
    it('records every schedule but flushes only the latest once per frame', () => {
        const frames: Array<() => void> = [];
        const batcher = createTickUiBatcher(
            callback => {
                frames.push(callback);
                return frames.length;
            },
            () => undefined
        );
        const flushes: number[] = [];

        batcher.schedule(() => flushes.push(1));
        batcher.schedule(() => flushes.push(2));
        batcher.schedule(() => flushes.push(3));

        expect(flushes).toEqual([]);
        expect(frames).toHaveLength(1);

        frames[0]!();
        expect(flushes).toEqual([3]);
    });

    it('schedules another frame after the previous flush', () => {
        const frames: Array<() => void> = [];
        const batcher = createTickUiBatcher(
            callback => {
                frames.push(callback);
                return frames.length;
            },
            () => undefined
        );
        const flushes: number[] = [];

        batcher.schedule(() => flushes.push(1));
        frames[0]!();
        batcher.schedule(() => flushes.push(2));
        expect(frames).toHaveLength(2);
        frames[1]!();
        expect(flushes).toEqual([1, 2]);
    });

    it('cancel drops the pending paint', () => {
        const frames: Array<() => void> = [];
        let cancelled = 0;
        const batcher = createTickUiBatcher(
            callback => {
                frames.push(callback);
                return 7;
            },
            () => {
                cancelled += 1;
            }
        );

        batcher.schedule(() => {
            throw new Error('should not flush after cancel');
        });
        batcher.cancel();
        expect(cancelled).toBe(1);
        frames[0]!();
    });
});
