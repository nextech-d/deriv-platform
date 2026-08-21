import { useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { BULK_TRADER_MARKETS } from '@/constants/bulk-markets';
import type { BatchResult, SettlementEvent } from '@/hooks/useBulkTrading';
import { lastDigitFromQuote } from '@/utils/analysis-tool';
import {
    FAST_AUTO_MODES,
    FAST_MIN_STAKE,
    FAST_TRADE_TYPES,
    clampFastDigit,
    clampFastDuration,
    clampFastStake,
    fastMartingaleStake,
    fastTradeKind,
    type FastAutoMode,
    type FastTradeType,
} from '@/utils/fast-trader';
import { ticksForMarket } from '@/utils/tick-series';
import './fast-trader-desk.scss';

export interface FastTick {
    quote: number;
    epoch: number;
    symbol: string;
}

interface FastTraderDeskProps {
    symbol: string;
    onSymbolChange: (symbol: string) => void;
    tickHistory: FastTick[];
    pipSize: number;
    isConnected: boolean;
    tradingLocked?: boolean;
    busy?: boolean;
    currency?: string;
    settlements?: SettlementEvent[];
    batchResults?: BatchResult[];
    /** Returns the batch id the purchased contract is grouped under. */
    onTrade?: (payload: {
        symbol: string;
        contractType: string;
        lastDigitPrediction?: number;
        duration: number;
        durationUnit: string;
        amount: number;
    }) => number | void;
    notice?: string | null;
}

const FastTraderDesk = ({
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
}: FastTraderDeskProps) => {
    const [activeType, setActiveType] = useState<FastTradeType>('even');
    const [digit, setDigit] = useState(5);
    const [stake, setStake] = useState(FAST_MIN_STAKE);
    const [duration, setDuration] = useState(1);
    const [useMartingale, setUseMartingale] = useState(true);
    const [mode, setMode] = useState<FastAutoMode>('trade_type');
    const [customType, setCustomType] = useState<FastTradeType>('over');
    const [customDigit, setCustomDigit] = useState(5);
    const [autoRunning, setAutoRunning] = useState(false);
    const [message, setMessage] = useState('');
    const [stats, setStats] = useState({ trades: 0, wins: 0, profit: 0, consecutiveLosses: 0 });

    const pendingRef = useRef(false);
    const skipEpochRef = useRef(0);
    const settledSeenRef = useRef(0);
    const batchSeenRef = useRef(0);

    const ticks = useMemo(() => ticksForMarket(tickHistory, symbol), [tickHistory, symbol]);
    const quote = ticks.at(-1)?.quote ?? null;
    const strip = ticks.slice(-10).map(tick => lastDigitFromQuote(tick.quote, pipSize));

    const kind = fastTradeKind(activeType);
    const autoKind = fastTradeKind(mode === 'custom' ? customType : activeType);
    const autoDigit = mode === 'custom' ? customDigit : digit;
    const nextStake = useMartingale ? fastMartingaleStake(stake, stats.consecutiveLosses) : clampFastStake(stake);
    const canTrade = Boolean(onTrade) && isConnected && !tradingLocked && !busy;
    const winRate = stats.trades ? Math.round((stats.wins / stats.trades) * 100) : 0;

    const markets = BULK_TRADER_MARKETS.some(item => item.id === symbol)
        ? BULK_TRADER_MARKETS
        : [{ id: symbol, label: symbol }, ...BULK_TRADER_MARKETS];

    useEffect(() => {
        if (!notice) return;
        setMessage(notice);
    }, [notice]);

    useEffect(() => {
        if (!message) return;
        const id = window.setTimeout(() => setMessage(''), 6000);
        return () => window.clearTimeout(id);
    }, [message]);

    // Switching market invalidates any ticket in flight for the old one.
    useEffect(() => {
        pendingRef.current = false;
        setAutoRunning(false);
    }, [symbol]);

    function fire(type: FastTradeType, prediction: number, size = nextStake) {
        if (tradingLocked) {
            setMessage('Log in to your Deriv account to place trades.');
            return;
        }
        if (!onTrade || !isConnected) {
            setMessage('Waiting for the feed.');
            return;
        }
        if (pendingRef.current) return;
        const contract = fastTradeKind(type);
        pendingRef.current = true;
        onTrade({
            symbol,
            contractType: contract.contract,
            duration,
            durationUnit: 't',
            amount: size,
            ...(contract.needsDigit ? { lastDigitPrediction: prediction } : {}),
        });
        setMessage(`Sent ${contract.label}${contract.needsDigit ? ` ${prediction}` : ''}.`);
    }

    // Trades, win rate and P/L come from settled contracts.
    useEffect(() => {
        if (settlements.length <= settledSeenRef.current) return;
        const fresh = settlements.slice(settledSeenRef.current);
        settledSeenRef.current = settlements.length;

        setStats(prev =>
            fresh.reduce(
                (acc, settled) => ({
                    trades: acc.trades + 1,
                    wins: acc.wins + (settled.won ? 1 : 0),
                    profit: Number((acc.profit + settled.profit).toFixed(2)),
                    consecutiveLosses: settled.won ? 0 : acc.consecutiveLosses + 1,
                }),
                prev
            )
        );
    }, [settlements]);

    /**
     * A batch finalises even when the buy never went through, so it — not the
     * settlement stream — is what frees the desk for the next ticket.
     */
    useEffect(() => {
        if (batchResults.length <= batchSeenRef.current) return;
        batchSeenRef.current = batchResults.length;
        pendingRef.current = false;
        skipEpochRef.current = ticks.at(-1)?.epoch ?? skipEpochRef.current;
    }, [batchResults, ticks]);

    // Auto fires one ticket per fresh tick, waiting for the previous to settle.
    useEffect(() => {
        if (!autoRunning || pendingRef.current || !canTrade) return;
        const epoch = ticks.at(-1)?.epoch ?? 0;
        if (!epoch || epoch <= skipEpochRef.current) return;
        skipEpochRef.current = epoch;
        fire(autoKind.id, autoDigit);
        // fire is stable enough for this edge trigger
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoRunning, canTrade, ticks, autoKind, autoDigit, nextStake, duration]);

    function resetSession() {
        pendingRef.current = false;
        setAutoRunning(false);
        setStats({ trades: 0, wins: 0, profit: 0, consecutiveLosses: 0 });
        setMessage('');
    }

    return (
        <div className='fast-trader-desk'>
            <div className='fast-trader-desk__card'>
                <header className='fast-trader-desk__header'>
                    <h2>
                        <span aria-hidden='true'>⚡</span> Fast Trader
                    </h2>
                    <button type='button' className='fast-trader-desk__reset-btn' onClick={resetSession}>
                        Reset
                    </button>
                </header>

                <div className='fast-trader-desk__digits-panel'>
                    <div className='fast-trader-desk__digits-row' aria-label='Recent digits'>
                        {strip.length ? (
                            strip.map((value, index) => (
                                <span
                                    key={`${index}-${value}`}
                                    className={classNames('fast-trader-desk__digit-box', {
                                        'is-now': index === strip.length - 1,
                                    })}
                                >
                                    {value}
                                </span>
                            ))
                        ) : (
                            <p className='fast-trader-desk__waiting'>Waiting on ticks for this market.</p>
                        )}
                    </div>
                </div>

                <div className='fast-trader-desk__type-tabs' role='tablist' aria-label='Trade type'>
                    {FAST_TRADE_TYPES.map(item => (
                        <button
                            key={item.id}
                            type='button'
                            role='tab'
                            aria-selected={activeType === item.id}
                            className={classNames('fast-trader-desk__type-tab', { active: activeType === item.id })}
                            onClick={() => setActiveType(item.id)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                <div className='fast-trader-desk__controls'>
                    <div className='fast-trader-desk__field'>
                        <label htmlFor='fast-symbol'>Symbol</label>
                        <select
                            id='fast-symbol'
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

                    <div className='fast-trader-desk__row'>
                        <div className='fast-trader-desk__field'>
                            <label htmlFor='fast-stake'>Stake ({currency})</label>
                            <input
                                id='fast-stake'
                                type='number'
                                min={FAST_MIN_STAKE}
                                step={0.05}
                                value={stake}
                                onChange={event => setStake(clampFastStake(Number(event.target.value)))}
                            />
                        </div>
                        <div className='fast-trader-desk__field'>
                            <label htmlFor='fast-duration'>Duration (ticks)</label>
                            <input
                                id='fast-duration'
                                type='number'
                                min={1}
                                max={10}
                                value={duration}
                                onChange={event => setDuration(clampFastDuration(Number(event.target.value)))}
                            />
                        </div>
                    </div>

                    {kind.needsDigit ? (
                        <div className='fast-trader-desk__row'>
                            <div className='fast-trader-desk__field'>
                                <label htmlFor='fast-digit'>
                                    {activeType === 'over' || activeType === 'under' ? 'Barrier' : 'Prediction'} (0-9)
                                </label>
                                <input
                                    id='fast-digit'
                                    type='number'
                                    min={0}
                                    max={9}
                                    value={digit}
                                    onChange={event => setDigit(clampFastDigit(Number(event.target.value)))}
                                />
                            </div>
                            <div className='fast-trader-desk__field fast-trader-desk__field--ghost' aria-hidden='true' />
                        </div>
                    ) : null}

                    <div className='fast-trader-desk__row'>
                        <div className='fast-trader-desk__field fast-trader-desk__field--toggle'>
                            <label htmlFor='fast-martingale'>Martingale</label>
                            <button
                                id='fast-martingale'
                                type='button'
                                role='switch'
                                aria-checked={useMartingale}
                                className={classNames('fast-trader-desk__toggle', { on: useMartingale })}
                                onClick={() => setUseMartingale(value => !value)}
                            >
                                <span className='fast-trader-desk__toggle-thumb' />
                            </button>
                        </div>
                        <div className='fast-trader-desk__field'>
                            <label htmlFor='fast-mode'>Mode</label>
                            <select
                                id='fast-mode'
                                value={mode}
                                onChange={event => setMode(event.target.value as FastAutoMode)}
                            >
                                {FAST_AUTO_MODES.map(item => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {mode === 'custom' ? (
                        <div className='fast-trader-desk__row'>
                            <div className='fast-trader-desk__field'>
                                <label htmlFor='fast-custom-type'>Auto contract</label>
                                <select
                                    id='fast-custom-type'
                                    value={customType}
                                    onChange={event => setCustomType(event.target.value as FastTradeType)}
                                >
                                    {FAST_TRADE_TYPES.map(item => (
                                        <option key={item.id} value={item.id}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className='fast-trader-desk__field'>
                                <label htmlFor='fast-custom-digit'>Auto barrier (0-9)</label>
                                <input
                                    id='fast-custom-digit'
                                    type='number'
                                    min={0}
                                    max={9}
                                    disabled={!fastTradeKind(customType).needsDigit}
                                    value={customDigit}
                                    onChange={event => setCustomDigit(clampFastDigit(Number(event.target.value)))}
                                />
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className='fast-trader-desk__actions'>
                    <button
                        type='button'
                        className='fast-trader-desk__btn fast-trader-desk__btn--trade'
                        disabled={!canTrade || autoRunning}
                        onClick={() => fire(activeType, digit)}
                    >
                        <span aria-hidden='true'>📈</span> Trade Now
                    </button>
                    <button
                        type='button'
                        className='fast-trader-desk__btn fast-trader-desk__btn--auto'
                        disabled={!canTrade && !autoRunning}
                        onClick={() => {
                            if (autoRunning) {
                                setAutoRunning(false);
                                setMessage('Auto trading stopped.');
                                return;
                            }
                            skipEpochRef.current = ticks.at(-1)?.epoch ?? 0;
                            setAutoRunning(true);
                            setMessage('Auto trading started.');
                        }}
                    >
                        <span aria-hidden='true'>🔄</span> {autoRunning ? 'Stop Auto' : 'Start Auto'}
                    </button>
                </div>

                {message ? <p className='fast-trader-desk__message'>{message}</p> : null}

                <div className='fast-trader-desk__summary-bar'>
                    <div>
                        <span className='fast-trader-desk__stat-label'>Current tick</span>
                        <span className='fast-trader-desk__stat-value'>
                            {quote == null ? '—' : quote.toFixed(pipSize)}
                        </span>
                    </div>
                    <div>
                        <span className='fast-trader-desk__stat-label'>Trades</span>
                        <span className='fast-trader-desk__stat-value'>{stats.trades}</span>
                    </div>
                    <div>
                        <span className='fast-trader-desk__stat-label'>Win rate</span>
                        <span className='fast-trader-desk__stat-value'>{winRate}%</span>
                    </div>
                    <div>
                        <span className='fast-trader-desk__stat-label'>Profit</span>
                        <span
                            className={classNames(
                                'fast-trader-desk__stat-value',
                                stats.profit >= 0 ? 'is-up' : 'is-down'
                            )}
                        >
                            {stats.profit >= 0 ? '+' : ''}
                            {stats.profit.toFixed(2)} {currency}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FastTraderDesk;
