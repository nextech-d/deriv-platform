import { useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { BULK_TRADER_MARKETS } from '@/constants/bulk-markets';
import type { BatchResult } from '@/hooks/useBulkTrading';
import { lastDigitFromQuote } from '@/utils/analysis-tool';
import {
    EDGING_LOSE_DIGITS,
    EDGING_MIN_TOTAL,
    EDGING_OVER_BARRIER,
    EDGING_UNDER_BARRIER,
    clampEdgingDuration,
    clampEdgingTotal,
    edgingFrequency,
    edgingMartingaleStake,
    edgingWins,
    perLegStake,
} from '@/utils/edging';
import { ticksForMarket } from '@/utils/tick-series';
import './edging-desk.scss';

export interface EdgingTick {
    quote: number;
    epoch: number;
    symbol: string;
}

const WINDOW = 20;

interface EdgingDeskProps {
    symbol: string;
    onSymbolChange: (symbol: string) => void;
    tickHistory: EdgingTick[];
    pipSize: number;
    isConnected: boolean;
    tradingLocked?: boolean;
    busy?: boolean;
    currency?: string;
    batchResults?: BatchResult[];
    /** Places both legs of the pair; each leg is bought separately. */
    onTrade?: (payload: { symbol: string; perLeg: number; duration: number }) => void;
    notice?: string | null;
}

const EdgingDesk = ({
    symbol,
    onSymbolChange,
    tickHistory,
    pipSize,
    isConnected,
    tradingLocked = false,
    busy = false,
    currency = 'USD',
    batchResults = [],
    onTrade,
    notice = null,
}: EdgingDeskProps) => {
    const [stake, setStake] = useState(EDGING_MIN_TOTAL);
    const [duration, setDuration] = useState(1);
    const [mode, setMode] = useState<'manual' | 'auto'>('manual');
    const [useMartingale, setUseMartingale] = useState(true);
    const [stopAfter, setStopAfter] = useState(3);
    const [message, setMessage] = useState('');
    const [stats, setStats] = useState({ trades: 0, wins: 0, losses: 0, profit: 0, consecutiveLosses: 0 });

    const pendingRef = useRef(false);
    const skipEpochRef = useRef(0);
    const batchSeenRef = useRef(0);
    // Each pair settles as two batches (Over leg, Under leg).
    const legBufferRef = useRef<BatchResult[]>([]);

    const ticks = useMemo(() => ticksForMarket(tickHistory, symbol), [tickHistory, symbol]);
    const quote = ticks.at(-1)?.quote ?? null;
    const digits = useMemo(
        () => ticks.slice(-WINDOW).map(tick => lastDigitFromQuote(tick.quote, pipSize)),
        [ticks, pipSize]
    );
    const lastDigit = quote == null ? null : lastDigitFromQuote(quote, pipSize);
    const freqs = useMemo(() => edgingFrequency(digits), [digits]);

    const nextStake = useMartingale ? edgingMartingaleStake(stake, stats.consecutiveLosses) : clampEdgingTotal(stake);
    const perContract = perLegStake(nextStake);
    const canTrade = Boolean(onTrade) && isConnected && !tradingLocked && !busy;
    const winRate = stats.trades ? ((stats.wins / stats.trades) * 100).toFixed(2) : '0.00';
    const cover = digits.filter(edgingWins).length;

    const markets = BULK_TRADER_MARKETS.some(item => item.id === symbol)
        ? BULK_TRADER_MARKETS
        : [{ id: symbol, label: symbol }, ...BULK_TRADER_MARKETS];

    useEffect(() => {
        if (notice) setMessage(notice);
    }, [notice]);

    useEffect(() => {
        if (!message) return;
        const id = window.setTimeout(() => setMessage(''), 6000);
        return () => window.clearTimeout(id);
    }, [message]);

    useEffect(() => {
        pendingRef.current = false;
        legBufferRef.current = [];
        setMode('manual');
    }, [symbol]);

    function fire(total = nextStake) {
        if (tradingLocked) {
            setMessage('Log in to your Deriv account to place the pair.');
            return;
        }
        if (!onTrade || !isConnected) {
            setMessage('Waiting for the feed.');
            return;
        }
        if (pendingRef.current) return;
        pendingRef.current = true;
        legBufferRef.current = [];
        onTrade({ symbol, perLeg: perLegStake(total), duration });
    }

    /**
     * Both legs settle as separate batches, so a pair is only complete once two
     * have landed. Profit is the net of the two legs, which is what decides a
     * cover from a kill.
     */
    useEffect(() => {
        if (batchResults.length <= batchSeenRef.current) return;
        const fresh = batchResults.slice(batchSeenRef.current);
        batchSeenRef.current = batchResults.length;

        const pairs: { profit: number; won: boolean }[] = [];
        for (const leg of fresh) {
            legBufferRef.current.push(leg);
            if (legBufferRef.current.length < 2) continue;
            const [first, second] = legBufferRef.current;
            const profit = Number((first!.profit + second!.profit).toFixed(2));
            pairs.push({ profit, won: profit > 0 });
            legBufferRef.current = [];
        }
        if (!pairs.length) return;

        pendingRef.current = false;
        skipEpochRef.current = ticks.at(-1)?.epoch ?? skipEpochRef.current;

        const next = pairs.reduce(
            (acc, pair) => ({
                trades: acc.trades + 1,
                wins: acc.wins + (pair.won ? 1 : 0),
                losses: acc.losses + (pair.won ? 0 : 1),
                profit: Number((acc.profit + pair.profit).toFixed(2)),
                consecutiveLosses: pair.won ? 0 : acc.consecutiveLosses + 1,
            }),
            stats
        );
        setStats(next);
        if (mode === 'auto' && stopAfter > 0 && next.consecutiveLosses >= stopAfter) {
            setMode('manual');
            setMessage(`Auto stopped after ${next.consecutiveLosses} kills in a row.`);
        }
    }, [batchResults, ticks, mode, stopAfter, stats]);

    useEffect(() => {
        if (mode !== 'auto' || pendingRef.current || !canTrade) return;
        const epoch = ticks.at(-1)?.epoch ?? 0;
        if (!epoch || epoch <= skipEpochRef.current) return;
        skipEpochRef.current = epoch;
        fire(nextStake);
        // fire is stable enough for this edge trigger
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, canTrade, ticks, nextStake, duration]);

    return (
        <div className='edging-desk-page'>
            <div className='edging-desk'>
                <div className='edging-desk__controls'>
                    <div className='edging-desk__field'>
                        <label htmlFor='edging-symbol'>Symbol</label>
                        <select
                            id='edging-symbol'
                            value={symbol}
                            onChange={event => onSymbolChange(event.target.value)}
                        >
                            {markets.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className='edging-desk__field'>
                        <label htmlFor='edging-stake'>Total stake ({currency})</label>
                        <input
                            id='edging-stake'
                            type='number'
                            min={EDGING_MIN_TOTAL}
                            step={0.1}
                            value={stake}
                            onChange={event => setStake(clampEdgingTotal(Number(event.target.value)))}
                        />
                        <span className='edging-desk__hint'>
                            Per leg {perContract.toFixed(2)} {currency}
                        </span>
                    </div>
                    <div className='edging-desk__field'>
                        <label htmlFor='edging-duration'>Duration (ticks)</label>
                        <input
                            id='edging-duration'
                            type='number'
                            min={1}
                            max={10}
                            value={duration}
                            onChange={event => setDuration(clampEdgingDuration(Number(event.target.value)))}
                        />
                        <span className='edging-desk__hint'>1-10 ticks</span>
                    </div>
                    <div className='edging-desk__field'>
                        <label htmlFor='edging-stop'>Stop after</label>
                        <input
                            id='edging-stop'
                            type='number'
                            min={0}
                            max={10}
                            value={stopAfter}
                            onChange={event =>
                                setStopAfter(Math.max(0, Math.min(10, Number(event.target.value) || 0)))
                            }
                        />
                        <span className='edging-desk__hint'>{stopAfter ? `${stopAfter} kills` : 'No auto stop'}</span>
                    </div>
                    <div className='edging-desk__field edging-desk__field--check'>
                        <label htmlFor='edging-martingale'>Martingale</label>
                        <input
                            id='edging-martingale'
                            type='checkbox'
                            checked={useMartingale}
                            onChange={event => setUseMartingale(event.target.checked)}
                        />
                        <span className='edging-desk__hint'>Doubles after a kill</span>
                    </div>
                    <div className='edging-desk__field'>
                        <label>Last digit</label>
                        <span
                            className={classNames('edging-desk__digit', {
                                'is-lose': lastDigit != null && EDGING_LOSE_DIGITS.has(lastDigit),
                                'is-win': lastDigit != null && edgingWins(lastDigit),
                            })}
                        >
                            {lastDigit ?? '—'}
                        </span>
                        <span className='edging-desk__hint'>
                            {quote == null ? 'Waiting' : `${quote.toFixed(pipSize)} · ${cover}/${digits.length} cover`}
                        </span>
                    </div>
                </div>

                <div className='edging-desk__mode-tabs' role='tablist' aria-label='Edging mode'>
                    {(['manual', 'auto'] as const).map(item => (
                        <button
                            key={item}
                            type='button'
                            role='tab'
                            aria-selected={mode === item}
                            className={classNames({ active: mode === item })}
                            onClick={() => {
                                if (item === 'auto') skipEpochRef.current = ticks.at(-1)?.epoch ?? 0;
                                setMode(item);
                            }}
                        >
                            {item === 'manual' ? 'Manual' : 'Auto'}
                        </button>
                    ))}
                </div>

                <button
                    type='button'
                    className='edging-desk__buy-btn'
                    disabled={!canTrade || mode === 'auto'}
                    onClick={() => fire()}
                >
                    Buy Over {EDGING_OVER_BARRIER} &amp; Under {EDGING_UNDER_BARRIER} · {nextStake.toFixed(2)} {currency}
                </button>

                {message ? <p className='edging-desk__message'>{message}</p> : null}

                <div className='edging-desk__section'>
                    <h3>Last {WINDOW} digits</h3>
                    <div className='edging-desk__digits-row'>
                        {digits.length ? (
                            digits.map((digit, index) => (
                                <span
                                    key={`${index}-${digit}`}
                                    className={classNames('edging-desk__digit-pill', {
                                        winning: edgingWins(digit),
                                        losing: !edgingWins(digit),
                                    })}
                                >
                                    {digit}
                                </span>
                            ))
                        ) : (
                            <p className='edging-desk__hint'>Waiting for ticks.</p>
                        )}
                    </div>
                </div>

                <div className='edging-desk__section'>
                    <h3>Statistics</h3>
                    <div className='edging-desk__stats-grid'>
                        <div>
                            <label>Trades</label>
                            <strong>{stats.trades}</strong>
                        </div>
                        <div>
                            <label>Wins</label>
                            <strong className='is-win'>{stats.wins}</strong>
                        </div>
                        <div>
                            <label>Losses</label>
                            <strong className='is-lose'>{stats.losses}</strong>
                        </div>
                        <div>
                            <label>Win rate</label>
                            <strong>{winRate}%</strong>
                        </div>
                        <div>
                            <label>Profit</label>
                            <strong className={stats.profit >= 0 ? 'is-win' : 'is-lose'}>
                                {stats.profit >= 0 ? '+' : ''}
                                {stats.profit.toFixed(2)} {currency}
                            </strong>
                        </div>
                        <div>
                            <label>Kills in a row</label>
                            <strong>{stats.consecutiveLosses}</strong>
                        </div>
                    </div>
                    <button
                        type='button'
                        className='edging-desk__reset-btn'
                        onClick={() => {
                            pendingRef.current = false;
                            legBufferRef.current = [];
                            setMode('manual');
                            setStats({ trades: 0, wins: 0, losses: 0, profit: 0, consecutiveLosses: 0 });
                        }}
                    >
                        Reset
                    </button>
                </div>

                <div className='edging-desk__section'>
                    <h3>Frequency</h3>
                    <div className='edging-desk__freq-list'>
                        {freqs.map((count, digit) => (
                            <div key={digit} className='edging-desk__freq-row'>
                                <label>Digit {digit}:</label>
                                <span>{count}</span>
                                <i className='edging-desk__freq-track'>
                                    <b
                                        className={classNames('edging-desk__freq-bar', {
                                            'is-lose': EDGING_LOSE_DIGITS.has(digit),
                                        })}
                                        style={{ width: digits.length ? `${(count / digits.length) * 100}%` : '0%' }}
                                    />
                                </i>
                            </div>
                        ))}
                    </div>
                </div>

                <div className='edging-desk__info'>
                    <h3>How it works</h3>
                    Buys Over {EDGING_OVER_BARRIER} and Under {EDGING_UNDER_BARRIER} together. 0–3 pays Under, 6–9
                    pays Over. Both lose only on {EDGING_UNDER_BARRIER} and {EDGING_OVER_BARRIER}.
                </div>
            </div>
        </div>
    );
};

export default EdgingDesk;
