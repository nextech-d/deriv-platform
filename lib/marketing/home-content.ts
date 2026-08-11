import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Copy,
  LayoutDashboard,
  LayoutList,
  Settings,
  Shield,
  Smartphone,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { PlatformNavId } from "@/lib/navigation/platform-nav";

export const HOME_HERO = {
  eyebrow: "Deriv EA · Synthetics desk",
  title: "Synthetics trading,",
  titleAccent: "one command desk.",
  lead: "Balance, live quotes, and session risk on Home — then ticket manually, run bots, or copy providers without leaving the terminal.",
  proofs: [
    "Live demo desk",
    "KES · UGX · TZS · RWF",
    "Volatility · Boom · Jump",
  ],
} as const;

export const HOME_MARKET_GROUPS = [
  {
    label: "Volatility",
    symbols: ["R_10", "R_100", "1HZ100V"],
  },
  {
    label: "Boom / Crash",
    symbols: ["BOOM1000", "CRASH1000"],
  },
  {
    label: "Jump",
    symbols: ["JD100"],
  },
] as const;

export interface HomePillar {
  id: Exclude<PlatformNavId, "home" | "portfolio" | "wallet" | "settings">;
  title: string;
  tagline: string;
  body: string;
  icon: LucideIcon;
}

export const HOME_PILLARS: HomePillar[] = [
  {
    id: "trade",
    title: "Trade",
    tagline: "Manual Rise/Fall",
    body: "Live quote gate, symbol rail, stake and duration ticket, and risk notices on every execution.",
    icon: TrendingUp,
  },
  {
    id: "auto",
    title: "Auto",
    tagline: "Strategies on the feed",
    body: "MA-cross and RSI bots on the same WebSocket as manual trades — pause, monitor, and respect session lockouts.",
    icon: Bot,
  },
  {
    id: "copy",
    title: "Copy",
    tagline: "Follow signal providers",
    body: "Mirror provider tickets with separate stake caps and drawdown limits from your manual session.",
    icon: Copy,
  },
];

export const HOME_STEPS = [
  {
    step: "01",
    title: "Connect your Deriv account",
    body: "Sign in with OAuth or a personal access token. Permissions and balances stay on Deriv.",
  },
  {
    step: "02",
    title: "Demo first or fund live",
    body: "Launch the demo desk instantly, or deposit through Deriv Cashier and East Africa payment agents.",
  },
  {
    step: "03",
    title: "Land on Home, then trade",
    body: "Your command center shows balance, open risk, and live quotes — then one click into any workspace.",
  },
] as const;

export interface HomeTrustItem {
  label: string;
  icon: LucideIcon;
}

export const HOME_TRUST: HomeTrustItem[] = [
  { label: "Deriv OAuth & PAT sign-in", icon: Shield },
  { label: "Demo desk with live public ticks", icon: TrendingUp },
  { label: "Cashier, M-Pesa & agent deposits", icon: Wallet },
  { label: "Reconnects on mobile networks", icon: Smartphone },
];

export type HomeSignalTone = "positive" | "neutral" | "warn";

export interface HomeSignal {
  label: string;
  value: string;
  hint?: string;
  tone: HomeSignalTone;
}

/** Hero live-feed instrument — illustrative desk telemetry */
export const HOME_LIVE_FEED = {
  symbol: "R_10",
  quote: "5432.1840",
  delta: "+0.042",
  latencyMs: 12,
  ticksPerMin: 847,
  account: "VRT1000000",
  channel: "Worker feed",
  connection: "WS connected",
  mode: "Demo",
  risk: "Clear",
} as const;

/** Illustrative desk snapshot — mirrors the in-app Home command center */
export const HOME_DESK_SNAPSHOT: HomeSignal[] = [
  {
    label: "Balance",
    value: "KES 1.29M",
    hint: "10,000.00 USD · demo",
    tone: "neutral",
  },
  {
    label: "Session P/L",
    value: "+124.50",
    hint: "USD · today",
    tone: "positive",
  },
  {
    label: "Market pulse",
    value: "R_10",
    hint: "5432.18 · feed live",
    tone: "positive",
  },
  {
    label: "Open book",
    value: "3",
    hint: "+42.10 USD unrealized",
    tone: "neutral",
  },
];

export interface HomeWorkspaceCard {
  id: PlatformNavId;
  group: "Overview" | "Trading" | "Account";
  title: string;
  body: string;
  icon: LucideIcon;
}

export const HOME_WORKSPACES: HomeWorkspaceCard[] = [
  {
    id: "home",
    group: "Overview",
    title: "Home",
    body: "Balance, session P/L, watchlist, recent positions, and workspace launchers on one command bar.",
    icon: LayoutDashboard,
  },
  {
    id: "trade",
    group: "Trading",
    title: "Trade",
    body: "Rise/Fall synthetics with a resilient feed that survives tab backgrounding and brief offline windows.",
    icon: TrendingUp,
  },
  {
    id: "auto",
    group: "Trading",
    title: "Auto",
    body: "Run MA-cross and RSI strategies with start/stop controls, tick telemetry, and session risk gates.",
    icon: Bot,
  },
  {
    id: "copy",
    group: "Trading",
    title: "Copy",
    body: "Browse providers, manage follows, and mirror tickets with copy-specific drawdown limits.",
    icon: Copy,
  },
  {
    id: "portfolio",
    group: "Trading",
    title: "Portfolio",
    body: "Open contracts with live P/L, close actions, and source badges — persisted locally across reloads.",
    icon: LayoutList,
  },
  {
    id: "wallet",
    group: "Account",
    title: "Wallet",
    body: "Deriv Cashier deep-links for deposits plus country-scoped payment agent listings.",
    icon: Wallet,
  },
  {
    id: "settings",
    group: "Account",
    title: "Settings",
    body: "Session stop-loss, daily drawdown, stake caps, KES/UGX/TZS/RWF/USD display, and themes.",
    icon: Settings,
  },
];

export const HOME_METRICS = [
  { value: "7", label: "Workspaces" },
  { value: "KES+", label: "Local display FX" },
  { value: "24/7", label: "Synthetic markets" },
  { value: "Demo", label: "Try before live" },
] as const;

export const HOME_SECTIONS = {
  pillars: {
    eyebrow: "Ways to trade",
    title: "Manual, automated, or social",
    lead: "Three execution modes on one market feed — switch workspaces without losing context.",
  },
  platform: {
    eyebrow: "The full desk",
    title: "Every workspace, one terminal",
    lead: "Home is the hub. Trade, Auto, Copy, Portfolio, Wallet, and Settings branch from the same sidebar.",
  },
  start: {
    eyebrow: "Get started",
    title: "Live in three steps",
  },
} as const;
