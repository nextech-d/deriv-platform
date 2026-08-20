import type {
  BotConfig,
  BotStrategy,
  QuickStrategyParams,
  QuickStrategyType,
} from "@/lib/bot/types";
import { QUICK_STRATEGY_METAS } from "@/lib/bot/types";
import { DEFAULT_BOT_CONFIG } from "@/lib/bot/settings";
import { FREE_BOT_STRATEGIES, type FreeBotStrategy } from "@/lib/terminal/free-bots";
import type { AutoTraderCard } from "@/lib/terminal/auto-trader-cards";
import type { CourseStrategyGuide } from "@/lib/terminal/deriv-course";

export type BuilderTradeType =
  | "Rise/Fall"
  | "Higher/Lower"
  | "Even/Odd"
  | "Over/Under"
  | "Matches"
  | "Touch/No Touch"
  | "Asian"
  | "Reset"
  | "High/Low Ticks";

export type DurationUnit = "t" | "s" | "m" | "h" | "d";

export interface DurationRule {
  units: DurationUnit[];
  min: number;
  max: number;
  /** Unit that min/max apply to (for display). First entry in `units` if omitted. */
  defaultUnit: DurationUnit;
}

/** Contract type codes sent to the Deriv API for each trade type direction. */
export interface TradeTypeContracts {
  primary: string;
  secondary: string;
  primaryLabel: string;
  secondaryLabel: string;
  /** Whether a digit prediction (0-9) is needed */
  needsDigit?: boolean;
  /** Whether a barrier value is needed */
  needsBarrier?: boolean;
  /** Whether a second barrier is needed */
  needsBarrier2?: boolean;
}

export const BUILDER_TRADE_TYPES: Record<BuilderTradeType, TradeTypeContracts> = {
  "Rise/Fall": { primary: "CALL", secondary: "PUT", primaryLabel: "Rise", secondaryLabel: "Fall" },
  "Higher/Lower": { primary: "CALLE", secondary: "PUTE", primaryLabel: "Higher", secondaryLabel: "Lower", needsBarrier: true },
  "Even/Odd": { primary: "DIGITEVEN", secondary: "DIGITODD", primaryLabel: "Even", secondaryLabel: "Odd" },
  "Over/Under": { primary: "DIGITOVER", secondary: "DIGITUNDER", primaryLabel: "Over", secondaryLabel: "Under", needsDigit: true },
  "Matches": { primary: "DIGITMATCH", secondary: "DIGITDIFF", primaryLabel: "Matches", secondaryLabel: "Differs", needsDigit: true },
  "Touch/No Touch": { primary: "ONETOUCH", secondary: "NOTOUCH", primaryLabel: "Touch", secondaryLabel: "No Touch", needsBarrier: true },
  "Asian": { primary: "ASIANU", secondary: "ASIAND", primaryLabel: "Asian Up", secondaryLabel: "Asian Down" },
  "Reset": { primary: "RESETCALL", secondary: "RESETPUT", primaryLabel: "Reset Call", secondaryLabel: "Reset Put" },
  "High/Low Ticks": { primary: "TICKHIGH", secondary: "TICKLOW", primaryLabel: "High Tick", secondaryLabel: "Low Tick" },
};

export const DURATION_RULES: Record<BuilderTradeType, DurationRule> = {
  "Rise/Fall": { units: ["t", "s", "m", "h", "d"], min: 1, max: 10, defaultUnit: "t" },
  "Higher/Lower": { units: ["s", "m", "h", "d"], min: 15, max: 86400, defaultUnit: "s" },
  "Even/Odd": { units: ["t"], min: 1, max: 10, defaultUnit: "t" },
  "Over/Under": { units: ["t"], min: 1, max: 10, defaultUnit: "t" },
  "Matches": { units: ["t"], min: 1, max: 10, defaultUnit: "t" },
  "Touch/No Touch": { units: ["s", "m", "h", "d"], min: 15, max: 86400, defaultUnit: "s" },
  "Asian": { units: ["t"], min: 5, max: 10, defaultUnit: "t" },
  "Reset": { units: ["s", "m", "h", "d"], min: 15, max: 86400, defaultUnit: "s" },
  "High/Low Ticks": { units: ["t"], min: 5, max: 5, defaultUnit: "t" },
};

export const DURATION_UNIT_LABELS: Record<DurationUnit, string> = {
  t: "Ticks",
  s: "Seconds",
  m: "Minutes",
  h: "Hours",
  d: "Days",
};

/** Min/max for the currently selected duration unit. */
export function durationBounds(
  tradeType: BuilderTradeType,
  unit: DurationUnit,
): { min: number; max: number } {
  const rule = DURATION_RULES[tradeType];
  if (!rule) return { min: 1, max: 10 };
  if (unit === "t" || (rule.units.length === 1 && rule.units[0] === "t")) {
    return { min: rule.min, max: rule.max };
  }
  const seconds =
    rule.defaultUnit === "t" ? { min: 15, max: 86400 } : { min: rule.min, max: rule.max };
  const divisor = unit === "m" ? 60 : unit === "h" ? 3600 : unit === "d" ? 86400 : 1;
  return {
    min: Math.max(1, Math.ceil(seconds.min / divisor)),
    max: Math.max(1, Math.floor(seconds.max / divisor)),
  };
}

export type BuilderChartMode = "line" | "candle";

export const CANDLE_INTERVALS = [
  "1 minute",
  "2 minutes",
  "3 minutes",
  "5 minutes",
  "10 minutes",
  "15 minutes",
  "30 minutes",
  "1 hour",
  "2 hours",
  "4 hours",
  "8 hours",
  "1 day",
] as const;

export type CandleInterval = (typeof CANDLE_INTERVALS)[number];

export interface BotBuilderSnapshot {
  market: string;
  symbol: string;
  tradeType: BuilderTradeType;
  contractType: "Both" | "Call" | "Put";
  purchase: string;
  duration: string;
  durationUnit: DurationUnit;
  stake: string;
  restartOnError: boolean;
  virtualHook: boolean;
  barrier: number;
  digitTarget: number;
  sellAction: "none" | "sell_at_market";
  restartAction: "trade_again" | "stop";
  chartMode: BuilderChartMode;
  candleInterval: CandleInterval;
  zoom: number;
  sourceLabel: string;
  botStrategy: BotStrategy;
  alternateMarkets: boolean;
  alternateMode: "every_x_runs";
  alternateEvery: number;
  tradeEachTick: boolean;
  fastExecution: boolean;
  hideTradeParameters: boolean;
  showAdvancedSettings: boolean;
  restartBuySellOnError: boolean;
  runOnceAtStart: boolean;
  allowBulkPurchase: boolean;
  bulkTradeCount: number;
  /** Stake progression applied when the snapshot is sent to the runner. */
  quickStrategy?: QuickStrategyParams;
  /** Nested Trade options block: vanilla duration/stake, multiplier, or accumulator. */
  tradeOptionsMode: "vanilla" | "multiplier" | "accumulator";
  growthRate: string;
  takeProfitAmount: string;
  stopLossAmount: string;
  tickCount: string;
  sellByTicks: boolean;
  /**
   * Indicator / utility parameters that feed into `BotConfig` during `snapshotToBotConfig()`.
   * DBot uses these to parametrize analysis blocks; our bot runner uses `BotConfig`.
   */
  fastPeriod: number;
  slowPeriod: number;
  rsiPeriod: number;
  rsiOversold: number;
  rsiOverbought: number;
  cooldownTicks: number;
  maxOpenPositions: number;
}

export const DEFAULT_BUILDER_SNAPSHOT: BotBuilderSnapshot = {
  market: "Volatility 100 Index",
  symbol: "R_100",
  tradeType: "Rise/Fall",
  contractType: "Both",
  purchase: "Rise",
  duration: "5",
  durationUnit: "t",
  stake: "0.60",
  restartOnError: true,
  virtualHook: false,
  barrier: 4,
  digitTarget: 5,
  sellAction: "none",
  restartAction: "trade_again",
  chartMode: "candle",
  candleInterval: "1 minute",
  zoom: 1,
  sourceLabel: "Blank workspace",
  botStrategy: "ma_cross",
  alternateMarkets: false,
  alternateMode: "every_x_runs",
  alternateEvery: 1,
  tradeEachTick: false,
  fastExecution: true,
  hideTradeParameters: false,
  showAdvancedSettings: true,
  restartBuySellOnError: false,
  runOnceAtStart: false,
  allowBulkPurchase: false,
  bulkTradeCount: 1,
  tradeOptionsMode: "vanilla",
  growthRate: "1%",
  takeProfitAmount: "10",
  stopLossAmount: "10",
  tickCount: "5",
  sellByTicks: false,
  fastPeriod: DEFAULT_BOT_CONFIG.fastPeriod,
  slowPeriod: DEFAULT_BOT_CONFIG.slowPeriod,
  rsiPeriod: DEFAULT_BOT_CONFIG.rsiPeriod,
  rsiOversold: DEFAULT_BOT_CONFIG.rsiOversold,
  rsiOverbought: DEFAULT_BOT_CONFIG.rsiOverbought,
  cooldownTicks: DEFAULT_BOT_CONFIG.cooldownTicks,
  maxOpenPositions: DEFAULT_BOT_CONFIG.maxOpenPositions,
};

import {
  allMarketOptions,
  symbolLabel,
  SYMBOL_ID_PATTERN,
} from "@/lib/markets/symbols";
import { CHART_MARKET_TREE, findChartMarketPath } from "@/lib/terminal/chart-markets";

export function builderMarketOptions() {
  return CHART_MARKET_TREE.flatMap((category) =>
    category.groups.flatMap((group) =>
      group.markets.map((market) => ({ label: market.label, symbol: market.id })),
    ),
  );
}

export function builderGroupedMarketOptions() {
  return CHART_MARKET_TREE.map((category) => ({
    group: category.label,
    options: category.groups.flatMap((group) =>
      group.markets.map((market) => ({ label: market.label, symbol: market.id })),
    ),
  }));
}

export function marketLabelForSymbol(symbol: string): string {
  return findChartMarketPath(symbol)?.market.label ?? symbolLabel(symbol);
}

export function symbolFromMarketLabel(label: string): string {
  return (
    findChartMarketPath(label)?.market.id ??
    allMarketOptions().find((item) => item.label === label)?.symbol ??
    "R_100"
  );
}

export function purchasesForTradeType(tradeType: BuilderTradeType): string[] {
  const meta = BUILDER_TRADE_TYPES[tradeType];
  if (meta) return [meta.primaryLabel, meta.secondaryLabel];
  return ["Rise", "Fall"];
}

export function normalizePurchase(tradeType: BuilderTradeType, purchase: string): string {
  const options = purchasesForTradeType(tradeType);
  if (options.includes(purchase)) return purchase;
  const lower = purchase.toLowerCase();
  const found = options.find(
    (option) =>
      option.toLowerCase() === lower ||
      option.toLowerCase().startsWith(lower.slice(0, 4)) ||
      lower.startsWith(option.toLowerCase().slice(0, 4)),
  );
  return found ?? options[0]!;
}

export function clampSnapshotDuration<
  T extends Pick<BotBuilderSnapshot, "tradeType" | "duration" | "durationUnit">,
>(snapshot: T): T {
  const rule = DURATION_RULES[snapshot.tradeType];
  if (!rule) return snapshot;
  const durationUnit = rule.units.includes(snapshot.durationUnit)
    ? snapshot.durationUnit
    : rule.defaultUnit;
  const { min, max } = durationBounds(snapshot.tradeType, durationUnit);
  const raw = Number(snapshot.duration);
  const duration = Number.isFinite(raw)
    ? Math.min(max, Math.max(min, raw))
    : min;
  return { ...snapshot, durationUnit, duration: String(duration) };
}

export function normalizeLoadedSnapshot(
  parsed: Partial<BotBuilderSnapshot>,
): BotBuilderSnapshot {
  const merged: BotBuilderSnapshot = { ...DEFAULT_BUILDER_SNAPSHOT, ...parsed };
  const tradeType = BUILDER_TRADE_TYPES[merged.tradeType]
    ? merged.tradeType
    : DEFAULT_BUILDER_SNAPSHOT.tradeType;
  const candleInterval = CANDLE_INTERVALS.includes(merged.candleInterval)
    ? merged.candleInterval
    : DEFAULT_BUILDER_SNAPSHOT.candleInterval;
  const contractType =
    merged.contractType === "Call" || merged.contractType === "Put"
      ? merged.contractType
      : "Both";
  return clampSnapshotDuration({
    ...merged,
    tradeType,
    contractType,
    purchase: normalizePurchase(tradeType, merged.purchase || ""),
    candleInterval,
    alternateMarkets: Boolean(merged.alternateMarkets),
    alternateMode: "every_x_runs",
    alternateEvery: Math.min(50, Math.max(1, Number(merged.alternateEvery) || 1)),
    tradeEachTick: Boolean(merged.tradeEachTick),
    fastExecution: merged.fastExecution !== false,
    hideTradeParameters: Boolean(merged.hideTradeParameters),
    showAdvancedSettings: merged.showAdvancedSettings !== false,
    restartBuySellOnError: Boolean(merged.restartBuySellOnError),
    runOnceAtStart: Boolean(merged.runOnceAtStart),
    allowBulkPurchase: Boolean(merged.allowBulkPurchase),
    bulkTradeCount: Math.min(20, Math.max(1, Number(merged.bulkTradeCount) || 1)),
    restartOnError: merged.restartOnError !== false,
    virtualHook: Boolean(merged.virtualHook),
    sellAction: merged.sellAction === "sell_at_market" ? "sell_at_market" : "none",
    restartAction: merged.restartAction === "stop" ? "stop" : "trade_again",
    zoom: Math.min(1.2, Math.max(0.85, Number(merged.zoom) || 1)),
    tradeOptionsMode:
      merged.tradeOptionsMode === "multiplier" || merged.tradeOptionsMode === "accumulator"
        ? merged.tradeOptionsMode
        : "vanilla",
    growthRate: merged.growthRate || DEFAULT_BUILDER_SNAPSHOT.growthRate,
    takeProfitAmount: merged.takeProfitAmount || DEFAULT_BUILDER_SNAPSHOT.takeProfitAmount,
    stopLossAmount: merged.stopLossAmount || DEFAULT_BUILDER_SNAPSHOT.stopLossAmount,
    tickCount: merged.tickCount || DEFAULT_BUILDER_SNAPSHOT.tickCount,
    sellByTicks: Boolean(merged.sellByTicks),
    quickStrategy: merged.virtualHook
      ? (merged.quickStrategy ?? defaultQuickParams("martingale"))
      : undefined,
  });
}

export function snapshotToBotConfig(
  snapshot: BotBuilderSnapshot,
  base: BotConfig = DEFAULT_BOT_CONFIG,
): BotConfig {
  const clamped = clampSnapshotDuration(snapshot);
  const stake = Math.max(0.35, Number(clamped.stake) || base.stake);
  const duration = Number(clamped.duration) || base.duration;
  const purchase = normalizePurchase(clamped.tradeType, clamped.purchase);

  return {
    ...base,
    enabled: false,
    paused: false,
    stake,
    duration,
    durationUnit: clamped.durationUnit,
    strategy: snapshot.botStrategy,
    digitTarget: snapshot.digitTarget,
    barrierDigit: snapshot.barrier,
    parityPrefer:
      snapshot.tradeType === "Even/Odd"
        ? snapshot.contractType === "Call"
          ? "even"
          : snapshot.contractType === "Put"
            ? "odd"
            : purchase.toLowerCase().includes("odd")
              ? "odd"
              : purchase.toLowerCase().includes("even")
                ? "even"
                : "auto"
        : "auto",
    fastPeriod: snapshot.fastPeriod,
    slowPeriod: snapshot.slowPeriod,
    rsiPeriod: snapshot.rsiPeriod,
    rsiOversold: snapshot.rsiOversold,
    rsiOverbought: snapshot.rsiOverbought,
    cooldownTicks: snapshot.tradeEachTick || snapshot.runOnceAtStart
      ? 0
      : clamped.fastExecution
        ? Math.min(2, Math.max(1, clamped.cooldownTicks || 1))
        : (clamped.cooldownTicks ?? base.cooldownTicks),
    maxOpenPositions: snapshot.allowBulkPurchase
      ? Math.max(1, snapshot.bulkTradeCount || 1)
      : snapshot.alternateMarkets
        ? Math.max(2, snapshot.maxOpenPositions)
        : snapshot.maxOpenPositions,
    quickStrategy: snapshot.virtualHook
      ? (snapshot.quickStrategy ?? defaultQuickParams("martingale"))
      : undefined,
    tradeType: snapshot.tradeType,
    purchase,
    sideMode: snapshot.contractType,
    restartAction: snapshot.restartAction,
    sellAction: snapshot.sellAction,
    restartOnError: snapshot.restartOnError || snapshot.restartBuySellOnError,
    virtualHook: snapshot.virtualHook,
  };
}

export function freeBotToSnapshot(strategy: FreeBotStrategy): BotBuilderSnapshot {
  const symbol = strategy.markets[0] ?? "R_100";
  const blob = `${strategy.name} ${strategy.tags.join(" ")}`.toLowerCase();
  let tradeType: BuilderTradeType = "Rise/Fall";
  let botStrategy: BotStrategy = "ma_cross";
  let purchase = "Rise";
  let barrier = 4;
  let digitTarget = 5;

  if (blob.includes("even") || blob.includes("odd") || blob.includes("parity")) {
    tradeType = "Even/Odd";
    botStrategy = "parity_bias";
    purchase = blob.includes("odd") && !blob.includes("even") ? "Odd" : "Even";
  } else if (blob.includes("under") || blob.includes("over") || blob.includes("barrier")) {
    tradeType = "Over/Under";
    botStrategy = "barrier_edge";
    purchase = blob.includes("under") ? "Under" : "Over";
    barrier = blob.includes("8") ? 8 : blob.includes("7") ? 7 : blob.includes("1") ? 1 : 4;
  } else if (blob.includes("match")) {
    tradeType = "Matches";
    botStrategy = "digit_match";
    purchase = "Matches";
    digitTarget = 5;
  } else if (blob.includes("rise") || blob.includes("fall") || blob.includes("candle")) {
    tradeType = "Rise/Fall";
    botStrategy = "rsi_threshold";
    purchase = "Rise";
  } else {
    tradeType = "Even/Odd";
    botStrategy = "parity_bias";
    purchase = "Even";
  }

  return {
    ...DEFAULT_BUILDER_SNAPSHOT,
    market: marketLabelForSymbol(symbol),
    symbol,
    tradeType,
    purchase,
    barrier,
    digitTarget,
    virtualHook: blob.includes("recovery") || blob.includes("martingale"),
    stake: strategy.difficulty === "advanced" ? "1.00" : "0.60",
    duration: "1",
    sourceLabel: `Free bots · ${strategy.name}`,
    botStrategy,
  };
}

export function defaultQuickParams(type: QuickStrategyType): QuickStrategyParams {
  const meta = QUICK_STRATEGY_METAS.find((item) => item.type === type);
  const params: QuickStrategyParams = {
    type,
    profitThreshold: 10,
    lossThreshold: 10,
  };
  for (const field of meta?.fields ?? []) {
    if (field.key === "type") continue;
    (params as unknown as Record<string, unknown>)[field.key] = field.defaultValue;
  }
  return params;
}

export interface QuickStrategyInput {
  type: QuickStrategyType;
  market?: string;
  symbol?: string;
  tradeType?: BuilderTradeType;
  purchase?: string;
  duration?: string;
  durationUnit?: DurationUnit;
  stake?: string;
  digitTarget?: number;
  barrier?: number;
  params?: Partial<QuickStrategyParams>;
}

export function botStrategyForTradeType(tradeType: BuilderTradeType): BotStrategy {
  if (tradeType === "Even/Odd") return "parity_bias";
  if (tradeType === "Over/Under") return "barrier_edge";
  if (tradeType === "Matches") return "digit_match";
  return "ma_cross";
}

/** Dashboard Speed Bot window — Martingale recovery on Volatility 100. */
export function speedBotSnapshot(): BotBuilderSnapshot {
  const catalog =
    FREE_BOT_STRATEGIES.find((bot) => bot.id === "tradecity-speed-bot") ??
    FREE_BOT_STRATEGIES[0]!;
  return {
    ...freeBotToSnapshot(catalog),
    duration: "1",
    stake: "0.60",
    virtualHook: true,
    quickStrategy: defaultQuickParams("martingale"),
    sourceLabel: "Dashboard · Speed Bot",
  };
}

export function quickStrategyToSnapshot(
  typeOrInput: QuickStrategyType | QuickStrategyInput,
): BotBuilderSnapshot {
  const input: QuickStrategyInput =
    typeof typeOrInput === "string" ? { type: typeOrInput } : typeOrInput;
  const meta = QUICK_STRATEGY_METAS.find((item) => item.type === input.type);
  const tradeType = input.tradeType ?? DEFAULT_BUILDER_SNAPSHOT.tradeType;
  const symbol = input.symbol ?? (input.market ? symbolFromMarketLabel(input.market) : DEFAULT_BUILDER_SNAPSHOT.symbol);
  const market = input.market ?? marketLabelForSymbol(symbol);
  const purchase = normalizePurchase(tradeType, input.purchase ?? purchasesForTradeType(tradeType)[0]!);
  const durationUnit = input.durationUnit ?? DURATION_RULES[tradeType]?.defaultUnit ?? "t";
  const bounds = durationBounds(tradeType, durationUnit);
  const duration = input.duration ?? String(bounds.min);
  return normalizeLoadedSnapshot({
    ...DEFAULT_BUILDER_SNAPSHOT,
    market,
    symbol,
    tradeType,
    purchase,
    duration,
    durationUnit,
    stake: input.stake ?? "0.60",
    digitTarget: input.digitTarget ?? DEFAULT_BUILDER_SNAPSHOT.digitTarget,
    barrier: input.barrier ?? DEFAULT_BUILDER_SNAPSHOT.barrier,
    botStrategy: botStrategyForTradeType(tradeType),
    virtualHook: true,
    quickStrategy: {
      ...defaultQuickParams(input.type),
      ...input.params,
      type: input.type,
    },
    sourceLabel: `Quick strategy · ${meta?.label ?? input.type}`,
  });
}

export function validateQuickStrategy(snapshot: BotBuilderSnapshot): string | null {
  const stake = Number(snapshot.stake);
  if (!Number.isFinite(stake) || stake < 0.35) {
    return "Initial stake must be at least 0.35";
  }
  const bounds = durationBounds(snapshot.tradeType, snapshot.durationUnit);
  const duration = Number(snapshot.duration);
  if (!Number.isFinite(duration) || duration < bounds.min || duration > bounds.max) {
    return `Duration must be ${bounds.min}–${bounds.max} ${DURATION_UNIT_LABELS[snapshot.durationUnit].toLowerCase()}`;
  }
  const qs = snapshot.quickStrategy;
  if (!qs) return "Choose a recovery strategy";
  if (qs.profitThreshold < 0 || qs.lossThreshold < 0) {
    return "Profit and loss thresholds cannot be negative";
  }
  if (qs.size != null && qs.size <= 1) return "Size must be greater than 1";
  if (qs.unit != null && qs.unit <= 0) return "Unit must be greater than 0";
  if (qs.maxStake != null && qs.maxStake > 0 && qs.maxStake < stake) {
    return "Max stake must be at least the initial stake";
  }
  const spec = BUILDER_TRADE_TYPES[snapshot.tradeType];
  if (spec?.needsDigit) {
    if (
      !Number.isInteger(snapshot.digitTarget) ||
      snapshot.digitTarget < 0 ||
      snapshot.digitTarget > 9
    ) {
      return "Last digit must be an integer from 0 to 9";
    }
  }
  if (spec?.needsBarrier && !Number.isFinite(snapshot.barrier)) {
    return "Barrier must be a number";
  }
  return null;
}

export function workspaceChipsForSnapshot(snapshot: BotBuilderSnapshot) {
  const recovery =
    QUICK_STRATEGY_METAS.find((item) => item.type === snapshot.quickStrategy?.type)?.label ??
    (snapshot.restartAction === "stop" ? "Stop after loss" : "Trade again");
  return [
    { label: snapshot.tradeType, category: "Trade parameters", lane: "trade" as const },
    { label: snapshot.market, category: "Trade parameters", lane: "trade" as const },
    {
      label: `${snapshot.duration} ${DURATION_UNIT_LABELS[snapshot.durationUnit]}`,
      category: "Trade parameters",
      lane: "trade" as const,
    },
    {
      label: `Stake ${snapshot.stake}`,
      category: "Trade parameters",
      lane: "trade" as const,
    },
    {
      label: `Purchase ${snapshot.purchase}`,
      category: "Purchase conditions",
      lane: "purchase" as const,
    },
    ...(snapshot.sellAction === "sell_at_market"
      ? [
          {
            label: "Sell at market",
            category: "Sell conditions",
            lane: "sell" as const,
          },
        ]
      : []),
    {
      label: snapshot.virtualHook ? `${recovery} recovery` : recovery,
      category: "Restart trading conditions",
      lane: "restart" as const,
    },
  ];
}

export function aiGeneratorToSnapshot(input: {
  symbol: string;
  tradeType: BuilderTradeType;
  purchase: string;
  duration: string;
  stake: string;
  barrier?: number;
  digitTarget?: number;
  martingale?: boolean;
  brief?: string;
}): BotBuilderSnapshot {
  const briefSnap = input.brief?.trim() ? aiBriefToSnapshot(input.brief) : null;
  let botStrategy: BotStrategy = "ma_cross";
  if (input.tradeType === "Even/Odd") botStrategy = "parity_bias";
  else if (input.tradeType === "Over/Under") botStrategy = "barrier_edge";
  else if (input.tradeType === "Matches") botStrategy = "digit_match";

  return {
    ...DEFAULT_BUILDER_SNAPSHOT,
    ...(briefSnap ?? {}),
    market: marketLabelForSymbol(input.symbol),
    symbol: input.symbol,
    tradeType: input.tradeType,
    purchase: input.purchase,
    duration: input.duration,
    durationUnit: "t",
    stake: input.stake,
    barrier: input.barrier ?? briefSnap?.barrier ?? 4,
    digitTarget: input.digitTarget ?? briefSnap?.digitTarget ?? 5,
    virtualHook: input.martingale ?? Boolean(briefSnap?.virtualHook),
    sourceLabel: "AI Bot Generator",
    botStrategy,
  };
}

export function aiBriefToSnapshot(brief: string): BotBuilderSnapshot {
  const text = brief.toLowerCase();
  const symbolMatch = text.match(new RegExp(`\\b(${SYMBOL_ID_PATTERN})\\b`, "i"));
  const symbol = symbolMatch ? symbolMatch[1]!.toUpperCase() : "R_100";
  const stakeMatch = text.match(/stake\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
  const tickMatch = text.match(/(\d+)\s*ticks?/i);

  let tradeType: BuilderTradeType = "Rise/Fall";
  let botStrategy: BotStrategy = "ma_cross";
  let purchase = "Rise";
  let barrier = 4;
  let digitTarget = 5;

  if (/even|odd|parity/.test(text)) {
    tradeType = "Even/Odd";
    botStrategy = "parity_bias";
    purchase = /odd/.test(text) && !/even/.test(text) ? "Odd" : "Even";
  } else if (/over|under|barrier/.test(text)) {
    tradeType = "Over/Under";
    botStrategy = "barrier_edge";
    purchase = /under/.test(text) && !/over/.test(text) ? "Under" : "Over";
    const barrierMatch = text.match(/barrier\s*[:=]?\s*([0-9])/i);
    if (barrierMatch) barrier = Number(barrierMatch[1]);
  } else if (/match/.test(text)) {
    tradeType = "Matches";
    botStrategy = "digit_match";
    purchase = "Matches";
    const digitMatch = text.match(/digit\s*[:=]?\s*([0-9])/i);
    if (digitMatch) digitTarget = Number(digitMatch[1]);
  } else if (/rsi/.test(text)) {
    botStrategy = "rsi_threshold";
  }

  return {
    ...DEFAULT_BUILDER_SNAPSHOT,
    market: marketLabelForSymbol(symbol),
    symbol,
    tradeType,
    purchase,
    barrier,
    digitTarget,
    stake: stakeMatch ? stakeMatch[1]! : "0.60",
    duration: tickMatch ? tickMatch[1]! : "5",
    sourceLabel: "Ai bot · generated brief",
    botStrategy,
  };
}

const COURSE_QUICK_TYPE: Record<string, QuickStrategyType> = {
  martingale: "martingale",
  dalembert: "dalembert",
  "oscars-grind": "oscars_grind",
  "reverse-martingale": "reverse_martingale",
  "reverse-dalembert": "reverse_dalembert",
  "one-three-two-six": "one_three_two_six",
};

export function courseStrategyToSnapshot(
  strategy: CourseStrategyGuide,
  values?: Record<string, number>,
): BotBuilderSnapshot {
  const stake = values?.stake ?? strategy.params.find((p) => p.key === "stake")?.defaultValue ?? 1;
  const type = COURSE_QUICK_TYPE[strategy.id];
  const quick = type
    ? {
        ...defaultQuickParams(type),
        ...(values?.multiplier != null ? { size: values.multiplier } : {}),
        ...(values?.unit != null ? { unit: values.unit } : {}),
        ...(values?.maxStake != null ? { maxStake: values.maxStake } : {}),
        ...(values?.takeProfit != null ? { profitThreshold: values.takeProfit } : {}),
        ...(values?.stopLoss != null ? { lossThreshold: values.stopLoss } : {}),
      }
    : undefined;
  return {
    ...DEFAULT_BUILDER_SNAPSHOT,
    tradeType: "Rise/Fall",
    purchase: "Rise",
    stake: String(stake),
    duration: "5",
    virtualHook: Boolean(type),
    quickStrategy: quick,
    restartOnError: true,
    sourceLabel: `Deriv Course · ${strategy.title}`,
    botStrategy: "rsi_threshold",
  };
}

export function autoTraderCardToSnapshot(card: AutoTraderCard): BotBuilderSnapshot {
  const tradeType: BuilderTradeType =
    card.style === "Parity"
      ? "Even/Odd"
      : card.style === "Barrier"
        ? "Over/Under"
        : "Matches";

  const botStrategy: BotStrategy =
    card.style === "Parity"
      ? "parity_bias"
      : card.style === "Barrier"
        ? "barrier_edge"
        : "digit_match";

  const purchase =
    tradeType === "Even/Odd"
      ? "Even"
      : tradeType === "Over/Under"
        ? "Over"
        : "Matches";

  return {
    ...DEFAULT_BUILDER_SNAPSHOT,
    market: marketLabelForSymbol(
      card.marketHint.includes("75")
        ? "R_75"
        : card.marketHint.includes("25")
          ? "R_25"
          : "R_100",
    ),
    symbol: card.marketHint.includes("75")
      ? "R_75"
      : card.marketHint.includes("25")
        ? "R_25"
        : "R_100",
    tradeType,
    purchase,
    barrier: card.defaults.barrier ?? 4,
    digitTarget: card.defaults.digit ?? 5,
    stake: String(card.defaults.stake),
    duration: String(card.defaults.ticks),
    sourceLabel: `Auto trader · ${card.name}`,
    botStrategy,
  };
}

export interface AnalysisBiasSeed {
  symbol: string;
  mode: "parity" | "barrier" | "matches" | "frequency";
  side: "CALL" | "PUT";
  barrier?: number;
  digitTarget?: number;
  label: string;
}

export function analysisBiasToSnapshot(bias: AnalysisBiasSeed): BotBuilderSnapshot {
  let tradeType: BuilderTradeType = "Rise/Fall";
  let botStrategy: BotStrategy = "ma_cross";
  let purchase = bias.side === "CALL" ? "Rise" : "Fall";

  if (bias.mode === "parity") {
    tradeType = "Even/Odd";
    botStrategy = "parity_bias";
    purchase = bias.side === "CALL" ? "Even" : "Odd";
  } else if (bias.mode === "barrier") {
    tradeType = "Over/Under";
    botStrategy = "barrier_edge";
    purchase = bias.side === "CALL" ? "Over" : "Under";
  } else if (bias.mode === "matches") {
    tradeType = "Matches";
    botStrategy = "digit_match";
    purchase = bias.side === "CALL" ? "Matches" : "Differs";
  }

  return {
    ...DEFAULT_BUILDER_SNAPSHOT,
    market: marketLabelForSymbol(bias.symbol),
    symbol: bias.symbol,
    tradeType,
    purchase,
    barrier: bias.barrier ?? 4,
    digitTarget: bias.digitTarget ?? 5,
    duration: "1",
    stake: "0.60",
    sourceLabel: `Analysis · ${bias.label}`,
    botStrategy,
  };
}

/** Simple XML envelope around JSON snapshot (import/export). */
export function snapshotToXml(snapshot: BotBuilderSnapshot): string {
  const payload = JSON.stringify(snapshot);
  const escaped = payload
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<deriv-ea-strategy version="1">\n  <payload>${escaped}</payload>\n</deriv-ea-strategy>\n`;
}

export function snapshotFromXml(xml: string): BotBuilderSnapshot | null {
  try {
    const match = xml.match(/<payload>([\s\S]*?)<\/payload>/i);
    if (match) {
      const raw = match[1]!
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .trim();
      const parsed = JSON.parse(raw) as BotBuilderSnapshot;
      return normalizeLoadedSnapshot(parsed);
    }
    // Fallback: raw JSON file pasted as .xml
    const parsed = JSON.parse(xml) as BotBuilderSnapshot;
    return normalizeLoadedSnapshot(parsed);
  } catch {
    return null;
  }
}

export const BUILDER_BLOCK_CHILDREN: Record<string, string[]> = {
  analysis: [
    "Last digit parity",
    "Barrier bias",
    "Match target",
    "Tick streak filter",
  ],
  utility: ["Set variable", "Notify desk", "Cooldown gate"],
  tools: ["Session stop-loss", "Max open tickets", "Demo rehearsal flag"],
};
