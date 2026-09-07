import { fireEvent, render, screen } from '@testing-library/react';
import FreeBotsDesk from '../free-bots-desk';

/**
 * The card renders displayName, so the search filter has to match it too —
 * otherwise a word the user can see on screen returns no rows.
 */
describe('FreeBotsDesk search', () => {
    const renderDesk = () => render(<FreeBotsDesk onLoadInBuilder={jest.fn()} initialTier='free' />);
    const search = () => screen.getByPlaceholderText('Search bots');

    it('shows the display name on the card', () => {
        renderDesk();

        expect(screen.getByText('Tradecity speed bot ai')).toBeInTheDocument();
    });

    it('finds a row by a token that exists only in the display name', () => {
        renderDesk();

        // "speed bot ai" is in displayName; the runtime name stops at "speed bot".
        fireEvent.change(search(), { target: { value: 'speed bot ai' } });

        expect(screen.getByText('Tradecity speed bot ai')).toBeInTheDocument();
    });

    it('still finds a row by the runtime name', () => {
        renderDesk();

        fireEvent.change(search(), { target: { value: 'tradecity speed bot' } });

        expect(screen.getByText('Tradecity speed bot ai')).toBeInTheDocument();
    });

    it('returns nothing for a token in neither name', () => {
        renderDesk();

        fireEvent.change(search(), { target: { value: 'zzzznotabot' } });

        expect(screen.queryByText('Tradecity speed bot ai')).not.toBeInTheDocument();
    });
});
