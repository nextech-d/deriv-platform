"use client";

import { useState } from "react";
import { CopySessionStats } from "@/components/trading/CopySessionStats";
import { CopyTradingPanel } from "@/components/trading/CopyTradingPanel";
import { CURATED_PROVIDERS } from "@/lib/copy/providers";
import type { CopyRiskSettings, CopySessionStats as CopyRiskSessionStats } from "@/lib/copy/risk-settings";
import { DEFAULT_COPY_FOLLOW } from "@/lib/copy/settings";
import type {
  CopyFollowState,
  CopyHistoryEntry,
  CopyNotice,
  CopySignal,
  SignalProvider,
} from "@/lib/copy/types";
import { cn } from "@/lib/utils/cn";

export interface CopyDeskViewProps {
  providers?: SignalProvider[];
  follow?: CopyFollowState;
  signals?: CopySignal[];
  copyHistory?: CopyHistoryEntry[];
  hydrated?: boolean;
  demoMode?: boolean;
  liveCopyAllowed?: boolean;
  isConnected?: boolean;
  riskMaxStake?: number;
  signedIn?: boolean;
  copyRisk?: CopyRiskSettings;
  copyRiskStats?: CopyRiskSessionStats;
  copyNotice?: CopyNotice | null;
  onToggleFollow?: (providerId: string) => void;
  onFollowChange?: (follow: CopyFollowState) => void;
  onCopySignal?: (signal: CopySignal) => void;
  onClearCopyHistory?: () => void;
  onDismissCopyNotice?: () => void;
  onOpenSettings?: () => void;
}

export function CopyDeskView({
  providers = CURATED_PROVIDERS,
  follow,
  signals = [],
  copyHistory = [],
  hydrated = true,
  demoMode = false,
  liveCopyAllowed = false,
  isConnected = false,
  riskMaxStake = 25,
  copyRisk,
  copyRiskStats,
  copyNotice = null,
  onToggleFollow,
  onFollowChange,
  onCopySignal,
  onClearCopyHistory,
  onDismissCopyNotice,
  onOpenSettings,
}: CopyDeskViewProps) {
  const [localFollow, setLocalFollow] = useState(DEFAULT_COPY_FOLLOW);
  const followState = follow ?? localFollow;

  function changeFollow(next: CopyFollowState) {
    if (onFollowChange) onFollowChange(next);
    else setLocalFollow(next);
  }

  function toggleFollow(providerId: string) {
    if (onToggleFollow) {
      onToggleFollow(providerId);
      return;
    }
    const followed = followState.followedIds.includes(providerId);
    changeFollow({
      ...followState,
      followedIds: followed
        ? followState.followedIds.filter((id) => id !== providerId)
        : [...followState.followedIds, providerId],
    });
  }

  const following = followState.followedIds.length;

  return (
    <div data-testid="copy-trader-desk" data-desk className="copy-trader" data-scroll-pane>
      <header className="copy-trader-toolbar">
        <h1>Copy Trader</h1>
        <div className="copy-trader-toolbar-status">
          <span className="copy-trader-chip">{following} following</span>
          <span className={cn("copy-trader-chip", signals.length > 0 && "is-live")}>
            {signals.length} signal{signals.length === 1 ? "" : "s"}
          </span>
        </div>
      </header>

      <div className="copy-trader-body">
        <CopySessionStats
          providers={providers}
          follow={followState}
          signals={signals}
          copyHistory={copyHistory}
          copyRisk={copyRisk}
          copyRiskStats={copyRiskStats}
          liveCopyAllowed={liveCopyAllowed}
          copyNotice={copyNotice}
          onDismissCopyNotice={onDismissCopyNotice}
          onOpenSettings={onOpenSettings}
        />
        <CopyTradingPanel
          providers={providers}
          follow={followState}
          signals={signals}
          copyHistory={copyHistory}
          hydrated={hydrated}
          demoMode={demoMode}
          liveCopyAllowed={liveCopyAllowed}
          isConnected={isConnected}
          riskMaxStake={riskMaxStake}
          embedded
          section="split"
          onToggleFollow={toggleFollow}
          onFollowChange={changeFollow}
          onCopySignal={onCopySignal ?? (() => undefined)}
          onClearCopyHistory={onClearCopyHistory}
        />
      </div>
    </div>
  );
}
