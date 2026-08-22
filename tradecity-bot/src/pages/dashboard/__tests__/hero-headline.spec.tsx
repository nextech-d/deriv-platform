import { act, render, screen } from '@testing-library/react';
import HeroHeadline from '../hero-headline';

describe('HeroHeadline', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('reveals the headline word by word', () => {
        render(<HeroHeadline />);
        expect(screen.getByLabelText('Analyze the market before every move.')).toBeInTheDocument();
        expect(document.querySelectorAll('.dashboard-hero__word.is-in')).toHaveLength(0);

        act(() => {
            jest.advanceTimersByTime(160);
        });
        expect(document.querySelectorAll('.dashboard-hero__word.is-in')).toHaveLength(1);

        for (let i = 0; i < 5; i += 1) {
            act(() => {
                jest.advanceTimersByTime(210);
            });
        }
        expect(document.querySelectorAll('.dashboard-hero__word.is-in')).toHaveLength(6);
        expect(document.querySelector('.dashboard-hero__word.is-accent')).toHaveTextContent('every');
    });
});
