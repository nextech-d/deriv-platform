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
  eyebrow: "Deriv EA · Synthetics terminal",
  title: "Synthetics trading,",
  titleAccent: "one command desk.",
  lead: "Ticket Rise/Fall, run bots, or copy providers from one terminal — balance and live quotes stay on Home.",
} as const;

export const HOME_MARKETS = {
  kicker: "Markets on the desk",
  lead: "Synthetic indices stream 24/7 — grouped the same way they appear in the symbol rail.",
  status: "Feed live",
  meta: "Symbol rail",
  latencyMs: 12,
} as const;

export const HOME_MARKET_GROUPS = [
  {
    label: "Volatility",
    description: "Constant volatility, tick-by-tick",
    symbols: ["R_10", "R_25", "R_75", "R_100"],
    spark: [38, 52, 44, 68, 48, 58, 42, 62, 50, 55],
    ticksPerMin: 847,
  },
  {
    label: "Boom / Crash",
    description: "Spike and drop indices",
    symbols: ["BOOM1000", "CRASH1000"],
    spark: [28, 72, 35, 88, 42, 65, 38, 78, 45, 70],
    ticksPerMin: 612,
  },
] as const;

export interface HomePillar {
  id: Exclude<PlatformNavId, "home" | "portfolio" | "wallet" | "settings">;
  title: string;
  tagline: string;
  body: string;
  chips: readonly string[];
  icon: LucideIcon;
}

export const HOME_PILLARS: HomePillar[] = [
  {
    id: "trade",
    title: "Trade",
    tagline: "Manual Rise/Fall",
    body: "Quote gate, stake, duration, and session risk on every ticket.",
    chips: ["Rise / Fall", "Quote gate", "Session risk"],
    icon: TrendingUp,
  },
  {
    id: "auto",
    title: "Auto",
    tagline: "Bots on the feed",
    body: "Bots on the same WebSocket — start, pause, or stop without losing ticks.",
    chips: ["MA cross", "RSI", "Shared feed"],
    icon: Bot,
  },
  {
    id: "copy",
    title: "Copy",
    tagline: "Mirror providers",
    body: "Follow providers with stake caps and a book separate from manual trades.",
    chips: ["Stake caps", "Drawdown limits", "Separate book"],
    icon: Copy,
  },
];

export const HOME_STEPS = [
  {
    step: "01",
    title: "Sign up or log in",
    tag: "Connect",
    body: "Deriv OAuth or PAT when OAuth is blocked.",
  },
  {
    step: "02",
    title: "Try demo or fund live",
    tag: "Fund",
    body: "Demo ticks live, or deposit via Cashier and local agents.",
  },
  {
    step: "03",
    title: "Start from Home",
    tag: "Trade",
    body: "Balance and watchlist first — then Trade, Auto, or Copy.",
  },
] as const;

export interface HomeTrustItem {
  label: string;
  detail: string;
  icon: LucideIcon;
}

export const HOME_TRUST: HomeTrustItem[] = [
  {
    label: "Deriv OAuth & PAT",
    detail: "Permissions and balances stay on Deriv",
    icon: Shield,
  },
  {
    label: "Demo desk",
    detail: "Live public ticks before you fund",
    icon: TrendingUp,
  },
  {
    label: "Cashier & agents",
    detail: "M-Pesa, MoMo, and card via Cashier",
    icon: Wallet,
  },
  {
    label: "Mobile-ready feed",
    detail: "Reconnects after tab sleep or handoff",
    icon: Smartphone,
  },
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
  tag: string;
  icon: LucideIcon;
}

export const HOME_WORKSPACES: HomeWorkspaceCard[] = [
  {
    id: "home",
    group: "Overview",
    title: "Home",
    body: "Balance, P/L, watchlist, and resume last workspace.",
    tag: "Hub",
    icon: LayoutDashboard,
  },
  {
    id: "trade",
    group: "Trading",
    title: "Trade",
    body: "Rise/Fall tickets with quote gate and resilient feed.",
    tag: "Manual",
    icon: TrendingUp,
  },
  {
    id: "auto",
    group: "Trading",
    title: "Auto",
    body: "MA-cross and RSI bots with telemetry and lockouts.",
    tag: "Bots",
    icon: Bot,
  },
  {
    id: "copy",
    group: "Trading",
    title: "Copy",
    body: "Provider follows and mirrored tickets with risk caps.",
    tag: "Mirror",
    icon: Copy,
  },
  {
    id: "portfolio",
    group: "Trading",
    title: "Portfolio",
    body: "Open contracts, live P/L, and close actions across reloads.",
    tag: "Book",
    icon: LayoutList,
  },
  {
    id: "wallet",
    group: "Account",
    title: "Wallet",
    body: "Cashier deposits and country-scoped payment agents.",
    tag: "Fund",
    icon: Wallet,
  },
  {
    id: "settings",
    group: "Account",
    title: "Settings",
    body: "Stop-loss, drawdown caps, display currency, and theme.",
    tag: "Risk",
    icon: Settings,
  },
];

export const HOME_METRICS = [
  { value: "7", label: "Workspaces" },
  { value: "5", label: "Display currencies" },
  { value: "24/7", label: "Synthetic hours" },
  { value: "0", label: "Installs required" },
] as const;

export const HOME_SECTIONS = {
  pillars: {
    eyebrow: "Ways to trade",
    title: "Manual, automated, or social",
    lead: "Three modes on the same market feed.",
  },
  platform: {
    eyebrow: "The full desk",
    title: "Every workspace, one sidebar",
    lead: "Home through settings on the same rail.",
  },
  start: {
    eyebrow: "Get started",
    title: "From sign-up to first ticket",
    lead: "Connect Deriv, fund or demo, then trade from Home.",
  },
  day: {
    eyebrow: "A day on the desk",
    title: "From check-in to session close",
    lead: "How a session moves across workspaces.",
  },
  metrics: {
    eyebrow: "At a glance",
    title: "Terminal by the numbers",
    lead: "Workspaces, currencies, and session shape.",
  },
  trust: {
    eyebrow: "Built for the desk",
    title: "Trust the stack",
  },
} as const;

export interface HomeDayMoment {
  time: string;
  workspace: string;
  navId: PlatformNavId;
  title: string;
  body: string;
}

export const HOME_DAY_ON_DESK: HomeDayMoment[] = [
  {
    time: "08:00",
    workspace: "Home",
    navId: "home",
    title: "Open the session",
    body: "Balance, P/L, and watchlist before you pick a market.",
  },
  {
    time: "09:15",
    workspace: "Trade",
    navId: "trade",
    title: "Ticket off the live quote",
    body: "Rise/Fall through the quote gate with risk notices on every ticket.",
  },
  {
    time: "11:00",
    workspace: "Auto",
    navId: "auto",
    title: "Let a bot run the feed",
    body: "MA-cross or RSI on the shared feed — pause without losing ticks.",
  },
  {
    time: "14:30",
    workspace: "Copy",
    navId: "copy",
    title: "Mirror a provider signal",
    body: "Follow a provider with copy stake caps and drawdown limits.",
  },
  {
    time: "16:00",
    workspace: "Portfolio",
    navId: "portfolio",
    title: "Manage the open book",
    body: "Live P/L, close contracts, and trace manual, bot, or copy tickets.",
  },
  {
    time: "17:45",
    workspace: "Wallet",
    navId: "wallet",
    title: "Fund before tomorrow",
    body: "Cashier or local agents — then back to Home for the next session.",
  },
];

export const HOME_CTA = {
  title: "Create your desk",
  bodyDemo: "Demo is on — open the terminal and ticket Volatility or Boom/Crash with live ticks.",
  bodyLive: "Sign up with Deriv, fund via Cashier or a local agent, then trade from Home.",
} as const;
