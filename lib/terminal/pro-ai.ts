import type { BotBuilderSnapshot } from "@/lib/terminal/strategy-seed";
import { DEFAULT_BUILDER_SNAPSHOT } from "@/lib/terminal/strategy-seed";
import type { BotStrategy } from "@/lib/bot/types";

export interface ProAiPack {
  id: string;
  name: string;
  tagline: string;
  lanes: string[];
  markets: string[];
  locked: boolean;
  botStrategy: BotStrategy;
  stake: number;
  duration: number;
  barrier?: number;
  digitTarget?: number;
}

/** Premium AI packs — same role as Binarytool Pro AI / Matrix-style bots. */
export const PRO_AI_PACKS: ProAiPack[] = [
  {
    id: "matrix-ai",
    name: "Matrix AI Lane",
    tagline:
      "Scans Even/Odd and Over/Under setups, then targets a short win cycle before returning to scan.",
    lanes: ["Even", "Odd", "Over 4", "Under 5"],
    markets: ["R_50", "R_75", "R_100"],
    locked: true,
    botStrategy: "parity_bias",
    stake: 1,
    duration: 1,
  },
  {
    id: "digit-pro",
    name: "Digit Pro AI",
    tagline: "Last-digit shape reader with Matches/Differs preference and cooldown between tickets.",
    lanes: ["Matches", "Differs"],
    markets: ["R_100", "1HZ100V"],
    locked: true,
    botStrategy: "digit_match",
    stake: 1,
    duration: 1,
    digitTarget: 5,
  },
  {
    id: "apex-switch",
    name: "Apex Switch AI",
    tagline: "Switches purchase side when the short digit window flips dominance.",
    lanes: ["Even/Odd switch"],
    markets: ["R_75", "R_100"],
    locked: true,
    botStrategy: "parity_bias",
    stake: 0.6,
    duration: 1,
  },
  {
    id: "barrier-edge-ai",
    name: "Barrier Edge AI",
    tagline: "Over/Under around barrier 4 with a compact three-digit confirmation window.",
    lanes: ["Over 4", "Under 4"],
    markets: ["R_100", "R_50"],
    locked: true,
    botStrategy: "barrier_edge",
    stake: 1,
    duration: 1,
    barrier: 4,
  },
];

export function proAiPackToSnapshot(pack: ProAiPack): BotBuilderSnapshot {
  const tradeType =
    pack.botStrategy === "parity_bias"
      ? "Even/Odd"
      : pack.botStrategy === "barrier_edge"
        ? "Over/Under"
        : pack.botStrategy === "digit_match"
          ? "Matches"
          : "Rise/Fall";

  const purchase =
    tradeType === "Even/Odd"
      ? "Even"
      : tradeType === "Over/Under"
        ? "Over"
        : tradeType === "Matches"
          ? "Matches"
          : "Rise";

  const symbol = pack.markets[0] ?? "R_100";

  return {
    ...DEFAULT_BUILDER_SNAPSHOT,
    market:
      symbol === "R_75"
        ? "Volatility 75 Index"
        : symbol === "R_50"
          ? "Volatility 50 Index"
          : symbol === "1HZ100V"
            ? "Volatility 100 (1s) Index"
            : "Volatility 100 Index",
    symbol,
    tradeType,
    purchase,
    stake: String(pack.stake),
    duration: String(pack.duration),
    barrier: pack.barrier ?? 4,
    digitTarget: pack.digitTarget ?? 5,
    botStrategy: pack.botStrategy,
    virtualHook: true,
    sourceLabel: `Pro AI · ${pack.name}`,
  };
}
