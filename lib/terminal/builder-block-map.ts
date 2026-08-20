import type { BuilderBlockDef } from "@/lib/terminal/bot-builder";
import type { BotBuilderSnapshot } from "@/lib/terminal/strategy-seed";
import { formatWalletBalance } from "@/lib/utils/format-wallet";

export type BuilderLane = "trade" | "purchase" | "sell" | "restart";
export type BuilderSummaryTab = "summary" | "transactions" | "journal";

export interface BuilderBlockContext {
  snapshot: BotBuilderSnapshot;
  lastDigit?: number | null;
  balance?: { amount: number; currency: string } | null;
}

export interface BuilderBlockEffect {
  patch?: Partial<BotBuilderSnapshot>;
  focus?: BuilderLane;
  lane: BuilderLane;
  notice: string;
  journal?: string;
  summaryTab?: BuilderSummaryTab;
}

function laneForAction(action: BuilderBlockDef["action"]): BuilderLane {
  if (action === "focus-sell") return "sell";
  if (action === "focus-restart") return "restart";
  if (action === "focus-purchase" || action.startsWith("add-")) return "purchase";
  return "trade";
}

function patchEffect(
  block: BuilderBlockDef,
  patch: Partial<BotBuilderSnapshot>,
  notice: string,
  extras?: Partial<BuilderBlockEffect>,
): BuilderBlockEffect {
  return {
    patch,
    focus: extras?.focus ?? laneForAction(block.action),
    lane: extras?.lane ?? extras?.focus ?? laneForAction(block.action),
    notice,
    journal: extras?.journal ?? `Block · ${block.label}`,
    summaryTab: extras?.summaryTab,
  };
}

function marker(
  block: BuilderBlockDef,
  notice: string,
  extras?: Partial<BuilderBlockEffect>,
): BuilderBlockEffect {
  return {
    focus: extras?.focus ?? laneForAction(block.action),
    lane: extras?.lane ?? extras?.focus ?? laneForAction(block.action),
    notice,
    journal: extras?.journal ?? `Added · ${block.label}`,
    summaryTab: extras?.summaryTab,
  };
}

/**
 * Maps a toolbox block onto the live snapshot / runner.
 * Analysis decides WHEN; trade parameters decide WHAT; restart/sell decide AFTER.
 */
export function effectForBuilderBlock(
  block: BuilderBlockDef,
  ctx: BuilderBlockContext,
): BuilderBlockEffect {
  const { snapshot } = ctx;

  switch (block.action) {
    case "focus-trade":
      if (
        block.id === "multiplier-options" ||
        block.id === "take-profit-multiplier" ||
        block.id === "stop-loss-multiplier"
      ) {
        return patchEffect(
          block,
          { tradeOptionsMode: "multiplier" },
          `Trade options · ${block.label}`,
          { focus: "trade" },
        );
      }
      if (block.id === "accumulator-options" || block.id === "take-profit-accumulator") {
        return patchEffect(
          block,
          { tradeOptionsMode: "accumulator" },
          `Trade options · ${block.label}`,
          { focus: "trade" },
        );
      }
      if (block.id === "trade-options") {
        return patchEffect(
          block,
          { tradeOptionsMode: "vanilla" },
          "Trade options · Duration and stake",
          { focus: "trade" },
        );
      }
      return marker(block, `Opened · ${block.label}`, { focus: "trade" });
    case "focus-purchase":
      return marker(block, `Opened · ${block.label}`, { focus: "purchase" });
    case "focus-sell":
      if (block.id === "during-purchase") {
        return marker(block, `Opened · ${block.label}`, { focus: "sell" });
      }
      return patchEffect(
        block,
        { sellAction: "sell_at_market" },
        `Sell condition · ${block.label}`,
        { focus: "sell" },
      );
    case "focus-restart":
      return patchEffect(
        block,
        { restartAction: block.id === "stop-after-loss" ? "stop" : "trade_again" },
        `Restart · ${block.label}`,
        { focus: "restart" },
      );
    case "set-even-odd":
      return patchEffect(
        block,
        { tradeType: "Even/Odd", purchase: "Even", botStrategy: "parity_bias" },
        block.id === "streak-logic" ? "Lane set · Even/Odd streak flip" : "Lane set · Even/Odd",
        { focus: "trade" },
      );
    case "set-over-under":
      return patchEffect(
        block,
        { tradeType: "Over/Under", purchase: "Over", botStrategy: "barrier_edge" },
        "Lane set · Over/Under",
        { focus: "trade" },
      );
    case "set-matches":
      return patchEffect(
        block,
        { tradeType: "Matches", purchase: "Matches", botStrategy: "digit_match" },
        "Lane set · Matches",
        { focus: "trade" },
      );
    case "set-rise-fall":
      return patchEffect(
        block,
        { tradeType: "Rise/Fall", purchase: "Rise", botStrategy: "ma_cross" },
        "Lane set · Rise/Fall",
        { focus: "trade" },
      );
    case "add-tick":
      return tickEffect(block, ctx);
    case "add-logic":
      return logicEffect(block, ctx);
    case "add-loop":
      return loopEffect(block, ctx);
    case "add-math":
      return mathEffect(block, ctx);
    case "add-notify":
      return marker(block, "Fills will log in Journal", {
        focus: "purchase",
        summaryTab: "journal",
      });
    case "add-variable":
      return marker(block, "Stake and duration on Trade parameters are the live values", {
        focus: "trade",
      });
    case "noop":
      return noopEffect(block, snapshot);
    default:
      return marker(block, `Added · ${block.label}`);
  }
}

function tickEffect(block: BuilderBlockDef, ctx: BuilderBlockContext): BuilderBlockEffect {
  if (block.id === "ind-rsi" || block.id === "ind-rsia") {
    return patchEffect(
      block,
      {
        botStrategy: "rsi_threshold",
        rsiPeriod: 14,
        rsiOversold: 30,
        rsiOverbought: 70,
      },
      "Indicator · RSI (14)",
      { focus: "purchase", journal: `Indicator · ${block.label}` },
    );
  }

  if (block.id.startsWith("ind-")) {
    const maPeriods = block.id === "ind-macda" ? { fast: 12, slow: 26 } : { fast: 5, slow: 20 };
    return patchEffect(
      block,
      {
        botStrategy: "ma_cross",
        fastPeriod: maPeriods.fast,
        slowPeriod: maPeriods.slow,
      },
      `Indicator · MA cross (${maPeriods.fast}/${maPeriods.slow})`,
      { focus: "purchase", journal: `Indicator · ${block.label}` },
    );
  }

  if (block.id === "tick-last-digit" || block.id === "tick-last-digit-list") {
    const digit = ctx.lastDigit ?? ctx.snapshot.digitTarget;
    const digitFamily = ["Even/Odd", "Over/Under", "Matches"].includes(ctx.snapshot.tradeType);
    return patchEffect(
      block,
      digitFamily
        ? { digitTarget: digit, botStrategy: "digit_match", tradeType: "Matches", purchase: "Matches" }
        : { digitTarget: digit },
      `Last digit · ${digit}`,
      { focus: "purchase" },
    );
  }

  if (
    block.id === "tick-direction" ||
    block.id === "tick-check-direction" ||
    block.id === "tick-stat" ||
    block.id === "tick-stat-list"
  ) {
    return patchEffect(
      block,
      { botStrategy: "ma_cross", tradeType: "Rise/Fall" },
      "Direction filter · MA cross",
      { focus: "purchase" },
    );
  }

  if (
    block.id.includes("ohlc") ||
    block.id.includes("candle") ||
    block.id === "tick-is-candle-black"
  ) {
    return patchEffect(
      block,
      { botStrategy: "rsi_threshold", chartMode: "candle" },
      "Candle source · RSI",
      { focus: "purchase" },
    );
  }

  if (block.id === "tick-window" || block.id === "tick-last-tick" || block.id === "tick-ticks-list") {
    return patchEffect(
      block,
      { cooldownTicks: Math.max(2, ctx.snapshot.cooldownTicks || 2) },
      "Tick window · cooldown 2",
      { focus: "purchase" },
    );
  }

  return marker(block, `Tick source · ${block.label}`, { focus: "purchase" });
}

function logicEffect(block: BuilderBlockDef, ctx: BuilderBlockContext): BuilderBlockEffect {
  if (block.id === "contract-check-sell") {
    return patchEffect(
      block,
      { sellAction: "sell_at_market" },
      "Sell is available",
      { focus: "sell" },
    );
  }

  if (block.id === "volatility-gate") {
    return patchEffect(
      block,
      { botStrategy: "rsi_threshold", cooldownTicks: 5 },
      "Volatility gate · RSI + cooldown 5",
      { focus: "purchase" },
    );
  }

  if (
    block.id === "contract-last-result" ||
    block.id === "contract-check-result" ||
    block.id === "ttr-last-tick-result" ||
    block.id === "hedge-last-result"
  ) {
    const hedge = block.id.startsWith("hedge-");
    return patchEffect(
      block,
      {
        restartAction: "trade_again",
        ...(hedge ? { alternateMarkets: true, maxOpenPositions: Math.max(2, ctx.snapshot.maxOpenPositions) } : {}),
      },
      hedge ? "Hedge book · two positions" : "Last result · trade again",
      { focus: "restart", summaryTab: "transactions" },
    );
  }

  if (block.id === "loop-break" || block.id === "logic-if") {
    return marker(block, `Logic · ${block.label}`, { focus: "purchase" });
  }

  return marker(block, `Logic · ${block.label}`, { focus: "purchase" });
}

function loopEffect(block: BuilderBlockDef, ctx: BuilderBlockContext): BuilderBlockEffect {
  if (block.id === "time-timeout") {
    return patchEffect(block, { cooldownTicks: 10 }, "Cooldown · 10 ticks", {
      focus: "purchase",
    });
  }
  if (block.id === "time-tickdelay") {
    return patchEffect(block, { cooldownTicks: 3 }, "Cooldown · 3 ticks", {
      focus: "purchase",
    });
  }
  if (block.id === "loop-break") {
    return patchEffect(block, { restartAction: "stop" }, "Loop break · stop after loss", {
      focus: "restart",
    });
  }
  if (block.id === "loop-count") {
    return patchEffect(
      block,
      { maxOpenPositions: Math.max(3, ctx.snapshot.maxOpenPositions) },
      "Repeat count · up to 3 open",
      { focus: "restart" },
    );
  }
  if (
    block.id === "loop-repeat" ||
    block.id === "loop-repeat-ext" ||
    block.id === "loop-while" ||
    block.id === "loop-foreach"
  ) {
    return patchEffect(block, { restartAction: "trade_again" }, "Loop · trade again", {
      focus: "restart",
    });
  }
  return marker(block, `Loop · ${block.label}`, { focus: "restart" });
}

function mathEffect(block: BuilderBlockDef, ctx: BuilderBlockContext): BuilderBlockEffect {
  if (block.id === "stats-balance") {
    const label = ctx.balance
      ? formatWalletBalance(ctx.balance.amount, ctx.balance.currency)
      : "Wallet loading…";
    return marker(block, `Account balance · ${label}`, {
      focus: "trade",
      summaryTab: "summary",
    });
  }

  if (
    block.id === "stats-total-profit" ||
    block.id === "stats-total-runs" ||
    block.id === "contract-profit" ||
    block.id === "contract-payout" ||
    block.id === "ttr-tick-profit" ||
    block.id === "hedge-profit"
  ) {
    return marker(block, "Live P/L is on Summary", { focus: "purchase", summaryTab: "summary" });
  }

  if (block.id === "misc-barrier-offset") {
    return patchEffect(
      block,
      { barrier: (ctx.snapshot.barrier + 1) % 10 },
      `Barrier offset · ${ (ctx.snapshot.barrier + 1) % 10 }`,
      { focus: "trade" },
    );
  }

  if (block.id === "math-constrain") {
    return patchEffect(block, { maxOpenPositions: 1 }, "Constrain · max 1 open", {
      focus: "restart",
    });
  }

  if (block.id.startsWith("hedge-")) {
    return patchEffect(
      block,
      { alternateMarkets: true, maxOpenPositions: Math.max(2, ctx.snapshot.maxOpenPositions) },
      "Hedge · two positions",
      { focus: "restart" },
    );
  }

  return marker(block, `Math · ${block.label} — live values sit on Trade parameters`, {
    focus: "trade",
  });
}

function noopEffect(
  block: BuilderBlockDef,
  snapshot: BotBuilderSnapshot,
): BuilderBlockEffect {
  if (block.id === "virtual-hook-switcher") {
    const next = !snapshot.virtualHook;
    return {
      patch: { virtualHook: next },
      focus: "trade",
      lane: "trade",
      notice: next ? "Virtual hook on" : "Virtual hook off",
      journal: `Block · ${block.label}`,
    };
  }
  if (block.id === "barrier-settings") {
    return marker(block, "Set barrier in Trade parameters", { focus: "trade" });
  }
  if (block.id === "contract-modifiers") {
    return marker(block, "Adjust contract type in Trade parameters", { focus: "trade" });
  }
  return marker(block, `Added · ${block.label}`);
}
