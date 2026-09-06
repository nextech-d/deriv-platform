import Observer from '../observer';

describe('Observer.unregister', () => {
    it('is a no-op for an event that was never registered', () => {
        const observer = new Observer();

        // run-panel's unregisterBotListeners runs from a MobX reaction on every page
        // load, before the bot has ever started. `bot.running` has no action list at
        // that point, and reading .filter off it threw a TypeError that abandoned the
        // twelve unregisters queued behind it.
        expect(() => observer.unregister('bot.running', () => {})).not.toThrow();
    });

    it('still removes a registered listener', () => {
        const observer = new Observer();
        const action = jest.fn();

        observer.register('bot.running', action);
        observer.emit('bot.running');
        expect(action).toHaveBeenCalledTimes(1);

        observer.unregister('bot.running', action);
        observer.emit('bot.running');
        expect(action).toHaveBeenCalledTimes(1);
    });

    it('leaves other listeners on the same event alone', () => {
        const observer = new Observer();
        const kept = jest.fn();
        const dropped = jest.fn();

        observer.register('bot.contract', kept);
        observer.register('bot.contract', dropped);
        observer.unregister('bot.contract', dropped);
        observer.emit('bot.contract');

        expect(kept).toHaveBeenCalledTimes(1);
        expect(dropped).not.toHaveBeenCalled();
    });
});
