export type FastTraderFamily = 'even_odd' | 'matches_differs' | 'over_under' | 'rise_fall';

export type FastTradeType = 'even' | 'odd' | 'matches' | 'differs' | 'over' | 'under' | 'rise' | 'fall';

export interface FastTradeKind {
    id: FastTradeType;
    label: string;
    contract: string;
    needsDigit: boolean;
}

/** How Start Auto picks the contract it fires. */
export type FastAutoMode = 'trade_type' | 'custom';

export const FAST_MIN_STAKE = 0.35;
export const FAST_MAX_DURATION = 10;

export const FAST_TRADE_TYPES: FastTradeKind[] = [
    { id: 'even', label: 'Even', contract: 'DIGITEVEN', needsDigit: false },
    { id: 'odd', label: 'Odd', contract: 'DIGITODD', needsDigit: false },
    { id: 'matches', label: 'Matches', contract: 'DIGITMATCH', needsDigit: true },
    { id: 'differs', label: 'Differs', contract: 'DIGITDIFF', needsDigit: true },
    { id: 'over', label: 'Over', contract: 'DIGITOVER', needsDigit: true },
    { id: 'under', label: 'Under', contract: 'DIGITUNDER', needsDigit: true },
    { id: 'rise', label: 'Rise', contract: 'CALL', needsDigit: false },
    { id: 'fall', label: 'Fall', contract: 'PUT', needsDigit: false },
];

export const FAST_AUTO_MODES: { value: FastAutoMode; label: string }[] = [
    { value: 'trade_type', label: 'Auto (by trade type)' },
    { value: 'custom', label: 'Custom' },
];

export function fastTradeKind(type: FastTradeType): FastTradeKind {
    return FAST_TRADE_TYPES.find(item => item.id === type) ?? FAST_TRADE_TYPES[0]!;
}

export function clampFastStake(value: number): number {
    if (!Number.isFinite(value)) return FAST_MIN_STAKE;
    return Math.max(FAST_MIN_STAKE, Math.round(value * 100) / 100);
}

export function clampFastDuration(value: number): number {
    if (!Number.isFinite(value)) return 1;
    return Math.max(1, Math.min(FAST_MAX_DURATION, Math.round(value)));
}

export function clampFastDigit(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(9, Math.round(value)));
}

/** Doubles after each loss, capped at four steps. */
export function fastMartingaleStake(base: number, consecutiveLosses: number): number {
    const sized = clampFastStake(base) * 2 ** Math.min(Math.max(0, consecutiveLosses), 4);
    return Math.round(sized * 100) / 100;
}

export function fastTraderFamily(type: FastTradeType): FastTraderFamily {
    if (type === 'even' || type === 'odd') return 'even_odd';
    if (type === 'matches' || type === 'differs') return 'matches_differs';
    if (type === 'over' || type === 'under') return 'over_under';
    return 'rise_fall';
}
