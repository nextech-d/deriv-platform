export interface RiskSettings {
  maxStake: number;
  sessionStopLoss: number;
  dailyMaxDrawdown: number;
  enabled: boolean;
}

export const DEFAULT_RISK: RiskSettings = {
  maxStake: 25,
  sessionStopLoss: 50,
  dailyMaxDrawdown: 100,
  enabled: true,
};

const STORAGE_KEY = "deriv_platform_risk";

export function loadRiskSettings(): RiskSettings {
  if (typeof window === "undefined") return DEFAULT_RISK;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RISK;
    return { ...DEFAULT_RISK, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_RISK;
  }
}

export function saveRiskSettings(settings: RiskSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export interface SessionStats {
  sessionLoss: number;
  dailyLoss: number;
  dayKey: string;
}

const SESSION_KEY = "deriv_platform_session_stats";

export function loadSessionStats(): SessionStats {
  if (typeof window === "undefined") {
    return { sessionLoss: 0, dailyLoss: 0, dayKey: todayKey() };
  }
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const today = todayKey();
    if (!raw) return { sessionLoss: 0, dailyLoss: 0, dayKey: today };
    const parsed = JSON.parse(raw) as SessionStats;
    if (parsed.dayKey !== today) {
      return { sessionLoss: parsed.sessionLoss, dailyLoss: 0, dayKey: today };
    }
    return parsed;
  } catch {
    return { sessionLoss: 0, dailyLoss: 0, dayKey: todayKey() };
  }
}

export function saveSessionStats(stats: SessionStats): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(stats));
}

function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
  }).format(new Date());
}

export function checkRiskGate(
  settings: RiskSettings,
  stats: SessionStats,
  stake: number,
): string | null {
  const stakeBlock = checkStakeCap(settings, stake);
  if (stakeBlock) return stakeBlock;
  if (!settings.enabled) return null;
  if (stats.sessionLoss >= settings.sessionStopLoss) {
    return `Session stop-loss reached ($${settings.sessionStopLoss})`;
  }
  if (stats.dailyLoss >= settings.dailyMaxDrawdown) {
    return `Daily drawdown limit reached ($${settings.dailyMaxDrawdown})`;
  }
  return null;
}

export function checkStakeCap(settings: RiskSettings, stake: number): string | null {
  if (!settings.enabled) return null;
  if (stake > settings.maxStake) {
    return `Stake exceeds max cap ($${settings.maxStake})`;
  }
  return null;
}

export function isRiskLockedOut(
  settings: RiskSettings,
  stats: SessionStats,
): boolean {
  if (!settings.enabled) return false;
  return (
    stats.sessionLoss >= settings.sessionStopLoss ||
    stats.dailyLoss >= settings.dailyMaxDrawdown
  );
}

export function riskLockoutReason(
  settings: RiskSettings,
  stats: SessionStats,
): string | null {
  if (!settings.enabled) return null;
  if (stats.sessionLoss >= settings.sessionStopLoss) {
    return `Session stop-loss of $${settings.sessionStopLoss} reached. Trading is locked until you reset the session counter in Settings.`;
  }
  if (stats.dailyLoss >= settings.dailyMaxDrawdown) {
    return `Daily drawdown limit of $${settings.dailyMaxDrawdown} reached. Trading resumes tomorrow (EAT).`;
  }
  return null;
}
