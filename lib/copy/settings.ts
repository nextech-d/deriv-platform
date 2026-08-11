import type { CopyFollowState } from "@/lib/copy/types";

export const DEFAULT_COPY_FOLLOW: CopyFollowState = {
  followedIds: [],
  autoCopy: false,
  maxStake: 1,
  providerStakes: {},
};

const STORAGE_KEY = "deriv_platform_copy_follow";

function normalizeCopyFollowState(raw: Partial<CopyFollowState>): CopyFollowState {
  const merged = { ...DEFAULT_COPY_FOLLOW, ...raw };
  const providerStakes =
    raw.providerStakes && typeof raw.providerStakes === "object"
      ? raw.providerStakes
      : {};
  return {
    ...merged,
    providerStakes,
    maxStake: Number.isFinite(merged.maxStake) ? merged.maxStake : DEFAULT_COPY_FOLLOW.maxStake,
  };
}

export function getProviderMaxStake(
  follow: CopyFollowState,
  providerId: string,
): number {
  const providerCap = follow.providerStakes[providerId];
  if (providerCap !== undefined && Number.isFinite(providerCap)) {
    return Math.min(follow.maxStake, providerCap);
  }
  return follow.maxStake;
}

export function resolveCopyStake(
  follow: CopyFollowState,
  providerId: string,
  stakeSuggestion: number,
): number {
  return Math.min(getProviderMaxStake(follow, providerId), stakeSuggestion);
}

export function clampProviderStakes(
  follow: CopyFollowState,
  maxStake: number,
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const [id, stake] of Object.entries(follow.providerStakes)) {
    next[id] = Math.min(stake, maxStake);
  }
  return next;
}

export function loadCopyFollowState(): CopyFollowState {
  if (typeof window === "undefined") return DEFAULT_COPY_FOLLOW;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_COPY_FOLLOW;
    return normalizeCopyFollowState(JSON.parse(raw));
  } catch {
    return DEFAULT_COPY_FOLLOW;
  }
}

export function saveCopyFollowState(state: CopyFollowState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
