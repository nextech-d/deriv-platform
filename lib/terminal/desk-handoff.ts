import type { BotBuilderSnapshot } from "@/lib/terminal/strategy-seed";

const BUILDER_SEED_KEY = "tc-desk-builder-seed";
const FREE_BOTS_TIER_KEY = "tc-desk-free-bots-tier";

export type FreeBotsTier = "free" | "premium";

let pendingBuilderSeed: BotBuilderSnapshot | null = null;
let pendingFreeBotsTier: FreeBotsTier | null = null;

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(key, JSON.stringify(value));
}

function clearKey(key: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(key);
}

export function writeBuilderHandoff(snapshot: BotBuilderSnapshot) {
  pendingBuilderSeed = snapshot;
  writeJson(BUILDER_SEED_KEY, snapshot);
}

export function readBuilderHandoff(): BotBuilderSnapshot | null {
  return pendingBuilderSeed ?? readJson<BotBuilderSnapshot>(BUILDER_SEED_KEY);
}

export function consumeBuilderHandoff(): BotBuilderSnapshot | null {
  return readBuilderHandoff();
}

export function clearBuilderHandoff() {
  pendingBuilderSeed = null;
  clearKey(BUILDER_SEED_KEY);
}

export function writeFreeBotsTier(tier: FreeBotsTier) {
  pendingFreeBotsTier = tier;
  writeJson(FREE_BOTS_TIER_KEY, tier);
}

export function readFreeBotsTier(): FreeBotsTier {
  const fromMemory = pendingFreeBotsTier;
  if (fromMemory === "free" || fromMemory === "premium") return fromMemory;
  const stored = readJson<FreeBotsTier>(FREE_BOTS_TIER_KEY);
  if (stored === "free" || stored === "premium") return stored;
  return "free";
}
