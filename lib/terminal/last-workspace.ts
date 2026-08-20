import type { AppView } from "@/components/layout/AppShell";
import { PLATFORM_NAV_ORDER } from "@/lib/navigation/platform-nav";

const STORAGE_KEY = "deriv_platform_last_workspace";

const LEGACY_VIEW_MAP: Record<string, AppView> = {
  home: "dashboard",
  trade: "manual-trading",
  auto: "auto-trader",
  copy: "copy-trading",
};

const VALID_VIEWS: AppView[] = [
  ...PLATFORM_NAV_ORDER,
  "portfolio",
  "wallet",
  "settings",
];

function normalizeView(raw: string): AppView | null {
  const mapped = LEGACY_VIEW_MAP[raw] ?? raw;
  if (mapped === "dashboard") return null;
  return VALID_VIEWS.includes(mapped as AppView) ? (mapped as AppView) : null;
}

export function readLastWorkspace(): AppView | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || raw === "home" || raw === "dashboard") return null;
    return normalizeView(raw);
  } catch {
    return null;
  }
}

export function writeLastWorkspace(view: AppView): void {
  if (typeof window === "undefined" || view === "dashboard") return;
  localStorage.setItem(STORAGE_KEY, view);
}
