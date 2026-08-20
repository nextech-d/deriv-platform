import { describe, expect, it } from "vitest";
import {
  analyzeBarrier,
  analyzeFrequency,
  analyzeMatches,
  analyzeParity,
  digitsFromQuotes,
  lastDigitFromQuote,
} from "@/lib/terminal/analysis-tool";

describe("lastDigitFromQuote", () => {
  it("matches Deriv pip rounding (toFixed then last char)", () => {
    expect(lastDigitFromQuote(3390.42, 2)).toBe(2);
    expect(lastDigitFromQuote(3390.425, 2)).toBe(3);
    expect(lastDigitFromQuote(12.3401, 3)).toBe(0);
  });

  it("falls back to pip 2 when pip size is not a number", () => {
    expect(lastDigitFromQuote(10.25, Number.NaN)).toBe(5);
  });
});

describe("digitsFromQuotes", () => {
  it("keeps only the last N ticks and stamps each digit", () => {
    const samples = digitsFromQuotes(
      [
        { quote: 1.11, epoch: 1 },
        { quote: 1.12, epoch: 2 },
        { quote: 1.13, epoch: 3 },
      ],
      2,
      2,
    );
    expect(samples.map((sample) => sample.digit)).toEqual([2, 3]);
    expect(samples[1]?.epoch).toBe(3);
  });
});

describe("digit stats", () => {
  const digits = digitsFromQuotes(
    [{ quote: 1.1 }, { quote: 1.3 }, { quote: 1.5 }, { quote: 1.4 }],
    40,
    1,
  );

  it("counts even/odd and the live streak", () => {
    const parity = analyzeParity(digits);
    expect(parity.evenCount).toBe(1);
    expect(parity.oddCount).toBe(3);
    expect(parity.streakSide).toBe("even");
    expect(parity.streakLength).toBe(1);
    expect(parity.lastDigit).toBe(4);
  });

  it("splits over/under around the barrier", () => {
    const barrier = analyzeBarrier(digits, 4);
    expect(barrier.overCount).toBe(1);
    expect(barrier.underCount).toBe(3);
  });

  it("ranks hot and cold digits", () => {
    const freq = analyzeFrequency(digits);
    expect(freq.counts[1]).toBe(1);
    expect(freq.counts[4]).toBe(1);
    expect(freq.hot).toHaveLength(3);
    expect(freq.cold).toHaveLength(3);
  });

  it("counts matches against a target digit", () => {
    const matches = analyzeMatches(digits, 1);
    expect(matches.matchCount).toBe(1);
    expect(matches.differCount).toBe(3);
    expect(matches.matchPct).toBe(25);
  });
});
