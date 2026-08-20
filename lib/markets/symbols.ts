/**
 * Canonical Deriv synthetic-index registry.
 * Every symbol picker, bot builder, chart desk, and copy provider
 * should import from here instead of maintaining its own list.
 */

export type SymbolGroup =
  | "volatility"
  | "volatility_1s"
  | "boom_crash"
  | "step"
  | "jump"
  | "bull_bear";

export interface DerivSymbol {
  id: string;
  label: string;
  shortLabel: string;
  group: SymbolGroup;
  /** Approximate tick interval in milliseconds (2000 for standard, 1000 for 1s) */
  tickMs: number;
}

export interface SymbolGroupMeta {
  id: SymbolGroup;
  label: string;
}

export const SYMBOL_GROUPS: SymbolGroupMeta[] = [
  { id: "volatility", label: "Volatility Indices" },
  { id: "volatility_1s", label: "Volatility (1s) Indices" },
  { id: "boom_crash", label: "Boom / Crash Indices" },
  { id: "step", label: "Step Indices" },
  { id: "jump", label: "Jump Indices" },
  { id: "bull_bear", label: "Bull / Bear Indices" },
];

export const DERIV_SYMBOLS: DerivSymbol[] = [
  // ── Volatility (standard, ~2s ticks) ──
  { id: "R_10", label: "Volatility 10 Index", shortLabel: "Vol 10", group: "volatility", tickMs: 2000 },
  { id: "R_25", label: "Volatility 25 Index", shortLabel: "Vol 25", group: "volatility", tickMs: 2000 },
  { id: "R_50", label: "Volatility 50 Index", shortLabel: "Vol 50", group: "volatility", tickMs: 2000 },
  { id: "R_75", label: "Volatility 75 Index", shortLabel: "Vol 75", group: "volatility", tickMs: 2000 },
  { id: "R_100", label: "Volatility 100 Index", shortLabel: "Vol 100", group: "volatility", tickMs: 2000 },

  // ── Volatility (1-second ticks) ──
  { id: "1HZ10V", label: "Volatility 10 (1s) Index", shortLabel: "Vol 10 (1s)", group: "volatility_1s", tickMs: 1000 },
  { id: "1HZ15V", label: "Volatility 15 (1s) Index", shortLabel: "Vol 15 (1s)", group: "volatility_1s", tickMs: 1000 },
  { id: "1HZ25V", label: "Volatility 25 (1s) Index", shortLabel: "Vol 25 (1s)", group: "volatility_1s", tickMs: 1000 },
  { id: "1HZ30V", label: "Volatility 30 (1s) Index", shortLabel: "Vol 30 (1s)", group: "volatility_1s", tickMs: 1000 },
  { id: "1HZ50V", label: "Volatility 50 (1s) Index", shortLabel: "Vol 50 (1s)", group: "volatility_1s", tickMs: 1000 },
  { id: "1HZ75V", label: "Volatility 75 (1s) Index", shortLabel: "Vol 75 (1s)", group: "volatility_1s", tickMs: 1000 },
  { id: "1HZ90V", label: "Volatility 90 (1s) Index", shortLabel: "Vol 90 (1s)", group: "volatility_1s", tickMs: 1000 },
  { id: "1HZ100V", label: "Volatility 100 (1s) Index", shortLabel: "Vol 100 (1s)", group: "volatility_1s", tickMs: 1000 },
  { id: "1HZ150V", label: "Volatility 150 (1s) Index", shortLabel: "Vol 150 (1s)", group: "volatility_1s", tickMs: 1000 },
  { id: "1HZ200V", label: "Volatility 200 (1s) Index", shortLabel: "Vol 200 (1s)", group: "volatility_1s", tickMs: 1000 },
  { id: "1HZ250V", label: "Volatility 250 (1s) Index", shortLabel: "Vol 250 (1s)", group: "volatility_1s", tickMs: 1000 },
  { id: "1HZ300V", label: "Volatility 300 (1s) Index", shortLabel: "Vol 300 (1s)", group: "volatility_1s", tickMs: 1000 },

  // ── Boom / Crash ──
  { id: "BOOM50", label: "Boom 50 Index", shortLabel: "Boom 50", group: "boom_crash", tickMs: 1000 },
  { id: "BOOM150", label: "Boom 150 Index", shortLabel: "Boom 150", group: "boom_crash", tickMs: 1000 },
  { id: "BOOM300N", label: "Boom 300 Index", shortLabel: "Boom 300", group: "boom_crash", tickMs: 1000 },
  { id: "BOOM500", label: "Boom 500 Index", shortLabel: "Boom 500", group: "boom_crash", tickMs: 1000 },
  { id: "BOOM600", label: "Boom 600 Index", shortLabel: "Boom 600", group: "boom_crash", tickMs: 1000 },
  { id: "BOOM900", label: "Boom 900 Index", shortLabel: "Boom 900", group: "boom_crash", tickMs: 1000 },
  { id: "BOOM1000", label: "Boom 1000 Index", shortLabel: "Boom 1000", group: "boom_crash", tickMs: 1000 },
  { id: "CRASH50", label: "Crash 50 Index", shortLabel: "Crash 50", group: "boom_crash", tickMs: 1000 },
  { id: "CRASH150", label: "Crash 150 Index", shortLabel: "Crash 150", group: "boom_crash", tickMs: 1000 },
  { id: "CRASH300N", label: "Crash 300 Index", shortLabel: "Crash 300", group: "boom_crash", tickMs: 1000 },
  { id: "CRASH500", label: "Crash 500 Index", shortLabel: "Crash 500", group: "boom_crash", tickMs: 1000 },
  { id: "CRASH600", label: "Crash 600 Index", shortLabel: "Crash 600", group: "boom_crash", tickMs: 1000 },
  { id: "CRASH900", label: "Crash 900 Index", shortLabel: "Crash 900", group: "boom_crash", tickMs: 1000 },
  { id: "CRASH1000", label: "Crash 1000 Index", shortLabel: "Crash 1000", group: "boom_crash", tickMs: 1000 },

  // ── Range Break ──
  { id: "RB100", label: "Range Break 100 Index", shortLabel: "Range 100", group: "boom_crash", tickMs: 1000 },
  { id: "RB200", label: "Range Break 200 Index", shortLabel: "Range 200", group: "boom_crash", tickMs: 1000 },

  // ── Step ──
  { id: "stpRNG", label: "Step Index 100", shortLabel: "Step 100", group: "step", tickMs: 1000 },
  { id: "stpRNG2", label: "Step Index 200", shortLabel: "Step 200", group: "step", tickMs: 1000 },
  { id: "stpRNG3", label: "Step Index 300", shortLabel: "Step 300", group: "step", tickMs: 1000 },
  { id: "stpRNG4", label: "Step Index 400", shortLabel: "Step 400", group: "step", tickMs: 1000 },
  { id: "stpRNG5", label: "Step Index 500", shortLabel: "Step 500", group: "step", tickMs: 1000 },

  // ── Jump ──
  { id: "JD10", label: "Jump 10 Index", shortLabel: "Jump 10", group: "jump", tickMs: 2000 },
  { id: "JD25", label: "Jump 25 Index", shortLabel: "Jump 25", group: "jump", tickMs: 2000 },
  { id: "JD50", label: "Jump 50 Index", shortLabel: "Jump 50", group: "jump", tickMs: 2000 },
  { id: "JD75", label: "Jump 75 Index", shortLabel: "Jump 75", group: "jump", tickMs: 2000 },
  { id: "JD100", label: "Jump 100 Index", shortLabel: "Jump 100", group: "jump", tickMs: 2000 },

  // ── Bull / Bear ──
  { id: "RDBULL", label: "Bull Market Index", shortLabel: "Bull", group: "bull_bear", tickMs: 2000 },
  { id: "RDBEAR", label: "Bear Market Index", shortLabel: "Bear", group: "bull_bear", tickMs: 2000 },
];

const SYMBOL_MAP = new Map(DERIV_SYMBOLS.map((s) => [s.id, s]));

/** All valid symbol IDs. */
export const ALL_SYMBOL_IDS = DERIV_SYMBOLS.map((s) => s.id);

/** Regex pattern matching any known symbol ID (case-insensitive). */
export const SYMBOL_ID_PATTERN = ALL_SYMBOL_IDS.map((id) =>
  id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
).join("|");

/** Look up a symbol by its API id. */
export function getSymbol(id: string): DerivSymbol | undefined {
  return SYMBOL_MAP.get(id);
}

/** Human-readable label for a symbol id, with fallback. */
export function symbolLabel(id: string): string {
  return SYMBOL_MAP.get(id)?.label ?? id;
}

/** Short label for compact UIs. */
export function symbolShortLabel(id: string): string {
  return SYMBOL_MAP.get(id)?.shortLabel ?? id;
}

/** Symbols filtered by group. */
export function symbolsByGroup(group: SymbolGroup): DerivSymbol[] {
  return DERIV_SYMBOLS.filter((s) => s.group === group);
}

/**
 * Flat list for dropdowns: `{ label, symbol }` tuples
 * matching the shape the old MARKET_OPTIONS used.
 */
export function allMarketOptions(): Array<{ label: string; symbol: string }> {
  return DERIV_SYMBOLS.map((s) => ({ label: s.label, symbol: s.id }));
}

/**
 * Grouped options for richer pickers.
 */
export function groupedMarketOptions(): Array<{
  group: string;
  options: Array<{ label: string; symbol: string }>;
}> {
  return SYMBOL_GROUPS.map((g) => ({
    group: g.label,
    options: symbolsByGroup(g.id).map((s) => ({ label: s.label, symbol: s.id })),
  }));
}
