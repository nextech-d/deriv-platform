import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Copy,
  LayoutList,
  Settings,
  TrendingUp,
  Wallet,
} from "lucide-react";

export interface PlatformSectionContent {
  sectionId: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  icon: LucideIcon;
}

export const PLATFORM_SECTIONS: PlatformSectionContent[] = [
  {
    sectionId: "trade",
    eyebrow: "Trade",
    title: "Rise/Fall on a resilient market feed",
    body: "Subscribe to synthetics with a WebSocket engine that survives tab backgrounding, 3G handoffs, and brief offline windows.",
    bullets: [
      "Symbol rail for Volatility, Boom/Crash, and majors",
      "Live quote gate before demo execution",
      "Order ticket with stake, duration, and risk notices",
    ],
    icon: TrendingUp,
  },
  {
    sectionId: "auto",
    eyebrow: "Auto",
    title: "Automation on the same desk",
    body: "Run MA-cross and RSI strategies on the same feed as manual trading, with demo runtime gates for safe validation.",
    bullets: [
      "Start, pause, and stop from the workspace",
      "Telemetry for ticks, trades, and last signal",
      "Respects session risk lockouts",
    ],
    icon: Bot,
  },
  {
    sectionId: "copy",
    eyebrow: "Copy",
    title: "Follow providers with copy-specific risk",
    body: "Browse signal providers, manage follow lists, and mirror Rise/Fall tickets with separate copy drawdown limits.",
    bullets: [
      "Provider badges and stake caps",
      "Signal history with one-click copy",
      "Independent copy session stats",
    ],
    icon: Copy,
  },
  {
    sectionId: "portfolio",
    eyebrow: "Portfolio",
    title: "Positions that survive reloads",
    body: "Open contracts persist in IndexedDB — a hard refresh on a flaky connection does not wipe your book.",
    bullets: [
      "Live P/L with local currency preview",
      "Close and sell from the list",
      "Source badges for manual, bot, and copy",
    ],
    icon: LayoutList,
  },
  {
    sectionId: "wallet",
    eyebrow: "Wallet",
    title: "Cashier and mobile-money agents",
    body: "Official Deriv Cashier deep-links for deposits, plus country-scoped payment agent listings for East Africa.",
    bullets: [
      "M-Pesa, MoMo, and card paths via Cashier",
      "Partner agent directory with disclosure",
      "Withdrawal guidance wizard",
    ],
    icon: Wallet,
  },
  {
    sectionId: "settings",
    eyebrow: "Settings",
    title: "Risk, theme, and copy controls",
    body: "Configure session stop-loss, daily drawdown, stake caps, display currency, and copy limits in one panel.",
    bullets: [
      "KES / UGX / TZS / RWF / USD display",
      "Light and dark terminal themes",
      "WebSocket metrics for transparency",
    ],
    icon: Settings,
  },
];
