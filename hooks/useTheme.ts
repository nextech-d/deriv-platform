"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyTheme,
  DEFAULT_THEME,
  readStoredTheme,
  resolveTheme,
  THEME_DESCRIPTIONS,
  THEME_LABELS,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme/settings";

function readInitialTheme(): {
  preference: ThemePreference;
  resolved: ResolvedTheme;
} {
  if (typeof window === "undefined") {
    return { preference: DEFAULT_THEME, resolved: "dark" };
  }
  const stored = readStoredTheme();
  const resolved = resolveTheme(stored);
  applyTheme(resolved);
  return { preference: stored, resolved };
}

export function useTheme() {
  const [{ preference, resolved: resolvedTheme }, setTheme] = useState(readInitialTheme);
  const hydrated = typeof window !== "undefined";

  const setPreference = useCallback((next: ThemePreference) => {
    const resolved = resolveTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(resolved);
    setTheme({ preference: next, resolved });
  }, []);

  const toggleLightDark = useCallback(() => {
    const current = preference === "system" ? resolvedTheme : preference;
    setPreference(current === "dark" ? "light" : "dark");
  }, [preference, resolvedTheme, setPreference]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = readStoredTheme();
    if (stored !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      const next = resolveTheme("system");
      setTheme((prev) => {
        applyTheme(next);
        return { ...prev, resolved: next };
      });
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return {
    preference,
    resolvedTheme,
    hydrated,
    setPreference,
    toggleLightDark,
    labels: THEME_LABELS,
    descriptions: THEME_DESCRIPTIONS,
  };
}
