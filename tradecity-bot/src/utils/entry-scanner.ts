import { ULTIMATE_BOT_MARKETS } from '@/constants/ultimate-markets';
import { lastDigitFromQuote } from './analysis-tool';

export const ENTRY_SCAN_DEPTH = 3000;
export const ENTRY_SCAN_KEY = 'tc-entry-scan';

export type EntryScanMode = '01-08' | '02-07';

export interface EntryMarketScore {
    symbol: string;
    label: string;
    side: 'over' | 'under' | null;
    contractType: 'DIGITOVER' | 'DIGITUNDER' | null;
    barrier: number | null;
    tradeLabel: string;
    score: number;
    ticks: number;
    recovered: boolean;
}

export interface EntryScanResult {
    mode: EntryScanMode;
    symbol: string;
    label: string;
    contractType: 'DIGITOVER' | 'DIGITUNDER';
    barrier: number;
    tradeLabel: string;
    score: number;
    ticks: number;
    recovered: boolean;
    savedAt: string;
}

export function barriersForMode(mode: EntryScanMode): { over: number; under: number } {
    return mode === '01-08' ? { over: 1, under: 8 } : { over: 2, under: 7 };
}

export function heroCopy(mode: EntryScanMode): string {
    const { over, under } = barriersForMode(mode);
    return `Scans Over ${over} and Under ${under} with recovery confirmation.`;
}

export function digitsFromPrices(prices: Array<string | number>): number[] {
    return prices.map(price => lastDigitFromQuote(Number(price)));
}

export function scoreDigits(digits: number[], over: number, under: number): Omit<EntryMarketScore, 'symbol' | 'label'> {
    if (digits.length < 2) {
        return {
            side: null,
            contractType: null,
            barrier: null,
            tradeLabel: 'Waiting for scan',
            score: 0,
            ticks: digits.length,
            recovered: false,
        };
    }

    const last = digits[digits.length - 1]!;
    const prev = digits[digits.length - 2]!;
    const overHits = digits.filter(digit => digit > over).length;
    const underHits = digits.filter(digit => digit < under).length;
    const overRatio = overHits / digits.length;
    const underRatio = underHits / digits.length;
    const lastOver = last > over;
    const lastUnder = last < under;
    const recoveredOver = lastOver && prev > over;
    const recoveredUnder = lastUnder && prev < under;
    const overScore = overRatio + (lastOver ? 0.08 : 0) + (recoveredOver ? 0.12 : 0);
    const underScore = underRatio + (lastUnder ? 0.08 : 0) + (recoveredUnder ? 0.12 : 0);

    let pick: 'over' | 'under' | null = null;
    if (recoveredOver !== recoveredUnder) pick = recoveredOver ? 'over' : 'under';
    else if (overScore > underScore) pick = 'over';
    else if (underScore > overScore) pick = 'under';
    else if (lastOver !== lastUnder) pick = lastOver ? 'over' : 'under';

    if (!pick) {
        return {
            side: null,
            contractType: null,
            barrier: null,
            tradeLabel: 'Waiting for scan',
            score: 0,
            ticks: digits.length,
            recovered: false,
        };
    }

    const recovered = pick === 'over' ? recoveredOver : recoveredUnder;
    const barrier = pick === 'over' ? over : under;
    const contractType = pick === 'over' ? 'DIGITOVER' : 'DIGITUNDER';
    const score = pick === 'over' ? overScore : underScore;

    return {
        side: pick,
        contractType,
        barrier,
        tradeLabel: pick === 'over' ? `Over ${over}` : `Under ${under}`,
        score,
        ticks: digits.length,
        recovered,
    };
}

export function scoreMarket(
    symbol: string,
    prices: Array<string | number>,
    mode: EntryScanMode
): EntryMarketScore {
    const market = ULTIMATE_BOT_MARKETS.find(item => item.id === symbol);
    const { over, under } = barriersForMode(mode);
    return {
        symbol,
        label: market?.label ?? symbol,
        ...scoreDigits(digitsFromPrices(prices), over, under),
    };
}

export function pickBestMarket(scores: EntryMarketScore[]): EntryMarketScore | null {
    const viable = scores.filter(item => item.side && item.score > 0);
    if (!viable.length) return null;
    const recovered = viable.filter(item => item.recovered);
    const pool = recovered.length ? recovered : viable;
    return [...pool].sort((left, right) => right.score - left.score || right.ticks - left.ticks)[0] ?? null;
}

export function toScanResult(score: EntryMarketScore, mode: EntryScanMode): EntryScanResult | null {
    if (!score.side || !score.contractType || score.barrier == null) return null;
    return {
        mode,
        symbol: score.symbol,
        label: score.label,
        contractType: score.contractType,
        barrier: score.barrier,
        tradeLabel: score.tradeLabel,
        score: score.score,
        ticks: score.ticks,
        recovered: score.recovered,
        savedAt: new Date().toISOString(),
    };
}

export function readSavedScan(): EntryScanResult | null {
    try {
        const raw = window.sessionStorage.getItem(ENTRY_SCAN_KEY);
        if (!raw) return null;
        const saved = JSON.parse(raw) as Partial<EntryScanResult>;
        if (saved.mode !== '01-08' && saved.mode !== '02-07') return null;
        if (!saved.symbol || !saved.tradeLabel || !saved.contractType) return null;
        return saved as EntryScanResult;
    } catch {
        return null;
    }
}

export function writeSavedScan(result: EntryScanResult): void {
    window.sessionStorage.setItem(ENTRY_SCAN_KEY, JSON.stringify(result));
}
