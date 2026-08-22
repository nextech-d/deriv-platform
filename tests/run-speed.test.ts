import { describe, expect, it } from "vitest";
import { applyRunSpeedToSnapshot, runSpeedDelayMs } from "@/lib/bot/run-speed";
import { DEFAULT_BUILDER_SNAPSHOT } from "@/lib/terminal/strategy-seed";

describe("runSpeedDelayMs", () => {
  it("returns zero for fast mode", () => {
    expect(runSpeedDelayMs("fast")).toBe(0);
  });

  it("returns a short pause for slow mode", () => {
    expect(runSpeedDelayMs("slow")).toBeGreaterThan(0);
  });
});

describe("applyRunSpeedToSnapshot", () => {
  it("enables tick trading in fast mode", () => {
    const tuned = applyRunSpeedToSnapshot(DEFAULT_BUILDER_SNAPSHOT, "fast");
    expect(tuned.tradeEachTick).toBe(true);
    expect(tuned.cooldownTicks).toBe(0);
  });

  it("adds cooldown in slow mode", () => {
    const tuned = applyRunSpeedToSnapshot(DEFAULT_BUILDER_SNAPSHOT, "slow");
    expect(tuned.tradeEachTick).toBe(false);
    expect(tuned.cooldownTicks).toBeGreaterThanOrEqual(8);
  });
});
