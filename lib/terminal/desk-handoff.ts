import type { BotBuilderSnapshot } from "@/lib/terminal/strategy-seed";
import type { BuilderLane } from "@/lib/terminal/builder-block-map";

const BUILDER_SEED_KEY = "tc-desk-builder-seed";
const BUILDER_WORKSPACE_KEY = "tc-desk-builder-workspace";
const BUILDER_RUN_AFTER_KEY = "tc-desk-builder-run-after";
const FREE_BOTS_TIER_KEY = "tc-desk-free-bots-tier";

export type FreeBotsTier = "free" | "premium";

let pendingBuilderSeed: BotBuilderSnapshot | null = null;
let pendingBuilderRunAfter = false;
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

const BUILDER_SEED_NONCE_KEY = "tc-desk-builder-seed-nonce";
const BUILDER_SEED_APPLIED_KEY = "tc-desk-builder-seed-applied";

let pendingBuilderNonce: string | null = null;
let pendingBuilderApplied: string | null = null;

function readNonce(): string | null {
  if (typeof window !== "undefined") {
    return window.sessionStorage.getItem(BUILDER_SEED_NONCE_KEY) ?? pendingBuilderNonce;
  }
  return pendingBuilderNonce;
}

function readAppliedNonce(): string | null {
  if (typeof window !== "undefined") {
    return window.sessionStorage.getItem(BUILDER_SEED_APPLIED_KEY) ?? pendingBuilderApplied;
  }
  return pendingBuilderApplied;
}

export function writeBuilderHandoff(snapshot: BotBuilderSnapshot) {
  pendingBuilderSeed = snapshot;
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  pendingBuilderNonce = nonce;
  pendingBuilderApplied = null;
  writeJson(BUILDER_SEED_KEY, snapshot);
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(BUILDER_SEED_NONCE_KEY, nonce);
  window.sessionStorage.removeItem(BUILDER_SEED_APPLIED_KEY);
}

export function readBuilderHandoff(): BotBuilderSnapshot | null {
  return pendingBuilderSeed ?? readJson<BotBuilderSnapshot>(BUILDER_SEED_KEY);
}

export function peekUnappliedBuilderHandoff(): BotBuilderSnapshot | null {
  const nonce = readNonce();
  if (!nonce || nonce === readAppliedNonce()) return null;
  return readBuilderHandoff();
}

export function markBuilderHandoffApplied() {
  const nonce = readNonce();
  if (!nonce) return;
  pendingBuilderApplied = nonce;
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(BUILDER_SEED_APPLIED_KEY, nonce);
}

export function consumeBuilderHandoff(): BotBuilderSnapshot | null {
  const next = peekUnappliedBuilderHandoff();
  if (next) markBuilderHandoffApplied();
  return next;
}

export function writeBuilderRunAfter(run = true) {
  pendingBuilderRunAfter = run;
  if (typeof window === "undefined") return;
  if (run) window.sessionStorage.setItem(BUILDER_RUN_AFTER_KEY, "1");
  else window.sessionStorage.removeItem(BUILDER_RUN_AFTER_KEY);
}

export function consumeBuilderRunAfter(): boolean {
  const stored =
    typeof window !== "undefined" &&
    window.sessionStorage.getItem(BUILDER_RUN_AFTER_KEY) === "1";
  const next = pendingBuilderRunAfter || stored;
  pendingBuilderRunAfter = false;
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(BUILDER_RUN_AFTER_KEY);
  }
  return next;
}

export interface BuilderWorkspaceChip {
  id: string;
  label: string;
  category: string;
  lane: BuilderLane;
}

export interface BuilderWorkspaceJournal {
  id: string;
  at: number;
  text: string;
}

export interface BuilderWorkspace {
  snapshot: BotBuilderSnapshot;
  chips: BuilderWorkspaceChip[];
  journal: BuilderWorkspaceJournal[];
  history: BotBuilderSnapshot[];
  historyIndex: number;
  focusBlock: BuilderLane;
}

export function writeBuilderWorkspace(workspace: BuilderWorkspace) {
  writeJson(BUILDER_WORKSPACE_KEY, {
    ...workspace,
    history: workspace.history.slice(-20),
    journal: workspace.journal.slice(0, 40),
    chips: workspace.chips.slice(0, 24),
  });
}

export function readBuilderWorkspace(): BuilderWorkspace | null {
  return readJson<BuilderWorkspace>(BUILDER_WORKSPACE_KEY);
}

export function clearBuilderWorkspace() {
  clearKey(BUILDER_WORKSPACE_KEY);
}

export function clearBuilderHandoff() {
  pendingBuilderSeed = null;
  pendingBuilderNonce = null;
  pendingBuilderApplied = null;
  clearKey(BUILDER_SEED_KEY);
  clearKey(BUILDER_SEED_NONCE_KEY);
  clearKey(BUILDER_SEED_APPLIED_KEY);
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
