"use client";

import { useCallback, useState } from "react";
import {
  DEFAULT_COPY_RISK,
  loadCopyRiskSettings,
  loadCopySessionStats,
  saveCopyRiskSettings,
  saveCopySessionStats,
  type CopyRiskSettings,
  type CopySessionStats,
} from "@/lib/copy/risk-settings";

export function useCopyRiskSettings() {
  const [settings, setSettingsState] = useState<CopyRiskSettings>(loadCopyRiskSettings);
  const [stats, setStatsState] = useState<CopySessionStats>(loadCopySessionStats);

  const setSettings = useCallback((next: CopyRiskSettings) => {
    setSettingsState(next);
    saveCopyRiskSettings(next);
  }, []);

  const recordCopyOutcome = useCallback((profit: number) => {
    setStatsState((prev) => {
      const next: CopySessionStats = {
        ...prev,
        copySettledPnl: prev.copySettledPnl + profit,
        copyWins: profit >= 0 ? prev.copyWins + 1 : prev.copyWins,
        copyLosses: profit < 0 ? prev.copyLosses + 1 : prev.copyLosses,
      };
      if (profit < 0) {
        const loss = Math.abs(profit);
        next.sessionLoss = prev.sessionLoss + loss;
        next.dailyLoss = prev.dailyLoss + loss;
      }
      saveCopySessionStats(next);
      return next;
    });
  }, []);

  const recordCopyAttempt = useCallback(() => {
    setStatsState((prev) => {
      const next = {
        ...prev,
        copiesThisSession: prev.copiesThisSession + 1,
      };
      saveCopySessionStats(next);
      return next;
    });
  }, []);

  const resetCopySession = useCallback(() => {
    setStatsState((prev) => {
      const next = {
        ...prev,
        sessionLoss: 0,
        copiesThisSession: 0,
        copyWins: 0,
        copyLosses: 0,
        copySettledPnl: 0,
      };
      saveCopySessionStats(next);
      return next;
    });
  }, []);

  return {
    settings,
    setSettings,
    stats,
    recordCopyOutcome,
    recordCopyAttempt,
    resetCopySession,
    defaults: DEFAULT_COPY_RISK,
  };
}
