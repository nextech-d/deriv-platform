import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Copy,
  LayoutList,
  Settings,
  TrendingUp,
  Wallet,
} from "lucide-react";

export interface PlatformSectionFeature {
  label: string;
  detail: string;
}

export interface PlatformSectionPreview {
  kicker: string;
  status: string;
  rows: readonly { key: string; value: string }[];
}

export interface PlatformSectionContent {
  sectionId: string;
  eyebrow: string;
  title: string;
  summary: string;
  body: string;
  meta: readonly string[];
  features: PlatformSectionFeature[];
  preview: PlatformSectionPreview;
  icon: LucideIcon;
}

export const PLATFORM_SECTIONS: PlatformSectionContent[] = [
  {
    sectionId: "trade",
    eyebrow: "Trade",
    title: "Rise/Fall tickets on the synthetic rail",
    summary:
      "Stake, tick duration, and a live-quote gate beside Volatility and Boom/Crash — session risk can lock the desk before execute.",
    body: "Trade the East Africa desk staples — R_10 through R_100 plus Boom/Crash 1000 — on one symbol rail with an advanced tick chart. Rise/Fall takes USD stake (from $0.35) and 1–10 tick duration; demo waits for a live quote, and session stop-loss or daily drawdown can lock the ticket until you reset in Settings. Stake shows a local FX preview in KES, UGX, TZS, or RWF.",
    meta: ["Rise / Fall", "Quote gate", "FX stake preview"],
    features: [
      {
        label: "Symbol rail",
        detail: "R_10, R_25, R_75, R_100, BOOM1000, and CRASH1000 — Synthetics and Crash/Boom groups.",
      },
      {
        label: "Rise/Fall ticket",
        detail: "CALL and PUT with USD stake, local ≈ preview, and duration chips (1t / 3t / 5t / 10t).",
      },
      {
        label: "Stake presets",
        detail: "$0.35, $1, $5, $10, $25 — minimum stake $0.35.",
      },
      {
        label: "Quote & connection gate",
        detail: "Demo blocks until a live quote; disconnected, in-flight, or risk-locked tickets cannot fire.",
      },
      {
        label: "Risk notices",
        detail: "Inline trade notices and “Trading locked — adjust limits in Settings” when session gates trip.",
      },
      {
        label: "Market desk",
        detail: "Live quote plus advanced tick chart on the same feed Auto and Copy use.",
      },
      {
        label: "Session strip",
        detail: "Session P/L, open count, and session/daily loss gauges beside the ticket.",
      },
    ],
    preview: {
      kicker: "Trade ticket",
      status: "Quote live",
      rows: [
        { key: "Symbol", value: "R_10 · Volatility 10" },
        { key: "Side", value: "Rise" },
        { key: "Stake", value: "10.00 USD ≈ KES 1,295" },
        { key: "Duration", value: "5 ticks" },
        { key: "Quote", value: "5432.184 · live" },
        { key: "Risk", value: "Within limits" },
      ],
    },
    icon: TrendingUp,
  },
  {
    sectionId: "auto",
    eyebrow: "Auto",
    title: "MA cross & RSI on the shared feed",
    summary:
      "Start, pause, and stop a bot with tunable periods, cooldown, and a 24h demo-runtime gate before live.",
    body: "Auto-trader runs MA-cross (fast/slow) or RSI threshold on the same tick stream as manual tickets. Configure stake, duration, periods, and cooldown ticks; telemetry shows ticks processed, trades fired, last signal, and last tick. Live auto-trade stays blocked until 24h of demo bot runtime; session risk lockouts still apply.",
    meta: ["MA cross", "RSI", "24h demo gate"],
    features: [
      {
        label: "Strategies",
        detail: "MA-cross (default 5/20) and RSI threshold (period 14, OS 30 / OB 70).",
      },
      {
        label: "Run controls",
        detail: "Start, pause, resume, and stop — status chip idle · running · paused · blocked.",
      },
      {
        label: "Tunable params",
        detail: "Stake, duration ticks, MA/RSI fields, and cooldown ticks between trades.",
      },
      {
        label: "Position cap",
        detail: "maxOpenPositions (default 1) gates new bot entries while a contract is open.",
      },
      {
        label: "Telemetry strip",
        detail: "Ticks processed, trades fired, last signal label, and last tick time.",
      },
      {
        label: "Demo runtime gate",
        detail: "Progress toward 24h demo bot runtime before live auto-trade unlocks.",
      },
      {
        label: "Risk honor",
        detail: "Blocked when trading is locked or the connection is down; demo simulates only.",
      },
    ],
    preview: {
      kicker: "Bot runner",
      status: "Running",
      rows: [
        { key: "Strategy", value: "MA cross 5/20" },
        { key: "Stake · dur", value: "1.00 USD · 5t" },
        { key: "Ticks / trades", value: "1,284 · 6" },
        { key: "Last signal", value: "MA cross ↑ · 12s" },
        { key: "Cooldown", value: "3 ticks" },
        { key: "Demo gate", value: "18h 40m / 24h" },
      ],
    },
    icon: Bot,
  },
  {
    sectionId: "copy",
    eyebrow: "Copy",
    title: "Follow curated East Africa desks",
    summary:
      "Follow KE/UG/TZ/RW providers with auto-copy, per-provider stake caps, and a separate copy risk book.",
    body: "Curated signal desks — no Telegram or XML import — emit Rise/Fall signals on followed symbols with 60s TTL, confidence, and rationale. Cap global and per-provider stake against session max stake; auto-copy when signed in for live OTP execution. Copy session stop-loss, daily drawdown (USD, EAT day), and max-copies stay independent of the manual book.",
    meta: ["Auto-copy", "60s TTL", "Separate risk"],
    features: [
      {
        label: "Provider directory",
        detail: "Curated desks (KE, UG, TZ, RW) with style, win listing, verified badge, and risk label.",
      },
      {
        label: "Follow & suggest",
        detail: "Follow or unfollow; suggested provider when none are followed yet.",
      },
      {
        label: "Stake caps",
        detail: "Global max stake plus per-provider caps, clamped to session max stake.",
      },
      {
        label: "Auto-copy",
        detail: "Mirror new signals automatically — live needs sign-in; demo simulates.",
      },
      {
        label: "Live signal feed",
        detail: "60s expiry bar, confidence %, Copy Now, and effective stake vs suggestion.",
      },
      {
        label: "Separate copy risk",
        detail: "Session SL, daily DD (USD), max copies/session — lockout banner with EAT day boundary.",
      },
      {
        label: "History strip",
        detail: "Copied, expired, blocked, and rejected events with a clear action trail.",
      },
    ],
    preview: {
      kicker: "Copy follow",
      status: "Following",
      rows: [
        { key: "Provider", value: "EA Vol Momentum · KE · Verified" },
        { key: "Style", value: "Momentum · R_10, R_25" },
        { key: "Stake cap", value: "5.00 USD (≤ session 25)" },
        { key: "Auto-copy", value: "On · live OTP" },
        { key: "Signal", value: "R_10 Rise · 72% · 48s left" },
        { key: "Copy risk", value: "SL $25 · DD $50 · clear" },
      ],
    },
    icon: Copy,
  },
  {
    sectionId: "portfolio",
    eyebrow: "Portfolio",
    title: "Open book with source filters",
    summary:
      "Live unrealized P/L for Manual, Copy, and Auto — close from the list; the book survives refresh in IndexedDB.",
    body: "Open Rise/Fall contracts show direction, symbol, contract id, source badge, stake, status, and USD P/L with a local FX underlay. Filter All / Manual / Copy / Auto; Close sells (or closes demo). Persistence is local IndexedDB so a hard refresh on a flaky line does not wipe the open book.",
    meta: ["Source filters", "Close", "IndexedDB"],
    features: [
      {
        label: "Open contracts list",
        detail: "Symbol, Rise/Fall, contract id, stake + currency, and live status.",
      },
      {
        label: "Live P/L",
        detail: "Unrealized USD with local currency preview; desk and filtered totals.",
      },
      {
        label: "Source badges",
        detail: "Manual, Copy, and Auto labels on every open contract.",
      },
      {
        label: "Source filters",
        detail: "All / Manual / Copy / Auto chips with counts and empty states.",
      },
      {
        label: "Close action",
        detail: "Per-row Close sends a sell (or closes the demo contract).",
      },
      {
        label: "Local persistence",
        detail: "Open book synced to IndexedDB — survives hard refresh and brief offline.",
      },
    ],
    preview: {
      kicker: "Open book",
      status: "3 open",
      rows: [
        { key: "Filter", value: "All · 3 open" },
        { key: "R_10 Rise #48291", value: "+2.40 USD · Manual" },
        { key: "BOOM1000 #48302", value: "−0.80 USD · Auto" },
        { key: "R_25 Fall #48310", value: "+1.10 USD · Copy" },
        { key: "Unrealized", value: "+2.70 USD ≈ KES 350" },
        { key: "Display", value: "KES preview" },
      ],
    },
    icon: LayoutList,
  },
  {
    sectionId: "wallet",
    eyebrow: "Wallet",
    title: "Cashier, agents, and MoMo guides",
    summary:
      "Open official Deriv Cashier, browse KE/UG/TZ/RW agents, and walk withdrawals — plus Uganda/Tanzania network guides.",
    body: "Deposit via Deriv Cashier (Fast Pesa / mobile money where available). The country rail scopes payment-agent listings with source disclosure and partner warnings. Withdrawals follow a three-step wizard (country → Cashier or agent → confirm). For UG and TZ, MoMo guides list MTN, Airtel, M-Pesa, Tigo, and Halotel with USSD and deposit/withdraw steps.",
    meta: ["Cashier", "Agents", "MoMo guides"],
    features: [
      {
        label: "Open Deriv Cashier",
        detail: "Deep-link into official Cashier for Fast Pesa, MoMo, and cards.",
      },
      {
        label: "Country agent rail",
        detail: "KE (M-Pesa·Bank), UG (MTN·Airtel), TZ (M-Pesa·Tigo), RW (MTN) with refresh + count.",
      },
      {
        label: "Agent directory",
        detail: "Partner listings with source disclosure and verify-on-Deriv.com context.",
      },
      {
        label: "Withdraw wizard",
        detail: "Country → Cashier vs agent → Confirm / Open Cashier.",
      },
      {
        label: "MoMo guides (UG/TZ)",
        detail: "Network-specific deposit and withdraw steps with USSD chips.",
      },
      {
        label: "Source line",
        detail: "Directory source formatting so you know which agents are partner-listed.",
      },
    ],
    preview: {
      kicker: "Wallet desk",
      status: "Cashier ready",
      rows: [
        { key: "Cashier", value: "Open · Fast Pesa / MoMo" },
        { key: "Country", value: "KE · Kenya" },
        { key: "Agents", value: "4 listed · refresh" },
        { key: "Source", value: "Partner listings · verify" },
        { key: "Withdraw", value: "Wizard · Cashier path" },
        { key: "MoMo", value: "UG / TZ guides when selected" },
      ],
    },
    icon: Wallet,
  },
  {
    sectionId: "settings",
    eyebrow: "Settings",
    title: "Session risk, copy limits, FX, theme",
    summary:
      "Client-side trading gates, separate copy risk, East Africa display currencies, and terminal theme — plus WS metrics.",
    body: "Trading gates enforce max stake, session stop-loss, and daily max drawdown in USD (EAT calendar day) before every order; reset session loss from Settings. Copy adds auto-copy, global copy stake, copy SL/DD/max-copies, and unfollow-all. Display currency is KES/UGX/TZS/RWF/USD with live or fallback FX; theme is Dark (default), Light, or System.",
    meta: ["USD gates", "Copy risk", "KES–RWF FX"],
    features: [
      {
        label: "Trading gates",
        detail: "Enabled toggle, max stake, session stop-loss, daily drawdown (USD), and reset session counter.",
      },
      {
        label: "Copy controls",
        detail: "Auto-copy, global max stake (≤ session max), copy risk fields, reset counters, unfollow all.",
      },
      {
        label: "Display FX",
        detail: "KES, UGX, TZS, RWF, or USD — live rate when available, fallback stamp otherwise.",
      },
      {
        label: "Theme",
        detail: "Dark (default), Light, or System via the terminal theme picker.",
      },
      {
        label: "WS metrics",
        detail: "Connection snapshot and reset for resilience checks on flaky lines.",
      },
      {
        label: "Admin studios",
        detail: "Links to Partner and Copy provider studios when ADMIN_SECRET is configured.",
      },
    ],
    preview: {
      kicker: "Risk prefs",
      status: "Armed",
      rows: [
        { key: "Max stake", value: "25.00 USD" },
        { key: "Session SL", value: "50.00 USD" },
        { key: "Daily DD", value: "100.00 USD" },
        { key: "Copy SL · DD", value: "25 · 50 USD" },
        { key: "Currency", value: "KES · live FX" },
        { key: "Theme", value: "Dark" },
      ],
    },
    icon: Settings,
  },
];
