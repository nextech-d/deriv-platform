import { describe, expect, it } from "vitest";
import {
  BULK_AUTO_CONDITION_DEFAULT,
  BULK_AUTO_RISK_DEFAULT,
  BULK_DEFAULT_STAKE,
  BULK_MIN_STAKE,
  BULK_SCANNER_DEFAULT,
  bulkConditionMet,
  bulkLastDigit,
  bulkMartingaleStake,
  bulkPair,
  bulkPipSize,
  bulkPayout,
  bulkRiskStop,
  bulkScannerSignal,
  bulkWinRates,
  clampBulkCount,
  clampBulkDigit,
  clampBulkStake,
  clampBulkWindow,
} from "@/lib/terminal/bulk-trader";

describe("bulk clamps", () => {
  it("keeps bulk count between 1 and 20", () => {
    expect(clampBulkCount(0)).toBe(1);
    expect(clampBulkCount(3.6)).toBe(4);
    expect(clampBulkCount(99)).toBe(20);
    expect(clampBulkCount(Number.NaN)).toBe(1);
  });

  it("keeps the sample window between 10 and 5000", () => {
    expect(clampBulkWindow(1)).toBe(10);
    expect(clampBulkWindow(120)).toBe(120);
    expect(clampBulkWindow(9000)).toBe(5000);
  });

  it("keeps stake at or above the Deriv floor", () => {
    expect(clampBulkStake(0.1)).toBe(BULK_MIN_STAKE);
    expect(clampBulkStake(0.555)).toBe(0.56);
    expect(clampBulkStake(Number.NaN)).toBe(BULK_DEFAULT_STAKE);
  });

  it("keeps prediction digits in 0–9", () => {
    expect(clampBulkDigit(-2)).toBe(0);
    expect(clampBulkDigit(12)).toBe(9);
  });
});

describe("bulk pip last digit", () => {
  it("uses pip 3 on R_10 / R_25 and pip 4 on R_50 / R_75", () => {
    expect(bulkPipSize("R_10")).toBe(3);
    expect(bulkPipSize("R_25")).toBe(3);
    expect(bulkPipSize("R_50")).toBe(4);
    expect(bulkPipSize("R_75")).toBe(4);
    expect(bulkPipSize("R_100")).toBe(2);
  });

  it("takes the last fixed decimal, including toFixed rounding", () => {
    expect(bulkLastDigit(3390.42, 2)).toBe(2);
    expect(bulkLastDigit(3390.425, 2)).toBe(3);
    expect(bulkLastDigit(123.4567, 3)).toBe(7);
  });
});

describe("bulk trade math", () => {
  it("pairs even/odd, over/under, and matches/differs", () => {
    expect(bulkPair("evenodd")).toEqual(["DIGITEVEN", "DIGITODD"]);
    expect(bulkPair("overunder")).toEqual(["DIGITOVER", "DIGITUNDER"]);
    expect(bulkPair("matchesdiffers")).toEqual(["DIGITMATCH", "DIGITDIFF"]);
  });

  it("prices payout at 95% of stake", () => {
    expect(bulkPayout(1)).toBe(1.95);
    expect(bulkPayout(0.5)).toBe(0.97);
  });

  it("sums even/odd and over/under from digit percentages", () => {
    const pcts = [10, 5, 10, 5, 10, 5, 10, 5, 10, 30];
    const rates = bulkWinRates(pcts, 5);
    expect(rates.DIGITEVEN).toBe(50);
    expect(rates.DIGITODD).toBe(50);
    expect(rates.DIGITOVER).toBe(55);
    expect(rates.DIGITUNDER).toBe(40);
    expect(rates.DIGITMATCH).toBe(5);
    expect(rates.DIGITDIFF).toBe(95);
  });
});

describe("bulk auto trader", () => {
  it("waits until the last N digits are all even", () => {
    const condition = { ...BULK_AUTO_CONDITION_DEFAULT, window: 3, evenMode: "all_even" as const };
    expect(bulkConditionMet([1, 2, 4], condition)).toBe(false);
    expect(bulkConditionMet([8, 2, 4], condition)).toBe(true);
    expect(bulkConditionMet([2, 4], condition)).toBe(false);
  });

  it("fires over/under when every digit in the window clears the comparator", () => {
    const greater = {
      ...BULK_AUTO_CONDITION_DEFAULT,
      family: "overunder" as const,
      window: 2,
      comparator: "greater" as const,
      thresholdDigit: 5,
    };
    expect(bulkConditionMet([6, 8], greater)).toBe(true);
    expect(bulkConditionMet([6, 5], greater)).toBe(false);
  });

  it("raises stake after a loss only when martingale is on", () => {
    const off = { ...BULK_AUTO_RISK_DEFAULT, useMartingale: false, baseStake: 0.5, multiplier: 2 };
    const on = { ...off, useMartingale: true };
    expect(bulkMartingaleStake(0.5, false, off)).toBe(0.5);
    expect(bulkMartingaleStake(0.5, false, on)).toBe(1);
    expect(bulkMartingaleStake(1, true, on)).toBe(0.5);
  });

  it("stops auto trading at stop-loss and take-profit", () => {
    const risk = { ...BULK_AUTO_RISK_DEFAULT, stopLoss: 2, takeProfit: 3 };
    expect(bulkRiskStop(-2, risk)).toBe("stop_loss");
    expect(bulkRiskStop(3, risk)).toBe("take_profit");
    expect(bulkRiskStop(-1.99, risk)).toBeNull();
  });
});

describe("bulk scanner", () => {
  it("buys over when the last sample is all at or below the low threshold", () => {
    expect(bulkScannerSignal([9, 0, 1, 2, 2], BULK_SCANNER_DEFAULT)).toEqual({
      contractType: "DIGITOVER",
      prediction: 2,
    });
  });

  it("buys under when the last sample is all at or above the high threshold", () => {
    expect(bulkScannerSignal([1, 7, 8, 9, 7], BULK_SCANNER_DEFAULT)).toEqual({
      contractType: "DIGITUNDER",
      prediction: 7,
    });
  });

  it("stays idle without a full sample or a clean run", () => {
    expect(bulkScannerSignal([1, 2, 3], BULK_SCANNER_DEFAULT)).toBeNull();
    expect(bulkScannerSignal([1, 8, 2, 9], BULK_SCANNER_DEFAULT)).toBeNull();
  });
});
