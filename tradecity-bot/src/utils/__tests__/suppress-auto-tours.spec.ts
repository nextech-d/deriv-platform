import { getSetting } from '../settings';
import { suppressAutoTours } from '../suppress-auto-tours';

describe('suppressAutoTours', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('marks onboarding and bot builder tours as seen', () => {
        suppressAutoTours();
        expect(getSetting('onboard_tour_token')).toBe(1);
        expect(getSetting('bot_builder_token')).toBe(1);
    });

    it('does not overwrite an existing token', () => {
        localStorage.setItem('dbot_settings', JSON.stringify({ onboard_tour_token: 99 }));
        suppressAutoTours();
        expect(getSetting('onboard_tour_token')).toBe(99);
        expect(getSetting('bot_builder_token')).toBe(1);
    });
});
