import TradeEngine from '../index';
import { openContractReceived, proposalsReady, purchaseSuccessful, start } from '../state/actions';
import * as constants from '../state/constants';

/**
 * Pins the tick guard in watchScope (../index.js): a watcher must never resolve
 * twice on the same tick.
 *
 * The guard is load-bearing, not cosmetic. A buy the gateway rejects leaves the
 * scope at BEFORE_PURCHASE, so without one-tick spacing the BeforePurchase block
 * would re-run and re-send the buy at interpreter speed. The shape most likely to
 * break it is a refactor that moves `prevTick` inside watchScope — a fresh
 * `undefined` on every call resolves immediately on an already-seen tick, and
 * both tests below then fail.
 *
 * `prevTick` is module-level, so it persists across tests in this file. Each test
 * therefore dispatches its own unique tick epoch first and asserts only on
 * transitions it has caused itself.
 */

// The TradeEngine constructor calls observe(); every observer bails out early
// while api_base.api is unset, which is the case under jest.
const makeEngine = () => new TradeEngine({ observer: { emit: jest.fn() } });

let next_epoch = 1000;
const nextTick = engine => {
    next_epoch += 1;
    engine.store.dispatch({ type: constants.NEW_TICK, payload: next_epoch });
    return next_epoch;
};

/** Resolves to 'PENDING' if `promise` has not settled by the next macrotask. */
const settledOr = promise =>
    Promise.race([promise, new Promise(resolve => setTimeout(() => resolve('PENDING'), 0))]);

describe('watchScope tick guard', () => {
    it('before-watcher refuses to resolve twice on the same tick', async () => {
        const engine = makeEngine();
        engine.store.dispatch(start());
        engine.store.dispatch(proposalsReady());
        nextTick(engine);

        await expect(engine.watch('before')).resolves.toBe(true);

        // Same tick, no new market data: the watcher must stay pending.
        const second = engine.watch('before');
        await expect(settledOr(second)).resolves.toBe('PENDING');

        // A genuinely new tick releases that same pending promise.
        nextTick(engine);
        await expect(second).resolves.toBe(true);
    });

    it('during-watcher refuses to resolve twice on the same tick', async () => {
        const engine = makeEngine();
        engine.store.dispatch(start());
        engine.store.dispatch(proposalsReady());
        nextTick(engine);
        await engine.watch('before');

        engine.store.dispatch(purchaseSuccessful());
        engine.store.dispatch(openContractReceived());
        nextTick(engine);

        await expect(engine.watch('during')).resolves.toBe(true);

        const second = engine.watch('during');
        await expect(settledOr(second)).resolves.toBe('PENDING');

        nextTick(engine);
        await expect(second).resolves.toBe(true);
    });

    it('resolves false without waiting once the stop scope is reached', async () => {
        const engine = makeEngine();
        engine.store.dispatch(start());
        engine.store.dispatch(proposalsReady());
        nextTick(engine);
        engine.store.dispatch(purchaseSuccessful());

        // DURING_PURCHASE is the before-watcher's stop scope.
        await expect(engine.watch('before')).resolves.toBe(false);
    });
});
