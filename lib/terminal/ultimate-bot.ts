import { lastDigitFromQuote } from "@/lib/terminal/analysis-tool";
import { FAST_MIN_STAKE, FAST_PAYOUT, clampFastStake } from "@/lib/terminal/fast-trader";
import type { TickEvent } from "@/lib/ws/protocol";

export interface UltimateInitial {
  id: string;
  label: string;
  over: number;
  under: number;
  window: number;
}

export interface UltimateRecovery {
  id: string;
  label: string;
  family: "even_odd" | "rise_fall" | "over_under";
  mode: "pattern" | "percent";
  invert: boolean;
}

export interface UltimateSide {
  contractType: string;
  label: string;
  barrier?: number;
  lastDigitPrediction?: number;
}

export const ULTIMATE_MIN_STAKE = FAST_MIN_STAKE;
export const ULTIMATE_PAYOUT = FAST_PAYOUT;

export const ULTIMATE_INITIAL: UltimateInitial[] = [
  { id: "OU_1_8_LAST2", label: "Over 1 / Under 8 · last 2", over: 1, under: 8, window: 2 },
  { id: "OU_2_7_LAST3", label: "Over 2 / Under 7 · last 3", over: 2, under: 7, window: 3 },
  { id: "OU_2_7_LAST4", label: "Over 2 / Under 7 · last 4", over: 2, under: 7, window: 4 },
  { id: "OU_2_7_LAST5", label: "Over 2 / Under 7 · last 5", over: 2, under: 7, window: 5 },
  { id: "OU_3_6_LAST4", label: "Over 3 / Under 6 · last 4", over: 3, under: 6, window: 4 },
];

export const ULTIMATE_RECOVERY: UltimateRecovery[] = [
  { id: "EO_PATTERN_CONTINUE", label: "Even / Odd · continue trend", family: "even_odd", mode: "pattern", invert: false },
  { id: "EO_PATTERN_REVERSAL", label: "Even / Odd · reverse trend", family: "even_odd", mode: "pattern", invert: true },
  { id: "EO_PCT_CONTINUE", label: "Even / Odd · strongest side", family: "even_odd", mode: "percent", invert: false },
  { id: "EO_PCT_OPPOSITE", label: "Even / Odd · opposite side", family: "even_odd", mode: "percent", invert: true },
  { id: "RF_PATTERN_FOLLOW", label: "Rise / Fall · follow tape", family: "rise_fall", mode: "pattern", invert: false },
  { id: "RF_PATTERN_REVERSE", label: "Rise / Fall · reverse tape", family: "rise_fall", mode: "pattern", invert: true },
  { id: "RF_PCT_CONTINUE", label: "Rise / Fall · strongest side", family: "rise_fall", mode: "percent", invert: false },
  { id: "RF_PCT_OPPOSITE", label: "Rise / Fall · opposite side", family: "rise_fall", mode: "percent", invert: true },
  { id: "OU_PATTERN_CONTINUE", label: "Over / Under · continue", family: "over_under", mode: "pattern", invert: false },
  { id: "OU_PATTERN_REVERSE", label: "Over / Under · reverse", family: "over_under", mode: "pattern", invert: true },
  { id: "OU_PCT_CONTINUE", label: "Over / Under · strongest side", family: "over_under", mode: "percent", invert: false },
  { id: "OU_PCT_OPPOSITE", label: "Over / Under · opposite side", family: "over_under", mode: "percent", invert: true },
];

export function clampUltimateWindow(value: number): number {
  if (!Number.isFinite(value)) return 7;
  return Math.max(2, Math.min(20, Math.round(value)));
}

export function clampMartMultiplier(value: number): number {
  if (!Number.isFinite(value) || value < 1) return 2;
  return Math.min(5, Math.round(value * 100) / 100);
}

export function ultimateStake(base: number, losses: number, martingale: boolean, multiplier: number): number {
  const sized = martingale
    ? clampFastStake(base) * clampMartMultiplier(multiplier) ** Math.min(Math.max(0, losses), 4)
    : clampFastStake(base);
  return Math.round(sized * 100) / 100;
}

export function digitsFromTicks(ticks: Array<{ quote: number }>, window: number): number[] {
  return ticks.slice(-Math.max(1, window)).map((tick) => lastDigitFromQuote(tick.quote));
}

function overUnderSide(
  digits: number[],
  over: number,
  under: number,
  invert: boolean,
): { over: boolean; under: boolean; side: UltimateSide | null } {
  if (!digits.length) return { over: false, under: false, side: null };
  const last = digits[digits.length - 1]!;
  const overHits = digits.filter((digit) => digit > over).length;
  const underHits = digits.filter((digit) => digit < under).length;
  const need = Math.ceil(digits.length / 2);
  const overOn = last > over && overHits >= need;
  const underOn = last < under && underHits >= need;
  let pick: "over" | "under" | null = null;
  if (overOn && underOn) pick = overHits >= underHits ? "over" : "under";
  else if (overOn) pick = "over";
  else if (underOn) pick = "under";
  if (pick && invert) pick = pick === "over" ? "under" : "over";
  const side =
    pick === "over"
      ? { contractType: "DIGITOVER", label: `Over ${over}`, barrier: over }
      : pick === "under"
        ? { contractType: "DIGITUNDER", label: `Under ${under}`, barrier: under }
        : null;
  return { over: overOn, under: underOn, side };
}

export function ultimateInitialScan(digits: number[], spec: UltimateInitial) {
  return overUnderSide(digits.slice(-spec.window), spec.over, spec.under, false);
}

function invertSide(side: UltimateSide | null): UltimateSide | null {
  if (!side) return null;
  if (side.contractType === "DIGITEVEN") return { contractType: "DIGITODD", label: "Odd" };
  if (side.contractType === "DIGITODD") return { contractType: "DIGITEVEN", label: "Even" };
  if (side.contractType === "CALL") return { contractType: "PUT", label: "Fall" };
  if (side.contractType === "PUT") return { contractType: "CALL", label: "Rise" };
  if (side.contractType === "DIGITOVER" && side.barrier != null) {
    return { contractType: "DIGITUNDER", label: `Under ${side.barrier}`, barrier: side.barrier };
  }
  if (side.contractType === "DIGITUNDER" && side.barrier != null) {
    return { contractType: "DIGITOVER", label: `Over ${side.barrier}`, barrier: side.barrier };
  }
  return side;
}

export function ultimateRecoveryScan(
  ticks: TickEvent[],
  spec: UltimateRecovery,
  window: number,
  over: number,
  under: number,
): UltimateSide | null {
  const slice = ticks.slice(-Math.max(2, window));
  if (slice.length < 2) return null;
  const digits = digitsFromTicks(slice, window);

  if (spec.family === "even_odd") {
    const last = digits.at(-1);
    if (last == null) return null;
    const even = digits.filter((digit) => digit % 2 === 0).length;
    const odd = digits.length - even;
    let side: UltimateSide =
      spec.mode === "pattern"
        ? last % 2 === 0
          ? { contractType: "DIGITEVEN", label: "Even" }
          : { contractType: "DIGITODD", label: "Odd" }
        : even >= odd
          ? { contractType: "DIGITEVEN", label: "Even" }
          : { contractType: "DIGITODD", label: "Odd" };
    return spec.invert ? invertSide(side) : side;
  }

  if (spec.family === "rise_fall") {
    const quotes = slice.map((tick) => tick.quote);
    const lastUp = quotes[quotes.length - 1]! > quotes[quotes.length - 2]!;
    let up = 0;
    for (let i = 1; i < quotes.length; i += 1) {
      if (quotes[i]! > quotes[i - 1]!) up += 1;
    }
    const down = quotes.length - 1 - up;
    let side: UltimateSide =
      spec.mode === "pattern"
        ? lastUp
          ? { contractType: "CALL", label: "Rise" }
          : { contractType: "PUT", label: "Fall" }
        : up >= down
          ? { contractType: "CALL", label: "Rise" }
          : { contractType: "PUT", label: "Fall" };
    return spec.invert ? invertSide(side) : side;
  }

  const scanned = overUnderSide(digits, over, under, spec.invert);
  return scanned.side;
}

export function ultimateWins(side: UltimateSide, exitDigit: number, exitQuote: number, entryQuote: number): boolean {
  switch (side.contractType) {
    case "DIGITEVEN":
      return exitDigit % 2 === 0;
    case "DIGITODD":
      return exitDigit % 2 === 1;
    case "DIGITOVER":
      return side.barrier != null && exitDigit > side.barrier;
    case "DIGITUNDER":
      return side.barrier != null && exitDigit < side.barrier;
    case "CALL":
      return exitQuote > entryQuote;
    case "PUT":
      return exitQuote < entryQuote;
    default:
      return false;
  }
}

export function ultimatePnl(win: boolean, stake: number): number {
  return Number((win ? stake * ULTIMATE_PAYOUT : -stake).toFixed(2));
}

export function ultimateFamily(side: UltimateSide): "even_odd" | "over_under" | "rise_fall" {
  if (side.contractType === "DIGITEVEN" || side.contractType === "DIGITODD") return "even_odd";
  if (side.contractType === "CALL" || side.contractType === "PUT") return "rise_fall";
  return "over_under";
}
