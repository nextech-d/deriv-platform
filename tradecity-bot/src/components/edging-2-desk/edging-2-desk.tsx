import { useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { BULK_TRADER_MARKETS } from '@/constants/bulk-markets';
import type { SettlementEvent } from '@/hooks/useBulkTrading';
import { analyzeFrequency, digitsFromQuotes, lastDigitFromQuote } from '@/utils/analysis-tool';
import { clampEdgingDuration, edging2Tone } from '@/utils/edging';
import { ticksForMarket } from '@/utils/tick-series';
import './edging-2-desk.scss';

export interface Edging2Tick {
    quote: number;
    epoch: number;
    symbol: string;
}

const WINDOW = 100;
const MIN_STAKE = 0.35;

interface Edging2DeskProps {
    symbol: string;
    onSymbolChange: (symbol: string) => void;
    tickHistory: Edging2Tick[];
    pipSize: number;
    isConnected: boolean;
    tradingLocked?: boolean;
    busy?: boolean;
    currency?: string;
    settlements?: SettlementEvent[];
    batchResults?: { batchId: number }[];
    onTrade?: (payload: {
        symbol: string;
        contractType: string;
        lastDigitPrediction: number;
        duration: number;
        durationUnit: string;
        amount: number;
    }) => void;
    notice?: string | null;
}

const Edging2Desk = ({
    symbol,
    onSymbolChange,
    tickHistory,
    pipSize,
    isConnected,
    tradingLocked = false,
    busy = false,
    currency = 'USD',
    settlements = [],
    batchResults = [],
    onTrade,
    notice = null,
}: Edging2DeskProps) => {
    const [stake, setStake] = useState(MIN_STAKE);
    const [duration, setDuration] = useState(1);
    const [selectedDigit, setSelectedDigit] = useState<number | null>(null);
    const [message, setMessage] = useState('');
    const [stats, setStats] = useState({ trades: 0, wins: 0, losses: 0, profit: 0 });

    const pendingRef = useRef(false);
    const settledSeenRef = useRef(0);
    const batchSeenRef = useRef(0);

    const ticks = useMemo(() => ticksForMarket(tickHistory, symbol), [tickHistory, symbol]);
    const samples = useMemo(() => digitsFromQuotes(ticks, WINDOW, pipSize), [ticks, pipSize]);
    const freq = useMemo(() => analyzeFrequency(samples), [samples]);
    const quote = ticks.at(-1)?.quote ?? null;
    const lastDigit = quote == null ? null : lastDigitFromQuote(quote, pipSize);

    const pcts = freq.counts.map(count => (freq.window ? Math.round((count / freq.window) * 100) : 0));
    const selectedPct = selectedDigit == null ? null : (pcts[selectedDigit] ?? 0);
    const suggest = selectedPct == null ? null : selectedPct >= 15 ? 'matches' : selectedPct < 10 ? 'differs' : null;

    const canTrade = Boolean(onTrade) && isConnected && !tradingLocked && !busy && selectedDigit != null;
    const winRate = stats.trades ? ((stats.wins / stats.trades) * 100).toFixed(2) : '0.00';

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
        setSelectedDigit(null);
    }, [symbol]);

    useEffect(() => {
        if (settlements.length <= settledSeenRef.current) return;
        const fresh = settlements.slice(settledSeenRef.current);
        settledSeenRef.current = settlements.length;
        setStats(prev =>
            fresh.reduce(
                (acc, settled) => ({
                    trades: acc.trades + 1,
                    wins: acc.wins + (settled.won ? 1 : 0),
                    losses: acc.losses + (settled.won ? 0 : 1),
                    profit: Number((acc.profit + settled.profit).toFixed(2)),
                }),
                prev
            )
        );
    }, [settlements]);

    // A batch finalises even when the buy failed, so it frees the next ticket.
    useEffect(() => {
        if (batchResults.length <= batchSeenRef.current) return;
        batchSeenRef.current = batchResults.length;
        pendingRef.current = false;
    }, [batchResults]);

    function play(side: 'matches' | 'differs') {
        if (selectedDigit == null) {
            setMessage('Pick a digit first.');
            return;
        }
        if (tradingLocked) {
            setMessage('Log in to your Deriv account to place trades.');
            return;
        }
        if (!onTrade || !isConnected) {
            setMessage('Waiting for the feed.');
            return;
        }
        if (pendingRef.current) return;
        pendingRef.current = true;
        onTrade({
            symbol,
            contractType: side === 'matches' ? 'DIGITMATCH' : 'DIGITDIFF',
            lastDigitPrediction: selectedDigit,
            duration,
            durationUnit: 't',
            amount: stake,
        });
        setMessage(`Sent ${side === 'matches' ? 'Matches' : 'Differs'} ${selectedDigit}.`);
    }

    return (
        <div className='edging2-desk-page'>
            <div className='edging2-desk'>
                <div className='edging2-desk__header'>
                    <h2>
                        <span aria-hidden='true'>📊</span> Edging 2 - Digit Analysis
                    </h2>
                    <p>Analyze digit patterns and trade based on statistical probability</p>
                </div>

                <div className='edging2-desk__controls'>
                    <div className='edging2-desk__field'>
                        <label htmlFor='edging2-symbol'>Symbol</label>
                        <select
                            id='edging2-symbol'
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
                    <div className='edging2-desk__field'>
                        <label htmlFor='edging2-stake'>Stake ({currency})</label>
                        <input
                            id='edging2-stake'
                            type='number'
                            min={MIN_STAKE}
                            step={0.05}
                            value={stake}
                            onChange={event =>
                                setStake(Math.max(MIN_STAKE, Number(event.target.value) || MIN_STAKE))
                            }
                        />
                    </div>
                    <div className='edging2-desk__field'>
                        <label htmlFor='edging2-duration'>Duration (ticks)</label>
                        <input
                            id='edging2-duration'
                            type='number'
                            min={1}
                            max={10}
                            value={duration}
                            onChange={event => setDuration(clampEdgingDuration(Number(event.target.value)))}
                        />
                    </div>
                    <div className='edging2-desk__field'>
                        <label>Current Tick</label>
                        <span className='edging2-desk__tick-badge'>
                            {quote == null ? '—' : quote.toFixed(pipSize)}
                        </span>
                    </div>
                </div>

                <div className='edging2-desk__section'>
                    <h3>Digit Analysis (Last {freq.window || WINDOW} Ticks)</h3>
                    <div className='edging2-desk__circles'>
                        {Array.from({ length: 10 }, (_, digit) => {
                            const pct = pcts[digit] ?? 0;
                            return (
                                <button
                                    key={digit}
                                    type='button'
                                    aria-pressed={selectedDigit === digit}
                                    className={classNames(
                                        'edging2-desk__circle',
                                        `edging2-desk__circle--${edging2Tone(pct)}`,
                                        {
                                            selected: selectedDigit === digit,
                                            'is-now': lastDigit === digit,
                                        }
                                    )}
                                    onClick={() => setSelectedDigit(digit)}
                                >
                                    <span className='edging2-desk__circle-digit'>{digit}</span>
                                    <span className='edging2-desk__circle-pct'>{pct}%</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className='edging2-desk__strategy-row'>
                    <div className='edging2-desk__section edging2-desk__strategy'>
                        <h3>
                            <span aria-hidden='true'>🎯</span> Trading Strategy
                        </h3>
                        <ul className='edging2-desk__legend'>
                            <li>
                                <strong>Click a digit</strong> to select it for trading
                            </li>
                            <li>
                                <i className='edging2-desk__dot edging2-desk__dot--green' />
                                <strong>Green digits (≥15%)</strong> - High frequency, good for MATCHES
                            </li>
                            <li>
                                <i className='edging2-desk__dot edging2-desk__dot--yellow' />
                                <strong>Yellow digits (10-14%)</strong> - Average frequency
                            </li>
                            <li>
                                <i className='edging2-desk__dot edging2-desk__dot--red' />
                                <strong>Red digits (&lt;10%)</strong> - Low frequency, good for DIFFERS
                            </li>
                        </ul>
                        <p className='edging2-desk__selected'>
                            Selected Digit: {selectedDigit ?? 'None'}
                            {selectedPct != null ? ` (${selectedPct}%)` : ''}
                            {suggest ? ` · bias ${suggest}` : ''}
                        </p>
                    </div>

                    <div className='edging2-desk__trade-btns'>
                        <button
                            type='button'
                            className={classNames('edging2-desk__btn edging2-desk__btn--matches', {
                                'is-lead': suggest === 'matches',
                            })}
                            disabled={!canTrade}
                            onClick={() => play('matches')}
                        >
                            <span aria-hidden='true'>🎯</span> MATCHES
                        </button>
                        <button
                            type='button'
                            className={classNames('edging2-desk__btn edging2-desk__btn--differs', {
                                'is-lead': suggest === 'differs',
                            })}
                            disabled={!canTrade}
                            onClick={() => play('differs')}
                        >
                            <span aria-hidden='true'>🎲</span> DIFFERS
                        </button>
                    </div>
                </div>

                {message ? <p className='edging2-desk__message'>{message}</p> : null}

                <div className='edging2-desk__section'>
                    <h3>Trading Statistics</h3>
                    <div className='edging2-desk__stats-grid'>
                        <div>
                            <label>Total Trades</label>
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
                            <label>Win Rate</label>
                            <strong>{winRate}%</strong>
                        </div>
                        <div>
                            <label>Total Profit</label>
                            <strong className={stats.profit >= 0 ? 'is-win' : 'is-lose'}>
                                {stats.profit >= 0 ? '+' : ''}
                                {stats.profit.toFixed(2)} {currency}
                            </strong>
                        </div>
                        <div>
                            <label>Hot / Cold</label>
                            <strong>
                                {freq.hot.length ? freq.hot.join(' ') : '—'} / {freq.cold.length ? freq.cold.join(' ') : '—'}
                            </strong>
                        </div>
                    </div>
                    <button
                        type='button'
                        className='edging2-desk__reset'
                        onClick={() => {
                            pendingRef.current = false;
                            setSelectedDigit(null);
                            setStats({ trades: 0, wins: 0, losses: 0, profit: 0 });
                        }}
                    >
                        Reset Statistics
                    </button>
                </div>

                <div className='edging2-desk__warning'>
                    Digit frequency describes what already happened and does not predict the next tick. Every digit
                    stays close to 10% over a long enough window, so treat a green or red reading as a short-term
                    imbalance rather than an edge.
                </div>
            </div>
        </div>
    );
};

export default Edging2Desk;
