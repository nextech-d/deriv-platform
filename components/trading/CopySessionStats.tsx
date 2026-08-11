"use client";

import {
  DeskPanel,
  DeskPanelHead,
} from "@/components/layout/TerminalViewLayout";
import { CopyRiskLockoutBanner } from "@/components/trading/CopyRiskLockoutBanner";
import {
  computeCopyDeskSessionMetrics,
  providerSortScore,
} from "@/lib/copy/session-stats";
import type { CopyRiskSettings, CopySessionStats as CopyRiskSessionStats } from "@/lib/copy/risk-settings";
import {
  copyDailyLossPct,
  copySessionLossPct,
  copySessionWinRate,
  isCopyLockedOut,
} from "@/lib/copy/risk-settings";
import type { CopyFollowState, CopyHistoryEntry, CopyNotice, CopySignal, SignalProvider } from "@/lib/copy/types";
import { symbolsForFollowedProviders } from "@/lib/copy/watch-symbols";
import { cn } from "@/lib/utils/cn";

/** Verified low-risk provider first, else best session copy rate or catalog win rate. */
export function pickSuggestedProvider(
  providers: SignalProvider[],
  history: CopyHistoryEntry[] = [],
  activeSignals: CopySignal[] = [],
  follow?: CopyFollowState,
): SignalProvider | null {
  if (providers.length === 0) return null;

  const metrics = follow
    ? computeCopyDeskSessionMetrics(providers, follow, history, activeSignals)
    : null;

  const riskOrder = { low: 0, medium: 1, high: 2 } as const;

  return [...providers].sort((a, b) => {
    if (a.verified !== b.verified) return a.verified ? -1 : 1;
    const riskDiff = riskOrder[a.riskLabel] - riskOrder[b.riskLabel];
    if (riskDiff !== 0) return riskDiff;
    const scoreB = metrics ? providerSortScore(b, metrics) : b.demoWinRate;
    const scoreA = metrics ? providerSortScore(a, metrics) : a.demoWinRate;
    return scoreB - scoreA;
  })[0];
}

interface CopySessionStatsProps {
  providers: SignalProvider[];
  follow: CopyFollowState;
  signals: CopySignal[];
  copyHistory: CopyHistoryEntry[];
  copyRisk?: CopyRiskSettings;
  copyRiskStats?: CopyRiskSessionStats;
  liveCopyAllowed: boolean;
  copyNotice?: CopyNotice | null;
  onDismissCopyNotice?: () => void;
  onOpenSettings?: () => void;
}

export function CopySessionStats({
  providers,
  follow,
  signals,
  copyHistory,
  copyRisk,
  copyRiskStats,
  liveCopyAllowed,
  copyNotice,
  onDismissCopyNotice,
  onOpenSettings,
}: CopySessionStatsProps) {
  const metrics = computeCopyDeskSessionMetrics(
    providers,
    follow,
    copyHistory,
    signals,
  );
  const watchSymbols = symbolsForFollowedProviders(providers, follow.followedIds);
  const feedLive = metrics.activeSignals > 0;
  const autoOn = follow.autoCopy && liveCopyAllowed;
  const copyLocked =
    copyRisk && copyRiskStats
      ? isCopyLockedOut(copyRisk, copyRiskStats)
      : false;
  const sessionLossPct =
    copyRisk && copyRiskStats
      ? copySessionLossPct(copyRisk, copyRiskStats)
      : 0;
  const dailyLossPct =
    copyRisk && copyRiskStats
      ? copyDailyLossPct(copyRisk, copyRiskStats)
      : 0;
  const copyWinRate =
    copyRiskStats ? copySessionWinRate(copyRiskStats) : null;
  const settledCopyTrades = copyRiskStats
    ? copyRiskStats.copyWins + copyRiskStats.copyLosses
    : 0;

  return (
    <DeskPanel variant="metrics" className="copy-session-desk view-in" aria-label="Copy desk metrics">
      {copyRisk && copyRiskStats ? (
        <CopyRiskLockoutBanner
          settings={copyRisk}
          stats={copyRiskStats}
          onOpenSettings={onOpenSettings}
        />
      ) : null}

      <DeskPanelHead
        title="Copy desk"
        hint={
          watchSymbols.length > 0
            ? `Live ticks on ${watchSymbols.join(" · ")}`
            : "Followed providers and live feed"
        }
        trailing={
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {copyLocked ? (
              <span className="session-status-chip" data-tone="warn">
                <span className="session-status-dot" aria-hidden />
                Copy locked
              </span>
            ) : null}
            {autoOn ? (
              <span className="session-status-chip" data-tone="ok">
                <span className="session-status-dot" aria-hidden />
                Auto-copy on
              </span>
            ) : (
              <span className="session-status-chip" data-tone="warn">
                <span className="session-status-dot" aria-hidden />
                Manual copy
              </span>
            )}
            {metrics.followingCount > 0 ? (
              <span
                className={cn(
                  "copy-count-chip",
                  feedLive && "copy-count-chip-live",
                )}
              >
                <span
                  className={cn(
                    "command-feed-dot h-1.5 w-1.5 rounded-full",
                    feedLive ? "bg-positive animate-pulse-dot" : "bg-muted",
                  )}
                  aria-hidden
                />
                {metrics.activeSignals} live
              </span>
            ) : null}
          </div>
        }
      />

      {copyNotice ? (
        <CopyNoticeBanner notice={copyNotice} onDismiss={onDismissCopyNotice} />
      ) : null}

      <div className="session-desk-grid copy-session-grid">
        <div className="session-metric session-metric-hero">
          <p className="session-metric-label">Following</p>
          <p className="session-metric-value">{metrics.followingCount}</p>
          <p className="session-metric-sub">
            {metrics.followingCount === 1 ? "provider" : "providers"}
          </p>
        </div>

        <div className="session-metric">
          <p className="session-metric-label">Session copy rate</p>
          <p
            className={cn(
              "session-metric-value",
              metrics.sessionCopyRate !== null &&
                metrics.sessionCopyRate >= 50 &&
                "text-positive",
            )}
          >
            {metrics.sessionCopyRate !== null
              ? `${metrics.sessionCopyRate.toFixed(0)}%`
              : "—"}
          </p>
          <p className="session-metric-sub">
            {metrics.sessionCopied} copied this session
          </p>
        </div>

        <div className="session-metric">
          <p className="session-metric-label">Copy win rate</p>
          <p
            className={cn(
              "session-metric-value",
              copyWinRate !== null && copyWinRate >= 50 && "text-positive",
            )}
          >
            {copyWinRate !== null ? `${copyWinRate.toFixed(0)}%` : "—"}
          </p>
          <p className="session-metric-sub">
            {settledCopyTrades > 0
              ? `${copyRiskStats!.copyWins}W · ${copyRiskStats!.copyLosses}L settled`
              : "No settled copy trades"}
          </p>
        </div>

        <div className="session-metric">
          <p className="session-metric-label">Active signals</p>
          <p className="session-metric-value">{metrics.activeSignals}</p>
          <p className="session-metric-sub">60s expiry window</p>
        </div>

        <div className="session-metric">
          <p className="session-metric-label">Copy session loss</p>
          <p
            className={cn(
              "session-metric-value font-mono tabular-nums",
              sessionLossPct >= 100 && "text-warning",
            )}
          >
            {copyRisk?.enabled && copyRiskStats
              ? `$${copyRiskStats.sessionLoss.toFixed(0)}`
              : "—"}
          </p>
          <p className="session-metric-sub">
            {copyRisk?.enabled
              ? `Limit $${copyRisk.sessionStopLoss}`
              : "Copy risk off"}
          </p>
        </div>
      </div>

      {copyRisk?.enabled && copyRiskStats ? (
        <div className="copy-risk-rail border-t border-border-subtle px-3 py-2.5 md:px-4">
          <div className="flex flex-wrap items-center gap-3 text-[10px]">
            <span className="text-muted">
              Copies{" "}
              <span className="font-mono text-foreground">
                {copyRiskStats.copiesThisSession}
              </span>
              {copyRisk.maxCopiesPerSession > 0
                ? ` / ${copyRisk.maxCopiesPerSession}`
                : ""}
            </span>
            <span className="text-muted">
              Daily loss{" "}
              <span
                className={cn(
                  "font-mono",
                  dailyLossPct >= 100 ? "text-warning" : "text-foreground",
                )}
              >
                ${copyRiskStats.dailyLoss.toFixed(0)}
              </span>
              {" / "}
              <span className="font-mono">${copyRisk.dailyMaxDrawdown}</span>
            </span>
          </div>
        </div>
      ) : null}

      {watchSymbols.length > 0 ? (
        <div className="copy-watch-rail border-t border-border-subtle px-3 py-2.5 md:px-4">
          <p className="session-metric-label mb-1.5">Watching</p>
          <div className="flex flex-wrap gap-1.5">
            {watchSymbols.map((sym) => (
              <span key={sym} className="copy-watch-chip font-mono">
                {sym}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </DeskPanel>
  );
}

function CopyNoticeBanner({
  notice,
  onDismiss,
}: {
  notice: CopyNotice;
  onDismiss?: () => void;
}) {
  return (
    <div
      className={cn(
        "copy-notice-banner workspace-inline-alert mx-3 mt-0 text-[11px] md:mx-4",
        notice.tone === "ok" && "workspace-inline-alert-success",
        notice.tone === "warn" && "workspace-inline-alert-warn",
        notice.tone === "error" && "workspace-inline-alert-danger",
      )}
      role="status"
      aria-live="polite"
    >
      <p className="min-w-0 flex-1 leading-relaxed">{notice.message}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="interactive shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted hover:text-foreground"
        >
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
