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

        expect(screen.getByText('Tradecity ai')).toBeInTheDocument();
    });

    it('finds a row by a token that exists only in the display name', () => {
        renderDesk();

        // "tradecity ai" is the displayName; the runtime name is "tradecity speed bot".
        fireEvent.change(search(), { target: { value: 'tradecity ai' } });

        expect(screen.getByText('Tradecity ai')).toBeInTheDocument();
    });

    it('still finds a row by the runtime name', () => {
        renderDesk();

        fireEvent.change(search(), { target: { value: 'tradecity speed bot' } });

        expect(screen.getByText('Tradecity ai')).toBeInTheDocument();
    });

    it('returns nothing for a token in neither name', () => {
        renderDesk();

        fireEvent.change(search(), { target: { value: 'zzzznotabot' } });

        expect(screen.queryByText('Tradecity ai')).not.toBeInTheDocument();
    });
});
