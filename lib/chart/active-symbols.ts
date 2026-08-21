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

export function activeSymbolsFromDerivApi(rows: DerivActiveSymbolRow[]): ActiveSymbol[] {
  if (!Array.isArray(rows) || rows.length === 0) return smartchartsActiveSymbols();

  return rows.flatMap((row) => {
    const code = row.underlying_symbol || row.symbol;
    if (!code) return [];
    return [
      {
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
      },
    ];
  });
}

export function tradingTimesFromDerivApi(raw: unknown): TradingTimesMap {
  const tradingTimes: TradingTimesMap = {};
  if (!raw || typeof raw !== "object") return tradingTimes;

  for (const [symbol, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const row = value as {
      open?: string[] | string;
      close?: string[] | string;
      times?: Array<{ open?: number; close?: number }>;
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
