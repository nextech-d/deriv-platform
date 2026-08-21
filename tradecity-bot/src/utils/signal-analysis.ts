import type { AnalysisMode } from './analysis-tool';

/**
 * Shared maths for the Signal Center tools. Everything here is pure so a tool's
 * reading can be tested without mounting anything.
 */

export type Tone = 'up' | 'down' | 'flat';

/**
 * What a tool hands to the rest of the platform. The field names match
 * AnalysisBiasSeed so the Bot Builder seeder can take it without translation.
 */
export interface SignalHandoff {
    mode: AnalysisMode;
    side: 'CALL' | 'PUT';
    barrier?: number;
    digitTarget?: number;
    label: string;
    confidence: number;
}

export interface ReadingRow {
    label: string;
    value: string;
    tone?: Tone;
}

export interface ReadingBar {
    label: string;
    pct: number;
    tone?: Tone;
    highlight?: boolean;
}

/** The common shape every tool returns and the results panel renders. */
export interface ToolReading {
    headline: string;
    detail?: string;
    rows: ReadingRow[];
    bars?: ReadingBar[];
    handoff: SignalHandoff | null;
}

export interface TrendStats {
    window: number;
    fastMa: number | null;
    slowMa: number | null;
    cross: 'bullish' | 'bearish' | null;
    upCount: number;
    downCount: number;
    upPct: number;
    downPct: number;
    streakSide: 'up' | 'down' | null;
    streakLength: number;
    /** Standard deviation of tick-to-tick percentage moves. */
    volatility: number;
    /** Last quote against the slow average, as a percentage. */
    momentum: number;
}

export const round2 = (value: number): number => Math.round(value * 100) / 100;

export function pct(part: number, total: number): number {
    if (total <= 0) return 0;
    return Math.round((part / total) * 10_000) / 100;
}

/**
 * How far a percentage sits from an even split, expressed as 0-100. A 50/50
 * reading is worth nothing; 100/0 is a full-strength lead.
 */
export function edgeConfidence(percentage: number): number {
    return Math.max(0, Math.min(100, Math.round(Math.abs(percentage - 50) * 2)));
}

export function movingAverage(values: number[], span: number): number | null {
    if (span <= 0 || values.length < span) return null;
    const slice = values.slice(-span);
    return slice.reduce((sum, value) => sum + value, 0) / span;
}

export function analyzeTrend(values: number[], fast = 5, slow = 20): TrendStats {
    const window = values.length;
    const fastMa = movingAverage(values, fast);
    const slowMa = movingAverage(values, slow);

    let upCount = 0;
    let downCount = 0;
    const moves: number[] = [];
    for (let i = 1; i < window; i += 1) {
        const previous = values[i - 1]!;
        const current = values[i]!;
        if (current > previous) upCount += 1;
        else if (current < previous) downCount += 1;
        if (previous !== 0) moves.push(((current - previous) / previous) * 100);
    }

    let streakSide: 'up' | 'down' | null = null;
    let streakLength = 0;
    for (let i = window - 1; i > 0; i -= 1) {
        const current = values[i]!;
        const previous = values[i - 1]!;
        if (current === previous) break;
        const side = current > previous ? 'up' : 'down';
        if (!streakSide) {
            streakSide = side;
            streakLength = 1;
            continue;
        }
        if (side !== streakSide) break;
        streakLength += 1;
    }

    const mean = moves.length ? moves.reduce((sum, move) => sum + move, 0) / moves.length : 0;
    const variance = moves.length
        ? moves.reduce((sum, move) => sum + (move - mean) ** 2, 0) / moves.length
        : 0;

    const directional = upCount + downCount;
    const last = window ? values[window - 1]! : 0;

    return {
        window,
        fastMa,
        slowMa,
        cross: fastMa == null || slowMa == null ? null : fastMa > slowMa ? 'bullish' : 'bearish',
        upCount,
        downCount,
        upPct: pct(upCount, directional),
        downPct: pct(downCount, directional),
        streakSide,
        streakLength,
        volatility: round2(Math.sqrt(variance)),
        momentum: slowMa ? round2(((last - slowMa) / slowMa) * 100) : 0,
    };
}

export interface RiskPlan {
    stake: number;
    /** The slice of balance being put at risk. */
    riskAmount: number;
    /** Consecutive losses the budget absorbs at this stake and multiplier. */
    maxLosses: number;
    /** Cumulative cost of those losses. */
    ladderTotal: number;
    /** The stake the ladder would demand after `maxLosses` losses. */
    nextStake: number;
    /** False when the budget cannot even cover the opening stake. */
    survives: boolean;
}

/** A martingale ladder deeper than this is academic, and it stops a runaway walk. */
const MAX_LADDER_DEPTH = 50;

/**
 * How deep a martingale ladder runs before it exhausts the risk budget.
 * Analysis only — nothing here places a trade.
 */
export function planRisk(balance: number, riskPercent: number, multiplier: number, stake: number): RiskPlan {
    const safeBalance = Math.max(0, balance);
    const riskAmount = round2((safeBalance * Math.max(0, Math.min(100, riskPercent))) / 100);
    const factor = Math.max(1, multiplier);
    const opening = Math.max(0, stake);

    let ladderTotal = 0;
    let maxLosses = 0;
    let rung = opening;
    while (opening > 0 && maxLosses < MAX_LADDER_DEPTH && ladderTotal + rung <= riskAmount) {
        ladderTotal += rung;
        maxLosses += 1;
        rung *= factor;
    }

    return {
        stake: round2(opening),
        riskAmount,
        maxLosses,
        ladderTotal: round2(ladderTotal),
        nextStake: round2(rung),
        survives: maxLosses > 0,
    };
}
