import type { BotConfig, BotEvaluation } from "@/lib/bot/types";
import {
  BUILDER_TRADE_TYPES,
  type BuilderTradeType,
} from "@/lib/terminal/strategy-seed";

const DIGIT_TYPES = new Set<BuilderTradeType>(["Even/Odd", "Over/Under", "Matches"]);
const PRICE_BARRIER_TYPES = new Set<BuilderTradeType>(["Higher/Lower", "Touch/No Touch"]);

function tradeFamily(config: BotConfig): BuilderTradeType {
  if (config.tradeType && config.tradeType in BUILDER_TRADE_TYPES) {
    return config.tradeType as BuilderTradeType;
  }
  switch (config.strategy) {
    case "parity_bias":
      return "Even/Odd";
    case "barrier_edge":
      return "Over/Under";
    case "digit_match":
      return "Matches";
    default:
      return "Rise/Fall";
  }
}

export interface ResolvedBotOrder {
  contractType: string;
  barrier?: number | string;
  lastDigitPrediction?: number;
}

/**
 * Maps a strategy evaluation onto the Deriv contract the builder actually selected.
 * Analysis decides WHEN to fire; purchase / contract type decide WHAT to buy.
 */
export function resolveBotOrder(
  config: BotConfig,
  evaluation: BotEvaluation,
): ResolvedBotOrder | null {
  if (!evaluation.signal) return null;

  const tradeType = tradeFamily(config);
  const meta = BUILDER_TRADE_TYPES[tradeType];
  const side = config.sideMode ?? "Both";

  if (!DIGIT_TYPES.has(tradeType)) {
    if (side === "Call" && evaluation.signal !== "CALL") return null;
    if (side === "Put" && evaluation.signal !== "PUT") return null;
  }

  let contractType = evaluation.contractType ?? evaluation.signal;

  if (meta) {
    if (DIGIT_TYPES.has(tradeType) && config.purchase) {
      if (config.purchase === meta.primaryLabel) contractType = meta.primary;
      else if (config.purchase === meta.secondaryLabel) contractType = meta.secondary;
    } else if (side === "Call") {
      contractType = meta.primary;
    } else if (side === "Put") {
      contractType = meta.secondary;
    } else {
      contractType = evaluation.signal === "CALL" ? meta.primary : meta.secondary;
    }
  }

  const order: ResolvedBotOrder = { contractType };

  if (tradeType === "Matches") {
    order.barrier = config.digitTarget ?? 5;
  } else if (tradeType === "Over/Under") {
    order.barrier = config.barrierDigit ?? 4;
  } else if (PRICE_BARRIER_TYPES.has(tradeType)) {
    order.barrier = config.barrierDigit ?? evaluation.barrier ?? 0;
  } else if (tradeType === "High/Low Ticks") {
    order.lastDigitPrediction = Math.min(5, Math.max(1, Number(config.duration) || 5));
  } else if (evaluation.barrier !== undefined) {
    order.barrier = evaluation.barrier;
  }

  return order;
}

export function demoHorizonTicks(
  duration: number,
  unit: BotConfig["durationUnit"],
): number {
  const n = Math.max(1, Math.round(duration || 1));
  if (unit === "s") return n;
  if (unit === "m") return n * 30;
  if (unit === "h") return n * 1800;
  if (unit === "d") return n * 43200;
  return n;
}

export function isCallLike(contractType: string): boolean {
  return !/PUT|ODD|UNDER|DIFF|NOTOUCH|ASIAND|TICKLOW|RESETPUT/i.test(contractType);
}
