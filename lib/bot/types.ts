export type BotStrategy = "ma_cross" | "rsi_threshold";

export type BotStatus = "idle" | "running" | "paused" | "blocked";

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
}

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
  label: string;
  rsi?: number;
  fastMa?: number;
  slowMa?: number;
}
