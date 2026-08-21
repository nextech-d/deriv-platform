/** SmartCharts chart type ids (Flutter enum) — not the same as our ChartDesk names. */
export function normalizeSmartChartType(type: string): string {
  switch (type.toLowerCase()) {
    case "candle":
    case "candles":
      return "candles";
    case "mountain":
    case "area":
    case "line":
      return "line";
    case "ohlc":
    case "colored_bar":
      return "ohlc";
    case "hollow":
    case "hollow_candle":
      return "hollow";
    default:
      return type;
  }
}
