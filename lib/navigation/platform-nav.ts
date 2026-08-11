import {
  Bot,
  Copy,
  LayoutDashboard,
  LayoutList,
  Settings,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type PlatformNavId =
  | "home"
  | "trade"
  | "auto"
  | "copy"
  | "portfolio"
  | "wallet"
  | "settings";

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

export const PLATFORM_NAV_GROUPS: PlatformNavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        id: "home",
        label: "Home",
        desc: "Terminal overview",
        icon: LayoutDashboard,
        sectionId: "overview",
      },
    ],
  },
  {
    label: "Trading",
    items: [
      {
        id: "trade",
        label: "Trade",
        desc: "Markets & ticket",
        icon: TrendingUp,
        sectionId: "trade",
      },
      {
        id: "auto",
        label: "Auto",
        desc: "Bot strategies",
        icon: Bot,
        sectionId: "auto",
      },
      {
        id: "copy",
        label: "Copy",
        desc: "Signal providers",
        icon: Copy,
        sectionId: "copy",
      },
      {
        id: "portfolio",
        label: "Portfolio",
        desc: "Open positions",
        icon: LayoutList,
        sectionId: "portfolio",
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        id: "wallet",
        label: "Wallet",
        desc: "Deposit & agents",
        icon: Wallet,
        sectionId: "wallet",
      },
      {
        id: "settings",
        label: "Settings",
        desc: "Risk & prefs",
        icon: Settings,
        sectionId: "settings",
      },
    ],
  },
];

export const PLATFORM_NAV_ITEMS = PLATFORM_NAV_GROUPS.flatMap(
  (group) => group.items,
);

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
