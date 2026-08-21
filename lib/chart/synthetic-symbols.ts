/** Synthetic / volatility symbols that show SmartCharts last-digit stats (Deriv Bot parity). */
export function isSyntheticChartSymbol(symbol: string): boolean {
  return /^(R_|1HZ|JD|STPRNG|RDBEAR|RDBULL|WL|BOOM|CRASH|RB|R_\d)/.test(symbol);
}
