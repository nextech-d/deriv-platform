import {
  BarChart3,
  FileUp,
  Gift,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { AppView } from "@/lib/navigation/platform-nav";

export type DashboardWindowId =
  | "load-bot"
  | "speed-bot"
  | "premium-bots"
  | "free-bots"
  | "analysis-tool";

export type DashboardWindowAccent =
  | "import"
  | "speed"
  | "premium"
  | "free"
  | "analysis";

export interface DashboardWindow {
  id: DashboardWindowId;
  title: string;
  summary: string;
  action: string;
  icon: LucideIcon;
  /** Terminal destination after open */
  view: AppView;
  accent: DashboardWindowAccent;
}

export const DASHBOARD_WINDOWS: DashboardWindow[] = [
  {
    id: "load-bot",
    title: "Load Bot",
    summary: "Import XML, Drive, Builder, or a quick strategy",
    action: "Choose XML",
    icon: FileUp,
    view: "bot-builder",
    accent: "import",
  },
  {
    id: "speed-bot",
    title: "Speed Bot",
    summary: "Build a guided strategy quickly",
    action: "Start guide",
    icon: Zap,
    view: "bot-builder",
    accent: "speed",
  },
  {
    id: "premium-bots",
    title: "Premium Bots",
    summary: "Open Advanced Ready-made bots",
    action: "Open library",
    icon: Sparkles,
    view: "free-bots",
    accent: "premium",
  },
  {
    id: "free-bots",
    title: "Free bots",
    summary: "Browse free strategies to load and edit",
    action: "Browse free",
    icon: Gift,
    view: "free-bots",
    accent: "free",
  },
  {
    id: "analysis-tool",
    title: "Analysis tool",
    summary: "Study signals before opening trades",
    action: "Open analysis",
    icon: BarChart3,
    view: "analysis-tool",
    accent: "analysis",
  },
];
