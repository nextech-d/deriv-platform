import { describe, expect, it } from "vitest";
import {
  mergeChartReferenceData,
  tradingTimesFromDerivApi,
} from "@/lib/chart/active-symbols";

describe("tradingTimesFromDerivApi", () => {
  it("parses nested Deriv markets response", () => {
    const map = tradingTimesFromDerivApi({
      markets: [
        {
          submarkets: [
            {
              symbols: [
                {
                  symbol: "R_100",
                  exchange_is_open: 1,
                  times: { open: ["00:00:00"], close: ["23:59:59"] },
                },
                {
                  symbol: "frxEURUSD",
                  exchange_is_open: 1,
                  times: { open: ["00:00:00"], close: ["23:59:59"] },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(map.R_100).toEqual({
      isOpen: true,
      openTime: "00:00:00",
      closeTime: "23:59:59",
    });
  });
});

describe("mergeChartReferenceData", () => {
  it("keeps fallback symbols and fills trading times", () => {
    const { activeSymbols, tradingTimes } = mergeChartReferenceData([], {});

    expect(activeSymbols.some((row) => row.symbol === "R_100")).toBe(true);
    expect(activeSymbols.find((row) => row.symbol === "R_100")?.delay_amount).toBe(0);
    expect(tradingTimes.R_100?.isOpen).toBe(true);
  });
});
