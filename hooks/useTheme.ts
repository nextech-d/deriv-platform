"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyTheme,
  readStoredTheme,
  resolveTheme,
  THEME_DESCRIPTIONS,
  THEME_LABELS,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme/settings";

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    typeof window === "undefined" ? "dark" : readStoredTheme(),
  );
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    typeof window === "undefined" ? "dark" : resolveTheme(readStoredTheme()),
  );

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    const resolved = resolveTheme(next);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  useEffect(() => {
    const stored = readStoredTheme();
    const resolved = resolveTheme(stored);
    setPreferenceState(stored);
    setResolvedTheme(resolved);
    applyTheme(resolved);

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
    setPreference,
    labels: THEME_LABELS,
    descriptions: THEME_DESCRIPTIONS,
  };
}
