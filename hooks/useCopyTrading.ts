"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CURATED_PROVIDERS } from "@/lib/copy/providers";
import {
  historyFromSignal,
  prependCopyHistory,
} from "@/lib/copy/history";
import {
  DEFAULT_COPY_FOLLOW,
  loadCopyFollowState,
  resolveCopyStake,
  saveCopyFollowState,
} from "@/lib/copy/settings";
import {
  generateSignalsFromTicks,
  pruneExpiredSignals,
  COPY_SIGNAL_PRUNE_MS,
} from "@/lib/copy/signal-engine";
import type {
  CopyFollowState,
  CopyHistoryEntry,
  CopyNotice,
  CopySignal,
  CopyTradeResult,
  SignalProvider,
} from "@/lib/copy/types";
import type { TickEvent, TradeRequest } from "@/lib/ws/protocol";

const COPY_NOTICE_TTL_MS = 6_000;
const COPY_REJECTION_WINDOW_MS = 12_000;

interface UseCopyTradingOptions {
  demoMode: boolean;
  isAuthenticated: boolean;
  copyRiskLocked: boolean;
  placeTrade: (request: TradeRequest) => CopyTradeResult;
}

function formatCopySuccess(signal: CopySignal, stake: number, auto: boolean): string {
  const direction = signal.direction === "CALL" ? "Rise" : "Fall";
  const prefix = auto ? "Auto-copied" : "Copy sent";
  return `${prefix} · ${direction} ${signal.symbol} · $${stake.toFixed(2)} · ${signal.durationTicks}t`;
}

export function useCopyTrading({
  demoMode,
  isAuthenticated,
  copyRiskLocked,
  placeTrade,
}: UseCopyTradingOptions) {
  const [providers, setProviders] = useState<SignalProvider[]>(CURATED_PROVIDERS);
  const [follow, setFollowState] = useState<CopyFollowState>(() =>
    typeof window !== "undefined" ? loadCopyFollowState() : DEFAULT_COPY_FOLLOW,
  );
  const [signals, setSignals] = useState<CopySignal[]>([]);
  const [copyHistory, setCopyHistory] = useState<CopyHistoryEntry[]>([]);
  const [copyNotice, setCopyNotice] = useState<CopyNotice | null>(null);
  const hydrated = typeof window !== "undefined";

  const cooldownRef = useRef(new Map<string, number>());
  const placeTradeRef = useRef(placeTrade);
  const followRef = useRef(follow);
  const gatesRef = useRef({ demoMode, isAuthenticated, copyRiskLocked });
  const noticeTimerRef = useRef<number | null>(null);
  const signalExpiryTimersRef = useRef<Map<string, number>>(new Map());
  const loggedExpiryRef = useRef<Set<string>>(new Set());
  const lastCopyAttemptRef = useRef<{ signal: CopySignal; at: number } | null>(null);

  const appendHistory = useCallback(
    (partial: Omit<CopyHistoryEntry, "id" | "at">) => {
      setCopyHistory((prev) => prependCopyHistory(prev, partial));
    },
    [],
  );

  const clearCopyHistory = useCallback(() => {
    setCopyHistory([]);
  }, []);

  const expireSignal = useCallback(
    (signal: CopySignal) => {
      setSignals((prev) => prev.filter((entry) => entry.id !== signal.id));
      if (loggedExpiryRef.current.has(signal.id)) return;
      loggedExpiryRef.current.add(signal.id);
      appendHistory(
        historyFromSignal(signal, {
          kind: "expired",
          detail: "60s window elapsed",
        }),
      );
    },
    [appendHistory],
  );

  useEffect(() => {
    void fetch("/api/copy/providers")
      .then((r) => r.json())
      .then((json: { providers: SignalProvider[] }) => {
        if (json.providers?.length) setProviders(json.providers);
      })
      .catch(() => {
        // keep fallback
      });
  }, []);

  useEffect(() => {
    placeTradeRef.current = placeTrade;
    followRef.current = follow;
    gatesRef.current = { demoMode, isAuthenticated, copyRiskLocked };
  }, [placeTrade, follow, demoMode, isAuthenticated, copyRiskLocked]);

  const dismissCopyNotice = useCallback(() => {
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
    setCopyNotice(null);
  }, []);

  const pushCopyNotice = useCallback(
    (notice: CopyNotice) => {
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
      }
      setCopyNotice(notice);
      noticeTimerRef.current = window.setTimeout(() => {
        setCopyNotice(null);
        noticeTimerRef.current = null;
      }, COPY_NOTICE_TTL_MS);
    },
    [],
  );

  const reportCopyRejection = useCallback(
    (message: string) => {
      const attempt = lastCopyAttemptRef.current;
      if (attempt && Date.now() - attempt.at < COPY_REJECTION_WINDOW_MS) {
        appendHistory(
          historyFromSignal(attempt.signal, {
            kind: "rejected",
            stake: resolveCopyStake(
              followRef.current,
              attempt.signal.providerId,
              attempt.signal.stakeSuggestion,
            ),
            detail: message,
          }),
        );
        lastCopyAttemptRef.current = null;
        return;
      }

      appendHistory({
        kind: "rejected",
        signalId: "unknown",
        symbol: "—",
        direction: "CALL",
        providerName: "Copy desk",
        detail: message,
      });
    },
    [appendHistory],
  );

  useEffect(() => () => {
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    for (const timer of signalExpiryTimersRef.current.values()) {
      window.clearTimeout(timer);
    }
    signalExpiryTimersRef.current.clear();
  }, []);

  useEffect(() => {
    const timers = signalExpiryTimersRef.current;
    const activeIds = new Set(signals.map((signal) => signal.id));

    for (const [id, timer] of timers) {
      if (!activeIds.has(id)) {
        window.clearTimeout(timer);
        timers.delete(id);
      }
    }

    for (const signal of signals) {
      if (timers.has(signal.id)) continue;
      const delay = Math.max(0, signal.expiresAt - Date.now());
      timers.set(
        signal.id,
        window.setTimeout(() => {
          timers.delete(signal.id);
          expireSignal(signal);
        }, delay),
      );
    }
  }, [signals, expireSignal]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSignals((prev) => {
        if (prev.length === 0) return prev;
        const next = pruneExpiredSignals(prev);
        if (next.length === prev.length) return prev;
        const nextIds = new Set(next.map((signal) => signal.id));
        for (const signal of prev) {
          if (nextIds.has(signal.id) || loggedExpiryRef.current.has(signal.id)) continue;
          loggedExpiryRef.current.add(signal.id);
          appendHistory(
            historyFromSignal(signal, {
              kind: "expired",
              detail: "60s window elapsed",
            }),
          );
        }
        return next;
      });
    }, COPY_SIGNAL_PRUNE_MS);
    return () => window.clearInterval(interval);
  }, [appendHistory]);

  const setFollow = useCallback((next: CopyFollowState) => {
    setFollowState(next);
    saveCopyFollowState(next);
  }, []);

  const toggleFollow = useCallback(
    (providerId: string) => {
      if (follow.followedIds.includes(providerId)) {
        const ids = follow.followedIds.filter((id) => id !== providerId);
        const { [providerId]: _removed, ...providerStakes } = follow.providerStakes;
        setFollow({ ...follow, followedIds: ids, providerStakes });
        return;
      }
      setFollow({
        ...follow,
        followedIds: [...follow.followedIds, providerId],
      });
    },
    [follow, setFollow],
  );

  const copySignal = useCallback(
    (signal: CopySignal, options?: { auto?: boolean }) => {
      const auto = options?.auto ?? false;

      if (gatesRef.current.copyRiskLocked) {
        const detail = "Copy risk lockout";
        pushCopyNotice({
          tone: "warn",
          message: "Copy risk lockout — adjust copy limits in Settings.",
        });
        appendHistory(historyFromSignal(signal, { kind: "blocked", detail }));
        return false;
      }

      if (!gatesRef.current.demoMode && !gatesRef.current.isAuthenticated) {
        const detail = "Sign in required";
        pushCopyNotice({
          tone: "warn",
          message: "Sign in to copy trades on a live account.",
        });
        appendHistory(historyFromSignal(signal, { kind: "blocked", detail }));
        return false;
      }

      const stake = resolveCopyStake(
        followRef.current,
        signal.providerId,
        signal.stakeSuggestion,
      );
      lastCopyAttemptRef.current = { signal, at: Date.now() };

      const result = placeTradeRef.current({
        symbol: signal.symbol,
        contractType: signal.direction,
        amount: stake,
        duration: signal.durationTicks,
        durationUnit: "t",
        basis: "stake",
      });

      if (!result.ok) {
        pushCopyNotice({ tone: "warn", message: result.reason });
        appendHistory(
          historyFromSignal(signal, {
            kind: "blocked",
            stake,
            detail: result.reason,
          }),
        );
        lastCopyAttemptRef.current = null;
        return false;
      }

      pushCopyNotice({
        tone: "ok",
        message: formatCopySuccess(signal, stake, auto),
      });
      appendHistory(
        historyFromSignal(signal, {
          kind: "copied",
          stake,
          detail: auto ? "Auto-copy" : "Manual copy",
        }),
      );
      loggedExpiryRef.current.delete(signal.id);
      lastCopyAttemptRef.current = null;
      setSignals((prev) => prev.filter((s) => s.id !== signal.id));
      return true;
    },
    [appendHistory, pushCopyNotice],
  );

  const handleTick = useCallback(
    (tick: TickEvent, history: TickEvent[]) => {
      const f = followRef.current;
      if (f.followedIds.length === 0) return;

      const newSignals = generateSignalsFromTicks(
        providers,
        f.followedIds,
        tick,
        history,
        cooldownRef.current,
      );

      if (newSignals.length === 0) return;

      setSignals((prev) => pruneExpiredSignals([...newSignals, ...prev]).slice(0, 30));

      if (
        f.autoCopy &&
        !gatesRef.current.copyRiskLocked &&
        (gatesRef.current.demoMode || gatesRef.current.isAuthenticated)
      ) {
        for (const signal of newSignals) {
          copySignal(signal, { auto: true });
        }
      }
    },
    [providers, copySignal],
  );

  return {
    providers,
    follow,
    setFollow,
    signals,
    copyHistory,
    clearCopyHistory,
    hydrated,
    copyNotice,
    dismissCopyNotice,
    pushCopyNotice,
    reportCopyRejection,
    toggleFollow,
    copySignal,
    handleTick,
    liveCopyAllowed: demoMode || isAuthenticated,
  };
}
