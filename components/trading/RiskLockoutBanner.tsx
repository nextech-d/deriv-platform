"use client";

import { Button } from "@/components/ui/button";
import type { RiskSettings, SessionStats } from "@/lib/risk/settings";
import { riskLockoutReason } from "@/lib/risk/settings";

interface RiskLockoutBannerProps {
  settings: RiskSettings;
  stats: SessionStats;
  onOpenSettings?: () => void;
}

export function RiskLockoutBanner({
  settings,
  stats,
  onOpenSettings,
}: RiskLockoutBannerProps) {
  const reason = riskLockoutReason(settings, stats);
  if (!reason) return null;

  return (
    <div
      className="workspace-inline-alert workspace-inline-alert-warn flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      role="alert"
    >
      <p className="text-[11px] leading-relaxed">
        <span className="font-medium text-warning">Trading locked</span>
        <span className="text-muted"> — {reason}</span>
      </p>
      {onOpenSettings ? (
        <Button
          variant="ghost"
          size="sm"
          className="interactive h-7 shrink-0 px-2 text-[11px]"
          onClick={onOpenSettings}
        >
          Settings
        </Button>
      ) : null}
    </div>
  );
}
