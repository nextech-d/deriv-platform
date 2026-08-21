import { tradeOptionToBuy } from '@/external/bot-skeleton/services/tradeEngine/utils/helpers';

/**
 * The custom desks (Bulk Trader, Ultimate Bot, Fast Trader, Edging, Edging 2)
 * buy through useBulkTrading, which delegates to the trade engine's own
 * tradeOptionToBuy. These pin the wire shape: this Deriv options API keys the
 * market as `underlying_symbol`, and a plain `symbol` is silently not a market.
 */
describe('desk buy payload', () => {
    const base = {
        amount: 1,
        basis: 'stake',
        currency: 'USD',
        duration: 1,
        duration_unit: 't',
        symbol: 'R_100',
    };

    // barrier and selected_tick are added conditionally, so they are absent
    // from the helper's inferred return type.
    const buildParams = (contractType: string, option: Record<string, unknown>): Record<string, unknown> =>
        tradeOptionToBuy(contractType, option).parameters as Record<string, unknown>;

    it('sends the market as underlying_symbol', () => {
        const parameters = buildParams('DIGITOVER', { ...base, prediction: 5 });
        expect(parameters.underlying_symbol).toBe('R_100');
        expect(parameters).not.toHaveProperty('symbol');
    });

    it('carries a digit prediction in both barrier and selected_tick', () => {
        const parameters = buildParams('DIGITOVER', { ...base, prediction: 5 });
        expect(parameters.barrier).toBe(5);
        expect(parameters.selected_tick).toBe(5);
    });

    it('leaves the digit fields off a rise/fall contract', () => {
        const parameters = buildParams('CALL', { ...base, prediction: undefined });
        expect(parameters.barrier).toBeUndefined();
        expect(parameters.selected_tick).toBeUndefined();
    });

    it('keeps stake basis and the requested duration', () => {
        const { parameters, price } = tradeOptionToBuy('DIGITEVEN', { ...base, amount: 2.5, duration: 3 });
        expect(parameters.basis).toBe('stake');
        expect(parameters.amount).toBe(2.5);
        expect(parameters.duration).toBe(3);
        expect(parameters.duration_unit).toBe('t');
        expect(price).toBe(2.5);
    });

    it('treats digit zero as a real prediction rather than dropping it', () => {
        const parameters = buildParams('DIGITMATCH', { ...base, prediction: 0 });
        expect(parameters.barrier).toBe(0);
        expect(parameters.selected_tick).toBe(0);
    });
});
