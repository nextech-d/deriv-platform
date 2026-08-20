import type { AppView, PlatformNavId } from "@/lib/navigation/platform-nav";
import {
  isPlatformNavId,
  platformNavIdFromSectionId,
  platformSectionIdFromNavId,
} from "@/lib/navigation/platform-nav";
import { readSectionIdFromHash } from "@/lib/navigation/scroll-to-section";
import { readLastWorkspace } from "@/lib/terminal/last-workspace";

const HASH_VIEWS: AppView[] = [
  "settings",
  "wallet",
  "portfolio",
  "ai-bot",
  "trading-bot",
  "pro-ai",
  "auto-trader",
  "manual-trading",
  "deriv-course",
];

function isAppView(value: string): value is AppView {
  return isPlatformNavId(value) || HASH_VIEWS.includes(value as AppView);
}

export function viewFromLocationHash(): AppView | null {
  const hash = readSectionIdFromHash();
  if (!hash || hash === "home") return null;
  if (hash === "overview" || hash === "dashboard") return "dashboard";
  if (isAppView(hash)) return hash;
  return platformNavIdFromSectionId(hash);
}

export function hashSegmentForView(view: AppView): string {
  if (isPlatformNavId(view)) return platformSectionIdFromNavId(view);
  return view;
}

export function writeViewHash(view: AppView): void {
  if (typeof window === "undefined") return;
  const next = `${window.location.pathname}${window.location.search}#${hashSegmentForView(view)}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (current !== next) {
    window.history.replaceState(null, "", next);
  }
}

export function resolveLandingView(): PlatformNavId {
  const fromHash = viewFromLocationHash();
  if (fromHash && isPlatformNavId(fromHash)) return fromHash;
  return "dashboard";
}

export function resolveDashboardView(): AppView {
  return viewFromLocationHash() ?? readLastWorkspace() ?? "dashboard";
}

export function clearBootHold(): void {
  if (typeof document === "undefined") return;
  document.documentElement.removeAttribute("data-boot-hold");
}
