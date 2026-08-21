export type BulkTradeFamily = 'evenodd' | 'overunder' | 'matchesdiffers';
export type BulkEvenMode = 'all_even' | 'all_odd';
export type BulkComparator = 'greater' | 'less' | 'equal';
export type BulkDigitTone = 'hot' | 'warm' | 'cool' | 'cold' | 'neutral';
export type BulkContract = 'DIGITEVEN' | 'DIGITODD' | 'DIGITOVER' | 'DIGITUNDER' | 'DIGITMATCH' | 'DIGITDIFF';

export const BULK_MIN_STAKE = 0.35;
export const BULK_DEFAULT_STAKE = 0.5;
export const BULK_PAYOUT = 0.95;
export const BULK_DEFAULT_SYMBOL = 'R_100';
export const BULK_DEFAULT_WINDOW = 120;
export const BULK_MIN_WINDOW = 10;
export const BULK_MAX_WINDOW = 5000;
export const BULK_MAX_COUNT = 20;
export const BULK_MAX_DURATION = 10;
export const BULK_SCAN_SYMBOLS = ['R_100', 'R_75', 'R_50', 'R_25', 'R_10'] as const;

export interface BulkAutoCondition {
    family: BulkTradeFamily;
    window: number;
    evenMode: BulkEvenMode;
    comparator: BulkComparator;
    thresholdDigit: number;
}

export interface BulkAutoAction {
    contractType: BulkContract;
    prediction: number;
}

export interface BulkAutoRisk {
    useMartingale: boolean;
    baseStake: number;
    multiplier: number;
    stopLoss: number | null;
    takeProfit: number | null;
}

export interface BulkScannerConfig {
    lowThreshold: number;
    highThreshold: number;
    overDigit: number;
    underDigit: number;
    sampleSize: number;
}

export const BULK_SCANNER_DEFAULT: BulkScannerConfig = {
    lowThreshold: 2,
    highThreshold: 7,
    overDigit: 2,
    underDigit: 7,
    sampleSize: 4,
};

export const BULK_AUTO_CONDITION_DEFAULT: BulkAutoCondition = {
    family: 'evenodd',
    window: 3,
    evenMode: 'all_even',
    comparator: 'greater',
    thresholdDigit: 5,
};

export const BULK_AUTO_ACTION_DEFAULT: BulkAutoAction = {
    contractType: 'DIGITOVER',
    prediction: 5,
};

export const BULK_AUTO_RISK_DEFAULT: BulkAutoRisk = {
    useMartingale: false,
    baseStake: BULK_DEFAULT_STAKE,
    multiplier: 2,
    stopLoss: null,
    takeProfit: null,
};

export const BULK_CONTRACTS: { value: BulkContract; label: string }[] = [
    { value: 'DIGITEVEN', label: 'Even' },
    { value: 'DIGITODD', label: 'Odd' },
    { value: 'DIGITOVER', label: 'Over' },
    { value: 'DIGITUNDER', label: 'Under' },
    { value: 'DIGITMATCH', label: 'Matches' },
    { value: 'DIGITDIFF', label: 'Differs' },
];

export function clampBulkCount(value: number): number {
    if (!Number.isFinite(value)) return 1;
    return Math.max(1, Math.min(BULK_MAX_COUNT, Math.round(value)));
}

export function clampBulkWindow(value: number): number {
    if (!Number.isFinite(value)) return BULK_DEFAULT_WINDOW;
    return Math.max(BULK_MIN_WINDOW, Math.min(BULK_MAX_WINDOW, Math.round(value)));
}

export function clampBulkDigit(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(9, Math.round(value)));
}

export function clampBulkStake(value: number): number {
    if (!Number.isFinite(value)) return BULK_DEFAULT_STAKE;
    return Math.max(BULK_MIN_STAKE, Math.round(value * 100) / 100);
}

export function clampBulkDuration(value: number): number {
    if (!Number.isFinite(value)) return 1;
    return Math.max(1, Math.min(BULK_MAX_DURATION, Math.round(value)));
}

export function bulkNeedsDigit(type: BulkTradeFamily): boolean {
    return type !== 'evenodd';
}

export function bulkPair(family: BulkTradeFamily): [BulkContract, BulkContract] {
    if (family === 'overunder') return ['DIGITOVER', 'DIGITUNDER'];
    if (family === 'matchesdiffers') return ['DIGITMATCH', 'DIGITDIFF'];
    return ['DIGITEVEN', 'DIGITODD'];
}

export function bulkContractNeedsDigit(contract: BulkContract): boolean {
    return contract !== 'DIGITEVEN' && contract !== 'DIGITODD';
}

export function bulkPipSize(symbol: string): number {
    if (/^(R_10|R_25|1HZ10V|1HZ15V|1HZ25V|1HZ30V)$/.test(symbol)) return 3;
    if (/^(R_50|R_75|1HZ50V|1HZ75V)$/.test(symbol)) return 4;
    return 2;
}

/** Last digit using Deriv pip_size (quote.toFixed(pip).slice(-1)). */
export function bulkLastDigit(quote: number, pipSize = 2): number {
    const places = Number.isFinite(pipSize) ? Math.max(0, Math.min(8, Math.round(pipSize))) : 2;
    const digit = Number(Math.abs(quote).toFixed(places).slice(-1));
    return Number.isFinite(digit) ? digit : 0;
}

export function bulkPayout(stake: number, payout = BULK_PAYOUT): number {
    return Number((clampBulkStake(stake) * (1 + payout)).toFixed(2));
}

export function bulkPnl(win: boolean, stake: number, payout = BULK_PAYOUT): number {
    return Number((win ? stake * payout : -stake).toFixed(2));
}

export function bulkWinRates(pcts: number[], digit: number): Record<BulkContract, number> {
    const even = pcts.reduce((sum, pct, value) => (value % 2 === 0 ? sum + pct : sum), 0);
    const odd = pcts.reduce((sum, pct, value) => (value % 2 === 1 ? sum + pct : sum), 0);
    const over = pcts.reduce((sum, pct, value) => (value > digit ? sum + pct : sum), 0);
    const under = pcts.reduce((sum, pct, value) => (value < digit ? sum + pct : sum), 0);
    const match = pcts[digit] ?? 0;
    return {
        DIGITEVEN: even,
        DIGITODD: odd,
        DIGITOVER: over,
        DIGITUNDER: under,
        DIGITMATCH: match,
        DIGITDIFF: Math.max(0, 100 - match),
    };
}

export function bulkDigitTones(pcts: number[]): BulkDigitTone[] {
    const ranked = pcts.map((value, index) => ({ value, index })).sort((a, b) => b.value - a.value);
    const tones = Array.from({ length: 10 }, (): BulkDigitTone => 'neutral');
    const hottest = ranked[0];
    const warm = ranked[1];
    const coldest = ranked[ranked.length - 1];
    const cool = ranked[ranked.length - 2];
    if (hottest) tones[hottest.index] = 'hot';
    if (warm) tones[warm.index] = 'warm';
    if (coldest) tones[coldest.index] = 'cold';
    if (cool && tones[cool.index] === 'neutral') tones[cool.index] = 'cool';
    return tones;
}

export function bulkConditionMet(digits: number[], condition: BulkAutoCondition): boolean {
    const slice = digits.slice(-Math.max(1, condition.window));
    if (slice.length < condition.window) return false;
    if (condition.family === 'evenodd') {
        return condition.evenMode === 'all_even'
            ? slice.every(digit => digit % 2 === 0)
            : slice.every(digit => digit % 2 === 1);
    }
    if (condition.family === 'matchesdiffers') {
        return slice.every(digit => digit === slice[0]);
    }
    if (condition.comparator === 'greater') {
        return slice.every(digit => digit > condition.thresholdDigit);
    }
    if (condition.comparator === 'less') {
        return slice.every(digit => digit < condition.thresholdDigit);
    }
    return slice.every(digit => digit === condition.thresholdDigit);
}

export function bulkMartingaleStake(current: number, won: boolean, risk: BulkAutoRisk): number {
    if (!risk.useMartingale) return clampBulkStake(risk.baseStake);
    if (won) return clampBulkStake(risk.baseStake);
    return clampBulkStake(Number((current * risk.multiplier).toFixed(2)));
}

export function bulkRiskStop(pnl: number, risk: BulkAutoRisk): 'stop_loss' | 'take_profit' | null {
    if (risk.stopLoss != null && pnl <= -Math.abs(risk.stopLoss)) return 'stop_loss';
    if (risk.takeProfit != null && pnl >= Math.abs(risk.takeProfit)) return 'take_profit';
    return null;
}

export function bulkScannerSignal(
    digits: number[],
    config: BulkScannerConfig
): { contractType: 'DIGITOVER' | 'DIGITUNDER'; prediction: number } | null {
    const slice = digits.slice(-config.sampleSize);
    if (slice.length < config.sampleSize) return null;
    if (slice.every(digit => digit <= config.lowThreshold)) {
        return { contractType: 'DIGITOVER', prediction: config.overDigit };
    }
    if (slice.every(digit => digit >= config.highThreshold)) {
        return { contractType: 'DIGITUNDER', prediction: config.underDigit };
    }
    return null;
}

export function bulkLabel(contract: BulkContract): string {
    if (contract === 'DIGITEVEN') return 'EVEN';
    if (contract === 'DIGITODD') return 'ODD';
    if (contract === 'DIGITOVER') return 'OVER';
    if (contract === 'DIGITUNDER') return 'UNDER';
    if (contract === 'DIGITMATCH') return 'MATCHES';
    return 'DIFFERS';
}

export { exitTickAfter, ticksForMarket } from './tick-series';
