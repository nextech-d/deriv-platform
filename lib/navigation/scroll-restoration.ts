"use client";

import { useEffect, useRef } from "react";

const STORAGE_PREFIX = "deriv-platform:scroll:";

export type ScrollContainer = Window | HTMLElement;

function storageKey(pageKey: string): string {
  return `${STORAGE_PREFIX}${pageKey}`;
}

export function saveScrollPosition(pageKey: string, container: ScrollContainer): void {
  if (typeof window === "undefined") return;
  const top = container instanceof Window ? window.scrollY : container.scrollTop;
  sessionStorage.setItem(storageKey(pageKey), String(Math.max(0, Math.round(top))));
}

export function readScrollPosition(pageKey: string): number | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(storageKey(pageKey));
  if (raw == null) return null;
  const top = Number(raw);
  return Number.isFinite(top) ? top : null;
}

export function applyScrollPosition(container: ScrollContainer, top: number): void {
  if (container instanceof Window) {
    window.scrollTo({ top, left: 0, behavior: "instant" });
    return;
  }
  container.scrollTo({ top, left: 0, behavior: "instant" });
}

export function restoreScrollPosition(pageKey: string, container: ScrollContainer): boolean {
  const top = readScrollPosition(pageKey);
  if (top == null || top <= 0) return false;
  applyScrollPosition(container, top);
  return true;
}

export function clearScrollPosition(pageKey: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(storageKey(pageKey));
}

export function disableNativeScrollRestoration(): void {
  if (typeof window === "undefined") return;
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }
}

interface UsePageScrollRestorationOptions {
  enabled?: boolean;
  getContainer?: () => ScrollContainer | null;
}

const getWindowContainer = (): ScrollContainer => window;

export function usePageScrollRestoration(
  pageKey: string,
  options: UsePageScrollRestorationOptions = {},
) {
  const { enabled = true, getContainer = getWindowContainer } = options;
  const restoredRef = useRef(false);

  useEffect(() => {
    disableNativeScrollRestoration();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    restoredRef.current = false;
    let raf = 0;
    let attempts = 0;

    const tryRestore = () => {
      const container = getContainer();
      if (!container) {
        if (attempts < 12) {
          attempts += 1;
          raf = window.requestAnimationFrame(tryRestore);
        }
        return;
      }

      const top = readScrollPosition(pageKey);
      if (top != null && top > 0) {
        applyScrollPosition(container, top);
        restoredRef.current = true;
        window.requestAnimationFrame(() => applyScrollPosition(container, top));
      }
    };

    raf = window.requestAnimationFrame(tryRestore);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [enabled, getContainer, pageKey]);

  useEffect(() => {
    if (!enabled) return;

    const container = getContainer();
    if (!container) return;

    let timeout: ReturnType<typeof setTimeout> | undefined;

    const persist = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => saveScrollPosition(pageKey, container), 120);
    };

    const flush = () => saveScrollPosition(pageKey, container);

    container.addEventListener("scroll", persist, { passive: true });
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);

    return () => {
      if (timeout) clearTimeout(timeout);
      container.removeEventListener("scroll", persist);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      flush();
    };
  }, [enabled, getContainer, pageKey]);

  return {
    scrollToTop(container?: ScrollContainer | null) {
      const target = container ?? getContainer();
      if (!target) return;
      applyScrollPosition(target, 0);
      saveScrollPosition(pageKey, target);
    },
    didRestore: () => restoredRef.current,
  };
}

export function marketingScrollKey(panelId: string): string {
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  return `marketing:${path}:${panelId}`;
}

export function dashboardScrollKey(viewId: string): string {
  return `dashboard:${viewId}`;
}
