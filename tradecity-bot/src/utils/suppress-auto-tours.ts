import { getSetting, storeSetting } from './settings';

const TOUR_TOKENS = ['onboard_tour_token', 'bot_builder_token'] as const;

/**
 * The first-visit tour overlay covers desks and eats tab clicks.
 * Mark both tours as seen so they stay opt-in from Tutorials.
 */
export function suppressAutoTours() {
    TOUR_TOKENS.forEach(token => {
        if (!getSetting(token)) {
            storeSetting(token, 1);
        }
    });
}
