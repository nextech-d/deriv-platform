"use client";

import { useEffect, useMemo, useState, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { deskActionPane, deskContentPane, TerminalSplitPanel } from "@/components/layout/TerminalViewLayout";
import { CopyHistoryStrip } from "@/components/trading/CopyHistoryStrip";
import { CopyMobileSignalRail } from "@/components/trading/CopySettingsSection";
import { pickSuggestedProvider } from "@/components/trading/CopySessionStats";
import { SIGNAL_TTL_MS, COPY_SIGNAL_PRUNE_MS } from "@/lib/copy/signal-engine";
import { clampProviderStakes, resolveCopyStake } from "@/lib/copy/settings";
import {
  computeCopyDeskSessionMetrics,
  getProviderSessionStats,
} from "@/lib/copy/session-stats";
import { symbolsForFollowedProviders } from "@/lib/copy/watch-symbols";
import type { CopyFollowState, CopyHistoryEntry, CopySignal, SignalProvider } from "@/lib/copy/types";
import {
  ArrowLeftRight,
  Radio,
  Sparkles,
  TrendingUp,
  UserRound,
  Zap,
} from "lucide-react";
import type { ProviderSessionStats } from "@/lib/copy/session-stats";
import { cn } from "@/lib/utils/cn";

interface CopyTradingPanelProps {
  providers: SignalProvider[];
  follow: CopyFollowState;
  signals: CopySignal[];
  hydrated: boolean;
  demoMode: boolean;
  liveCopyAllowed: boolean;
  onToggleFollow: (providerId: string) => void;
  onFollowChange: (follow: CopyFollowState) => void;
  onCopySignal: (signal: CopySignal) => void;
  copyHistory?: CopyHistoryEntry[];
  onClearCopyHistory?: () => void;
  section?: "both" | "providers" | "signals" | "split";
  embedded?: boolean;
  riskMaxStake?: number;
  isConnected?: boolean;
}

const STYLE_META: Record<
  SignalProvider["style"],
  { label: string; icon: typeof TrendingUp }
> = {
  momentum: { label: "Momentum", icon: TrendingUp },
  mean_reversion: { label: "Mean revert", icon: ArrowLeftRight },
  breakout: { label: "Breakout", icon: Zap },
};

export function CopyTradingPanel({
  providers,
  follow,
  signals,
  hydrated,
  demoMode,
  liveCopyAllowed,
  onToggleFollow,
  onFollowChange,
  onCopySignal,
  copyHistory = [],
  onClearCopyHistory,
  section = "both",
  embedded = false,
  riskMaxStake,
  isConnected = false,
}: CopyTradingPanelProps) {
  const stakeCeiling = riskMaxStake
    ? Math.min(follow.maxStake, riskMaxStake)
    : follow.maxStake;

  function updateGlobalMaxStake(next: number) {
    const maxStake = riskMaxStake ? Math.min(next, riskMaxStake) : next;
    onFollowChange({
      ...follow,
      maxStake,
      providerStakes: clampProviderStakes(follow, maxStake),
    });
  }
  const followingCount = follow.followedIds.length;
  const watchSymbols = useMemo(
    () => symbolsForFollowedProviders(providers, follow.followedIds),
    [providers, follow.followedIds],
  );
  const suggestedProvider = useMemo(
    () =>
      followingCount === 0
        ? pickSuggestedProvider(providers, copyHistory, signals, follow)
        : null,
    [followingCount, providers, copyHistory, signals, follow],
  );

  const sessionMetrics = useMemo(
    () =>
      computeCopyDeskSessionMetrics(providers, follow, copyHistory, signals),
    [providers, follow, copyHistory, signals],
  );

  if (!hydrated) {
    const loading = (
      <div className="copy-desk">
        <div className="copy-skeleton-row animate-pulse bg-surface-elevated" />
        <div className="copy-skeleton-row copy-skeleton-row-lg animate-pulse bg-surface-elevated" />
      </div>
    );
    if (embedded) return <div className={deskContentPane}>{loading}</div>;
    return (
      <Card studio>
        <CardHeader title="Copy trading" subtitle="Loading providers…" />
      </Card>
    );
  }

  const providersBody = (
    <div className="copy-desk">
      {!embedded ? (
        <CardHeader
          title="Curated signal providers"
          subtitle="Vetted desks only — no Telegram/XML import (Phase D)"
        />
      ) : null}

      <section className="copy-desk-section">
        <div className="copy-desk-section-head">
          <p className="desk-section-title">Copy controls</p>
          <p className="desk-section-desc">Session mode and stake limits</p>
        </div>
        <div className="copy-desk-section-body space-y-2.5">
          <div
            className={cn(
              "copy-status-strip workspace-inline-alert text-[10px]",
              demoMode && "workspace-inline-alert-demo",
              !demoMode && liveCopyAllowed && "border-positive/30 bg-positive/5 text-positive",
              !demoMode && !liveCopyAllowed && "workspace-inline-alert-warn text-warning",
            )}
          >
            {demoMode
              ? "Demo mode — copy trades are simulated. Sign in for live execution."
              : liveCopyAllowed
                ? "Live account — copy trades execute via Deriv OTP WebSocket."
                : "Sign in at /login to enable live copy trading."}
          </div>

          <div className="copy-settings-bar desk-tile">
            <label className="copy-toggle">
              <input
                type="checkbox"
                checked={follow.autoCopy}
                disabled={!liveCopyAllowed}
                onChange={(e) =>
                  onFollowChange({ ...follow, autoCopy: e.target.checked })
                }
                className="rounded border-border accent-accent"
              />
              <span>Auto-copy new signals</span>
            </label>
            <div className="copy-stake-field">
              <label className="trade-field-label" htmlFor="copy-max-stake">
                Global max
              </label>
              <Input
                id="copy-max-stake"
                type="number"
                min={0.35}
                max={riskMaxStake}
                step={0.01}
                value={follow.maxStake}
                mono
                className="copy-stake-input h-9"
                onChange={(e) => updateGlobalMaxStake(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="copy-desk-section copy-desk-section-list">
        <div className="copy-desk-section-head">
          <p className="desk-section-title">Providers</p>
          <p className="desk-section-desc">
            {followingCount === 0
              ? "Follow desks to receive signals"
              : watchSymbols.length > 0
                ? `${followingCount} followed · watching ${watchSymbols.join(", ")}`
                : `${followingCount} followed · ${providers.length} available`}
          </p>
        </div>

        {suggestedProvider ? (
          <div className="copy-suggested-banner desk-tile">
            <div className="copy-suggested-banner-main">
              <Sparkles className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-tight">Suggested start</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
                  <span className="font-medium text-foreground">{suggestedProvider.name}</span>
                  {" · "}
                  {suggestedProvider.demoWinRate}% listed win · {suggestedProvider.riskLabel} risk
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="interactive shrink-0"
              onClick={() => onToggleFollow(suggestedProvider.id)}
            >
              Follow
            </Button>
          </div>
        ) : null}

        <ul className="copy-provider-list">
          {providers.map((provider) => {
            const isFollowing = follow.followedIds.includes(provider.id);
            const isSuggested =
              suggestedProvider?.id === provider.id && followingCount === 0;
            return (
              <li key={provider.id}>
                <ProviderCard
                  provider={provider}
                  isFollowing={isFollowing}
                  isSuggested={isSuggested}
                  onToggleFollow={onToggleFollow}
                  providerStake={
                    follow.providerStakes[provider.id] ?? follow.maxStake
                  }
                  stakeCeiling={stakeCeiling}
                  sessionStats={getProviderSessionStats(sessionMetrics, provider.id)}
                  onProviderStakeChange={(stake) => {
                    const capped = Math.min(stake, stakeCeiling);
                    const nextStakes = { ...follow.providerStakes };
                    if (capped >= follow.maxStake) {
                      delete nextStakes[provider.id];
                    } else {
                      nextStakes[provider.id] = capped;
                    }
                    onFollowChange({ ...follow, providerStakes: nextStakes });
                  }}
                />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );

  const signalsBody = (
    <div className="copy-desk copy-desk-signals">
      {!embedded ? (
        <CardHeader
          title="Live signal feed"
          subtitle={
            followingCount === 0
              ? "Follow a provider to receive signals"
              : `${signals.length} active · 60s expiry`
          }
        />
      ) : null}

      {signals.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No signals yet"
          description={
            followingCount === 0
              ? suggestedProvider
                ? `Follow ${suggestedProvider.name} to start receiving live signals.`
                : "Follow a provider to receive live signals."
              : "Waiting for signals on followed symbols…"
          }
          compact={embedded}
          action={
            followingCount === 0 && suggestedProvider ? (
              <Button
                size="sm"
                className="interactive"
                onClick={() => onToggleFollow(suggestedProvider.id)}
              >
                Follow {suggestedProvider.name}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <CopySignalList
          signals={signals}
          follow={follow}
          liveCopyAllowed={liveCopyAllowed}
          onCopySignal={onCopySignal}
        />
      )}

      <CopyHistoryStrip
        history={copyHistory}
        onClear={onClearCopyHistory}
        compact={embedded}
      />

      <p className="copy-disclaimer">
        Session stats reflect this browser session only. Catalog win rates in
        admin are illustrative. Deriv does not endorse third-party strategies.
      </p>
    </div>
  );

  function wrap(content: React.ReactNode, accent?: boolean, actionColumn = false) {
    if (embedded) {
      return (
        <div className={actionColumn ? deskActionPane : deskContentPane}>
          {content}
        </div>
      );
    }
    return (
      <Card className={accent ? "border-accent/20" : undefined} studio>
        {content}
      </Card>
    );
  }

  if (section === "providers") {
    return wrap(providersBody, true);
  }

  if (section === "signals") {
    return wrap(signalsBody, false, true);
  }

  if (section === "split") {
    return (
      <>
        <CopyMobileSignalRail
          signals={signals}
          onSelectSignal={(id) => {
            document
              .getElementById(`copy-signal-${id}`)
              ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }}
        />
        <TerminalSplitPanel
          primaryLabel="Signal providers"
          primaryHint="Curated desks · vetted manually"
          primaryTrailing={
            <CopyProvidersHeadChip count={followingCount} />
          }
          secondaryLabel="Live feed"
          secondaryHint="Recent copy signals"
          secondaryTrailing={
            <CopySignalsHeadChip
              count={signals.length}
              live={signals.length > 0 && isConnected}
            />
          }
          primary={wrap(providersBody, true)}
          secondary={wrap(signalsBody, false, true)}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {wrap(providersBody, true)}
      {wrap(signalsBody)}
    </div>
  );
}

function ProviderStyleIcon({ style }: { style: SignalProvider["style"] }) {
  const meta = STYLE_META[style];
  const Icon = meta.icon;
  return (
    <span className={cn("copy-style-icon", `copy-style-icon-${style}`)} title={meta.label}>
      <Icon className="h-3 w-3" strokeWidth={2} />
      <span className="sr-only">{meta.label}</span>
    </span>
  );
}

function CopySignalList({
  signals,
  follow,
  liveCopyAllowed,
  onCopySignal,
}: {
  signals: CopySignal[];
  follow: CopyFollowState;
  liveCopyAllowed: boolean;
  onCopySignal: (signal: CopySignal) => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (signals.length === 0) return;
    const interval = setInterval(
      () => setNow(Date.now()),
      COPY_SIGNAL_PRUNE_MS,
    );
    return () => clearInterval(interval);
  }, [signals.length]);

  const stakesById = useMemo(
    () =>
      new Map(
        signals.map((signal) => [
          signal.id,
          resolveCopyStake(follow, signal.providerId, signal.stakeSuggestion),
        ]),
      ),
    [signals, follow],
  );

  return (
    <ul className="copy-signal-list">
      {signals.map((signal) => (
        <li key={signal.id}>
          <CopySignalCard
            signal={signal}
            now={now}
            liveCopyAllowed={liveCopyAllowed}
            onCopySignal={onCopySignal}
            effectiveStake={stakesById.get(signal.id) ?? signal.stakeSuggestion}
          />
        </li>
      ))}
    </ul>
  );
}

const ProviderCard = memo(function ProviderCard({
  provider,
  isFollowing,
  isSuggested,
  onToggleFollow,
  providerStake,
  stakeCeiling,
  sessionStats,
  onProviderStakeChange,
}: {
  provider: SignalProvider;
  isFollowing: boolean;
  isSuggested: boolean;
  onToggleFollow: (id: string) => void;
  providerStake: number;
  stakeCeiling: number;
  sessionStats: ProviderSessionStats;
  onProviderStakeChange: (stake: number) => void;
}) {
  const styleMeta = STYLE_META[provider.style];

  return (
    <article
      className={cn(
        "copy-provider-card desk-tile",
        isFollowing && "copy-provider-card-active",
        isSuggested && "copy-provider-card-suggested",
      )}
    >
      {isSuggested ? (
        <p className="copy-suggested-tag">
          <Sparkles className="h-3 w-3" strokeWidth={2} />
          Suggested
        </p>
      ) : null}
      <div className="copy-provider-card-head">
        <span className="copy-provider-avatar" aria-hidden>
          <ProviderStyleIcon style={provider.style} />
        </span>
        <div className="copy-provider-main min-w-0 flex-1">
          <div className="copy-provider-title">
            <p className="copy-provider-name">{provider.name}</p>
            <span className="copy-meta-chip font-mono">{provider.country}</span>
          </div>
          <div className="copy-provider-badges">
            {provider.verified ? (
              <span className="copy-badge copy-badge-verified">Verified</span>
            ) : (
              <span className="copy-badge copy-badge-unverified">Unverified</span>
            )}
            <RiskBadge label={provider.riskLabel} />
            <span className="copy-meta-chip copy-style-label">{styleMeta.label}</span>
          </div>
        </div>
        <Button
          variant={isFollowing ? "primary" : "secondary"}
          size="sm"
          className={cn(
            "interactive copy-follow-btn shrink-0",
            isFollowing && "copy-follow-btn-active",
          )}
          onClick={() => onToggleFollow(provider.id)}
        >
          {isFollowing ? "Unfollow" : "Follow"}
        </Button>
      </div>
      <p className="copy-provider-bio">{provider.bio}</p>
      {isFollowing ? (
        <div className="copy-provider-stake-row">
          <label
            className="trade-field-label"
            htmlFor={`copy-provider-stake-${provider.id}`}
          >
            Stake cap (USD)
          </label>
          <Input
            id={`copy-provider-stake-${provider.id}`}
            type="number"
            min={0.35}
            max={stakeCeiling}
            step={0.01}
            value={providerStake}
            mono
            className="copy-stake-input copy-provider-stake-input h-8"
            onChange={(e) => onProviderStakeChange(Number(e.target.value))}
          />
          {providerStake < stakeCeiling ? (
            <span className="copy-provider-stake-hint font-mono">
              Capped below global ${stakeCeiling.toFixed(2)}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="copy-provider-stats">
        <span className="copy-stat-chip">
          <span className="copy-stat-label">Session copied</span>
          <span className="copy-stat-value">{sessionStats.copied}</span>
        </span>
        <span className="copy-stat-chip">
          <span className="copy-stat-label">Session signals</span>
          <span className="copy-stat-value">{sessionStats.signalsReceived}</span>
        </span>
        <span className="copy-stat-chip">
          <span className="copy-stat-label">Copy rate</span>
          <span className="copy-stat-value">
            {sessionStats.copyRate !== null
              ? `${sessionStats.copyRate.toFixed(0)}%`
              : "—"}
          </span>
        </span>
        <span className="copy-stat-chip copy-stat-chip-wide">
          <span className="copy-stat-label">Symbols</span>
          <span className="copy-stat-value font-mono">
            {provider.symbols.join(" · ")}
          </span>
        </span>
        <span className="copy-stat-chip">
          <span className="copy-stat-label">Listed win</span>
          <span className="copy-stat-value font-mono text-muted">
            {provider.demoWinRate}%
          </span>
        </span>
      </div>
    </article>
  );
});

const CopySignalCard = memo(function CopySignalCard({
  signal,
  now,
  liveCopyAllowed,
  onCopySignal,
  effectiveStake,
}: {
  signal: CopySignal;
  now: number;
  liveCopyAllowed: boolean;
  onCopySignal: (signal: CopySignal) => void;
  effectiveStake: number;
}) {
  const remainingMs = Math.max(0, signal.expiresAt - now);
  const isExpired = signal.expiresAt <= now;
  const ttlPct = Math.min(100, (remainingMs / SIGNAL_TTL_MS) * 100);
  const remainingSec = isExpired ? 0 : Math.ceil(remainingMs / 1000);
  const urgent = !isExpired && remainingSec <= 15;

  return (
    <article
      id={`copy-signal-${signal.id}`}
      className={cn(
        "copy-signal-card desk-tile",
        signal.direction === "CALL" ? "copy-signal-card-rise" : "copy-signal-card-fall",
        urgent && "copy-signal-card-urgent",
        isExpired && "copy-signal-card-expired",
      )}
    >
      <div className="copy-signal-card-head">
        <div className="copy-signal-main min-w-0 flex-1">
          <div className="copy-signal-title">
            <span
              className={cn(
                "portfolio-direction",
                signal.direction === "CALL"
                  ? "portfolio-direction-rise"
                  : "portfolio-direction-fall",
              )}
            >
              {signal.direction === "CALL" ? "Rise" : "Fall"}
            </span>
            <span className="copy-signal-symbol font-mono">{signal.symbol}</span>
            <span className="copy-meta-chip">{signal.providerName}</span>
          </div>
          <p className="copy-signal-rationale">{signal.rationale}</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          className="interactive copy-copy-btn shrink-0"
          disabled={!liveCopyAllowed || isExpired}
          onClick={() => onCopySignal(signal)}
        >
          Copy trade
        </Button>
      </div>

      <div className="copy-signal-ttl">
        <div className="copy-signal-ttl-row">
          <span className="copy-stat-label">Expires</span>
          <span
            className={cn(
              "copy-signal-ttl-value font-mono tabular-nums",
              urgent && "text-warning",
              isExpired && "text-muted",
            )}
          >
            {isExpired ? "Expired" : `${remainingSec}s`}
          </span>
        </div>
        <div className="copy-signal-ttl-track" aria-hidden>
          <div
            className={cn(
              "copy-signal-ttl-fill",
              urgent && "copy-signal-ttl-fill-urgent",
              isExpired && "copy-signal-ttl-fill-expired",
            )}
            style={{ width: `${ttlPct}%` }}
          />
        </div>
      </div>

      <div className="copy-signal-meta">
        <span className="copy-stat-chip">
          <span className="copy-stat-label">Stake</span>
          <span className="copy-stat-value font-mono">
            ${effectiveStake.toFixed(2)}
            {effectiveStake < signal.stakeSuggestion ? (
              <span className="copy-stake-capped" title="Provider or global cap applied">
                {" "}
                cap
              </span>
            ) : null}
          </span>
        </span>
        <span className="copy-stat-chip">
          <span className="copy-stat-label">Duration</span>
          <span className="copy-stat-value font-mono">{signal.durationTicks}t</span>
        </span>
        <span className="copy-stat-chip">
          <span className="copy-stat-label">Conf</span>
          <span className="copy-stat-value font-mono">{signal.confidence}%</span>
        </span>
        <span className="copy-stat-chip">
          <span className="copy-stat-label">Time</span>
          <span className="copy-stat-value font-mono">
            {new Date(signal.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        </span>
      </div>
    </article>
  );
});

function RiskBadge({ label }: { label: string }) {
  return (
    <span
      className={cn(
        "copy-badge capitalize",
        label === "low" && "copy-badge-low",
        label === "high" && "copy-badge-high",
        label !== "low" && label !== "high" && "copy-badge-medium",
      )}
    >
      {label} risk
    </span>
  );
}

/** Chips for split-panel headers — exported for DashboardClient */
export function CopyProvidersHeadChip({ count }: { count: number }) {
  return (
    <span className="copy-count-chip">
      <UserRound className="h-3 w-3 opacity-70" strokeWidth={2} />
      {count} following
    </span>
  );
}

export function CopySignalsHeadChip({ count, live }: { count: number; live: boolean }) {
  return (
    <span className={cn("copy-count-chip", live && "copy-count-chip-live")}>
      <span
        className={cn(
          "command-feed-dot h-1.5 w-1.5 rounded-full",
          live ? "bg-positive animate-pulse-dot" : "bg-muted",
        )}
        aria-hidden
      />
      {count} signal{count === 1 ? "" : "s"}
    </span>
  );
}
