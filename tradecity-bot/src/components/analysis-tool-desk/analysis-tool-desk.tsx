import { useMemo, useState } from 'react';
import classNames from 'classnames';
import { ANALYSIS_DCIRCLE_SYMBOLS, analysisMarketMeta } from '@/constants/analysis-markets';
import {
    analyzeBarrier,
    analyzeFrequency,
    analyzeMatches,
    analyzeParity,
    digitsFromQuotes,
    type AnalysisMode,
} from '@/utils/analysis-tool';
import './analysis-tool-desk.scss';

export interface AnalysisBias {
    mode: AnalysisMode;
    side: 'CALL' | 'PUT';
    barrier?: number;
    digitTarget?: number;
    label: string;
}

interface AnalysisToolDeskProps {
    symbol: string;
    quotes: Array<{ quote: number; epoch?: number; symbol?: string }>;
    pipSizes?: Record<string, number>;
    /** Symbols currently streaming ticks; drives the per-card scan state. */
    scanning: Set<string>;
    onToggleScan: (symbol: string) => void;
    onToggleScanAll: () => void;
    onSymbolChange?: (symbol: string) => void;
    onTradeBias?: (bias: AnalysisBias) => void;
    onSendToBuilder?: (bias: AnalysisBias) => void;
}

const TICK_WINDOWS = [30, 60, 100, 120, 240, 500, 1000];
const DCIRCLE_SYMBOLS = [...ANALYSIS_DCIRCLE_SYMBOLS];
const STRIP_LIMIT = 48;
const STRONG_PCT = 13;
const MODES: Array<{ id: AnalysisMode; label: string }> = [
    { id: 'parity', label: 'Parity' },
    { id: 'barrier', label: 'Barrier' },
    { id: 'matches', label: 'Matches' },
    { id: 'frequency', label: 'Frequency' },
];

type DigitRank = 'hot' | 'warm' | 'cool' | 'cold' | null;

const EMPTY_COUNTS = Array.from({ length: 10 }, () => 0);
const MARK_COLORS = ['#fb7185', '#0ea5e9', '#f59e0b', '#8b5cf6', '#10b981', '#ec4899', '#06b6d4', '#eab308'];

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

function digitRanks(counts: number[]): Record<number, DigitRank> {
    const ranked = counts
        .map((count, digit) => ({ digit, count }))
        .sort((a, b) => b.count - a.count || a.digit - b.digit);
    const rank: Record<number, DigitRank> = {};
    if (ranked[0]) rank[ranked[0].digit] = 'hot';
    if (ranked[1]) rank[ranked[1].digit] = 'warm';
    if (ranked[ranked.length - 2]) rank[ranked[ranked.length - 2]!.digit] = 'cool';
    if (ranked[ranked.length - 1]) rank[ranked[ranked.length - 1]!.digit] = 'cold';
    return rank;
}

function maxPct(counts: number[]): number {
    const total = counts.reduce((a, b) => a + b, 0) || 1;
    return (Math.max(...counts) / total) * 100;
}

const AnalysisToolDesk = ({
    symbol,
    quotes,
    pipSizes = {},
    scanning,
    onToggleScan,
    onToggleScanAll,
    onSymbolChange,
    onTradeBias,
    onSendToBuilder,
}: AnalysisToolDeskProps) => {
    const [view, setView] = useState<'dcircle' | 'analysis'>('dcircle');
    const [ticks, setTicks] = useState(120);
    const [mode, setMode] = useState<AnalysisMode>('parity');
    const [barrier, setBarrier] = useState(4);
    const [matchTarget, setMatchTarget] = useState(5);

    const pipFor = (id: string) => pipSizes[id] ?? 2;

    const tagged = quotes.some(tick => tick.symbol);
    const liveDigits = useMemo(() => {
        const series = tagged ? quotes.filter(tick => tick.symbol === symbol) : quotes;
        return digitsFromQuotes(series, ticks, pipFor(symbol));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quotes, ticks, symbol, tagged, pipSizes]);
    const liveFreq = useMemo(() => analyzeFrequency(liveDigits), [liveDigits]);
    const parity = useMemo(() => analyzeParity(liveDigits), [liveDigits]);
    const barrierStats = useMemo(() => analyzeBarrier(liveDigits, barrier), [barrier, liveDigits]);
    const matches = useMemo(() => analyzeMatches(liveDigits, matchTarget), [liveDigits, matchTarget]);
    const strip = liveDigits.slice(-STRIP_LIMIT);

    const marketRows = useMemo(
        () =>
            DCIRCLE_SYMBOLS.map(id => {
                const series = tagged ? quotes.filter(tick => tick.symbol === id) : id === symbol ? quotes : [];
                const freq = analyzeFrequency(digitsFromQuotes(series, ticks, pipFor(id)));
                const live = freq.window > 0;
                const counts = live ? freq.counts : EMPTY_COUNTS;
                return {
                    id,
                    counts,
                    live,
                    strong: live && maxPct(counts) >= STRONG_PCT,
                };
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [quotes, symbol, tagged, ticks, pipSizes]
    );
    const strongCount = marketRows.filter(row => row.strong).length;
    const allScanning = scanning.size === DCIRCLE_SYMBOLS.length;

    function openAnalysis(id: string, digit?: number) {
        onSymbolChange?.(id);
        if (digit != null) {
            setMatchTarget(digit);
            setMode('matches');
        }
        setView('analysis');
    }

    function currentBias(): AnalysisBias {
        if (mode === 'parity') {
            const evenLeads = parity.evenPct >= parity.oddPct;
            return {
                mode,
                side: evenLeads ? 'CALL' : 'PUT',
                barrier,
                digitTarget: matchTarget,
                label: evenLeads ? `Even ${parity.evenPct.toFixed(1)}%` : `Odd ${parity.oddPct.toFixed(1)}%`,
            };
        }
        if (mode === 'barrier') {
            const overLeads = barrierStats.overPct >= barrierStats.underPct;
            return {
                mode,
                side: overLeads ? 'CALL' : 'PUT',
                barrier,
                digitTarget: barrier,
                label: overLeads
                    ? `Over ${barrier} · ${barrierStats.overPct.toFixed(1)}%`
                    : `Under ${barrier} · ${barrierStats.underPct.toFixed(1)}%`,
            };
        }
        const target = mode === 'frequency' ? (liveFreq.hot[0] ?? matchTarget) : matchTarget;
        const matchPct = mode === 'frequency' ? analyzeMatches(liveDigits, target).matchPct : matches.matchPct;
        return {
            mode: 'matches',
            side: 'CALL',
            barrier,
            digitTarget: target,
            label: `Matches ${target} · ${matchPct.toFixed(1)}%`,
        };
    }

    function pickDigit(digit: number) {
        if (mode === 'barrier') setBarrier(digit);
        else setMatchTarget(digit);
    }

    const symbolLabel = analysisMarketMeta(symbol)?.label ?? symbol;
    const lastDigit = parity.lastDigit;
    const bias = currentBias();

    return (
        <div data-testid='analysis-tool-desk' data-desk className='analysis-tool' data-scroll-pane>
            <header className='analysis-tool-toolbar'>
                <div className='analysis-tool-toolbar-cluster'>
                    <div className='analysis-tool-toolbar-tools'>
                        <div className='analysis-tool-segment'>
                            {(['dcircle', 'analysis'] as const).map(id => (
                                <button
                                    key={id}
                                    type='button'
                                    className={classNames('analysis-tool-seg', view === id && 'is-on')}
                                    onClick={() => setView(id)}
                                >
                                    {id === 'dcircle' ? 'Dcircle' : 'Analysis'}
                                </button>
                            ))}
                        </div>
                        <span className='analysis-tool-rule' aria-hidden />
                        <div className='analysis-tool-segment'>
                            {TICK_WINDOWS.map(n => (
                                <button
                                    key={n}
                                    type='button'
                                    className={classNames('analysis-tool-seg', ticks === n && 'is-on')}
                                    onClick={() => setTicks(n)}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                        {view === 'analysis' ? (
                            <>
                                <span className='analysis-tool-rule' aria-hidden />
                                <div className='analysis-tool-segment'>
                                    {MODES.map(item => (
                                        <button
                                            key={item.id}
                                            type='button'
                                            className={classNames('analysis-tool-seg', mode === item.id && 'is-on')}
                                            onClick={() => setMode(item.id)}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : null}
                    </div>
                    <div className='analysis-tool-toolbar-status'>
                        {view === 'dcircle' ? (
                            <div className='analysis-tool-legend'>
                                <span className='is-hot'>Most</span>
                                <span className='is-warm'>2nd most</span>
                                <span className='is-cool'>2nd least</span>
                                <span className='is-cold'>Least</span>
                            </div>
                        ) : (
                            <span className='analysis-tool-chip'>{sentenceCase(symbolLabel)}</span>
                        )}
                        <span className='analysis-tool-count'>{strongCount}</span>
                        {view === 'dcircle' ? (
                            <button type='button' className='analysis-tool-strip-cta' onClick={onToggleScanAll}>
                                {allScanning ? 'Stop' : 'Scan all'}
                            </button>
                        ) : null}
                    </div>
                </div>
            </header>

            {view === 'dcircle' ? (
                <div className='analysis-tool-grid'>
                    {marketRows.map(row => {
                        const meta = analysisMarketMeta(row.id);
                        const total = row.counts.reduce((a, b) => a + b, 0) || 1;
                        const ranks = digitRanks(row.counts);
                        const scanningNow = scanning.has(row.id);
                        const title = sentenceCase(meta?.shortLabel ?? row.id);
                        return (
                            <article
                                key={row.id}
                                className={classNames(
                                    'analysis-tool-card',
                                    (scanningNow || row.id === symbol) && 'is-on',
                                    row.strong && 'is-strong'
                                )}
                            >
                                <header className='analysis-tool-card-top'>
                                    <h2>
                                        <i
                                            className='analysis-tool-mark'
                                            style={{ background: markColor(row.id) }}
                                            aria-hidden
                                        />
                                        <button type='button' onClick={() => openAnalysis(row.id)}>
                                            {title}
                                        </button>
                                    </h2>
                                    <div className='analysis-tool-card-marks'>
                                        {row.strong ? <span className='analysis-tool-pill is-hot'>Strong</span> : null}
                                        <span className='analysis-tool-pill'>{row.live ? 'Live' : 'Waiting'}</span>
                                    </div>
                                </header>
                                <p className='analysis-tool-card-summary'>
                                    {sentenceCase(meta?.label ?? row.id)}
                                    {row.live ? ` · ${ticks} ticks` : ' · Waiting for ticks'}
                                    {scanningNow ? ' · Scanning' : ''}
                                </p>
                                <div className='analysis-tool-digits'>
                                    {row.counts.map((count, digit) => (
                                        <button
                                            key={digit}
                                            type='button'
                                            className='analysis-tool-digit'
                                            onClick={() => openAnalysis(row.id, digit)}
                                            title={`Analyze ${meta?.shortLabel ?? row.id} · ${digit}`}
                                        >
                                            <span className={classNames(ranks[digit] && `is-${ranks[digit]}`)}>
                                                {digit}
                                            </span>
                                            <small>{((count / total) * 100).toFixed(1)}%</small>
                                        </button>
                                    ))}
                                </div>
                                <button
                                    type='button'
                                    className='analysis-tool-load'
                                    onClick={() => onToggleScan(row.id)}
                                >
                                    {scanningNow ? 'Stop' : 'Scan'}
                                </button>
                            </article>
                        );
                    })}
                </div>
            ) : (
                <div className='analysis-tool-work'>
                    <article className='analysis-tool-card'>
                        <header className='analysis-tool-card-top'>
                            <h2>
                                <i
                                    className='analysis-tool-mark'
                                    style={{ background: markColor(symbol) }}
                                    aria-hidden
                                />
                                {sentenceCase(analysisMarketMeta(symbol)?.shortLabel ?? symbol)}
                            </h2>
                            <div className='analysis-tool-card-marks'>
                                <span className='analysis-tool-pill'>{ticks} ticks</span>
                            </div>
                        </header>
                        <p className='analysis-tool-card-summary'>
                            {sentenceCase(symbolLabel)} · Even {parity.evenPct.toFixed(1)}% / Odd{' '}
                            {parity.oddPct.toFixed(1)}% · Over {barrier} {barrierStats.overPct.toFixed(1)}% · Match{' '}
                            {matchTarget} {matches.matchPct.toFixed(1)}%
                        </p>
                        <div className='analysis-tool-bar' aria-hidden>
                            <i className='is-even' style={{ width: `${parity.evenPct}%` }} />
                            <i className='is-odd' style={{ width: `${parity.oddPct}%` }} />
                        </div>
                        <div className='analysis-tool-strip' aria-label='Recent last digits'>
                            {strip.length ? (
                                strip.map((sample, i) => (
                                    <span
                                        key={`${sample.epoch ?? i}-${i}`}
                                        className={classNames(sample.digit % 2 === 0 ? 'is-even' : 'is-odd')}
                                    >
                                        {sample.digit}
                                    </span>
                                ))
                            ) : (
                                <em>Waiting for ticks…</em>
                            )}
                        </div>
                        {liveDigits.length > STRIP_LIMIT ? (
                            <p className='analysis-tool-strip-note'>
                                Last {STRIP_LIMIT} of {liveDigits.length}
                            </p>
                        ) : null}
                        <div className='analysis-tool-stats'>
                            {mode === 'parity' ? (
                                <>
                                    <Stat
                                        label='Even'
                                        value={`${parity.evenPct.toFixed(1)}%`}
                                        sub={`${parity.evenCount} ticks`}
                                    />
                                    <Stat
                                        label='Odd'
                                        value={`${parity.oddPct.toFixed(1)}%`}
                                        sub={`${parity.oddCount} ticks`}
                                    />
                                    <Stat
                                        label='Streak'
                                        value={parity.streakLength ? String(parity.streakLength) : '—'}
                                        sub={parity.streakSide ?? 'no run'}
                                    />
                                    <Stat
                                        label='Last digit'
                                        value={lastDigit == null ? '—' : String(lastDigit)}
                                        sub={`${parity.window} window`}
                                    />
                                </>
                            ) : null}
                            {mode === 'barrier' ? (
                                <>
                                    <Stat
                                        label={`Over ${barrier}`}
                                        value={`${barrierStats.overPct.toFixed(1)}%`}
                                        sub={`${barrierStats.overCount} ticks`}
                                    />
                                    <Stat
                                        label={`Under ${barrier}`}
                                        value={`${barrierStats.underPct.toFixed(1)}%`}
                                        sub={`${barrierStats.underCount} ticks`}
                                    />
                                    <label className='analysis-tool-field'>
                                        <span>Barrier</span>
                                        <select
                                            value={barrier}
                                            onChange={event => setBarrier(Number(event.target.value))}
                                            aria-label='Barrier digit'
                                        >
                                            {Array.from({ length: 10 }, (_, d) => (
                                                <option key={d} value={d}>
                                                    {d}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </>
                            ) : null}
                            {mode === 'matches' ? (
                                <>
                                    <Stat
                                        label={`Matches ${matchTarget}`}
                                        value={`${matches.matchPct.toFixed(1)}%`}
                                        sub={`${matches.matchCount} ticks`}
                                    />
                                    <Stat
                                        label='Differs'
                                        value={`${matches.differPct.toFixed(1)}%`}
                                        sub={`${matches.differCount} ticks`}
                                    />
                                    <label className='analysis-tool-field'>
                                        <span>Target</span>
                                        <select
                                            value={matchTarget}
                                            onChange={event => setMatchTarget(Number(event.target.value))}
                                            aria-label='Match target'
                                        >
                                            {Array.from({ length: 10 }, (_, d) => (
                                                <option key={d} value={d}>
                                                    {d}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </>
                            ) : null}
                            {mode === 'frequency' ? (
                                <div className='analysis-tool-freq'>
                                    {liveFreq.counts.map((count, digit) => {
                                        const pct = liveFreq.window ? (count / liveFreq.window) * 100 : 0;
                                        const ranks = digitRanks(liveFreq.counts);
                                        return (
                                            <div key={digit} className='analysis-tool-freq-row'>
                                                <span className={classNames(ranks[digit] && `is-${ranks[digit]}`)}>
                                                    {digit}
                                                </span>
                                                <i>
                                                    <b style={{ width: `${pct}%` }} />
                                                </i>
                                                <small>{pct.toFixed(1)}%</small>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </div>
                    </article>

                    <article className='analysis-tool-card'>
                        <header className='analysis-tool-card-top'>
                            <h2>
                                <i className='analysis-tool-mark' aria-hidden />
                                Digit pad
                            </h2>
                            <div className='analysis-tool-card-marks'>
                                <span className='analysis-tool-pill'>{bias.label}</span>
                            </div>
                        </header>
                        <div className='analysis-tool-pad'>
                            {Array.from({ length: 10 }, (_, digit) => {
                                const pct = liveFreq.window
                                    ? ((liveFreq.counts[digit] ?? 0) / liveFreq.window) * 100
                                    : 0;
                                const picked =
                                    (mode === 'barrier' && barrier === digit) ||
                                    (mode !== 'barrier' && matchTarget === digit);
                                return (
                                    <button
                                        key={digit}
                                        type='button'
                                        className={classNames(
                                            'analysis-tool-key',
                                            picked && 'is-pick',
                                            lastDigit === digit && 'is-last'
                                        )}
                                        onClick={() => pickDigit(digit)}
                                    >
                                        <strong>{digit}</strong>
                                        <span>{pct.toFixed(1)}%</span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className='analysis-tool-actions'>
                            <button type='button' className='analysis-tool-load' onClick={() => onTradeBias?.(bias)}>
                                D-Trader
                            </button>
                            <button
                                type='button'
                                className='analysis-tool-load'
                                onClick={() => onSendToBuilder?.(bias)}
                            >
                                Bot builder
                            </button>
                        </div>
                    </article>
                </div>
            )}
        </div>
    );
};

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
    return (
        <div className='analysis-tool-stat'>
            <p>{label}</p>
            <strong>{value}</strong>
            <span>{sub}</span>
        </div>
    );
}

export default AnalysisToolDesk;
