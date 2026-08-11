"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useThemeContext } from "@/components/ThemeProvider";
import type { ThemePreference } from "@/lib/theme/settings";

const ICONS: Record<ThemePreference, typeof Moon> = {
  dark: Moon,
  light: Sun,
  system: Monitor,
};

interface ThemeToggleProps {
  variant?: "icon" | "compact";
  className?: string;
}

export function ThemeToggle({ variant = "icon", className }: ThemeToggleProps) {
  const { preference, setPreference } = useThemeContext();
  const Icon = ICONS[preference];

  function cycleTheme() {
    const order: ThemePreference[] = ["dark", "light", "system"];
    const index = order.indexOf(preference);
    setPreference(order[(index + 1) % order.length]!);
  }

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={cycleTheme}
        title={`Theme: ${preference}`}
        aria-label={`Theme: ${preference}. Click to change.`}
        className={cn(
          "interactive inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-muted hover:bg-surface-elevated/60 hover:text-foreground",
          className,
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        <span className="capitalize">{preference}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={cycleTheme}
      title={`Theme: ${preference}`}
      aria-label={`Theme: ${preference}. Click to change.`}
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

const OPTIONS: ThemePreference[] = ["dark", "light", "system"];

export function ThemePicker({
  preference,
  onChange,
  labels,
  descriptions,
}: ThemePickerProps) {
  return (
    <div className="prefs-theme-grid">
      {OPTIONS.map((option) => {
        const Icon = ICONS[option];
        const selected = preference === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "prefs-theme-option interactive",
              selected && "prefs-theme-option-active",
            )}
            aria-pressed={selected}
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
