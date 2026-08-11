import type { ResolvedTheme } from "@/lib/theme/settings";

export interface ChartTheme {
  grid: string;
  gridStrong: string;
  up: string;
  upFill: string;
  down: string;
  downFill: string;
  ma: string;
  crosshair: string;
  label: string;
}

export const CHART_THEMES: Record<ResolvedTheme, ChartTheme> = {
  dark: {
    grid: "rgb(42 49 66 / 0.55)",
    gridStrong: "rgb(42 49 66 / 0.85)",
    up: "#22c55e",
    upFill: "rgb(34 197 94 / 0.12)",
    down: "#ef4444",
    downFill: "rgb(239 68 68 / 0.12)",
    ma: "#60a5fa",
    crosshair: "rgb(148 163 184 / 0.35)",
    label: "#94a3b8",
  },
  light: {
    grid: "rgb(205 209 217 / 0.85)",
    gridStrong: "rgb(190 195 205 / 1)",
    up: "#15803d",
    upFill: "rgb(21 128 61 / 0.12)",
    down: "#b91c1c",
    downFill: "rgb(185 28 28 / 0.1)",
    ma: "#1d4ed8",
    crosshair: "rgb(113 113 122 / 0.4)",
    label: "#52525b",
  },
};
