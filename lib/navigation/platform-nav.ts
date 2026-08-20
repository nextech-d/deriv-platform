import {
  BarChart3,
  BookOpen,
  Bot,
  Brain,
  ChartLine,
  Copy,
  DollarSign,
  Gift,
  LayoutDashboard,
  LineChart,
  Layers,
  Radar,
  Sparkles,
  TrendingUp,
  Wand2,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Sidebar / marketing rail destinations (ordered as product menu).
 * Settings, wallet, and portfolio stay reachable via the command bar / dashboard actions.
 */
export type PlatformNavId =
  | "dashboard"
  | "bot-builder"
  | "ai-bot"
  | "trading-bot"
  | "free-bots"
  | "analysis-tool"
  | "signal-center"
  | "money-management"
  | "pro-ai"
  | "auto-trader"
  | "d-trader"
  | "manual-trading"
  | "chart"
  | "copy-trading"
  | "edging"
  | "edging-2"
  | "fast-trader"
  | "ultimate-bot"
  | "bulk-trader"
  | "deriv-course";

/** Full terminal view set including chrome-only destinations and legacy views. */
export type AppView = PlatformNavId | "settings" | "wallet" | "portfolio" | "ai-bot" | "trading-bot" | "pro-ai" | "auto-trader" | "manual-trading" | "deriv-course";

export interface PlatformNavItem {
  id: PlatformNavId;
  label: string;
  desc: string;
  icon: LucideIcon;
  /** Landing page section anchor */
  sectionId: string;
}

export interface PlatformNavGroup {
  label: string;
  items: PlatformNavItem[];
}

/**
 * Product menu — Sentence Case labels, fixed product order.
 */
export const PLATFORM_NAV_ITEMS: PlatformNavItem[] = [
  { id: "dashboard", label: "Dashboard", desc: "Bot desk windows", icon: LayoutDashboard, sectionId: "overview" },
  { id: "bot-builder", label: "Bot Builder", desc: "Visual strategy build", icon: Workflow, sectionId: "bot-builder" },
  { id: "free-bots", label: "Free Bots", desc: "Browse free strategies", icon: Gift, sectionId: "free-bots" },
  { id: "d-trader", label: "D-Trader", desc: "Deriv-style ticket", icon: TrendingUp, sectionId: "d-trader" },
  { id: "analysis-tool", label: "Analysis Tool", desc: "Digit signal desk", icon: BarChart3, sectionId: "analysis-tool" },
  { id: "signal-center", label: "Signal Center", desc: "Trading tools hub", icon: Radar, sectionId: "signal-center" },
  { id: "money-management", label: "Money Management", desc: "Plan generator", icon: DollarSign, sectionId: "money-management" },
  { id: "copy-trading", label: "Copy Trader", desc: "Multi-account trading", icon: Copy, sectionId: "copy-trading" },
  { id: "edging", label: "Edging", desc: "Over 5 & Under 4", icon: Layers, sectionId: "edging" },
  { id: "edging-2", label: "Edging 2", desc: "Digit analysis", icon: Layers, sectionId: "edging-2" },
  { id: "fast-trader", label: "Fast Trader", desc: "Quick trade all types", icon: Zap, sectionId: "fast-trader" },
  { id: "chart", label: "Charts", desc: "Tick chart focus", icon: LineChart, sectionId: "chart" },
  { id: "ultimate-bot", label: "Ultimate Bot", desc: "Multi-market scanner", icon: Brain, sectionId: "ultimate-bot" },
  { id: "bulk-trader", label: "Bulk Trader", desc: "Digit frequency bulk", icon: BarChart3, sectionId: "bulk-trader" },
];

const ITEM = Object.fromEntries(
  PLATFORM_NAV_ITEMS.map((item) => [item.id, item]),
) as Record<PlatformNavId, PlatformNavItem>;

/** Flat list for horizontal pill tabs — matches dangotetradecity.trade layout. */
export const PLATFORM_NAV_GROUPS: PlatformNavGroup[] = [
  {
    label: "All",
    items: PLATFORM_NAV_ITEMS,
  },
];

export const PLATFORM_NAV_ORDER = PLATFORM_NAV_ITEMS.map((item) => item.id);

export function platformSectionHref(sectionId: string): string {
  return `#${sectionId}`;
}

export function platformNavIdFromSectionId(
  sectionId: string,
): PlatformNavId | null {
  return (
    PLATFORM_NAV_ITEMS.find((item) => item.sectionId === sectionId)?.id ?? null
  );
}

export function platformSectionIdFromNavId(id: PlatformNavId): string {
  return (
    PLATFORM_NAV_ITEMS.find((item) => item.id === id)?.sectionId ?? "overview"
  );
}

export function isPlatformNavId(value: string): value is PlatformNavId {
  return PLATFORM_NAV_ORDER.includes(value as PlatformNavId);
}
