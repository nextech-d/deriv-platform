import { useEffect, useState } from 'react';
import classNames from 'classnames';

const WORDS = [
    { text: 'Analyze', accent: false },
    { text: 'the', accent: false },
    { text: 'market', accent: false },
    { text: 'before', accent: false },
    { text: 'every', accent: true },
    { text: 'move.', accent: false },
] as const;

const HeroHeadline = () => {
    const reduced =
        typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const [visible, setVisible] = useState(reduced ? WORDS.length : 0);

    useEffect(() => {
        if (reduced || visible >= WORDS.length) return;
        const delay = visible === 0 ? 160 : 210;
        const timer = window.setTimeout(() => setVisible(count => count + 1), delay);
        return () => window.clearTimeout(timer);
    }, [reduced, visible]);

    return (
        <h2 className='dashboard-hero__title' aria-label='Analyze the market before every move.'>
            {WORDS.map((word, index) => (
                <span
                    key={word.text}
                    className={classNames('dashboard-hero__word', {
                        'is-accent': word.accent,
                        'is-in': index < visible,
                    })}
                >
                    {word.text}
                </span>
            ))}
            <span className={classNames('dashboard-hero__caret', visible >= WORDS.length && 'is-on')} />
        </h2>
    );
};

export default HeroHeadline;
