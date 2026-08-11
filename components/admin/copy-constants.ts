import type { ProviderStyle } from "@/lib/copy/types";

export const COPY_SYMBOL_PRESETS = [
  "R_10",
  "R_25",
  "R_50",
  "R_75",
  "R_100",
] as const;

export const COPY_STYLES: ProviderStyle[] = [
  "momentum",
  "mean_reversion",
  "breakout",
];

export const COPY_STYLE_LABELS: Record<ProviderStyle, string> = {
  momentum: "Momentum",
  mean_reversion: "Mean reversion",
  breakout: "Breakout",
};

export const COPY_RISK_LABELS = ["low", "medium", "high"] as const;
