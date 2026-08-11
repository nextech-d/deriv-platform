import type { AppView } from "@/components/layout/AppShell";

const STORAGE_KEY = "deriv_platform_last_workspace";

const VALID_VIEWS: AppView[] = [
  "home",
  "trade",
  "auto",
  "copy",
  "portfolio",
  "wallet",
  "settings",
];

export function readLastWorkspace(): AppView | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || raw === "home") return null;
    return VALID_VIEWS.includes(raw as AppView) ? (raw as AppView) : null;
  } catch {
    return null;
  }
}

export function writeLastWorkspace(view: AppView): void {
  if (typeof window === "undefined" || view === "home") return;
  localStorage.setItem(STORAGE_KEY, view);
}
