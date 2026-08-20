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

export function useTheme() {
  const [preference, setPreferenceState] =
    useState<ThemePreference>(DEFAULT_THEME);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");
  const [hydrated, setHydrated] = useState(false);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    const resolved = resolveTheme(next);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  const toggleLightDark = useCallback(() => {
    const current = preference === "system" ? resolvedTheme : preference;
    setPreference(current === "dark" ? "light" : "dark");
  }, [preference, resolvedTheme, setPreference]);

  useEffect(() => {
    const stored = readStoredTheme();
    const resolved = resolveTheme(stored);
    setPreferenceState(stored);
    setResolvedTheme(resolved);
    applyTheme(resolved);
    setHydrated(true);

    if (stored !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      const next = resolveTheme("system");
      setResolvedTheme(next);
      applyTheme(next);
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
