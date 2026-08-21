import type { ActiveSymbol, TradingTimesMap } from "@deriv-com/smartcharts-champion";
import { smartchartsActiveSymbols } from "@/lib/chart/smartcharts-symbols";

export interface DerivActiveSymbolRow {
  symbol?: string;
  underlying_symbol?: string;
  display_name?: string;
  market?: string;
  market_display_name?: string;
  submarket?: string;
  submarket_display_name?: string;
  subgroup?: string;
  subgroup_display_name?: string;
  symbol_type?: string;
  pip?: number;
  pip_size?: number;
  exchange_is_open?: 0 | 1;
  is_trading_suspended?: 0 | 1;
  delay_amount?: number;
}

interface DerivTradingTimesSymbol {
  symbol?: string;
  name?: string;
  exchange_is_open?: 0 | 1;
  times?: { open?: string[]; close?: string[] };
}

function normalizeActiveSymbol(row: ActiveSymbol): ActiveSymbol {
  return {
    ...row,
    subgroup: row.subgroup ?? row.submarket,
    subgroup_display_name: row.subgroup_display_name ?? row.submarket_display_name,
    delay_amount: row.delay_amount ?? 0,
  };
}

export function activeSymbolsFromDerivApi(rows: DerivActiveSymbolRow[]): ActiveSymbol[] {
  if (!Array.isArray(rows) || rows.length === 0) return smartchartsActiveSymbols();

  return rows.flatMap((row) => {
    const code = row.underlying_symbol || row.symbol;
    if (!code) return [];
    return [
      normalizeActiveSymbol({
        display_name: row.display_name || code,
        market: row.market || "synthetic_index",
        market_display_name: row.market_display_name || row.market || "",
        subgroup: row.subgroup || row.submarket,
        subgroup_display_name: row.subgroup_display_name || row.submarket_display_name,
        submarket: row.submarket || row.market || "",
        submarket_display_name: row.submarket_display_name || row.market_display_name || "",
        symbol: code,
        symbol_type: row.symbol_type || row.market || "",
        pip: row.pip ?? row.pip_size ?? 0.01,
        exchange_is_open: row.exchange_is_open ?? 1,
        is_trading_suspended: row.is_trading_suspended ?? 0,
        delay_amount: row.delay_amount,
      }),
    ];
  });
}

function tradingTimesFromFlatRecord(raw: Record<string, unknown>): TradingTimesMap {
  const tradingTimes: TradingTimesMap = {};

  for (const [symbol, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object") continue;
    const row = value as {
      open?: string[] | string;
      close?: string[] | string;
      isOpen?: boolean;
      openTime?: string;
      closeTime?: string;
    };

    if (row.isOpen !== undefined && row.openTime !== undefined && row.closeTime !== undefined) {
      tradingTimes[symbol] = {
        isOpen: row.isOpen,
        openTime: row.openTime,
        closeTime: row.closeTime,
      };
      continue;
    }

    if (row.open && row.close) {
      const openTimes = Array.isArray(row.open) ? row.open : [row.open];
      const closeTimes = Array.isArray(row.close) ? row.close : [row.close];
      tradingTimes[symbol] = {
        isOpen: openTimes.length > 0 && openTimes[0] !== "--",
        openTime: openTimes[0] || "",
        closeTime: closeTimes[0] || "",
      };
    }
  }

  return tradingTimes;
}

/** Deriv API returns markets → submarkets → symbols; SmartCharts expects symbol → schedule. */
export function tradingTimesFromDerivApi(raw: unknown): TradingTimesMap {
  if (!raw || typeof raw !== "object") return {};

  const root = raw as {
    markets?: Array<{ submarkets?: Array<{ symbols?: DerivTradingTimesSymbol[] }> }>;
  };

  if (Array.isArray(root.markets)) {
    const tradingTimes: TradingTimesMap = {};
    for (const market of root.markets) {
      for (const submarket of market.submarkets ?? []) {
        for (const entry of submarket.symbols ?? []) {
          const code = entry.symbol;
          if (!code) continue;
          const openTimes = entry.times?.open ?? [];
          const closeTimes = entry.times?.close ?? [];
          const openTime = openTimes[0] ?? "00:00:00";
          const closeTime = closeTimes[0] ?? "23:59:59";
          const isOpen =
            entry.exchange_is_open !== undefined
              ? entry.exchange_is_open === 1
              : openTime !== "--" && closeTime !== "--";
          tradingTimes[code] = { isOpen, openTime, closeTime };
        }
      }
    }
    return tradingTimes;
  }

  return tradingTimesFromFlatRecord(raw as Record<string, unknown>);
}

export function buildDefaultTradingTimes(symbols: ActiveSymbol[]): TradingTimesMap {
  const tradingTimes: TradingTimesMap = {};
  for (const symbol of symbols) {
    tradingTimes[symbol.symbol] = {
      isOpen: symbol.exchange_is_open === 1,
      openTime: "00:00:00",
      closeTime: "23:59:59",
    };
  }
  return tradingTimes;
}

/** Merge API reference data with static fallbacks so default symbols like R_100 always work. */
export function mergeChartReferenceData(
  apiSymbols: ActiveSymbol[] | undefined,
  apiTimes: TradingTimesMap | undefined,
): { activeSymbols: ActiveSymbol[]; tradingTimes: TradingTimesMap } {
  const fallback = smartchartsActiveSymbols().map(normalizeActiveSymbol);
  const bySymbol = new Map<string, ActiveSymbol>();

  for (const symbol of fallback) {
    bySymbol.set(symbol.symbol, symbol);
  }

  for (const symbol of (apiSymbols ?? []).map(normalizeActiveSymbol)) {
    const existing = bySymbol.get(symbol.symbol);
    bySymbol.set(
      symbol.symbol,
      existing
        ? {
            ...existing,
            ...symbol,
            delay_amount: symbol.delay_amount ?? existing.delay_amount ?? 0,
          }
        : symbol,
    );
  }

  const activeSymbols = Array.from(bySymbol.values());
  const tradingTimes = {
    ...buildDefaultTradingTimes(activeSymbols),
    ...(apiTimes ?? {}),
  };

  for (const symbol of activeSymbols) {
    if (!tradingTimes[symbol.symbol]) {
      tradingTimes[symbol.symbol] = {
        isOpen: symbol.exchange_is_open === 1,
        openTime: "00:00:00",
        closeTime: "23:59:59",
      };
    }
  }

  return { activeSymbols, tradingTimes };
}
