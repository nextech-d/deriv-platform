"use client";

import { Button } from "@/components/ui/button";
import type { CopyRiskSettings, CopySessionStats } from "@/lib/copy/risk-settings";
import { copyLockoutReason } from "@/lib/copy/risk-settings";

interface CopyRiskLockoutBannerProps {
  settings: CopyRiskSettings;
  stats: CopySessionStats;
  onOpenSettings?: () => void;
}

export function CopyRiskLockoutBanner({
  settings,
  stats,
  onOpenSettings,
}: CopyRiskLockoutBannerProps) {
  const reason = copyLockoutReason(settings, stats);
  if (!reason) return null;

  return (
    <div
      className="workspace-inline-alert workspace-inline-alert-warn mx-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between md:mx-4"
      role="alert"
    >
      <p className="text-[11px] leading-relaxed">
        <span className="font-medium text-warning">Copy trading locked</span>
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
