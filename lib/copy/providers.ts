import type { SignalProvider } from "@/lib/copy/types";

/** Curated signal providers — fallback when registry is empty */
export const CURATED_PROVIDERS: SignalProvider[] = [
  {
    id: "ea-vol-momentum",
    name: "EA Vol Momentum",
    country: "KE",
    bio: "Volatility 10/25 trend-follow on synthetic indices. Demo-first strategy.",
    style: "momentum",
    symbols: ["R_10", "R_25"],
    demoWinRate: 58,
    demoSignals30d: 142,
    verified: true,
    riskLabel: "medium",
  },
  {
    id: "nairobi-scalper",
    name: "Nairobi Scalper Pro",
    country: "KE",
    bio: "Short-duration Rise/Fall on Volatility 10 with tight cooldowns.",
    style: "breakout",
    symbols: ["R_10"],
    demoWinRate: 54,
    demoSignals30d: 310,
    verified: true,
    riskLabel: "high",
  },
  {
    id: "kampala-revert",
    name: "Kampala Mean Revert",
    country: "UG",
    bio: "Counter-trend entries on Volatility 25 after extended moves.",
    style: "mean_reversion",
    symbols: ["R_25", "R_75"],
    demoWinRate: 61,
    demoSignals30d: 89,
    verified: true,
    riskLabel: "low",
  },
  {
    id: "dar-es-salaam-swing",
    name: "Dar Swing Desk",
    country: "TZ",
    bio: "Volatility 75 swing signals — fewer trades, wider targets.",
    style: "momentum",
    symbols: ["R_75", "R_100"],
    demoWinRate: 56,
    demoSignals30d: 47,
    verified: false,
    riskLabel: "medium",
  },
  {
    id: "kigali-conservative",
    name: "Kigali Conservative",
    country: "RW",
    bio: "Low-frequency signals with strict drawdown guidance.",
    style: "mean_reversion",
    symbols: ["R_10", "R_25"],
    demoWinRate: 63,
    demoSignals30d: 36,
    verified: true,
    riskLabel: "low",
  },
];

export function getProvider(id: string): SignalProvider | undefined {
  return CURATED_PROVIDERS.find((p) => p.id === id);
}
