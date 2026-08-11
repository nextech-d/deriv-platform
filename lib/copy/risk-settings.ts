export interface CopyRiskSettings {
  enabled: boolean;
  sessionStopLoss: number;
  dailyMaxDrawdown: number;
  /** 0 = unlimited */
  maxCopiesPerSession: number;
}

export interface CopySessionStats {
  sessionLoss: number;
  dailyLoss: number;
  dayKey: string;
  copiesThisSession: number;
  /** Settled copy trades with profit ≥ 0 */
  copyWins: number;
  /** Settled copy trades with profit < 0 */
  copyLosses: number;
  /** Running P/L from settled copy trades (USD) */
  copySettledPnl: number;
}

export const DEFAULT_COPY_RISK: CopyRiskSettings = {
  enabled: true,
  sessionStopLoss: 25,
  dailyMaxDrawdown: 50,
  maxCopiesPerSession: 0,
};

const RISK_KEY = "deriv_platform_copy_risk";
const STATS_KEY = "deriv_platform_copy_session_stats";

function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
  }).format(new Date());
}

export function loadCopyRiskSettings(): CopyRiskSettings {
  if (typeof window === "undefined") return DEFAULT_COPY_RISK;
  try {
    const raw = localStorage.getItem(RISK_KEY);
    if (!raw) return DEFAULT_COPY_RISK;
    return { ...DEFAULT_COPY_RISK, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_COPY_RISK;
  }
}

export function saveCopyRiskSettings(settings: CopyRiskSettings): void {
  localStorage.setItem(RISK_KEY, JSON.stringify(settings));
}

function emptyCopySessionStats(dayKey = todayKey()): CopySessionStats {
  return {
    sessionLoss: 0,
    dailyLoss: 0,
    dayKey,
    copiesThisSession: 0,
    copyWins: 0,
    copyLosses: 0,
    copySettledPnl: 0,
  };
}

export function loadCopySessionStats(): CopySessionStats {
  if (typeof window === "undefined") {
    return emptyCopySessionStats();
  }
  try {
    const raw = localStorage.getItem(STATS_KEY);
    const today = todayKey();
    if (!raw) {
      return emptyCopySessionStats(today);
    }
    const parsed = { ...emptyCopySessionStats(today), ...JSON.parse(raw) } as CopySessionStats;
    if (parsed.dayKey !== today) {
      return {
        ...parsed,
        dailyLoss: 0,
        dayKey: today,
      };
    }
    return parsed;
  } catch {
    return emptyCopySessionStats();
  }
}

export function saveCopySessionStats(stats: CopySessionStats): void {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function checkCopyRiskGate(
  settings: CopyRiskSettings,
  stats: CopySessionStats,
): string | null {
  if (!settings.enabled) return null;
  if (stats.sessionLoss >= settings.sessionStopLoss) {
    return `Copy session stop-loss reached ($${settings.sessionStopLoss})`;
  }
  if (stats.dailyLoss >= settings.dailyMaxDrawdown) {
    return `Copy daily drawdown limit reached ($${settings.dailyMaxDrawdown})`;
  }
  if (
    settings.maxCopiesPerSession > 0 &&
    stats.copiesThisSession >= settings.maxCopiesPerSession
  ) {
    return `Copy session limit reached (${settings.maxCopiesPerSession} trades)`;
  }
  return null;
}

export function isCopyLockedOut(
  settings: CopyRiskSettings,
  stats: CopySessionStats,
): boolean {
  if (!settings.enabled) return false;
  return (
    stats.sessionLoss >= settings.sessionStopLoss ||
    stats.dailyLoss >= settings.dailyMaxDrawdown ||
    (settings.maxCopiesPerSession > 0 &&
      stats.copiesThisSession >= settings.maxCopiesPerSession)
  );
}

export function copyLockoutReason(
  settings: CopyRiskSettings,
  stats: CopySessionStats,
): string | null {
  if (!settings.enabled) return null;
  if (stats.sessionLoss >= settings.sessionStopLoss) {
    return `Copy session stop-loss of $${settings.sessionStopLoss} reached. Reset copy counters in Settings or Copy controls.`;
  }
  if (stats.dailyLoss >= settings.dailyMaxDrawdown) {
    return `Copy daily drawdown limit of $${settings.dailyMaxDrawdown} reached. Copy trading resumes tomorrow (EAT).`;
  }
  if (
    settings.maxCopiesPerSession > 0 &&
    stats.copiesThisSession >= settings.maxCopiesPerSession
  ) {
    return `Copy session trade limit (${settings.maxCopiesPerSession}) reached. Reset copy session in Settings.`;
  }
  return null;
}

export function copySessionLossPct(
  settings: CopyRiskSettings,
  stats: CopySessionStats,
): number {
  if (!settings.enabled || settings.sessionStopLoss <= 0) return 0;
  return Math.min(100, (stats.sessionLoss / settings.sessionStopLoss) * 100);
}

export function copyDailyLossPct(
  settings: CopyRiskSettings,
  stats: CopySessionStats,
): number {
  if (!settings.enabled || settings.dailyMaxDrawdown <= 0) return 0;
  return Math.min(100, (stats.dailyLoss / settings.dailyMaxDrawdown) * 100);
}

/** Win rate from settled copy trades (0–100), null if none settled. */
export function copySessionWinRate(stats: CopySessionStats): number | null {
  const settled = stats.copyWins + stats.copyLosses;
  if (settled <= 0) return null;
  return (stats.copyWins / settled) * 100;
}
