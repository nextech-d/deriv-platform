export type SignalDirection = "CALL" | "PUT";

export type ProviderStyle = "momentum" | "mean_reversion" | "breakout";

export interface SignalProvider {
  id: string;
  name: string;
  country: string;
  bio: string;
  style: ProviderStyle;
  symbols: string[];
  /** Demo display stats — not verified performance claims */
  demoWinRate: number;
  demoSignals30d: number;
  verified: boolean;
  riskLabel: "low" | "medium" | "high";
}

export interface CopySignal {
  id: string;
  providerId: string;
  providerName: string;
  symbol: string;
  direction: SignalDirection;
  stakeSuggestion: number;
  durationTicks: number;
  confidence: number;
  rationale: string;
  createdAt: number;
  expiresAt: number;
}

export interface CopyFollowState {
  followedIds: string[];
  autoCopy: boolean;
  /** Global ceiling for all copy trades */
  maxStake: number;
  /** Per-provider caps — unset providers inherit maxStake */
  providerStakes: Record<string, number>;
}

export type CopyNoticeTone = "ok" | "warn" | "error";

export interface CopyNotice {
  tone: CopyNoticeTone;
  message: string;
}

export type CopyTradeResult = { ok: true } | { ok: false; reason: string };

export type CopyHistoryKind = "copied" | "expired" | "blocked" | "rejected";

export interface CopyHistoryEntry {
  id: string;
  at: number;
  kind: CopyHistoryKind;
  signalId: string;
  symbol: string;
  direction: SignalDirection;
  providerName: string;
  providerId?: string;
  stake?: number;
  detail?: string;
}
