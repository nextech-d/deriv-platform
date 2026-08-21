import { describe, expect, it } from "vitest";
import { isSyntheticChartSymbol } from "@/lib/chart/synthetic-symbols";

describe("isSyntheticChartSymbol", () => {
  it("matches volatility indices", () => {
    expect(isSyntheticChartSymbol("R_100")).toBe(true);
    expect(isSyntheticChartSymbol("R_10")).toBe(true);
    expect(isSyntheticChartSymbol("1HZ100V")).toBe(true);
  });

  it("skips forex", () => {
    expect(isSyntheticChartSymbol("frxEURUSD")).toBe(false);
  });
});
