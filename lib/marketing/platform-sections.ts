import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Copy,
  TrendingUp,
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
    sectionId: "manual-trading",
    eyebrow: "Manual trading",
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
    sectionId: "auto-trader",
    eyebrow: "Auto trader",
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
    sectionId: "copy-trading",
    eyebrow: "Copy trading",
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
    sectionId: "d-trader",
    eyebrow: "D Trader",
    title: "Deriv-style ticket on the synthetic rail",
    summary: "Same Rise/Fall execution as Manual trading — stake, duration, and quote gate on the shared feed.",
    body: "D Trader mirrors the familiar Deriv ticket flow for Volatility and Boom/Crash. Stake, tick duration, and session risk gates apply before every order.",
    meta: ["Rise / Fall", "Quote gate", "Session risk"],
    features: [
      { label: "Symbol rail", detail: "R_10 through R_100 plus Boom/Crash 1000." },
      { label: "Ticket", detail: "CALL and PUT with USD stake and tick duration chips." },
      { label: "Risk", detail: "Session stop-loss and daily drawdown lock the desk when tripped." },
    ],
    preview: {
      kicker: "D Trader",
      status: "Quote live",
      rows: [
        { key: "Symbol", value: "R_10" },
        { key: "Side", value: "Rise" },
        { key: "Stake", value: "10.00 USD" },
      ],
    },
    icon: TrendingUp,
  },
  {
    sectionId: "chart",
    eyebrow: "Chart",
    title: "Tick chart focus beside the live quote",
    summary: "Full-width market tape for Volatility and Boom/Crash without leaving the terminal.",
    body: "Chart workspace keeps the advanced tick chart and quote on the same feed Manual and Auto use — pick a symbol and read the tape before you ticket.",
    meta: ["Tick chart", "Symbol rail", "Shared feed"],
    features: [
      { label: "Live quote", detail: "Streaming last tick with connection state." },
      { label: "Symbol switch", detail: "Same rail as Manual trading and Auto trader." },
      { label: "Session strip", detail: "Balance and open count stay in the command bar." },
    ],
    preview: {
      kicker: "Chart desk",
      status: "Feed live",
      rows: [
        { key: "Symbol", value: "R_10" },
        { key: "Quote", value: "5432.184" },
        { key: "Ticks/min", value: "847" },
      ],
    },
    icon: TrendingUp,
  },
  {
    sectionId: "trading-bot",
    eyebrow: "Trading bot",
    title: "Saved bot desk on the shared feed",
    summary: "Run MA-cross or RSI from a dedicated bot workspace with the same telemetry as Auto trader.",
    body: "Trading bot is the saved-strategy desk for bots you keep on the feed — start, pause, and stop without losing ticks.",
    meta: ["MA cross", "RSI", "Telemetry"],
    features: [
      { label: "Strategies", detail: "MA-cross and RSI threshold presets." },
      { label: "Run controls", detail: "Start, pause, resume, and stop." },
      { label: "Demo gate", detail: "24h demo runtime before live unlock." },
    ],
    preview: {
      kicker: "Bot desk",
      status: "Idle",
      rows: [
        { key: "Strategy", value: "MA cross 5/20" },
        { key: "Stake", value: "1.00 USD" },
      ],
    },
    icon: Bot,
  },
  {
    sectionId: "bot-builder",
    eyebrow: "Bot builder",
    title: "Visual blocks for trade, purchase, sell, and restart",
    summary:
      "Assemble strategy windows with a blocks menu, AI Bot Generator, and a live run summary.",
    body: "Bot builder mirrors a Deriv-style canvas: search Analysis Logics and Market Structure, configure Trade parameters and Purchase conditions, then track stake, payout, and win/loss on the Summary desk.",
    meta: ["Blocks menu", "AI generator", "Run summary"],
    features: [
      {
        label: "AI Bot Generator",
        detail: "Jump into Ai bot from the toolbar to seed a strategy briefly.",
      },
      {
        label: "Blocks menu",
        detail:
          "Trade parameters, Purchase / Sell / Restart conditions, Analysis, Utility, and desk tools.",
      },
      {
        label: "Strategy canvas",
        detail:
          "Numbered windows for market, duration, stake, purchase side, sell logic, and trade-again.",
      },
      {
        label: "Summary desk",
        detail:
          "Summary, Transactions, and Journal tabs with stake, payout, runs, and P/L stats.",
      },
      {
        label: "Workspace tools",
        detail: "Load/save XML, undo/redo, zoom, and chart layout shortcuts on the toolbar.",
      },
    ],
    preview: {
      kicker: "Builder",
      status: "Desk live",
      rows: [
        { key: "Market", value: "Volatility 100 (1s)" },
        { key: "Purchase", value: "Rise" },
        { key: "Duration", value: "5 ticks" },
        { key: "Stake", value: "0.60 USD" },
      ],
    },
    icon: Bot,
  },
  {
    sectionId: "ai-bot",
    eyebrow: "Ai bot",
    title: "Generate bots from a brief (coming next)",
    summary: "Describe a strategy in plain language and get a runnable bot config.",
    body: "Ai bot will turn a short brief into MA/RSI parameters you can run on the shared feed.",
    meta: ["Prompt", "Generate", "Review"],
    features: [
      { label: "Brief", detail: "Describe markets, style, and risk in plain language." },
      { label: "Generate", detail: "Produce stake, duration, and indicator settings." },
      { label: "Review", detail: "Edit before sending to Trading bot or Auto trader." },
    ],
    preview: {
      kicker: "Ai bot",
      status: "Soon",
      rows: [
        { key: "Status", value: "Coming next" },
        { key: "Output", value: "Bot config draft" },
      ],
    },
    icon: Bot,
  },
  {
    sectionId: "analysis-tool",
    eyebrow: "Analysis tool",
    title: "Digit signals before you open a ticket",
    summary:
      "Parity, barrier, matches, and frequency desks over the live tick window.",
    body: "Analysis tool reads last digits from the shared feed — even/odd bias, over/under around a barrier, match/differ rates, and hot/cold digits — so you can study before Manual trading or Bot builder.",
    meta: ["Parity", "Barrier", "Frequency"],
    features: [
      {
        label: "Digit strip",
        detail: "Recent last digits color-coded by parity from the live symbol.",
      },
      {
        label: "Parity & streak",
        detail: "Even/odd percentages plus the current same-side streak length.",
      },
      {
        label: "Barrier desk",
        detail: "Over/Under share relative to a configurable digit barrier.",
      },
      {
        label: "Matches & frequency",
        detail: "Target digit hit rate and a hot/cold frequency board.",
      },
    ],
    preview: {
      kicker: "Analysis",
      status: "Desk live",
      rows: [
        { key: "Mode", value: "Parity" },
        { key: "Window", value: "Last 20" },
        { key: "Symbol", value: "R_100" },
      ],
    },
    icon: TrendingUp,
  },
  {
    sectionId: "pro-ai",
    eyebrow: "Pro AI",
    title: "Advanced AI desk (coming next)",
    summary: "Signals, scenario runs, and assisted ticket sizing.",
    body: "Pro AI will sit beside the ticket with scenario assists and sizing hints under your risk gates.",
    meta: ["Signals", "Scenarios", "Sizing"],
    features: [
      { label: "Signals", detail: "Desk-scoped ideas on the shared feed." },
      { label: "Scenarios", detail: "What-if stake and duration runs." },
      { label: "Risk", detail: "Honors session stop-loss and stake caps." },
    ],
    preview: {
      kicker: "Pro AI",
      status: "Soon",
      rows: [
        { key: "Status", value: "Coming next" },
        { key: "Assist", value: "Ticket sizing" },
      ],
    },
    icon: TrendingUp,
  },
  {
    sectionId: "deriv-course",
    eyebrow: "Deriv Course",
    title: "Guides and lessons (coming next)",
    summary: "Curriculum for synthetics, risk, bots, and copy trading.",
    body: "Deriv Course will walk new desks from first login through risk, Manual trading, Auto trader, and Copy.",
    meta: ["Guides", "Lessons", "Playbooks"],
    features: [
      { label: "Basics", detail: "Accounts, demo, and first ticket." },
      { label: "Risk", detail: "Stop-loss, drawdown, and stake caps." },
      { label: "Modes", detail: "Manual, Auto, and Copy playbooks." },
    ],
    preview: {
      kicker: "Course",
      status: "Soon",
      rows: [
        { key: "Status", value: "Coming next" },
        { key: "Tracks", value: "Risk · Bots · Copy" },
      ],
    },
    icon: TrendingUp,
  },
];

