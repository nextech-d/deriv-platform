export type BotStrategy =
  | "ma_cross"
  | "rsi_threshold"
  | "parity_bias"
  | "barrier_edge"
  | "digit_match";

/** Quick-strategy IDs matching Deriv DBot exactly. */
export type QuickStrategyType =
  | "martingale"
  | "dalembert"
  | "oscars_grind"
  | "reverse_martingale"
  | "reverse_dalembert"
  | "one_three_two_six";

export type BotStatus = "idle" | "running" | "paused" | "blocked";

export type ParityPrefer = "even" | "odd" | "auto";

/**
 * Quick-strategy parameters — these sit on "Tab 2" in DBot
 * and control stake progression between rounds.
 */
export interface QuickStrategyParams {
  type: QuickStrategyType;
  profitThreshold: number;
  lossThreshold: number;
  /** Multiplier after a loss (Martingale) or win (Reverse Martingale). Must be > 1. */
  size?: number;
  /** Additive unit per loss (D'Alembert) or win (Reverse D'Alembert). 1 unit = initial stake. */
  unit?: number;
  /** Maximum stake cap (optional for all except 1-3-2-6). */
  maxStake?: number;
}

export interface BotConfig {
  enabled: boolean;
  paused: boolean;
  strategy: BotStrategy;
  stake: number;
  duration: number;
  fastPeriod: number;
  slowPeriod: number;
  rsiPeriod: number;
  rsiOversold: number;
  rsiOverbought: number;
  cooldownTicks: number;
  maxOpenPositions: number;
  /** Last-digit target for Matches / Differs lanes */
  digitTarget?: number;
  /** Barrier digit for Over / Under lanes */
  barrierDigit?: number;
  /** Preferred parity when running parity_bias */
  parityPrefer?: ParityPrefer;
  /** Quick-strategy stake progression (optional — if set, overrides flat staking). */
  quickStrategy?: QuickStrategyParams;
  /** Duration unit sent to Deriv (`t` ticks, `s` seconds, …). */
  durationUnit?: "t" | "s" | "m" | "h" | "d";
  /** Builder trade family, used to map CALL/PUT onto the real contract code. */
  tradeType?: string;
  /** Purchase-condition label (Rise, Even, Over, …). */
  purchase?: string;
  /** Trade-definition contract selector. */
  sideMode?: "Both" | "Call" | "Put";
  restartAction?: "trade_again" | "stop";
  sellAction?: "none" | "sell_at_market";
  restartOnError?: boolean;
  virtualHook?: boolean;
}

/** Metadata for quick-strategy UI rendering. */
export interface QuickStrategyMeta {
  type: QuickStrategyType;
  label: string;
  description: string;
  fields: Array<{
    key: keyof QuickStrategyParams;
    label: string;
    min?: number;
    max?: number;
    step?: number;
    defaultValue: number;
    hidden?: boolean;
  }>;
}

export const QUICK_STRATEGY_METAS: QuickStrategyMeta[] = [
  {
    type: "martingale",
    label: "Martingale",
    description: "Multiply stake after each loss. Reset to initial stake after a win.",
    fields: [
      { key: "profitThreshold", label: "Profit threshold", min: 0, step: 0.01, defaultValue: 10 },
      { key: "lossThreshold", label: "Loss threshold", min: 0, step: 0.01, defaultValue: 10 },
      { key: "size", label: "Size (multiplier)", min: 1.01, step: 0.01, defaultValue: 2 },
      { key: "maxStake", label: "Max stake", min: 0, step: 0.01, defaultValue: 50 },
    ],
  },
  {
    type: "dalembert",
    label: "D'Alembert",
    description: "Add one unit after a loss, subtract one unit after a win.",
    fields: [
      { key: "profitThreshold", label: "Profit threshold", min: 0, step: 0.01, defaultValue: 10 },
      { key: "lossThreshold", label: "Loss threshold", min: 0, step: 0.01, defaultValue: 10 },
      { key: "unit", label: "Unit (additive)", min: 0.01, step: 0.01, defaultValue: 1 },
      { key: "maxStake", label: "Max stake", min: 0, step: 0.01, defaultValue: 50 },
    ],
  },
  {
    type: "oscars_grind",
    label: "Oscar's Grind",
    description: "Increase by one unit after a win following a loss. Aim for one unit profit per cycle.",
    fields: [
      { key: "profitThreshold", label: "Profit threshold", min: 0, step: 0.01, defaultValue: 10 },
      { key: "lossThreshold", label: "Loss threshold", min: 0, step: 0.01, defaultValue: 10 },
      { key: "maxStake", label: "Max stake", min: 0, step: 0.01, defaultValue: 50 },
    ],
  },
  {
    type: "reverse_martingale",
    label: "Reverse Martingale",
    description: "Multiply stake after each win. Reset to initial stake after a loss.",
    fields: [
      { key: "profitThreshold", label: "Profit threshold", min: 0, step: 0.01, defaultValue: 10 },
      { key: "lossThreshold", label: "Loss threshold", min: 0, step: 0.01, defaultValue: 10 },
      { key: "size", label: "Size (multiplier)", min: 1.01, step: 0.01, defaultValue: 2 },
      { key: "maxStake", label: "Max stake", min: 0, step: 0.01, defaultValue: 50 },
    ],
  },
  {
    type: "reverse_dalembert",
    label: "Reverse D'Alembert",
    description: "Add one unit after a win, subtract one unit after a loss.",
    fields: [
      { key: "profitThreshold", label: "Profit threshold", min: 0, step: 0.01, defaultValue: 10 },
      { key: "lossThreshold", label: "Loss threshold", min: 0, step: 0.01, defaultValue: 10 },
      { key: "unit", label: "Unit (additive)", min: 0.01, step: 0.01, defaultValue: 1 },
      { key: "maxStake", label: "Max stake", min: 0, step: 0.01, defaultValue: 50 },
    ],
  },
  {
    type: "one_three_two_six",
    label: "1-3-2-6",
    description: "Stake follows the 1-3-2-6 unit sequence on consecutive wins. Any loss resets to 1.",
    fields: [
      { key: "profitThreshold", label: "Profit threshold", min: 0, step: 0.01, defaultValue: 10 },
      { key: "lossThreshold", label: "Loss threshold", min: 0, step: 0.01, defaultValue: 10 },
    ],
  },
];

export interface BotHeartbeat {
  status: BotStatus;
  lastTickAt: number | null;
  lastSignalAt: number | null;
  lastSignalLabel: string | null;
  ticksProcessed: number;
  tradesExecuted: number;
  demoRuntimeMs: number;
  blockReason: string | null;
}

export type BotSignal = "CALL" | "PUT";

export interface BotEvaluation {
  signal: BotSignal | null;
  /** Deriv contract_type when different from CALL/PUT */
  contractType?: string;
  barrier?: number;
  label: string;
  rsi?: number;
  fastMa?: number;
  slowMa?: number;
}
