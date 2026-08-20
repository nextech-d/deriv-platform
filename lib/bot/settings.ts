import type { BotConfig } from "@/lib/bot/types";

export const DEFAULT_BOT_CONFIG: BotConfig = {
  enabled: false,
  paused: false,
  strategy: "ma_cross",
  stake: 1,
  duration: 5,
  fastPeriod: 5,
  slowPeriod: 20,
  rsiPeriod: 14,
  rsiOversold: 30,
  rsiOverbought: 70,
  cooldownTicks: 10,
  maxOpenPositions: 1,
  digitTarget: 5,
  barrierDigit: 4,
  parityPrefer: "auto",
};

const CONFIG_KEY = "deriv_platform_bot_config";
const RUNTIME_KEY = "deriv_platform_bot_demo_runtime_ms";

/** RSK-05: 24 h demo bot runtime required before live auto-trade */
export const DEMO_RUNTIME_REQUIRED_MS = 24 * 60 * 60 * 1000;

export function loadBotConfig(): BotConfig {
  if (typeof window === "undefined") return DEFAULT_BOT_CONFIG;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_BOT_CONFIG;
    return { ...DEFAULT_BOT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_BOT_CONFIG;
  }
}

export function saveBotConfig(config: BotConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function loadDemoRuntimeMs(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(RUNTIME_KEY);
  return raw ? Number(raw) || 0 : 0;
}

export function saveDemoRuntimeMs(ms: number): void {
  localStorage.setItem(RUNTIME_KEY, String(Math.floor(ms)));
}

export function canEnableLiveBot(demoMode: boolean, demoRuntimeMs: number): boolean {
  if (demoMode) return true;
  return demoRuntimeMs >= DEMO_RUNTIME_REQUIRED_MS;
}

export function demoRuntimeRemainingMs(demoRuntimeMs: number): number {
  return Math.max(0, DEMO_RUNTIME_REQUIRED_MS - demoRuntimeMs);
}
