import { describe, expect, it } from "vitest";
import { streamGranularityFromRequest } from "@/hooks/useSmartChartFeed";

describe("streamGranularityFromRequest", () => {
  it("uses 0 for tick streams when granularity is omitted", () => {
    expect(streamGranularityFromRequest({ symbol: "R_100", style: "ticks" })).toBe(0);
  });

  it("keeps candle granularity when provided", () => {
    expect(
      streamGranularityFromRequest({ symbol: "R_100", style: "candles", granularity: 60 }),
    ).toBe(60);
  });

  it("returns null when symbol is missing", () => {
    expect(streamGranularityFromRequest({ style: "ticks" })).toBeNull();
  });
});
