import type {
  CopyHistoryEntry,
  CopySignal,
  SignalProvider,
} from "@/lib/copy/types";
import type { CopyFollowState } from "@/lib/copy/types";

export interface ProviderSessionStats {
  providerId: string;
  signalsReceived: number;
  copied: number;
  expired: number;
  blocked: number;
  rejected: number;
  /** Copied ÷ (copied + blocked + rejected), 0–100 */
  copyRate: number | null;
}

export interface CopyDeskSessionMetrics {
  followingCount: number;
  sessionSignals: number;
  sessionCopied: number;
  sessionCopyRate: number | null;
  activeSignals: number;
  providerStats: Map<string, ProviderSessionStats>;
}

function emptyProviderStats(providerId: string): ProviderSessionStats {
  return {
    providerId,
    signalsReceived: 0,
    copied: 0,
    expired: 0,
    blocked: 0,
    rejected: 0,
    copyRate: null,
  };
}

function finalizeCopyRate(stats: ProviderSessionStats): ProviderSessionStats {
  const attempts = stats.copied + stats.blocked + stats.rejected;
  return {
    ...stats,
    copyRate: attempts > 0 ? (stats.copied / attempts) * 100 : null,
  };
}

export function computeProviderSessionStats(
  providerId: string,
  history: CopyHistoryEntry[],
  activeSignals: CopySignal[],
): ProviderSessionStats {
  const signalIds = new Set<string>();
  let stats = emptyProviderStats(providerId);

  for (const signal of activeSignals) {
    if (signal.providerId !== providerId) continue;
    signalIds.add(signal.id);
  }

  for (const entry of history) {
    if (entry.providerId !== providerId) continue;

    if (entry.signalId !== "unknown") {
      signalIds.add(entry.signalId);
    }

    switch (entry.kind) {
      case "copied":
        stats = { ...stats, copied: stats.copied + 1 };
        break;
      case "expired":
        stats = { ...stats, expired: stats.expired + 1 };
        break;
      case "blocked":
        stats = { ...stats, blocked: stats.blocked + 1 };
        break;
      case "rejected":
        stats = { ...stats, rejected: stats.rejected + 1 };
        break;
    }
  }

  stats = { ...stats, signalsReceived: signalIds.size };
  return finalizeCopyRate(stats);
}

export function computeCopyDeskSessionMetrics(
  providers: SignalProvider[],
  follow: CopyFollowState,
  history: CopyHistoryEntry[],
  activeSignals: CopySignal[],
): CopyDeskSessionMetrics {
  const followed = providers.filter((p) => follow.followedIds.includes(p.id));
  const providerStats = new Map<string, ProviderSessionStats>();

  for (const provider of followed) {
    providerStats.set(
      provider.id,
      computeProviderSessionStats(provider.id, history, activeSignals),
    );
  }

  let sessionSignals = 0;
  let sessionCopied = 0;
  let sessionBlocked = 0;
  let sessionRejected = 0;

  for (const stats of providerStats.values()) {
    sessionSignals += stats.signalsReceived;
    sessionCopied += stats.copied;
    sessionBlocked += stats.blocked;
    sessionRejected += stats.rejected;
  }

  const attempts = sessionCopied + sessionBlocked + sessionRejected;

  return {
    followingCount: followed.length,
    sessionSignals,
    sessionCopied,
    sessionCopyRate: attempts > 0 ? (sessionCopied / attempts) * 100 : null,
    activeSignals: activeSignals.length,
    providerStats,
  };
}

export function getProviderSessionStats(
  metrics: CopyDeskSessionMetrics,
  providerId: string,
): ProviderSessionStats {
  return metrics.providerStats.get(providerId) ?? emptyProviderStats(providerId);
}

/** Prefer session copy rate, then catalog demo win rate for sorting. */
export function providerSortScore(
  provider: SignalProvider,
  metrics: CopyDeskSessionMetrics,
): number {
  const session = metrics.providerStats.get(provider.id);
  if (
    session &&
    session.copyRate !== null &&
    session.copied + session.blocked + session.rejected > 0
  ) {
    return session.copyRate;
  }
  return provider.demoWinRate;
}
