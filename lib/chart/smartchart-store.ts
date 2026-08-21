/** Mirrors Deriv Bot `chart-store.ts` localStorage key `bot.chart_props`. */

export interface SmartChartProps {
  symbol?: string;
  granularity?: number;
  chart_type?: string;
}

const STORAGE_KEY = "bot.chart_props";

export function loadChartProps(): SmartChartProps {
  if (typeof window === "undefined") return { granularity: 0, chart_type: "line" };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { granularity: 0, chart_type: "line" };
    return JSON.parse(raw) as SmartChartProps;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return { granularity: 0, chart_type: "line" };
  }
}

export function saveChartProps(props: SmartChartProps): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(props));
}

/** Same ordering as Deriv Bot — synthetic_index first when present. */
export function getMarketsOrder(
  activeSymbols: Array<{ market: string; display_name: string }>,
): string[] {
  const syntheticIndex = "synthetic_index";
  const hasSynthetic = activeSymbols.some((item) => item.market === syntheticIndex);
  return activeSymbols
    .slice()
    .sort((a, b) => (a.display_name < b.display_name ? -1 : 1))
    .map((item) => item.market)
    .reduce<string[]>((markets, market) => {
      if (!markets.includes(market)) markets.push(market);
      return markets;
    }, hasSynthetic ? [syntheticIndex] : []);
}
