export type TradeSource = "manual" | "copy" | "bot";

export const TRADE_SOURCE_LABELS: Record<TradeSource, string> = {
  manual: "Manual",
  copy: "Copy",
  bot: "Auto",
};

export function isTradeSource(value: unknown): value is TradeSource {
  return value === "manual" || value === "copy" || value === "bot";
}
