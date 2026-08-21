/**
 * Edging buys Over 5 and Under 4 as a pair: 0-3 pays the Under leg, 6-9 pays
 * the Over leg, and only 4 or 5 kills both.
 */
export const EDGING_LOSE_DIGITS = new Set([4, 5]);
export const EDGING_OVER_BARRIER = 5;
export const EDGING_UNDER_BARRIER = 4;
export const EDGING_MIN_TOTAL = 0.7;
export const EDGING_MIN_LEG = 0.35;
export const EDGING_MAX_DURATION = 10;

export function edgingWins(digit: number): boolean {
    return !EDGING_LOSE_DIGITS.has(digit);
}

export function clampEdgingDuration(value: number): number {
    if (!Number.isFinite(value)) return 1;
    return Math.max(1, Math.min(EDGING_MAX_DURATION, Math.round(value)));
}

export function clampEdgingTotal(value: number): number {
    if (!Number.isFinite(value)) return EDGING_MIN_TOTAL;
    return Math.max(EDGING_MIN_TOTAL, Math.round(value * 100) / 100);
}

/** Each leg carries half the total, never below Deriv's minimum stake. */
export function perLegStake(totalStake: number): number {
    return Math.max(EDGING_MIN_LEG, Math.round((clampEdgingTotal(totalStake) / 2) * 100) / 100);
}

/** Doubles the pair after a kill, capped at four steps. */
export function edgingMartingaleStake(base: number, consecutiveLosses: number): number {
    const sized = clampEdgingTotal(base) * 2 ** Math.min(Math.max(0, consecutiveLosses), 4);
    return Math.round(sized * 100) / 100;
}

/** Digit frequency counts over a digit sample window. */
export function edgingFrequency(digits: number[]): number[] {
    const counts = Array.from({ length: 10 }, () => 0);
    for (const digit of digits) {
        if (digit >= 0 && digit <= 9) counts[digit] += 1;
    }
    return counts;
}

export type Edging2Tone = 'green' | 'yellow' | 'red';

/** Green ≥15% suits Matches, red <10% suits Differs. */
export function edging2Tone(pct: number): Edging2Tone {
    if (pct >= 15) return 'green';
    if (pct >= 10) return 'yellow';
    return 'red';
}
