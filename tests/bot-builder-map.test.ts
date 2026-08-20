import { describe, expect, it, beforeEach } from "vitest";
import { BOT_BUILDER_TOOLBOX } from "@/lib/terminal/bot-builder";
import { effectForBuilderBlock } from "@/lib/terminal/builder-block-map";
import {
  writeBuilderHandoff,
  consumeBuilderHandoff,
  clearBuilderHandoff,
  writeBuilderRunAfter,
  consumeBuilderRunAfter,
} from "@/lib/terminal/desk-handoff";
import {
  DEFAULT_BUILDER_SNAPSHOT,
  courseStrategyToSnapshot,
  snapshotToBotConfig,
  speedBotSnapshot,
  quickStrategyToSnapshot,
  validateQuickStrategy,
  workspaceChipsForSnapshot,
} from "@/lib/terminal/strategy-seed";
import { COURSE_STRATEGIES } from "@/lib/terminal/deriv-course";

function block(id: string) {
  for (const category of BOT_BUILDER_TOOLBOX) {
    const found = category.blocks.find((item) => item.id === id);
    if (found) return found;
  }
  throw new Error(`Missing block ${id}`);
}

describe("builder block map", () => {
  const ctx = { snapshot: DEFAULT_BUILDER_SNAPSHOT, lastDigit: 7, balance: { amount: 100, currency: "USD" } };

  it("maps Even/Odd analysis onto the parity runner", () => {
    const effect = effectForBuilderBlock(block("parity-logic"), ctx);
    expect(effect.patch?.tradeType).toBe("Even/Odd");
    expect(effect.patch?.botStrategy).toBe("parity_bias");
    const config = snapshotToBotConfig({
      ...DEFAULT_BUILDER_SNAPSHOT,
      ...effect.patch,
    });
    expect(config.strategy).toBe("parity_bias");
    expect(config.tradeType).toBe("Even/Odd");
  });

  it("maps RSI onto the RSI runner with periods", () => {
    const effect = effectForBuilderBlock(block("ind-rsi"), ctx);
    expect(effect.patch?.botStrategy).toBe("rsi_threshold");
    expect(effect.patch?.rsiPeriod).toBe(14);
    const config = snapshotToBotConfig({
      ...DEFAULT_BUILDER_SNAPSHOT,
      ...effect.patch,
    });
    expect(config.strategy).toBe("rsi_threshold");
    expect(config.rsiPeriod).toBe(14);
  });

  it("maps sell-at-market and stop-after-loss onto the runner", () => {
    const sell = effectForBuilderBlock(block("sell-at-market"), ctx);
    expect(sell.patch?.sellAction).toBe("sell_at_market");
    const stop = effectForBuilderBlock(block("stop-after-loss"), ctx);
    expect(stop.patch?.restartAction).toBe("stop");
  });

  it("maps last-digit onto Matches when already on a digit lane", () => {
    const effect = effectForBuilderBlock(block("tick-last-digit"), {
      ...ctx,
      snapshot: { ...DEFAULT_BUILDER_SNAPSHOT, tradeType: "Even/Odd" },
    });
    expect(effect.patch?.digitTarget).toBe(7);
    expect(effect.patch?.tradeType).toBe("Matches");
  });

  it("maps virtual hook toggle", () => {
    const on = effectForBuilderBlock(block("virtual-hook-switcher"), ctx);
    expect(on.patch?.virtualHook).toBe(true);
    const off = effectForBuilderBlock(block("virtual-hook-switcher"), {
      ...ctx,
      snapshot: { ...DEFAULT_BUILDER_SNAPSHOT, virtualHook: true },
    });
    expect(off.patch?.virtualHook).toBe(false);
  });

  it("maps account-balance to the live wallet notice", () => {
    const effect = effectForBuilderBlock(block("stats-balance"), ctx);
    expect(effect.notice).toContain("100.00 USD");
  });
});

describe("strategy seeds", () => {
  it("Speed Bot snapshot is martingale recovery on a real market", () => {
    const snapshot = speedBotSnapshot();
    expect(snapshot.sourceLabel).toBe("Dashboard · Speed Bot");
    expect(snapshot.virtualHook).toBe(true);
    expect(snapshot.quickStrategy?.type).toBe("martingale");
    const config = snapshotToBotConfig(snapshot);
    expect(config.virtualHook).toBe(true);
    expect(config.quickStrategy?.type).toBe("martingale");
  });

  it("course Martingale copies stake and multiplier into the runner", () => {
    const strategy = COURSE_STRATEGIES.find((item) => item.id === "martingale")!;
    const snapshot = courseStrategyToSnapshot(strategy, {
      stake: 0.5,
      multiplier: 2.5,
      takeProfit: 12,
      stopLoss: 8,
    });
    expect(snapshot.virtualHook).toBe(true);
    expect(snapshot.quickStrategy?.type).toBe("martingale");
    expect(snapshot.quickStrategy?.size).toBe(2.5);
    expect(snapshot.quickStrategy?.profitThreshold).toBe(12);
    expect(snapshotToBotConfig(snapshot).stake).toBe(0.5);
  });

  it("maps quick strategy parameters onto the snapshot, chips, and runner", () => {
    const snapshot = quickStrategyToSnapshot({
      type: "martingale",
      market: "Volatility 75 Index",
      tradeType: "Even/Odd",
      purchase: "Odd",
      duration: "5",
      durationUnit: "t",
      stake: "1.25",
      params: { size: 2.1, profitThreshold: 20, lossThreshold: 8, maxStake: 40 },
    });
    expect(validateQuickStrategy(snapshot)).toBeNull();
    expect(snapshot.symbol).toBe("R_75");
    expect(snapshot.botStrategy).toBe("parity_bias");
    expect(snapshot.virtualHook).toBe(true);
    expect(snapshot.sourceLabel).toBe("Quick strategy · Martingale");
    const config = snapshotToBotConfig(snapshot);
    expect(config.strategy).toBe("parity_bias");
    expect(config.stake).toBe(1.25);
    expect(config.duration).toBe(5);
    expect(config.quickStrategy?.size).toBe(2.1);
    expect(config.quickStrategy?.profitThreshold).toBe(20);
    expect(config.purchase).toBe("Odd");
    const chips = workspaceChipsForSnapshot(snapshot);
    expect(chips.map((chip) => chip.label)).toEqual(
      expect.arrayContaining(["Even/Odd", "Volatility 75 Index", "Purchase Odd", "Martingale recovery"]),
    );
  });

  it("rejects invalid quick strategy stake and size", () => {
    expect(
      validateQuickStrategy(quickStrategyToSnapshot({ type: "martingale", stake: "0.10" })),
    ).toMatch(/0\.35/);
    expect(
      validateQuickStrategy(
        quickStrategyToSnapshot({
          type: "martingale",
          params: { size: 1 },
        }),
      ),
    ).toMatch(/greater than 1/);
  });
});

describe("builder handoff", () => {
  beforeEach(() => {
    clearBuilderHandoff();
    writeBuilderRunAfter(false);
  });

  it("consumeBuilderHandoff returns once then clears", () => {
    writeBuilderHandoff(speedBotSnapshot());
    const first = consumeBuilderHandoff();
    expect(first?.sourceLabel).toBe("Dashboard · Speed Bot");
    expect(consumeBuilderHandoff()).toBeNull();
  });

  it("consumeBuilderRunAfter returns once then clears", () => {
    writeBuilderRunAfter();
    expect(consumeBuilderRunAfter()).toBe(true);
    expect(consumeBuilderRunAfter()).toBe(false);
  });
});
