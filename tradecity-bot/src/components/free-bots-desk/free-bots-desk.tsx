import { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { FREE_BOT_STRATEGIES, type FreeBotStrategy } from '@/constants/free-bots';
import {
    readFreeBotsTier,
    tradingBotsTierLabel,
    TRADING_BOTS_TIER_EVENT,
    writeFreeBotsTier,
    type FreeBotsTier,
} from '@/utils/free-bots-tier';
import { LabelPairedSearchSmRegularIcon } from '@deriv/quill-icons/LabelPaired';
import './free-bots-desk.scss';

type Tier = 'free' | 'premium';
type Freshness = 'all' | 'new' | 'normal';

const DIFFICULTY: Record<FreeBotStrategy['difficulty'], string> = {
    starter: 'Starter',
    standard: 'Standard',
    advanced: 'Advanced',
};

const sentenceCase = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return value;
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

type TFreeBotsDeskProps = {
    onLoadInBuilder: (strategy: FreeBotStrategy) => void;
    initialTier?: FreeBotsTier;
};

const FreeBotsDesk = ({ onLoadInBuilder, initialTier = 'free' }: TFreeBotsDeskProps) => {
    const [query, setQuery] = useState('');
    const [tier, setTier] = useState<Tier>(() => readFreeBotsTier() || initialTier);
    const [fresh, setFresh] = useState<Freshness>('all');

    useEffect(() => {
        const sync = (event?: Event) => {
            const fromEvent = (event as CustomEvent<FreeBotsTier> | undefined)?.detail;
            const next = fromEvent === 'free' || fromEvent === 'premium' ? fromEvent : readFreeBotsTier();
            if (next) setTier(next);
        };
        window.addEventListener(TRADING_BOTS_TIER_EVENT, sync);
        return () => window.removeEventListener(TRADING_BOTS_TIER_EVENT, sync);
    }, []);

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
                <div className='free-bots-toolbar-cluster'>
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
                                    {tradingBotsTierLabel(id)}
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
                </div>
            </header>

            {strategies.length ? (
                <div className='free-bots-grid'>
                    {strategies.map(bot => (
                        <article
                            key={bot.id}
                            className={classNames('free-bots-card', bot.category === 'premium' && 'is-premium')}
                            data-accent={bot.category === 'premium' ? 'premium' : 'standard'}
                        >
                            <span className='free-bots-card-icon' aria-hidden />
                            <header className='free-bots-card-top'>
                                <h2>{sentenceCase(bot.name)}</h2>
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
