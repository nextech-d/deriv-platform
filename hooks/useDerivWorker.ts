"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEMO_BALANCE,
  getPublicWsUrl,
  isDemoMode,
  PUBLIC_WS_URL,
} from "@/lib/config/demo";
import { derivConfig } from "@/lib/config/deriv";
import {
  failStalePendingIntents,
  hydrateTradingState,
  persistConnectionState,
  persistContractUpdate,
  persistPendingIntent,
  persistTickSubscription,
  resolvePendingIntent,
} from "@/lib/state/persistence";
import { getPendingIntents } from "@/lib/state/db";
import {
  loadPersistedMetrics,
  WsMetricsTracker,
  type WsMetricsSnapshot,
} from "@/lib/metrics/ws-metrics";
import { reportClientError } from "@/lib/monitoring/report";
import type { OpenContractRecord, PendingIntentRecord } from "@/lib/state/types";
import type { TradeSource } from "@/lib/trading/source";
import { demoHorizonTicks, isCallLike } from "@/lib/bot/trade-map";
import type {
  ConnectionState,
  OpenContractEvent,
  TickEvent,
  TradeRequest,
  WorkerCommand,
  WorkerEvent,
  ChartHistorySnapshot,
} from "@/lib/ws/protocol";
import {
  applyTickToChartCandles,
  applyTickToHistory,
} from "@/lib/chart/candles";
import { ensureCsrfCookie, withCsrfHeaders } from "@/lib/auth/csrf";
import { fetchWithTimeout } from "@/lib/utils/fetch-with-timeout";

const DEFAULT_SYMBOL = "R_10";
const MAX_TICK_HISTORY = 1560;
const MAX_TICK_HISTORY_PER_SYMBOL = 120;

type WorkerInbound = WorkerEvent | { type: "NEED_OTP_REFRESH" };

export interface DerivWorkerState {
  connectionState: ConnectionState;
  balance: { amount: number; currency: string } | null;
  lastTick: TickEvent | null;
  tickHistory: TickEvent[];
  contracts: OpenContractRecord[];
  pendingIntents: PendingIntentRecord[];
  subscriptions: string[];
  error: string | null;
  tradeNotice: string | null;
  isTrading: boolean;
  isHydrated: boolean;
}

const initialState: DerivWorkerState = {
  connectionState: "disconnected",
  balance: null,
  lastTick: null,
  tickHistory: [],
  contracts: [],
  pendingIntents: [],
  subscriptions: [],
  error: null,
  tradeNotice: null,
  isTrading: false,
  isHydrated: false,
};

interface DemoContractMeta {
  entryQuote: number;
  direction: "CALL" | "PUT";
  stake: number;
  symbol: string;
  ticksSeen: number;
  maxTicks: number;
  intentId?: string;
  source?: TradeSource;
}

interface PendingSourceMark {
  symbol: string;
  amount: number;
  source: TradeSource;
  at: number;
}

function attachTradeSource(
  event: OpenContractEvent,
  marks: PendingSourceMark[],
  explicitSource?: TradeSource,
): OpenContractEvent {
  if (event.source ?? explicitSource) {
    return { ...event, source: event.source ?? explicitSource };
  }

  const markIndex = marks.findIndex(
    (mark) =>
      mark.symbol === event.symbol &&
      Math.abs(mark.amount - event.buyPrice) < 0.02 &&
      Date.now() - mark.at < 15_000,
  );
  if (markIndex < 0) return event;

  const [mark] = marks.splice(markIndex, 1);
  return { ...event, source: mark.source };
}

export interface UseDerivWorkerOptions {
  onContractClosed?: (profit: number, contractId: number) => void;
  onTick?: (tick: TickEvent, history: TickEvent[]) => void;
  onTradeRejected?: (reason: string) => void;
}

async function fetchOtp(accountId?: string): Promise<string> {
  await ensureCsrfCookie();
  const response = await fetchWithTimeout("/api/trading/otp", {
    method: "POST",
    headers: withCsrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ accountId }),
    timeoutMs: 15_000,
  });

  if (!response.ok) {
    const body = (await response.json()) as { error?: string };
    throw new Error(body.error ?? "Failed to obtain WebSocket URL");
  }

  const data = (await response.json()) as { wsUrl: string };
  return data.wsUrl;
}

async function resolveWsUrl(accountId?: string): Promise<string> {
  if (isDemoMode || !accountId) {
    return getPublicWsUrl(derivConfig.appId) || PUBLIC_WS_URL;
  }
  return fetchOtp(accountId);
}

function estimateDemoProfit(meta: DemoContractMeta, quote: number): number {
  const delta =
    meta.direction === "CALL"
      ? quote - meta.entryQuote
      : meta.entryQuote - quote;
  const pct = delta / meta.entryQuote;
  return Math.round(pct * meta.stake * 85 * 100) / 100;
}

export function useDerivWorker(
  activeAccountId?: string,
  options?: UseDerivWorkerOptions,
) {
  const onContractClosedRef = useRef(options?.onContractClosed);
  const onTickRef = useRef(options?.onTick);
  const onTradeRejectedRef = useRef(options?.onTradeRejected);

  useEffect(() => {
    onContractClosedRef.current = options?.onContractClosed;
    onTickRef.current = options?.onTick;
    onTradeRejectedRef.current = options?.onTradeRejected;
  }, [options?.onContractClosed, options?.onTick, options?.onTradeRejected]);

  const workerRef = useRef<Worker | null>(null);
  const subscriptionsRef = useRef<string[]>([]);
  const tickHistoryBySymbolRef = useRef<Record<string, TickEvent[]>>({});
  const demoContractsRef = useRef<Map<number, DemoContractMeta>>(new Map());
  const pendingSourceMarksRef = useRef<PendingSourceMark[]>([]);
  const lastTickRef = useRef<TickEvent | null>(null);
  const metricsTrackerRef = useRef(
    new WsMetricsTracker(typeof window !== "undefined" ? loadPersistedMetrics() : null),
  );
  const prevConnectionRef = useRef<ConnectionState>("disconnected");
  const tradeInFlightRef = useRef(false);
  const tradeQueueRef = useRef<TradeRequest[]>([]);
  const dispatchTradeRef = useRef<(request: TradeRequest) => void>(() => {});
  const [wsMetrics, setWsMetrics] = useState<WsMetricsSnapshot>(() =>
    metricsTrackerRef.current.getSnapshot(),
  );
  const [state, setState] = useState<DerivWorkerState>(initialState);
  const [chartHistory, setChartHistory] = useState<ChartHistorySnapshot | null>(null);
  const [chartHistoryLoading, setChartHistoryLoading] = useState(false);
  const chartKeyRef = useRef("");
  const chartQuotesPendingRef = useRef(
    new Map<
      string,
      {
        resolve: (payload: {
          prices?: number[];
          times?: number[];
          candles?: ChartHistorySnapshot["candles"];
        }) => void;
        reject: (error: Error) => void;
      }
    >(),
  );
  const chartStreamCallbacksRef = useRef(
    new Map<
      string,
      (payload: {
        symbol: string;
        granularity: number;
        epoch: number;
        quote: number;
        open?: number;
        high?: number;
        low?: number;
        close?: number;
      }) => void
    >(),
  );

  const flushTradeQueue = useCallback(() => {
    if (tradeInFlightRef.current) return;
    const next = tradeQueueRef.current.shift();
    if (next) dispatchTradeRef.current(next);
  }, []);

  const releaseTradeLock = useCallback(() => {
    tradeInFlightRef.current = false;
    flushTradeQueue();
  }, [flushTradeQueue]);

  useEffect(() => {
    if (!state.isTrading) {
      releaseTradeLock();
    }
  }, [state.isTrading, releaseTradeLock]);

  const sendCommand = useCallback((command: WorkerCommand) => {
    workerRef.current?.postMessage(command);
  }, []);

  const connect = useCallback(async () => {
    try {
      const wsUrl = await resolveWsUrl(activeAccountId);
      sendCommand({
        type: "INIT",
        payload: {
          wsUrl,
          tradingEnabled: !isDemoMode && Boolean(activeAccountId),
          isPublic: isDemoMode || !activeAccountId,
        },
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Connection failed",
        connectionState: "disconnected",
      }));
    }
  }, [activeAccountId, sendCommand]);

  const finalizeDemoClose = useCallback(
    async (contractId: number, profit: number, intentId?: string) => {
      const meta = demoContractsRef.current.get(contractId);
      demoContractsRef.current.delete(contractId);

      const event: OpenContractEvent = attachTradeSource(
        {
          contractId,
          symbol: meta?.symbol ?? "",
          buyPrice: meta?.stake ?? 0,
          profit,
          isSold: true,
          status: "sold",
          currency: "USD",
        },
        pendingSourceMarksRef.current,
        meta?.source,
      );

      const contracts = await persistContractUpdate(event);
      let pendingIntents = state.pendingIntents;
      if (intentId) {
        pendingIntents = await resolvePendingIntent(intentId, "filled");
      }

      setState((prev) => ({
        ...prev,
        contracts,
        pendingIntents,
        balance: prev.balance
          ? {
              ...prev.balance,
              amount: prev.balance.amount + event.buyPrice + profit,
            }
          : DEMO_BALANCE,
      }));

      onContractClosedRef.current?.(profit, contractId);
    },
    [state.pendingIntents],
  );

  const closeDemoContract = useCallback(
    async (contractId: number) => {
      const meta = demoContractsRef.current.get(contractId);
      if (!meta) return;

      const quote = lastTickRef.current?.quote ?? meta.entryQuote;
      const profit = estimateDemoProfit(meta, quote);
      await finalizeDemoClose(contractId, profit, meta.intentId);
    },
    [finalizeDemoClose],
  );

  const pushTick = useCallback(
    (tick: TickEvent) => {
      lastTickRef.current = tick;
      const symbolHistory = [
        ...(tickHistoryBySymbolRef.current[tick.symbol] ?? []),
        tick,
      ].slice(-MAX_TICK_HISTORY_PER_SYMBOL);
      tickHistoryBySymbolRef.current[tick.symbol] = symbolHistory;

      setState((prev) => {
        const history = [...prev.tickHistory, tick].slice(-MAX_TICK_HISTORY);
        onTickRef.current?.(tick, symbolHistory);
        return { ...prev, lastTick: tick, tickHistory: history };
      });

      setChartHistory((prev) => {
        if (!prev || prev.symbol !== tick.symbol) return prev;
        if (prev.granularity <= 0) {
          return { ...prev, ticks: applyTickToHistory(prev.ticks, tick) };
        }
        return {
          ...prev,
          candles: applyTickToChartCandles(prev.candles, tick, prev.granularity),
        };
      });

      if (!isDemoMode || demoContractsRef.current.size === 0) return;

      void (async () => {
        const toClose: Array<{ contractId: number; profit: number; intentId?: string }> = [];

        for (const [contractId, meta] of demoContractsRef.current) {
          if (meta.symbol !== tick.symbol) continue;

          meta.ticksSeen += 1;
          const profit = estimateDemoProfit(meta, tick.quote);

          const event: OpenContractEvent = attachTradeSource(
            {
              contractId,
              symbol: meta.symbol,
              buyPrice: meta.stake,
              profit,
              isSold: false,
              status: "open",
              currency: "USD",
            },
            pendingSourceMarksRef.current,
            meta.source,
          );
          const contracts = await persistContractUpdate(event);
          setState((prev) => ({ ...prev, contracts }));

          if (meta.ticksSeen >= meta.maxTicks) {
            toClose.push({ contractId, profit, intentId: meta.intentId });
          }
        }

        for (const item of toClose) {
          await finalizeDemoClose(item.contractId, item.profit, item.intentId);
        }
      })();
    },
    [finalizeDemoClose],
  );

  const simulateDemoTrade = useCallback(
    async (request: TradeRequest, entryQuote: number) => {
      setState((prev) => ({ ...prev, isTrading: true, tradeNotice: null }));

      const intentId = crypto.randomUUID();
      const direction = isCallLike(request.contractType) ? "CALL" : "PUT";
      await persistPendingIntent({
        id: intentId,
        symbol: request.symbol,
        contractType: request.contractType,
        amount: request.amount,
        status: "pending",
      });

      await new Promise((r) => setTimeout(r, 400));
      await resolvePendingIntent(intentId, "sent");

      const contractId = Date.now();

      demoContractsRef.current.set(contractId, {
        entryQuote,
        direction,
        stake: request.amount,
        symbol: request.symbol,
        ticksSeen: 0,
        maxTicks: demoHorizonTicks(request.duration, request.durationUnit),
        intentId,
        source: request.source,
      });

      const event: OpenContractEvent = attachTradeSource(
        {
          contractId,
          symbol: request.symbol,
          buyPrice: request.amount,
          profit: 0,
          isSold: false,
          status: "open",
          currency: "USD",
        },
        pendingSourceMarksRef.current,
        request.source,
      );

      const contracts = await persistContractUpdate(event);
      const filledIntents = await resolvePendingIntent(intentId, "filled");

      setState((prev) => ({
        ...prev,
        contracts,
        pendingIntents: filledIntents,
        isTrading: false,
        tradeNotice: `Demo ${direction === "CALL" ? "Rise" : "Fall"} opened · $${request.amount}`,
        balance: prev.balance
          ? {
              ...prev.balance,
              amount: Math.max(0, prev.balance.amount - request.amount),
            }
          : DEMO_BALANCE,
      }));
    },
    [],
  );

  const dispatchTrade = useCallback(
    (request: TradeRequest) => {
      tradeInFlightRef.current = true;
      setState((prev) => ({ ...prev, tradeNotice: null }));

      if (request.source) {
        pendingSourceMarksRef.current.push({
          symbol: request.symbol,
          amount: request.amount,
          source: request.source,
          at: Date.now(),
        });
      }

      if (isDemoMode) {
        const quote = lastTickRef.current?.quote;
        if (!quote) {
          releaseTradeLock();
          setState((prev) => ({
            ...prev,
            tradeNotice: "Wait for live ticks before trading",
          }));
          return;
        }
        void simulateDemoTrade(request, quote).finally(releaseTradeLock);
        return;
      }

      sendCommand({ type: "TRADE_REQUEST", payload: request });
    },
    [releaseTradeLock, sendCommand, simulateDemoTrade],
  );
  dispatchTradeRef.current = dispatchTrade;

  const placeTrade = useCallback(
    (request: TradeRequest) => {
      if (tradeInFlightRef.current) {
        setState((prev) => ({
          ...prev,
          tradeNotice: "Trade already in progress — wait for confirmation",
        }));
        return;
      }
      dispatchTrade(request);
    },
    [dispatchTrade],
  );

  const placeTradeSequence = useCallback(
    (requests: TradeRequest[]) => {
      const pending = requests.filter((request) => request.amount > 0);
      if (pending.length === 0) return;
      const [head, ...tail] = pending;
      if (!head) return;
      if (tradeInFlightRef.current) {
        tradeQueueRef.current.push(...pending);
        return;
      }
      tradeQueueRef.current.push(...tail);
      dispatchTrade(head);
    },
    [dispatchTrade],
  );

  const closeContract = useCallback(
    (contractId: number) => {
      if (isDemoMode) {
        void closeDemoContract(contractId);
        return;
      }
      sendCommand({ type: "SELL", payload: { contractId } });
    },
    [closeDemoContract, sendCommand],
  );

  const subscribeTicks = useCallback(
    (symbol: string) => {
      subscriptionsRef.current = [...new Set([...subscriptionsRef.current, symbol])];
      void persistTickSubscription(symbol);
      sendCommand({ type: "SUBSCRIBE_TICKS", payload: { symbol } });
      setState((prev) => ({
        ...prev,
        subscriptions: subscriptionsRef.current,
      }));
    },
    [sendCommand],
  );

  const syncTickSubscriptions = useCallback(
    (symbols: string[]) => {
      const next = [...new Set(symbols.filter(Boolean))].sort();
      const prev = [...subscriptionsRef.current].sort();
      if (
        next.length === prev.length &&
        next.every((symbol, index) => symbol === prev[index])
      ) {
        return;
      }

      subscriptionsRef.current = next;
      for (const symbol of next) {
        void persistTickSubscription(symbol);
      }
      sendCommand({ type: "SET_TICK_SUBSCRIPTIONS", payload: { symbols: next } });
      setState((prev) => ({
        ...prev,
        subscriptions: next,
      }));
      void persistConnectionState(prevConnectionRef.current, next);
    },
    [sendCommand],
  );

  useEffect(() => {
    const hydrateTimeout = window.setTimeout(() => {
      setState((prev) =>
        prev.isHydrated ? prev : { ...prev, isHydrated: true },
      );
    }, 5_000);

    void hydrateTradingState()
      .then(({ contracts, subscriptions, pendingIntents }) => {
        subscriptionsRef.current =
          subscriptions.length > 0 ? subscriptions : [DEFAULT_SYMBOL];
        setState((prev) => ({
          ...prev,
          contracts,
          pendingIntents,
          subscriptions: subscriptionsRef.current,
          balance: isDemoMode ? DEMO_BALANCE : prev.balance,
          isHydrated: true,
        }));
      })
      .catch(() => {
        setState((prev) => ({ ...prev, isHydrated: true }));
      })
      .finally(() => {
        window.clearTimeout(hydrateTimeout);
      });

    return () => window.clearTimeout(hydrateTimeout);
  }, []);

  useEffect(() => {
    if (!state.isHydrated) return;

    const worker = new Worker(
      new URL("../workers/deriv-ws.engine.ts", import.meta.url),
    );
    workerRef.current = worker;

    setState((prev) => ({
      ...prev,
      connectionState: "connecting",
      error: null,
      balance: isDemoMode ? DEMO_BALANCE : null,
    }));

    worker.onmessage = (event: MessageEvent<WorkerInbound>) => {
      const message = event.data;

      if (message.type === "NEED_OTP_REFRESH") {
        void connect();
        return;
      }

      switch (message.type) {
        case "CONNECTION_STATE": {
          const prev = prevConnectionRef.current;
          prevConnectionRef.current = message.payload;
          const snapshot = metricsTrackerRef.current.onConnectionState(
            message.payload,
            prev,
          );
          setWsMetrics(snapshot);
          void persistConnectionState(message.payload, subscriptionsRef.current);
          setState((prevState) => ({
            ...prevState,
            connectionState: message.payload,
            error: message.payload === "connected" ? null : prevState.error,
          }));
          if (message.payload === "connected") {
            for (const sym of subscriptionsRef.current) {
              worker.postMessage({
                type: "SUBSCRIBE_TICKS",
                payload: { symbol: sym },
              } satisfies WorkerCommand);
            }
            if (isDemoMode) {
              setState((prevState) => ({ ...prevState, balance: DEMO_BALANCE }));
            } else {
              worker.postMessage({ type: "REQUEST_BALANCE" } satisfies WorkerCommand);
            }
          }
          break;
        }

        case "TICK":
          pushTick(message.payload);
          break;

        case "CHART_HISTORY": {
          const key = `${message.payload.symbol}:${message.payload.granularity}`;
          if (key !== chartKeyRef.current) break;
          setChartHistory(message.payload);
          setChartHistoryLoading(false);
          break;
        }

        case "CHART_QUOTES": {
          const pending = chartQuotesPendingRef.current.get(message.payload.requestId);
          if (!pending) break;
          chartQuotesPendingRef.current.delete(message.payload.requestId);
          if (message.payload.error) {
            pending.reject(new Error(message.payload.error));
            break;
          }
          pending.resolve({
            prices: message.payload.prices,
            times: message.payload.times,
            candles: message.payload.candles,
          });
          break;
        }

        case "CHART_STREAM_QUOTE": {
          const callback = chartStreamCallbacksRef.current.get(message.payload.streamId);
          callback?.(message.payload);
          break;
        }

        case "BALANCE":
          if (!isDemoMode) {
            setState((prev) => ({
              ...prev,
              balance: {
                amount: message.payload.balance,
                currency: message.payload.currency,
              },
            }));
          }
          break;

        case "INTENT_PENDING":
          void persistPendingIntent({
            id: message.payload.intentId,
            symbol: message.payload.symbol,
            contractType: "TRADE",
            amount: message.payload.amount,
            status: "pending",
          }).then((pendingIntents) => {
            setState((prev) => ({ ...prev, pendingIntents }));
          });
          break;

        case "CONTRACT_UPDATE":
          setState((prev) => ({ ...prev, isTrading: false }));
          void persistContractUpdate(
            attachTradeSource(message.payload, pendingSourceMarksRef.current),
          ).then((contracts) => {
            setState((prev) => ({ ...prev, contracts }));
          });
          break;

        case "CONTRACT_CLOSED":
          setState((prev) => ({ ...prev, isTrading: false }));
          onContractClosedRef.current?.(
            message.payload.profit,
            message.payload.contractId,
          );
          break;

        case "TRADE_EXECUTING":
          setState((prev) => ({ ...prev, isTrading: true, tradeNotice: null }));
          break;

        case "TRADE_REJECTED":
          releaseTradeLock();
          onTradeRejectedRef.current?.(message.payload.reason);
          void failStalePendingIntents(message.payload.reason).then(async () => {
            const pendingIntents = await getPendingIntents();
            setState((prev) => ({
              ...prev,
              isTrading: false,
              tradeNotice: message.payload.reason,
              pendingIntents,
            }));
          });
          break;

        case "ERROR": {
          const code = message.payload.code;
          if (code === "chart") {
            setChartHistoryLoading(false);
            break;
          }
          if (code === "AlreadySubscribed" || code === "reconnect") {
            if (code === "reconnect") {
              const snapshot = metricsTrackerRef.current.onError(
                message.payload.message,
              );
              setWsMetrics(snapshot);
            }
            break;
          }
          const snapshot = metricsTrackerRef.current.onError(message.payload.message);
          setWsMetrics(snapshot);
          void reportClientError(new Error(message.payload.message), {
            code: message.payload.code,
            source: "ws-worker",
          });
          setState((prev) => ({
            ...prev,
            error: message.payload.message,
            isTrading: false,
          }));
          break;
        }

        case "RECOVERY_COMPLETE":
          setState((prev) => ({
            ...prev,
            subscriptions: message.payload.subscriptions,
            isTrading: false,
          }));
          break;

        default:
          break;
      }
    };

    void connect();

    return () => {
      worker.postMessage({ type: "DISCONNECT" } satisfies WorkerCommand);
      worker.terminate();
      workerRef.current = null;
    };
  }, [activeAccountId, state.isHydrated, connect, pushTick, releaseTradeLock]);

  const requestChartHistory = useCallback(
    (symbol: string, granularity: number) => {
      chartKeyRef.current = `${symbol}:${granularity}`;
      setChartHistoryLoading(true);
      sendCommand({
        type: "REQUEST_CHART_HISTORY",
        payload: { symbol, granularity },
      });
    },
    [sendCommand],
  );

  const fetchChartQuotes = useCallback(
    (params: {
      symbol: string;
      granularity: number;
      count?: number;
      start?: number;
      end?: number | "latest";
    }) =>
      new Promise<{
        prices?: number[];
        times?: number[];
        candles?: ChartHistorySnapshot["candles"];
      }>((resolve, reject) => {
        const requestId = crypto.randomUUID();
        chartQuotesPendingRef.current.set(requestId, { resolve, reject });
        sendCommand({
          type: "REQUEST_CHART_QUOTES",
          payload: { requestId, ...params },
        });
        window.setTimeout(() => {
          if (!chartQuotesPendingRef.current.has(requestId)) return;
          chartQuotesPendingRef.current.delete(requestId);
          reject(new Error("Chart quotes timed out"));
        }, 25_000);
      }),
    [sendCommand],
  );

  const subscribeChartStream = useCallback(
    (
      params: { symbol: string; granularity: number },
      onQuote: (payload: {
        symbol: string;
        granularity: number;
        epoch: number;
        quote: number;
        open?: number;
        high?: number;
        low?: number;
        close?: number;
      }) => void,
    ) => {
      const streamId = crypto.randomUUID();
      chartStreamCallbacksRef.current.set(streamId, onQuote);
      sendCommand({
        type: "SUBSCRIBE_CHART_STREAM",
        payload: { streamId, ...params },
      });
      return () => {
        chartStreamCallbacksRef.current.delete(streamId);
        sendCommand({
          type: "UNSUBSCRIBE_CHART_STREAM",
          payload: { streamId },
        });
      };
    },
    [sendCommand],
  );

  const openContracts = state.contracts.filter((c) => !c.isSold);

  const sessionPnl = state.contracts.reduce(
    (sum, c) => sum + (c.profit ?? 0),
    0,
  );

  return {
    ...state,
    openContracts,
    sessionPnl,
    subscribeTicks,
    syncTickSubscriptions,
    placeTrade,
    placeTradeSequence,
    closeContract,
    reconnect: () => sendCommand({ type: "FORCE_RECONNECT" }),
    requestChartHistory,
    fetchChartQuotes,
    subscribeChartStream,
    chartHistory,
    chartHistoryLoading,
    requestBalance: () => {
      if (isDemoMode) {
        setState((prev) => ({ ...prev, balance: DEMO_BALANCE }));
        return;
      }
      sendCommand({ type: "REQUEST_BALANCE" });
    },
    resetWsMetrics: () => {
      setWsMetrics(metricsTrackerRef.current.reset());
    },
    wsMetrics,
  };
}
