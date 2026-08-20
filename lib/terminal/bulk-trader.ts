import type { FastTraderFamily } from "@/lib/terminal/fast-trader";

export type BulkTradeFamily = "evenodd" | "overunder" | "matchesdiffers";

export const BULK_MIN_STAKE = 0.35;
export const BULK_WINDOWS = [50, 100, 120, 200];

export function clampBulkCount(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(5, Math.round(value)));
}

export function clampBulkWindow(value: number): number {
  if (!Number.isFinite(value)) return 120;
  return Math.max(20, Math.min(400, Math.round(value)));
}

export function bulkFamily(type: BulkTradeFamily): FastTraderFamily {
  if (type === "evenodd") return "even_odd";
  if (type === "overunder") return "over_under";
  return "matches_differs";
}

export function bulkDefaultDigit(type: BulkTradeFamily): number {
  return type === "overunder" ? 4 : 5;
}

export function bulkNeedsDigit(type: BulkTradeFamily): boolean {
  return type !== "evenodd";
}
