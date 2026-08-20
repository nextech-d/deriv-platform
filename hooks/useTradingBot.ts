"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  evaluateStrategy,
  initProgressionState,
  progressStake,
  type StakeProgressionState,
} from "@/lib/bot/strategies";
import { resolveBotOrder } from "@/lib/bot/trade-map";
import {
  canEnableLiveBot,
  DEFAULT_BOT_CONFIG,
  demoRuntimeRemainingMs,
  loadBotConfig,
  loadDemoRuntimeMs,
  saveBotConfig,
  saveDemoRuntimeMs,
} from "@/lib/bot/settings";
import type { BotConfig, BotHeartbeat } from "@/lib/bot/types";
import type { TickEvent, TradeRequest } from "@/lib/ws/protocol";

interface UseTradingBotOptions {
  symbol: string;
  isConnected: boolean;
  isTrading: boolean;
  demoMode: boolean;
  tradingLocked: boolean;
  openContractCount: number;
  placeTrade: (request: TradeRequest) => void;
}

function buildInitialHeartbeat(): BotHeartbeat {
  const demoRuntimeMs =
    typeof window !== "undefined" ? loadDemoRuntimeMs() : 0;
  const config =
    typeof window !== "undefined" ? loadBotConfig() : DEFAULT_BOT_CONFIG;
  return {
    status:
      config.enabled && !config.paused
        ? "running"
        : config.enabled
          ? "paused"
          : "idle",
    lastTickAt: null,
    lastSignalAt: null,
    lastSignalLabel: null,
    ticksProcessed: 0,
    tradesExecuted: 0,
    demoRuntimeMs,
    blockReason: null,
  };
}

export function useTradingBot({
  symbol,
  isConnected,
  isTrading,
  demoMode,
  tradingLocked,
  openContractCount,
  placeTrade,
}: UseTradingBotOptions) {
  const [config, setConfigState] = useState<BotConfig>(() =>
    typeof window !== "undefined" ? loadBotConfig() : DEFAULT_BOT_CONFIG,
  );
  const [heartbeat, setHeartbeat] = useState<BotHeartbeat>(buildInitialHeartbeat);

  const cooldownRef = useRef(0);
  const runtimeStartRef = useRef<number | null>(null);
  const demoRuntimeRef = useRef(heartbeat.demoRuntimeMs);
  const placeTradeRef = useRef(placeTrade);
  const lastProcessedEpochRef = useRef<number | null>(null);
  const progressionRef = useRef<StakeProgressionState | null>(null);
  const configRef = useRef(config);
  const gatesRef = useRef({
    isConnected,
    isTrading,
    tradingLocked,
    openContractCount,
    symbol,
  });

  useEffect(() => {
    placeTradeRef.current = placeTrade;
    configRef.current = config;
    gatesRef.current = {
      isConnected,
      isTrading,
      tradingLocked,
      openContractCount,
      symbol,
    };
  }, [
    placeTrade,
    config,
    isConnected,
    isTrading,
    tradingLocked,
    openContractCount,
    symbol,
  ]);

  useEffect(() => {
    if (!demoMode || !config.enabled || config.paused) {
      if (runtimeStartRef.current !== null) {
        const elapsed = Date.now() - runtimeStartRef.current;
        demoRuntimeRef.current += elapsed;
        saveDemoRuntimeMs(demoRuntimeRef.current);
        runtimeStartRef.current = null;
        setHeartbeat((prev) => ({ ...prev, demoRuntimeMs: demoRuntimeRef.current }));
      }
      return;
    }

    runtimeStartRef.current = Date.now();
    return () => {
      if (runtimeStartRef.current !== null) {
        const elapsed = Date.now() - runtimeStartRef.current;
        demoRuntimeRef.current += elapsed;
        saveDemoRuntimeMs(demoRuntimeRef.current);
        runtimeStartRef.current = null;
      }
    };
  }, [demoMode, config.enabled, config.paused]);

  const setConfig = useCallback((next: BotConfig) => {
    configRef.current = next;
    setConfigState(next);
    saveBotConfig(next);
    setHeartbeat((prev) => ({
      ...prev,
      status: next.enabled && !next.paused ? "running" : next.enabled ? "paused" : "idle",
    }));
  }, []);

  const start = useCallback((override?: BotConfig) => {
    const base = override ?? configRef.current;
    configRef.current = { ...base, enabled: false, paused: false };
    saveBotConfig(configRef.current);
    setConfigState(configRef.current);

    if (!canEnableLiveBot(demoMode, demoRuntimeRef.current)) {
      const remaining = demoRuntimeRemainingMs(demoRuntimeRef.current);
      const hours = Math.ceil(remaining / (60 * 60 * 1000));
      setHeartbeat((prev) => ({
        ...prev,
        status: "blocked",
        blockReason: `Live auto-trade locked (RSK-05). Run ${hours}h more on demo first.`,
      }));
      return;
    }
    const next = { ...base, enabled: true, paused: false };
    progressionRef.current = next.quickStrategy
      ? initProgressionState(next.stake)
      : null;
    setConfig(next);
    setHeartbeat((prev) => ({ ...prev, status: "running", blockReason: null }));
  }, [demoMode, setConfig]);

  const pause = useCallback(() => {
    setConfig({ ...configRef.current, paused: true });
    setHeartbeat((prev) => ({ ...prev, status: "paused" }));
  }, [setConfig]);

  const stop = useCallback((reason?: string) => {
    setConfig({ ...configRef.current, enabled: false, paused: false });
    cooldownRef.current = 0;
    progressionRef.current = null;
    setHeartbeat((prev) => ({
      ...prev,
      status: "idle",
      blockReason: typeof reason === "string" ? reason : null,
    }));
  }, [setConfig]);

  const handleRound = useCallback(
    (profit: number) => {
      const activeConfig = configRef.current;
      if (!activeConfig.enabled) return;

      if (activeConfig.restartAction === "stop" && profit < 0) {
        stop("Stopped after loss");
        return;
      }

      const params = activeConfig.quickStrategy;
      if (!params) return;

      const current =
        progressionRef.current ?? initProgressionState(activeConfig.stake);
      const next = progressStake(
        current,
        params,
        profit >= 0 ? "win" : "loss",
        profit >= 0 ? activeConfig.stake + profit : 0,
      );
      if (!next) {
        stop("Profit/loss threshold reached");
        return;
      }
      progressionRef.current = next;
      if (next.currentStake !== activeConfig.stake) {
        setConfig({ ...activeConfig, stake: next.currentStake });
      }
    },
    [setConfig, stop],
  );

  const handleTradeRejected = useCallback(() => {
    if (configRef.current.restartOnError) {
      cooldownRef.current = 0;
    }
  }, []);

  const handleTick = useCallback((tick: TickEvent, tickHistory: TickEvent[]) => {
    const activeConfig = configRef.current;
    const gates = gatesRef.current;

    if (
      !activeConfig.enabled ||
      activeConfig.paused ||
      tick.symbol !== gates.symbol
    ) {
      return;
    }
    if (lastProcessedEpochRef.current === tick.epoch) return;
    lastProcessedEpochRef.current = tick.epoch;

    const bumpTick = () =>
      setHeartbeat((prev) => ({
        ...prev,
        lastTickAt: tick.epoch,
        ticksProcessed: prev.ticksProcessed + 1,
      }));

    if (cooldownRef.current > 0) {
      cooldownRef.current -= 1;
      bumpTick();
      return;
    }

    if (
      !gates.isConnected ||
      gates.isTrading ||
      gates.tradingLocked ||
      gates.openContractCount >= activeConfig.maxOpenPositions
    ) {
      bumpTick();
      return;
    }

    const quotes = tickHistory
      .filter((t) => t.symbol === gates.symbol)
      .map((t) => t.quote);

    if (quotes.length < 2) {
      bumpTick();
      return;
    }

    const evaluation = evaluateStrategy(quotes, activeConfig);
    const order = resolveBotOrder(activeConfig, evaluation);

    if (order) {
      cooldownRef.current = activeConfig.cooldownTicks;
      placeTradeRef.current({
        symbol: gates.symbol,
        contractType: order.contractType,
        amount: progressionRef.current?.currentStake ?? activeConfig.stake,
        duration: activeConfig.duration,
        durationUnit: activeConfig.durationUnit ?? "t",
        basis: "stake",
        ...(order.barrier !== undefined ? { barrier: order.barrier } : {}),
        ...(order.lastDigitPrediction !== undefined
          ? { lastDigitPrediction: order.lastDigitPrediction }
          : {}),
      });
    }

    setHeartbeat((prev) => ({
      ...prev,
      lastTickAt: tick.epoch,
      ticksProcessed: prev.ticksProcessed + 1,
      lastSignalLabel: evaluation.label,
      lastSignalAt: order ? Date.now() : prev.lastSignalAt,
      tradesExecuted: order ? prev.tradesExecuted + 1 : prev.tradesExecuted,
    }));
  }, []);

  const liveAllowed = canEnableLiveBot(demoMode, heartbeat.demoRuntimeMs);
  const demoRemainingMs = demoRuntimeRemainingMs(heartbeat.demoRuntimeMs);

  return {
    config,
    setConfig,
    heartbeat,
    hydrated: true,
    handleTick,
    handleRound,
    handleTradeRejected,
    start,
    pause,
    stop,
    liveAllowed,
    demoRemainingMs,
  };
}
