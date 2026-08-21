import { describe, expect, it } from "vitest";
import { smartChartTickQuote } from "@/lib/chart/smartchart-quotes";

describe("smartChartTickQuote", () => {
  it("formats live ticks the way SmartCharts champion expects", () => {
    const quote = smartChartTickQuote(1_722_000_000, 624.72);
    expect(quote.Date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(quote.Close).toBe(624.72);
    expect(quote.tick).toEqual({ quote: 624.72, epoch: 1_722_000_000 });
    expect(quote.DT).toBeInstanceOf(Date);
  });
});
