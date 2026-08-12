import { CURATED_PROVIDERS } from "@/lib/copy/providers";
import type { SignalProvider } from "@/lib/copy/types";

export interface CopyPanelStep {
  title: string;
  detail: string;
}

export interface CopyPanelSignalPreview {
  provider: string;
  country: string;
  symbol: string;
  side: "Rise" | "Fall";
  confidence: number;
  ttlSeconds: number;
  stakeSuggested: string;
  stakeEffective: string;
  note: string;
}

export interface CopyPanelRiskRow {
  label: string;
  value: string;
}

const STYLE_LABELS: Record<SignalProvider["style"], string> = {
  momentum: "rides trends",
  mean_reversion: "fades extremes",
  breakout: "catches breaks",
};

const RISK_LABELS: Record<SignalProvider["riskLabel"], string> = {
  low: "Steady",
  medium: "Balanced",
  high: "Aggressive",
};

const PROVIDER_BLURBS: Record<string, string> = {
  "ea-vol-momentum": "Nairobi desk watching Volatility 10 and 25 for clean trend follows.",
  "nairobi-scalper": "Fast Rise/Fall calls on R_10 — short ticks, tight timing.",
  "kampala-revert": "Kampala mean-revert on stretched Volatility moves.",
  "dar-es-salaam-swing": "Dar swing desk — fewer signals, wider targets on R_75 and R_100.",
  "kigali-conservative": "Kigali keeps frequency low and drawdown guidance tight.",
};

export const COPY_PANEL = {
  eyebrow: "Copy",
  title: "Trade with someone who already watches the feed",
  summary: "Pick a desk in Kenya, Uganda, Tanzania, or Rwanda. When they signal, you can mirror it — or let the desk copy for you.",
  lead: "These aren’t Telegram forwards. They’re curated providers on the same synthetics you trade. Each signal lasts about a minute. You set how much you’re willing to stake, and copy risk stays away from your manual book.",
  steps: [
    {
      title: "Choose who to follow",
      detail: "Browse the desks below. Follow the ones that match how you like to trade.",
    },
    {
      title: "Set your stake limits",
      detail: "Cap what you’ll copy overall and per provider — never above your session max.",
    },
    {
      title: "Copy a signal — or auto-copy",
      detail: "Hit Copy while the timer runs, or turn auto-copy on after you sign in.",
    },
    {
      title: "Keep copy risk separate",
      detail: "Stop-loss and daily drawdown for copy sit on their own book, not your manual tickets.",
    },
  ] satisfies CopyPanelStep[],
  signal: {
    provider: "EA Vol Momentum",
    country: "KE",
    symbol: "R_10",
    side: "Rise",
    confidence: 72,
    ttlSeconds: 48,
    stakeSuggested: "3.50 USD",
    stakeEffective: "3.50 USD",
    note: "They’re calling a short Rise on Volatility 10 after a momentum push.",
  } satisfies CopyPanelSignalPreview,
  risk: [
    { label: "Stop if copy loses", value: "$25 this session" },
    { label: "Daily drawdown", value: "$50 max" },
    { label: "Copies today", value: "Up to 12" },
    { label: "Per-copy stake", value: "Up to $5" },
  ] satisfies CopyPanelRiskRow[],
  ctaTitle: "Ready to follow a desk?",
  ctaBody: "Log in with Deriv, follow a provider, and start mirroring signals under your own limits.",
} as const;

export interface CopyPanelProviderRow {
  id: string;
  name: string;
  country: string;
  place: string;
  style: string;
  symbols: string;
  winRate: string;
  signals: string;
  risk: string;
  verified: boolean;
  blurb: string;
}

const PLACE_BY_COUNTRY: Record<string, string> = {
  KE: "Nairobi",
  UG: "Kampala",
  TZ: "Dar es Salaam",
  RW: "Kigali",
};

export function getCopyPanelProviders(): CopyPanelProviderRow[] {
  return CURATED_PROVIDERS.map((provider) => ({
    id: provider.id,
    name: provider.name,
    country: provider.country,
    place: PLACE_BY_COUNTRY[provider.country] ?? provider.country,
    style: STYLE_LABELS[provider.style],
    symbols: provider.symbols.join(", "),
    winRate: `${provider.demoWinRate}% demo`,
    signals: `${provider.demoSignals30d} signals / 30 days`,
    risk: RISK_LABELS[provider.riskLabel],
    verified: provider.verified,
    blurb: PROVIDER_BLURBS[provider.id] ?? provider.bio,
  }));
}
