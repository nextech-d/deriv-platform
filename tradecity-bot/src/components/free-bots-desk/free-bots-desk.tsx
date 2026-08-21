import { useMemo, useState } from 'react';
import classNames from 'classnames';
import { FREE_BOT_STRATEGIES, type FreeBotStrategy } from '@/constants/free-bots';
import { readFreeBotsTier, writeFreeBotsTier, type FreeBotsTier } from '@/utils/free-bots-tier';
import { LabelPairedSearchSmRegularIcon } from '@deriv/quill-icons/LabelPaired';
import './free-bots-desk.scss';

type Tier = 'free' | 'premium';
type Freshness = 'all' | 'new' | 'normal';

const DIFFICULTY: Record<FreeBotStrategy['difficulty'], string> = {
    starter: 'Starter',
    standard: 'Standard',
    advanced: 'Advanced',
};

const MARK_COLORS = ['#ff444f', '#0ea5e9', '#f59e0b', '#8b5cf6', '#10b981', '#ec4899', '#06b6d4', '#eab308'];

const sentenceCase = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return value;
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

const markColor = (id: string): string => {
    let hash = 0;
    for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i)) % MARK_COLORS.length;
    return MARK_COLORS[hash];
};

type TFreeBotsDeskProps = {
    onLoadInBuilder: (strategy: FreeBotStrategy) => void;
    initialTier?: FreeBotsTier;
};

const FreeBotsDesk = ({ onLoadInBuilder, initialTier = 'free' }: TFreeBotsDeskProps) => {
    const [query, setQuery] = useState('');
    const [tier, setTier] = useState<Tier>(() => readFreeBotsTier() || initialTier);
    const [fresh, setFresh] = useState<Freshness>('all');

    const strategies = useMemo(() => {
        const q = query.trim().toLowerCase();
        return FREE_BOT_STRATEGIES.filter(bot => {
            const isPremium = bot.category === 'premium';
            if (tier === 'premium' && !isPremium) return false;
            if (tier === 'free' && isPremium) return false;
            if (fresh === 'new' && !bot.isNew) return false;
            if (fresh === 'normal' && bot.isNew) return false;
            if (!q) return true;
            return (
                bot.name.toLowerCase().includes(q) ||
                bot.summary.toLowerCase().includes(q) ||
                bot.tags.some(tag => tag.toLowerCase().includes(q))
            );
        });
    }, [fresh, query, tier]);

    const clearFilters = () => {
        setQuery('');
        setFresh('all');
    };

    return (
        <div data-testid='free-bots-desk' data-desk className='free-bots' data-scroll-pane>
            <header className='free-bots-toolbar'>
                <div className='free-bots-toolbar-tools'>
                    <div className='free-bots-segment'>
                        {(['free', 'premium'] as const).map(id => (
                            <button
                                key={id}
                                type='button'
                                className={classNames('free-bots-seg', tier === id && 'is-on')}
                                onClick={() => {
                                    setTier(id);
                                    writeFreeBotsTier(id);
                                }}
                            >
                                {id === 'free' ? 'Free' : 'Premium'}
                            </button>
                        ))}
                    </div>
                    <span className='free-bots-split' aria-hidden />
                    <div className='free-bots-segment'>
                        {(['all', 'new', 'normal'] as const).map(id => (
                            <button
                                key={id}
                                type='button'
                                className={classNames('free-bots-seg', fresh === id && 'is-on')}
                                onClick={() => setFresh(id)}
                            >
                                {id === 'all' ? 'All' : id === 'new' ? 'New' : 'Normal'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className='free-bots-toolbar-status'>
                    <label className='free-bots-search'>
                        <LabelPairedSearchSmRegularIcon width={14} height={14} />
                        <input
                            value={query}
                            onChange={event => setQuery(event.target.value)}
                            placeholder='Search bots'
                            aria-label='Search bots'
                        />
                    </label>
                    <span className='free-bots-count'>{strategies.length}</span>
                </div>
            </header>

            {strategies.length ? (
                <div className='free-bots-grid'>
                    {strategies.map(bot => (
                        <article
                            key={bot.id}
                            className={classNames('free-bots-card', bot.category === 'premium' && 'is-premium')}
                        >
                            <header className='free-bots-card-top'>
                                <h2>
                                    <i className='free-bots-mark' style={{ background: markColor(bot.id) }} aria-hidden />
                                    {sentenceCase(bot.name)}
                                </h2>
                                <div className='free-bots-card-marks'>
                                    {bot.isNew ? <span className='free-bots-new'>New</span> : null}
                                    <span className='free-bots-diff'>{DIFFICULTY[bot.difficulty]}</span>
                                </div>
                            </header>
                            <p className='free-bots-card-summary'>{bot.summary}</p>
                            <div className='free-bots-card-tags'>
                                {bot.markets.map(market => (
                                    <span key={market} className='free-bots-tag is-market'>
                                        {market}
                                    </span>
                                ))}
                                {bot.tags.map(tag => (
                                    <span key={tag} className='free-bots-tag'>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                            <button type='button' className='free-bots-load' onClick={() => onLoadInBuilder(bot)}>
                                Load bot
                            </button>
                        </article>
                    ))}
                </div>
            ) : (
                <div className='free-bots-empty'>
                    <p>No bots match this filter.</p>
                    <button type='button' className='free-bots-clear' onClick={clearFilters}>
                        Clear filters
                    </button>
                </div>
            )}
        </div>
    );
};

export default FreeBotsDesk;
