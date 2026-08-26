type FrameId = number;

export type TickUiBatcher = {
    schedule: (flush: () => void) => void;
    cancel: () => void;
};

const defaultSchedule = (callback: () => void): FrameId =>
    typeof requestAnimationFrame === 'function' ? requestAnimationFrame(callback) : (setTimeout(callback, 16) as FrameId);

const defaultCancel = (id: FrameId) => {
    if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(id);
        return;
    }
    clearTimeout(id);
};

/**
 * Keeps the latest tick data, but runs at most one UI flush per animation frame.
 */
export const createTickUiBatcher = (
    scheduleFrame: (callback: () => void) => FrameId = defaultSchedule,
    cancelFrame: (id: FrameId) => void = defaultCancel
): TickUiBatcher => {
    let frame_id: FrameId | null = null;
    let pending: (() => void) | null = null;

    return {
        schedule(flush) {
            pending = flush;
            if (frame_id != null) return;
            frame_id = scheduleFrame(() => {
                frame_id = null;
                const run = pending;
                pending = null;
                run?.();
            });
        },
        cancel() {
            if (frame_id != null) cancelFrame(frame_id);
            frame_id = null;
            pending = null;
        },
    };
};
