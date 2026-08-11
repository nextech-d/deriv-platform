import type { SignalProvider } from "@/lib/copy/types";

/** Unique symbols covered by followed provider listings. */
export function symbolsForFollowedProviders(
  providers: SignalProvider[],
  followedIds: string[],
): string[] {
  if (followedIds.length === 0) return [];

  const followed = new Set(followedIds);
  const symbols = new Set<string>();

  for (const provider of providers) {
    if (!followed.has(provider.id)) continue;
    for (const symbol of provider.symbols) {
      symbols.add(symbol);
    }
  }

  return [...symbols].sort();
}

/** Active chart symbol + any copy watchlist symbols. */
export function mergeWatchSymbols(
  activeSymbol: string,
  copySymbols: string[],
): string[] {
  const merged = new Set<string>();
  if (activeSymbol) merged.add(activeSymbol);
  for (const symbol of copySymbols) merged.add(symbol);
  return [...merged].sort();
}

export function sameSymbolList(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((symbol, index) => symbol === b[index]);
}
