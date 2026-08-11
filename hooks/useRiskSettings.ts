"use client";

import { useCallback, useState } from "react";
import {
  DEFAULT_RISK,
  loadRiskSettings,
  loadSessionStats,
  saveRiskSettings,
  saveSessionStats,
  type RiskSettings,
  type SessionStats,
} from "@/lib/risk/settings";

export function useRiskSettings() {
  const [settings, setSettingsState] = useState<RiskSettings>(loadRiskSettings);
  const [stats, setStatsState] = useState<SessionStats>(loadSessionStats);

  const setSettings = useCallback((next: RiskSettings) => {
    setSettingsState(next);
    saveRiskSettings(next);
  }, []);

  const recordLoss = useCallback((amount: number) => {
    setStatsState((prev) => {
      const next = {
        ...prev,
        sessionLoss: prev.sessionLoss + amount,
        dailyLoss: prev.dailyLoss + amount,
      };
      saveSessionStats(next);
      return next;
    });
  }, []);

  const resetSession = useCallback(() => {
    setStatsState((prev) => {
      const next = { ...prev, sessionLoss: 0 };
      saveSessionStats(next);
      return next;
    });
  }, []);

  return {
    settings,
    setSettings,
    stats,
    recordLoss,
    resetSession,
    defaults: DEFAULT_RISK,
  };
}
