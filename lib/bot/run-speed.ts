import type { BotBuilderSnapshot } from "@/lib/terminal/strategy-seed";

export type RunSpeed = "fast" | "slow";

export const RUN_SPEED_KEY = "tc-run-speed";
/** Slow mode pause between purchase cycles (ms). */
export const SLOW_RUN_DELAY_MS = 350;

export function readRunSpeed(): RunSpeed {
  if (typeof window === "undefined") return "fast";
  const raw = window.localStorage.getItem(RUN_SPEED_KEY);
  return raw === "slow" ? "slow" : "fast";
}

export function writeRunSpeed(speed: RunSpeed): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RUN_SPEED_KEY, speed);
}

/** Blockly runner delay before each purchase cycle (tradecity-bot engine). */
export function runSpeedDelayMs(speed: RunSpeed = readRunSpeed()): number {
  return speed === "slow" ? SLOW_RUN_DELAY_MS : 0;
}

/** Map run-speed toggle onto builder snapshot before starting the runner. */
export function applyRunSpeedToSnapshot(
  snapshot: BotBuilderSnapshot,
  speed: RunSpeed = readRunSpeed(),
): BotBuilderSnapshot {
  if (speed === "fast") {
    return {
      ...snapshot,
      fastExecution: true,
      tradeEachTick: true,
      cooldownTicks: 0,
      runOnceAtStart: false,
    };
  }
  return {
    ...snapshot,
    fastExecution: false,
    tradeEachTick: false,
    cooldownTicks: Math.max(snapshot.cooldownTicks, 8),
  };
}
