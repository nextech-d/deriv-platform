export type AnalysisMode = "parity" | "barrier" | "matches" | "frequency";

export interface DigitSample {
  digit: number;
  quote: number;
  epoch?: number;
}

export interface ParityStats {
  window: number;
  evenCount: number;
  oddCount: number;
  evenPct: number;
  oddPct: number;
  lastDigit: number | null;
  streakSide: "even" | "odd" | null;
  streakLength: number;
}

export interface BarrierStats {
  window: number;
  barrier: number;
  overCount: number;
  underCount: number;
  overPct: number;
  underPct: number;
}

export interface FrequencyStats {
  window: number;
  counts: number[];
  hot: number[];
  cold: number[];
}

function roundPct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 10_000) / 100;
}

/** Last decimal digit of a quote (Deriv-style digit contracts). */
export function lastDigitFromQuote(quote: number): number {
  const scaled = Math.round(Math.abs(quote) * 100);
  return scaled % 10;
}

export function digitsFromQuotes(
  quotes: Array<{ quote: number; epoch?: number }>,
  limit = 40,
): DigitSample[] {
  const slice = quotes.slice(-limit);
  return slice.map((tick) => ({
    digit: lastDigitFromQuote(tick.quote),
    quote: tick.quote,
    epoch: tick.epoch,
  }));
}

export function analyzeParity(digits: DigitSample[]): ParityStats {
  const window = digits.length;
  let evenCount = 0;
  for (const sample of digits) {
    if (sample.digit % 2 === 0) evenCount += 1;
  }
  const oddCount = window - evenCount;
  const lastDigit = window ? digits[window - 1]!.digit : null;

  let streakSide: "even" | "odd" | null = null;
  let streakLength = 0;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    const side = digits[i]!.digit % 2 === 0 ? "even" : "odd";
    if (!streakSide) {
      streakSide = side;
      streakLength = 1;
      continue;
    }
    if (side !== streakSide) break;
    streakLength += 1;
  }

  return {
    window,
    evenCount,
    oddCount,
    evenPct: roundPct(evenCount, window),
    oddPct: roundPct(oddCount, window),
    lastDigit,
    streakSide,
    streakLength,
  };
}

export function analyzeBarrier(
  digits: DigitSample[],
  barrier: number,
): BarrierStats {
  const window = digits.length;
  let overCount = 0;
  for (const sample of digits) {
    if (sample.digit > barrier) overCount += 1;
  }
  const underCount = window - overCount;
  return {
    window,
    barrier,
    overCount,
    underCount,
    overPct: roundPct(overCount, window),
    underPct: roundPct(underCount, window),
  };
}

export function analyzeFrequency(digits: DigitSample[]): FrequencyStats {
  const counts = Array.from({ length: 10 }, () => 0);
  for (const sample of digits) {
    counts[sample.digit] = (counts[sample.digit] ?? 0) + 1;
  }
  const ranked = counts
    .map((count, digit) => ({ digit, count }))
    .sort((a, b) => b.count - a.count || a.digit - b.digit);
  return {
    window: digits.length,
    counts,
    hot: ranked.slice(0, 3).map((row) => row.digit),
    cold: ranked.slice(-3).reverse().map((row) => row.digit),
  };
}

export function analyzeMatches(digits: DigitSample[], target: number) {
  const window = digits.length;
  let matches = 0;
  for (const sample of digits) {
    if (sample.digit === target) matches += 1;
  }
  return {
    window,
    target,
    matchCount: matches,
    differCount: window - matches,
    matchPct: roundPct(matches, window),
    differPct: roundPct(window - matches, window),
  };
}
