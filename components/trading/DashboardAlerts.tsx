"use client";

import { ConnectionBanner } from "@/components/ConnectionBanner";
import { RiskLockoutBanner } from "@/components/trading/RiskLockoutBanner";
import type { RiskSettings, SessionStats } from "@/lib/risk/settings";
import type { ConnectionState } from "@/lib/ws/protocol";

interface DashboardAlertsProps {
  demoMode?: boolean;
  connectionState: ConnectionState;
  error: string | null;
  onReconnect: () => void;
  settings: RiskSettings;
  stats: SessionStats;
  onOpenSettings: () => void;
  showConnection?: boolean;
  showRisk?: boolean;
}

export function DashboardAlerts({
  demoMode,
  connectionState,
  error,
  onReconnect,
  settings,
  stats,
  onOpenSettings,
  showConnection = true,
  showRisk = true,
}: DashboardAlertsProps) {
  return (
    <div className="space-y-2">
      {demoMode ? (
        <p className="workspace-inline-alert workspace-inline-alert-demo text-[11px] text-muted">
          <span className="font-medium text-accent">Demo mode</span> — simulated
          trades only. Sign in for live execution.
        </p>
      ) : null}
      {showRisk ? (
        <RiskLockoutBanner
          settings={settings}
          stats={stats}
          onOpenSettings={onOpenSettings}
        />
      ) : null}
      {showConnection ? (
        <ConnectionBanner
          state={connectionState}
          error={error}
          onReconnect={onReconnect}
        />
      ) : null}
    </div>
  );
}
