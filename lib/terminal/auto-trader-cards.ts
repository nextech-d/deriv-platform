import type { BotStrategy } from "@/lib/bot/types";

export type AutoTraderCardId =
  | "parity-pulse"
  | "barrier-edge"
  | "trend-match";

export interface AutoTraderCard {
  id: AutoTraderCardId;
  name: string;
  tagline: string;
  marketHint: string;
  style: string;
  defaults: {
    digit?: number;
    barrier?: number;
    ticks: number;
    stake: number;
    strategy: BotStrategy;
  };
  stats: Array<{ label: string; value: string }>;
  /** Editable fields shown on the card before launch */
  fields: Array<{
    key: "stake" | "ticks" | "barrier" | "digit";
    label: string;
    min: number;
    max: number;
    step?: number;
  }>;
}

/** Same three Auto trader packs Binarytool ships — renamed slightly for our desk. */
export const AUTO_TRADER_CARDS: AutoTraderCard[] = [
  {
    id: "parity-pulse",
    name: "Parity Pulse Auto Trader",
    tagline:
      "Even/Odd percentage desk with a compact digit window and streak-aware entries.",
    marketHint: "Volatility 75 · Digits",
    style: "Parity",
    defaults: {
      digit: 5,
      ticks: 1,
      stake: 1,
      strategy: "parity_bias",
    },
    stats: [
      { label: "Lane", value: "Even / Odd" },
      { label: "Window", value: "3 digits" },
      { label: "Duration", value: "1 tick" },
    ],
    fields: [
      { key: "stake", label: "Stake", min: 0.35, max: 100, step: 0.01 },
      { key: "ticks", label: "Ticks", min: 1, max: 10 },
    ],
  },
  {
    id: "barrier-edge",
    name: "Over Under Edge Auto Trader",
    tagline:
      "Focused Over/Under digit setup using barrier 4 and a three-digit analysis window.",
    marketHint: "Volatility 100 · Digits",
    style: "Barrier",
    defaults: {
      barrier: 4,
      ticks: 1,
      stake: 1,
      strategy: "barrier_edge",
    },
    stats: [
      { label: "Lane", value: "Over / Under" },
      { label: "Barrier", value: "4" },
      { label: "Duration", value: "1 tick" },
    ],
    fields: [
      { key: "stake", label: "Stake", min: 0.35, max: 100, step: 0.01 },
      { key: "ticks", label: "Ticks", min: 1, max: 10 },
      { key: "barrier", label: "Barrier", min: 0, max: 9 },
    ],
  },
  {
    id: "trend-match",
    name: "Trend Match Fusion Auto Trader",
    tagline:
      "Combines Rise/Fall direction with Matches/Differs confirmation in one runner.",
    marketHint: "Volatility 25 · Digits",
    style: "Matches",
    defaults: {
      digit: 7,
      ticks: 1,
      stake: 1,
      strategy: "digit_match",
    },
    stats: [
      { label: "Lane", value: "Matches" },
      { label: "Lookback", value: "20 ticks" },
      { label: "Duration", value: "1 tick" },
    ],
    fields: [
      { key: "stake", label: "Stake", min: 0.35, max: 100, step: 0.01 },
      { key: "ticks", label: "Ticks", min: 1, max: 10 },
      { key: "digit", label: "Digit", min: 0, max: 9 },
    ],
  },
];
