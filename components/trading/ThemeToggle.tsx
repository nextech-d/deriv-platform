"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useThemeContext } from "@/components/ThemeProvider";
import type { ThemePreference } from "@/lib/theme/settings";

interface ThemeToggleProps {
  variant?: "icon" | "compact" | "navbar";
  className?: string;
}

export function ThemeToggle({ variant = "icon", className }: ThemeToggleProps) {
  const { preference, resolvedTheme, hydrated, toggleLightDark } = useThemeContext();
  const current = hydrated
    ? preference === "system"
      ? resolvedTheme
      : preference
    : resolvedTheme;
  const Icon = current === "light" ? Sun : Moon;
  const next = current === "dark" ? "light" : "dark";
  const label = `Switch to ${next} theme`;

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={toggleLightDark}
        title={label}
        aria-label={label}
        className={cn(
          "interactive inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-muted hover:bg-surface-elevated/60 hover:text-foreground",
          className,
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        <span className="capitalize">{current}</span>
      </button>
    );
  }

  if (variant === "navbar") {
    return (
      <button
        type="button"
        onClick={toggleLightDark}
        title={label}
        aria-label={label}
        className={cn("tc-theme-toggle", className)}
      >
        <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleLightDark}
      title={label}
      aria-label={label}
      className={cn(
        "interactive inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-elevated/60 hover:text-foreground",
        className,
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
    </button>
  );
}

interface ThemePickerProps {
  preference: ThemePreference;
  onChange: (next: ThemePreference) => void;
  labels: Record<ThemePreference, string>;
  descriptions: Record<ThemePreference, string>;
}

const OPTIONS: ThemePreference[] = ["dark", "light"];

export function ThemePicker({
  preference,
  onChange,
  labels,
  descriptions,
}: ThemePickerProps) {
  const { resolvedTheme } = useThemeContext();
  const selected = preference === "system" ? resolvedTheme : preference;

  return (
    <div className="prefs-theme-grid">
      {OPTIONS.map((option) => {
        const Icon = option === "light" ? Sun : Moon;
        const active = selected === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "prefs-theme-option interactive",
              active && "prefs-theme-option-active",
            )}
            aria-pressed={active}
          >
            <div className="prefs-theme-option-head">
              <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              <p className="text-xs font-semibold">{labels[option]}</p>
            </div>
            <p className="prefs-theme-option-desc">{descriptions[option]}</p>
          </button>
        );
      })}
    </div>
  );
}
