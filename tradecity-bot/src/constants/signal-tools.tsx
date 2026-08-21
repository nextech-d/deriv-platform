import type { ReactNode } from 'react';
import { analyzeBarrier, analyzeFrequency, analyzeMatches, analyzeParity, type DigitSample } from '@/utils/analysis-tool';
import {
    analyzeTrend,
    edgeConfidence,
    pct,
    planRisk,
    round2,
    type ReadingBar,
    type SignalHandoff,
    type ToolReading,
} from '@/utils/signal-analysis';

export type SignalCategory = 'Signal Tools' | 'Analysis Tools' | 'Digits Tools' | 'Risk Management';

export const SIGNAL_CATEGORIES: SignalCategory[] = [
    'Signal Tools',
    'Analysis Tools',
    'Digits Tools',
    'Risk Management',
];

export type ToolParam =
    | {
          key: string;
          label: string;
          kind: 'select';
          options: { value: string; label: string }[];
          initial: string;
          /** Shown as the empty choice when `initial` is blank. */
          placeholder?: string;
      }
    | { key: string; label: string; kind: 'digit'; initial: number }
    | { key: string; label: string; kind: 'number'; initial: number; min: number; max: number; step: number };

export type ParamValues = Record<string, string | number>;

export interface ToolContext {
    /** Quotes for the selected market, oldest first. */
    values: number[];
    /** Last digit of each quote, aligned with `values`. */
    digits: number[];
    params: ParamValues;
}

export interface SignalTool {
    id: string;
    label: string;
    description: string;
    category: SignalCategory;
    icon: ReactNode;
    params: ToolParam[];
    /** Ticks needed before the tool can report anything. */
    minTicks: number;
    analyze: (context: ToolContext) => ToolReading;
}

const toSamples = (digits: number[]): DigitSample[] => digits.map(digit => ({ digit, quote: 0 }));

const windowParam = (initial = 50): ToolParam => ({
    key: 'window',
    label: 'SAMPLE WINDOW:',
    kind: 'select',
    options: [25, 50, 100, 250].map(size => ({ value: String(size), label: `Last ${size} ticks` })),
    initial: String(initial),
});

const digitParam = (key: string, label: string, initial: number): ToolParam => ({ key, label, kind: 'digit', initial });

const readWindow = (context: ToolContext, fallback = 50): number => {
    const raw = Number(context.params.window ?? fallback);
    return Number.isFinite(raw) && raw > 0 ? raw : fallback;
};

const scoped = (context: ToolContext) => {
    const size = readWindow(context);
    return { values: context.values.slice(-size), digits: context.digits.slice(-size) };
};

const EMPTY: ToolReading = { headline: 'Waiting for ticks', rows: [], handoff: null };

/* ---------------------------------------------------------------- readings */

function parityReading(digits: number[]): ToolReading {
    const stats = analyzeParity(toSamples(digits));
    const evenLeads = stats.evenPct >= stats.oddPct;
    const lead = evenLeads ? stats.evenPct : stats.oddPct;

    return {
        headline: `${evenLeads ? 'Even' : 'Odd'} leads at ${lead.toFixed(1)}%`,
        detail: stats.streakSide ? `Current run: ${stats.streakLength} ${stats.streakSide}` : undefined,
        rows: [
            { label: 'Even', value: `${stats.evenPct.toFixed(1)}% (${stats.evenCount})`, tone: evenLeads ? 'up' : 'flat' },
            { label: 'Odd', value: `${stats.oddPct.toFixed(1)}% (${stats.oddCount})`, tone: evenLeads ? 'flat' : 'up' },
            { label: 'Sample', value: `${stats.window} ticks` },
            { label: 'Streak', value: stats.streakSide ? `${stats.streakLength} ${stats.streakSide}` : '—' },
        ],
        bars: [
            { label: 'Even', pct: stats.evenPct, tone: 'up', highlight: evenLeads },
            { label: 'Odd', pct: stats.oddPct, tone: 'down', highlight: !evenLeads },
        ],
        handoff: {
            mode: 'parity',
            side: evenLeads ? 'CALL' : 'PUT',
            label: evenLeads ? 'Even' : 'Odd',
            confidence: edgeConfidence(lead),
        },
    };
}

function barrierReading(digits: number[], barrier: number): ToolReading {
    const stats = analyzeBarrier(toSamples(digits), barrier);
    const overLeads = stats.overPct >= stats.underPct;
    const lead = overLeads ? stats.overPct : stats.underPct;

    return {
        headline: `${overLeads ? 'Over' : 'Under'} ${barrier} at ${lead.toFixed(1)}%`,
        rows: [
            { label: `Over ${barrier}`, value: `${stats.overPct.toFixed(1)}% (${stats.overCount})`, tone: overLeads ? 'up' : 'flat' },
            { label: `Under ${barrier}`, value: `${stats.underPct.toFixed(1)}% (${stats.underCount})`, tone: overLeads ? 'flat' : 'up' },
            { label: 'Sample', value: `${stats.window} ticks` },
        ],
        bars: [
            { label: `Over ${barrier}`, pct: stats.overPct, tone: 'up', highlight: overLeads },
            { label: `Under ${barrier}`, pct: stats.underPct, tone: 'down', highlight: !overLeads },
        ],
        handoff: {
            mode: 'barrier',
            side: overLeads ? 'CALL' : 'PUT',
            barrier,
            label: `${overLeads ? 'Over' : 'Under'} ${barrier}`,
            confidence: edgeConfidence(lead),
        },
    };
}

function frequencyBars(counts: number[], total: number, highlight: number[]): ReadingBar[] {
    return counts.map((count, digit) => ({
        label: String(digit),
        pct: pct(count, total),
        tone: highlight.includes(digit) ? 'up' : 'flat',
        highlight: highlight.includes(digit),
    }));
}

function matchesReading(digits: number[], target: number): ToolReading {
    const samples = toSamples(digits);
    const stats = analyzeMatches(samples, target);
    const frequency = analyzeFrequency(samples);
    // Ten digits, so anything above a 10% share is running hot.
    const matchFavoured = stats.matchPct > 10;

    return {
        headline: matchFavoured
            ? `Digit ${target} is hot at ${stats.matchPct.toFixed(1)}%`
            : `Digit ${target} is cold at ${stats.matchPct.toFixed(1)}%`,
        detail: `Hot ${frequency.hot.join(', ')} · Cold ${frequency.cold.join(', ')}`,
        rows: [
            { label: `Matches ${target}`, value: `${stats.matchPct.toFixed(1)}% (${stats.matchCount})`, tone: matchFavoured ? 'up' : 'flat' },
            { label: `Differs ${target}`, value: `${stats.differPct.toFixed(1)}% (${stats.differCount})`, tone: matchFavoured ? 'flat' : 'up' },
            { label: 'Baseline', value: '10.0% per digit' },
            { label: 'Sample', value: `${stats.window} ticks` },
        ],
        bars: frequencyBars(frequency.counts, stats.window, [target]),
        handoff: {
            mode: 'matches',
            side: matchFavoured ? 'CALL' : 'PUT',
            digitTarget: target,
            label: `${matchFavoured ? 'Matches' : 'Differs'} ${target}`,
            confidence: Math.min(100, Math.round(Math.abs(stats.matchPct - 10) * 5)),
        },
    };
}

function trendReading(values: number[], title = 'Rise'): ToolReading {
    const stats = analyzeTrend(values);
    const rising = stats.upPct >= stats.downPct;
    const lead = rising ? stats.upPct : stats.downPct;

    return {
        headline: `${rising ? 'Rise' : 'Fall'} leads at ${lead.toFixed(1)}%`,
        detail: stats.cross ? `${stats.cross === 'bullish' ? 'Bullish' : 'Bearish'} MA cross` : undefined,
        rows: [
            { label: 'Rise', value: `${stats.upPct.toFixed(1)}% (${stats.upCount})`, tone: rising ? 'up' : 'flat' },
            { label: 'Fall', value: `${stats.downPct.toFixed(1)}% (${stats.downCount})`, tone: rising ? 'flat' : 'up' },
            { label: 'MA 5 / 20', value: stats.fastMa != null && stats.slowMa != null ? `${stats.fastMa.toFixed(3)} / ${stats.slowMa.toFixed(3)}` : '—' },
            { label: 'Streak', value: stats.streakSide ? `${stats.streakLength} ${stats.streakSide}` : '—' },
        ],
        bars: [
            { label: 'Rise', pct: stats.upPct, tone: 'up', highlight: rising },
            { label: 'Fall', pct: stats.downPct, tone: 'down', highlight: !rising },
        ],
        handoff: {
            // 'frequency' is the seeder's call/put fallback - see load-analysis-bias.
            mode: 'frequency',
            side: rising ? 'CALL' : 'PUT',
            label: `${title} ${rising ? 'up' : 'down'}`,
            confidence: edgeConfidence(lead),
        },
    };
}

/** Ranks every family on the same window so the strongest edge wins. */
function bestOf(readings: ToolReading[]): ToolReading | null {
    const ranked = readings
        .filter(reading => reading.handoff)
        .sort((a, b) => (b.handoff?.confidence ?? 0) - (a.handoff?.confidence ?? 0));
    return ranked[0] ?? null;
}

/* ------------------------------------------------------------------- icons */

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const IconSignalHack = (
    <svg viewBox='0 0 24 24' {...stroke} aria-hidden='true'>
        <circle cx='12' cy='12' r='2' fill='currentColor' stroke='none' />
        <path d='M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7M5.5 18.5a9 9 0 0 1 0-13M18.5 5.5a9 9 0 0 1 0 13' />
    </svg>
);

const IconSignals = (
    <svg viewBox='0 0 24 24' {...stroke} aria-hidden='true'>
        <path d='M3 17l5-5 4 4 8-8' />
        <path d='M15 8h5v5' />
    </svg>
);

const IconPercentage = (
    <svg viewBox='0 0 24 24' {...stroke} aria-hidden='true'>
        <circle cx='7.5' cy='7.5' r='2.5' />
        <circle cx='16.5' cy='16.5' r='2.5' />
        <path d='M18 6L6 18' />
    </svg>
);

const IconProTool = (
    <svg viewBox='0 0 24 24' {...stroke} aria-hidden='true'>
        <path d='M5 20V10M10 20V4M15 20v-7M20 20v-4' />
    </svg>
);

const IconMarketAnalyser = (
    <svg viewBox='0 0 24 24' {...stroke} aria-hidden='true'>
        <rect x='3' y='4' width='18' height='16' rx='2' />
        <path d='M6.5 15l3.5-4 3 2.5L17.5 8' />
    </svg>
);

const IconRiseFall = (
    <svg viewBox='0 0 24 24' {...stroke} aria-hidden='true'>
        <path d='M3 16l6-6 4 4 8-8' />
        <path d='M16 6h5v5' />
    </svg>
);

const IconDigits = (
    <svg viewBox='0 0 24 24' {...stroke} aria-hidden='true'>
        <rect x='4' y='3' width='16' height='18' rx='2' />
        <path d='M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M16 15h0' />
    </svg>
);

const IconEvenOdd = (
    <svg viewBox='0 0 24 24' {...stroke} aria-hidden='true'>
        <circle cx='12' cy='12' r='8' />
        <path d='M12 4a8 8 0 0 1 0 16' fill='currentColor' stroke='none' opacity='0.35' />
        <path d='M9.5 9.5l5 5M14.5 9.5l-5 5' />
    </svg>
);

const IconOverUnder = (
    <svg viewBox='0 0 24 24' {...stroke} aria-hidden='true'>
        <path d='M6 6l12 12' />
        <path d='M18 12v6h-6' />
    </svg>
);

const IconDigitsPercentages = (
    <svg viewBox='0 0 24 24' {...stroke} aria-hidden='true'>
        <path d='M12 3a9 9 0 1 0 9 9h-9z' />
        <path d='M12 3v9h9A9 9 0 0 0 12 3z' fill='currentColor' stroke='none' opacity='0.35' />
    </svg>
);

const IconRisk = (
    <svg viewBox='0 0 24 24' {...stroke} aria-hidden='true'>
        <path d='M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z' />
    </svg>
);

/* ---------------------------------------------------------------- registry */

export const SIGNAL_TOOLS: SignalTool[] = [
    {
        id: 'signal_hack',
        label: 'Signal Hack',
        description: 'Advanced signal generation tool',
        category: 'Signal Tools',
        icon: IconSignalHack,
        minTicks: 50,
        params: [
            {
                key: 'strategy',
                label: 'SELECT STRATEGY:',
                kind: 'select',
                initial: '',
                placeholder: '-- Select Strategy --',
                options: [
                    { value: 'matches_differs', label: 'Matches/Differs' },
                    { value: 'even_odd', label: 'Even/Odd' },
                    { value: 'over_under', label: 'Over/Under' },
                    { value: 'high_low', label: 'High/Low' },
                    { value: 'touch_no_touch', label: 'Touch/No Touch' },
                ],
            },
            digitParam('target', 'DIGIT / BARRIER:', 5),
        ],
        analyze: context => {
            const { values, digits } = scoped(context);
            if (!digits.length) return EMPTY;
            const target = Number(context.params.target ?? 5);
            const strategy = String(context.params.strategy ?? '');
            if (!strategy) {
                return { headline: 'Select a strategy to analyse', rows: [], handoff: null };
            }

            switch (strategy) {
                case 'even_odd':
                    return parityReading(digits);
                case 'over_under':
                    return barrierReading(digits, target);
                case 'high_low':
                    return trendReading(values, 'High');
                case 'touch_no_touch': {
                    const stats = analyzeTrend(values);
                    // No touch contract in the builder seeder, so this reports only.
                    const touchLikely = stats.volatility > 0.05;
                    return {
                        headline: touchLikely
                            ? `Volatility ${stats.volatility.toFixed(3)}% favours Touch`
                            : `Volatility ${stats.volatility.toFixed(3)}% favours No Touch`,
                        detail: 'Touch contracts cannot be seeded into Bot Builder yet.',
                        rows: [
                            { label: 'Volatility', value: `${stats.volatility.toFixed(3)}%` },
                            { label: 'Momentum', value: `${stats.momentum.toFixed(3)}%` },
                            { label: 'Streak', value: stats.streakSide ? `${stats.streakLength} ${stats.streakSide}` : '—' },
                            { label: 'Sample', value: `${stats.window} ticks` },
                        ],
                        handoff: null,
                    };
                }
                default:
                    return matchesReading(digits, target);
            }
        },
    },
    {
        id: 'signals',
        label: 'Signals',
        description: 'Trading signals dashboard',
        category: 'Signal Tools',
        icon: IconSignals,
        minTicks: 50,
        params: [windowParam(100)],
        analyze: context => {
            const { values, digits } = scoped(context);
            if (!digits.length) return EMPTY;

            const candidates = [
                { name: 'Even/Odd', reading: parityReading(digits) },
                { name: 'Over/Under 4', reading: barrierReading(digits, 4) },
                { name: 'Rise/Fall', reading: trendReading(values) },
                { name: 'Matches 5', reading: matchesReading(digits, 5) },
            ];
            const ranked = [...candidates].sort(
                (a, b) => (b.reading.handoff?.confidence ?? 0) - (a.reading.handoff?.confidence ?? 0)
            );
            const top = ranked[0]!;

            return {
                headline: `${top.name}: ${top.reading.handoff?.label} (${top.reading.handoff?.confidence}%)`,
                detail: 'Strongest edge across every family on this market.',
                rows: ranked.map(entry => ({
                    label: entry.name,
                    value: `${entry.reading.handoff?.label} · ${entry.reading.handoff?.confidence}%`,
                    tone: entry === top ? 'up' : 'flat',
                })),
                bars: ranked.map(entry => ({
                    label: entry.name,
                    pct: entry.reading.handoff?.confidence ?? 0,
                    tone: entry === top ? 'up' : 'flat',
                    highlight: entry === top,
                })),
                handoff: top.reading.handoff,
            };
        },
    },
    {
        id: 'percentage',
        label: 'Percentage',
        description: 'Percentage-based analysis tool',
        category: 'Analysis Tools',
        icon: IconPercentage,
        minTicks: 50,
        params: [windowParam(100)],
        analyze: context => {
            const { values, digits } = scoped(context);
            if (!digits.length) return EMPTY;

            const parity = parityReading(digits);
            const trend = trendReading(values);
            const best = bestOf([parity, trend]);

            return {
                headline: best ? `${best.handoff?.label} at ${best.handoff?.confidence}% edge` : 'No clear edge',
                detail: `Even ${parity.bars?.[0]?.pct.toFixed(1)}% · Rise ${trend.bars?.[0]?.pct.toFixed(1)}%`,
                rows: [...parity.rows.slice(0, 2), ...trend.rows.slice(0, 2), { label: 'Sample', value: `${digits.length} ticks` }],
                bars: [...(parity.bars ?? []), ...(trend.bars ?? [])],
                handoff: best?.handoff ?? null,
            };
        },
    },
    {
        id: 'pro_tool',
        label: 'Pro Tool',
        description: 'Professional trading analysis',
        category: 'Analysis Tools',
        icon: IconProTool,
        minTicks: 100,
        params: [windowParam(250), digitParam('barrier', 'BARRIER DIGIT:', 4)],
        analyze: context => {
            const { values, digits } = scoped(context);
            if (!digits.length) return EMPTY;

            const barrier = Number(context.params.barrier ?? 4);
            const parity = parityReading(digits);
            const over = barrierReading(digits, barrier);
            const trend = trendReading(values);
            const matches = matchesReading(digits, analyzeFrequency(toSamples(digits)).hot[0] ?? 0);
            const stats = analyzeTrend(values);
            const best = bestOf([parity, over, trend, matches]);

            return {
                headline: best ? `Strongest edge: ${best.handoff?.label} (${best.handoff?.confidence}%)` : 'No clear edge',
                detail: `Volatility ${stats.volatility.toFixed(3)}% · Momentum ${stats.momentum.toFixed(3)}%`,
                rows: [
                    { label: 'Even/Odd', value: `${parity.handoff?.label} · ${parity.handoff?.confidence}%` },
                    { label: `Over/Under ${barrier}`, value: `${over.handoff?.label} · ${over.handoff?.confidence}%` },
                    { label: 'Rise/Fall', value: `${trend.handoff?.label} · ${trend.handoff?.confidence}%` },
                    { label: 'Matches', value: `${matches.handoff?.label} · ${matches.handoff?.confidence}%` },
                    { label: 'Volatility', value: `${stats.volatility.toFixed(3)}%` },
                    { label: 'Sample', value: `${digits.length} ticks` },
                ],
                bars: [parity, over, trend, matches].map(reading => ({
                    label: reading.handoff?.label ?? '—',
                    pct: reading.handoff?.confidence ?? 0,
                    tone: reading === best ? 'up' : 'flat',
                    highlight: reading === best,
                })),
                handoff: best?.handoff ?? null,
            };
        },
    },
    {
        id: 'market_analyser',
        label: 'Market Analyser',
        description: 'Real-time market analysis',
        category: 'Analysis Tools',
        icon: IconMarketAnalyser,
        minTicks: 50,
        params: [windowParam(100)],
        analyze: context => {
            const { values } = scoped(context);
            if (values.length < 2) return EMPTY;

            const stats = analyzeTrend(values);
            const last = values[values.length - 1]!;
            const first = values[0]!;
            const change = first ? round2(((last - first) / first) * 100) : 0;

            return {
                headline: `${stats.cross === 'bullish' ? 'Bullish' : stats.cross === 'bearish' ? 'Bearish' : 'Flat'} over ${stats.window} ticks`,
                detail: `Net move ${change > 0 ? '+' : ''}${change}%`,
                rows: [
                    { label: 'Last quote', value: last.toFixed(4) },
                    { label: 'Net change', value: `${change > 0 ? '+' : ''}${change}%`, tone: change >= 0 ? 'up' : 'down' },
                    { label: 'Volatility', value: `${stats.volatility.toFixed(3)}%` },
                    { label: 'Momentum', value: `${stats.momentum.toFixed(3)}%` },
                    { label: 'MA 5 / 20', value: stats.fastMa != null && stats.slowMa != null ? `${stats.fastMa.toFixed(3)} / ${stats.slowMa.toFixed(3)}` : '—' },
                    { label: 'Streak', value: stats.streakSide ? `${stats.streakLength} ${stats.streakSide}` : '—' },
                ],
                bars: [
                    { label: 'Rise', pct: stats.upPct, tone: 'up', highlight: stats.upPct >= stats.downPct },
                    { label: 'Fall', pct: stats.downPct, tone: 'down', highlight: stats.downPct > stats.upPct },
                ],
                handoff: trendReading(values).handoff,
            };
        },
    },
    {
        id: 'rise_fall',
        label: 'Rise/Fall',
        description: 'Rise and fall prediction',
        category: 'Analysis Tools',
        icon: IconRiseFall,
        minTicks: 20,
        params: [windowParam(50)],
        analyze: context => {
            const { values } = scoped(context);
            if (values.length < 2) return EMPTY;
            return trendReading(values);
        },
    },
    {
        id: 'digits',
        label: 'Digits',
        description: 'Digits prediction tool',
        category: 'Digits Tools',
        icon: IconDigits,
        minTicks: 50,
        params: [windowParam(100), digitParam('target', 'TARGET DIGIT:', 5)],
        analyze: context => {
            const { digits } = scoped(context);
            if (!digits.length) return EMPTY;
            return matchesReading(digits, Number(context.params.target ?? 5));
        },
    },
    {
        id: 'even_odd',
        label: 'Even/Odd',
        description: 'Even and odd digit analysis',
        category: 'Digits Tools',
        icon: IconEvenOdd,
        minTicks: 20,
        params: [windowParam(100)],
        analyze: context => {
            const { digits } = scoped(context);
            if (!digits.length) return EMPTY;
            return parityReading(digits);
        },
    },
    {
        id: 'over_under',
        label: 'Over/Under',
        description: 'Over and under prediction',
        category: 'Digits Tools',
        icon: IconOverUnder,
        minTicks: 20,
        params: [windowParam(100), digitParam('barrier', 'BARRIER DIGIT:', 4)],
        analyze: context => {
            const { digits } = scoped(context);
            if (!digits.length) return EMPTY;
            return barrierReading(digits, Number(context.params.barrier ?? 4));
        },
    },
    {
        id: 'digits_percentages',
        label: 'Digits Percentages',
        description: 'Statistical digits analysis',
        category: 'Digits Tools',
        icon: IconDigitsPercentages,
        minTicks: 50,
        params: [windowParam(250)],
        analyze: context => {
            const { digits } = scoped(context);
            if (!digits.length) return EMPTY;

            const stats = analyzeFrequency(toSamples(digits));
            const hottest = stats.hot[0] ?? 0;
            const coldest = stats.cold[0] ?? 0;

            return {
                headline: `Digit ${hottest} leads at ${pct(stats.counts[hottest] ?? 0, stats.window).toFixed(1)}%`,
                detail: `Hot ${stats.hot.join(', ')} · Cold ${stats.cold.join(', ')}`,
                rows: stats.counts.map((count, digit) => ({
                    label: `Digit ${digit}`,
                    value: `${pct(count, stats.window).toFixed(1)}% (${count})`,
                    tone: digit === hottest ? 'up' : digit === coldest ? 'down' : 'flat',
                })),
                bars: frequencyBars(stats.counts, stats.window, stats.hot),
                handoff: matchesReading(digits, hottest).handoff,
            };
        },
    },
    {
        id: 'risk_management',
        label: 'Risk Management',
        description: 'Manage trading risk effectively',
        category: 'Risk Management',
        icon: IconRisk,
        minTicks: 0,
        params: [
            { key: 'balance', label: 'ACCOUNT BALANCE:', kind: 'number', initial: 1000, min: 1, max: 1_000_000, step: 1 },
            { key: 'risk', label: 'RISK PER RUN (%):', kind: 'number', initial: 10, min: 0.1, max: 100, step: 0.1 },
            { key: 'stake', label: 'OPENING STAKE:', kind: 'number', initial: 1, min: 0.35, max: 10_000, step: 0.35 },
            { key: 'multiplier', label: 'MARTINGALE x:', kind: 'number', initial: 2, min: 1, max: 5, step: 0.1 },
        ],
        analyze: context => {
            const balance = Number(context.params.balance ?? 1000);
            const risk = Number(context.params.risk ?? 10);
            const stake = Number(context.params.stake ?? 1);
            const multiplier = Number(context.params.multiplier ?? 2);
            const plan = planRisk(balance, risk, multiplier, stake);

            return {
                headline: plan.survives
                    ? `Budget absorbs ${plan.maxLosses} consecutive losses`
                    : 'The opening stake is larger than the risk budget',
                detail: plan.survives
                    ? `Loss ${plan.maxLosses + 1} would need ${plan.nextStake.toFixed(2)} and break the budget.`
                    : undefined,
                rows: [
                    { label: 'Losses absorbed', value: String(plan.maxLosses), tone: plan.survives ? 'up' : 'down' },
                    { label: 'Opening stake', value: plan.stake.toFixed(2) },
                    { label: 'Risk budget', value: plan.riskAmount.toFixed(2) },
                    { label: 'Ladder total', value: plan.ladderTotal.toFixed(2) },
                    { label: 'Next stake', value: plan.nextStake.toFixed(2), tone: 'down' },
                    { label: 'Balance', value: balance.toFixed(2) },
                ],
                handoff: null,
            };
        },
    },
];

export const toolById = (id: string): SignalTool => SIGNAL_TOOLS.find(tool => tool.id === id) ?? SIGNAL_TOOLS[0]!;

export const initialParams = (tool: SignalTool): ParamValues =>
    Object.fromEntries(tool.params.map(param => [param.key, param.initial]));

export type { SignalHandoff };
