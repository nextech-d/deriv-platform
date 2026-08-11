"use client";

import type { CopyHistoryEntry, CopySignal, CopyFollowState, SignalProvider } from "@/lib/copy/types";
import { CopyTradingPanel } from "@/components/trading/CopyTradingPanel";

export interface CopyDeskViewProps {
  providers: SignalProvider[];
  follow: CopyFollowState;
  signals: CopySignal[];
  copyHistory: CopyHistoryEntry[];
  hydrated: boolean;
  demoMode: boolean;
  liveCopyAllowed: boolean;
  isConnected: boolean;
  riskMaxStake: number;
  onToggleFollow: (providerId: string) => void;
  onFollowChange: (follow: CopyFollowState) => void;
  onCopySignal: (signal: CopySignal) => void;
  onClearCopyHistory: () => void;
}

/** Single-mount copy workspace — providers + live feed split. */
export function CopyDeskView(props: CopyDeskViewProps) {
  return <CopyTradingPanel {...props} section="split" embedded />;
}
