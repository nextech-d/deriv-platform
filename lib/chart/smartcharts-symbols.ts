import type { ActiveSymbol } from "@deriv-com/smartcharts-champion";
import { CHART_MARKET_TREE } from "@/lib/terminal/chart-markets";

const MARKET_TYPE: Record<string, string> = {
  baskets: "basket_index",
  synthetics: "synthetic_index",
  forex: "forex",
  indices: "indices",
  commodities: "commodities",
  stocks: "stocks",
  crypto: "cryptocurrency",
};

function pipForSymbol(symbol: string): number {
  if (symbol.startsWith("frx") || symbol.startsWith("WLD")) return 0.00001;
  if (symbol.startsWith("cry")) return 0.01;
  return 0.01;
}

/** Map our chart market tree into SmartCharts active_symbols shape. */
export function smartchartsActiveSymbols(): ActiveSymbol[] {
  const rows: ActiveSymbol[] = [];
  for (const category of CHART_MARKET_TREE) {
    const market = MARKET_TYPE[category.id] ?? category.id;
    for (const group of category.groups) {
      for (const item of group.markets) {
        rows.push({
          display_name: item.label,
          market,
          market_display_name: category.label,
          subgroup: group.id,
          subgroup_display_name: group.label,
          submarket: group.id,
          submarket_display_name: group.label,
          symbol: item.id,
          symbol_type: market,
          pip: pipForSymbol(item.id),
          exchange_is_open: 1,
          is_trading_suspended: 0,
          delay_amount: 0,
        });
      }
    }
  }
  return rows;
}
