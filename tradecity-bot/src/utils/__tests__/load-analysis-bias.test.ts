jest.mock('@/external/bot-skeleton', () => ({
    ApiHelpers: { instance: null },
    load: jest.fn(),
}));
jest.mock('@/external/bot-skeleton/constants/save-type', () => ({
    save_types: { UNSAVED: 'unsaved' },
}));
jest.mock('@/external/bot-skeleton/scratch/dbot-store', () => ({
    __esModule: true,
    default: { instance: null },
}));
jest.mock('@/pages/bot-builder/quick-strategy/config', () => ({
    STRATEGIES: () => ({ MARTINGALE: { name: 'martingale_max-stake' } }),
}));
jest.mock('@/utils/xml-dom-quick-strategy', () => ({
    addDynamicBlockToDOM: jest.fn(),
}));

import { analysisBiasToStrategyFields } from '../load-analysis-bias';

describe('analysisBiasToStrategyFields', () => {
    it('maps an Over scan onto Quick Strategy purchase, not TYPE_LIST', () => {
        const fields = analysisBiasToStrategyFields({
            symbol: 'R_75',
            mode: 'barrier',
            side: 'CALL',
            barrier: 1,
            label: 'Over 1',
            stake: 0.5,
            size: 2.2,
            profit: 5,
            loss: 50,
        });

        expect(fields.tradetype).toBe('overunder');
        expect(fields.type).toBe('both');
        expect(fields.purchase).toBe('DIGITOVER');
        expect(fields.last_digit_prediction).toBe(1);
        expect(fields.durationtype).toBe('t');
        expect(fields.duration).toBe(1);
        expect(fields.stake).toBe(0.5);
        expect(fields.size).toBe(2.2);
        expect(fields.profit).toBe(5);
        expect(fields.loss).toBe(50);
    });

    it('maps an Under scan to DIGITUNDER', () => {
        const fields = analysisBiasToStrategyFields({
            symbol: 'R_100',
            mode: 'barrier',
            side: 'PUT',
            barrier: 8,
            label: 'Under 8',
        });

        expect(fields.purchase).toBe('DIGITUNDER');
        expect(fields.last_digit_prediction).toBe(8);
        expect(fields.stake).toBe(0.6);
        expect(fields.size).toBe(2);
    });

    it('maps parity Even/Odd onto the purchase list', () => {
        expect(
            analysisBiasToStrategyFields({
                symbol: 'R_10',
                mode: 'parity',
                side: 'CALL',
                label: 'Even',
            }).purchase
        ).toBe('DIGITEVEN');
        expect(
            analysisBiasToStrategyFields({
                symbol: 'R_10',
                mode: 'parity',
                side: 'PUT',
                label: 'Odd',
            }).purchase
        ).toBe('DIGITODD');
    });
});
