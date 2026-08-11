import type { CopyHistoryEntry, CopySignal, SignalDirection } from "@/lib/copy/types";

export const MAX_COPY_HISTORY = 24;

let historySeq = 0;

export function createHistoryEntry(
  partial: Omit<CopyHistoryEntry, "id" | "at">,
): CopyHistoryEntry {
  historySeq += 1;
  return {
    id: `copy-hist-${historySeq}`,
    at: Date.now(),
    ...partial,
  };
}

export function prependCopyHistory(
  history: CopyHistoryEntry[],
  partial: Omit<CopyHistoryEntry, "id" | "at">,
): CopyHistoryEntry[] {
  return [createHistoryEntry(partial), ...history].slice(0, MAX_COPY_HISTORY);
}

export function historyFromSignal(
  signal: CopySignal,
  partial: Omit<CopyHistoryEntry, "id" | "at" | "signalId" | "symbol" | "direction" | "providerName" | "providerId">,
): Omit<CopyHistoryEntry, "id" | "at"> {
  return {
    signalId: signal.id,
    symbol: signal.symbol,
    direction: signal.direction,
    providerName: signal.providerName,
    providerId: signal.providerId,
    ...partial,
  };
}

export function formatHistoryDirection(direction: SignalDirection): string {
  return direction === "CALL" ? "Rise" : "Fall";
}
