"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useTheme } from "@/hooks/useTheme";
import type { ResolvedTheme, ThemePreference } from "@/lib/theme/settings";

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (next: ThemePreference) => void;
  labels: Record<ThemePreference, string>;
  descriptions: Record<ThemePreference, string>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}
