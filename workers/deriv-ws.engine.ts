/// <reference lib="webworker" />

import { ConnectionFsm, WS_TIMING } from "../lib/ws/connection-fsm";
import { RequestRegistry } from "../lib/ws/request-registry";
import type {
  ChartHistorySnapshot,
  ConnectionState,
  DerivWsMessage,
  OpenContractEvent,
  TradeRequest,
  WorkerCommand,
  WorkerEvent,
} from "../lib/ws/protocol";

const fsm = new ConnectionFsm();
const registry = new RequestRegistry();

let socket: WebSocket | null = null;
let wsUrl: string | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let pingWatchdog: ReturnType<typeof setTimeout> | null = null;
let lastPongAt = 0;

let tradingEnabled = false;
let isPublicConnection = false;
let tradeInFlight = false;

const tickSubscriptions = new Set<string>();
/** Symbols confirmed live on the current WebSocket session. */
const liveTickSubscriptions = new Set<string>();
const openContracts = new Map<number, OpenContractEvent>();

function emit(event: WorkerEvent): void {
  self.postMessage(event);
}

function emitState(state: ConnectionState): void {
  emit({ type: "CONNECTION_STATE", payload: state });
}

function clearPingTimers(): void {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
  if (pingWatchdog) {
    clearTimeout(pingWatchdog);
    pingWatchdog = null;
  }
}

function armPingWatchdog(): void {
  if (pingWatchdog) clearTimeout(pingWatchdog);
  pingWatchdog = setTimeout(() => {
    if (Date.now() - lastPongAt > WS_TIMING.pingIntervalMs + WS_TIMING.pingTimeoutMs) {
      forceReconnect("ping timeout");
    }
  }, WS_TIMING.pingIntervalMs + WS_TIMING.pingTimeoutMs);
}

function sendRaw(payload: Record<string, unknown>): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    throw new Error("WebSocket is not connected");
  }
  socket.send(JSON.stringify(payload));
}

function sendWithReqId(
  payload: Record<string, unknown>,
  method: string,
  timeoutMs: number = WS_TIMING.defaultRequestTimeoutMs,
): Promise<unknown> {
  const reqId = registry.createId();
  sendRaw({ ...payload, req_id: reqId });
  return registry.register(reqId, method, timeoutMs);
}

function startPingLoop(): void {
  clearPingTimers();
  lastPongAt = Date.now();

  pingTimer = setInterval(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const reqId = registry.createId();
    try {
      sendRaw({ ping: 1, req_id: reqId });
      registry
        .register(reqId, "ping", WS_TIMING.pingTimeoutMs)
        .then(() => {
          lastPongAt = Date.now();
          emit({ type: "PONG", payload: { reqId } });
        })
        .catch(() => {
          forceReconnect("ping failed");
        });
      armPingWatchdog();
    } catch {
      forceReconnect("ping send failed");
    }
  }, WS_TIMING.pingIntervalMs);
}

function parseOpenContract(raw: Record<string, unknown>): OpenContractEvent | null {
  const contractId = Number(raw.contract_id);
  if (!Number.isFinite(contractId)) return null;

  return {
    contractId,
    symbol: String(raw.symbol ?? raw.underlying ?? ""),
    buyPrice: Number(raw.buy_price ?? 0),
    profit: raw.profit !== undefined ? Number(raw.profit) : undefined,
    isSold: Boolean(raw.is_sold),
    status: String(raw.status ?? "open"),
    currency: String(raw.currency ?? "USD"),
  };
}

function tickQuote(tick: NonNullable<DerivWsMessage["tick"]>): number {
  if (tick.quote !== undefined) return tick.quote;
  if (tick.ask !== undefined && tick.bid !== undefined) {
    return (tick.ask + tick.bid) / 2;
  }
  return tick.ask ?? tick.bid ?? 0;
}

function handleMessage(event: MessageEvent<string>): void {
  let message: DerivWsMessage;
  try {
    message = JSON.parse(event.data) as DerivWsMessage;
  } catch {
    return;
  }

  if (message.error) {
    const code = message.error.code ?? "unknown";
    if (code === "AlreadySubscribed") {
      const symbol = String(message.echo_req?.ticks ?? "");
      if (symbol) liveTickSubscriptions.add(symbol);
      return;
    }
    if (!message.echo_req?.ticks_history) {
      emit({
        type: "ERROR",
        payload: {
          code,
          message: message.error.message ?? "Unknown WebSocket error",
        },
      });
    }
  }

  const reqId = message.req_id ?? message.echo_req?.req_id;
  if (typeof reqId === "number") {
    registry.resolve(reqId, message);
  }

  if (message.msg_type === "ping" || message.ping === "pong") {
    lastPongAt = Date.now();
    return;
  }

  if (
    message.msg_type === "tick" ||
    (message.tick &&
      (message.tick.quote !== undefined ||
        message.tick.ask !== undefined ||
        message.tick.bid !== undefined))
  ) {
    const tick = message.tick!;
    const symbol = tick.symbol ?? String(message.echo_req?.ticks ?? "");
    if (symbol) liveTickSubscriptions.add(symbol);
    emit({
      type: "TICK",
      payload: {
        symbol,
        quote: tickQuote(tick),
        epoch: tick.epoch ?? Date.now(),
      },
    });
  }

  if (message.balance?.balance !== undefined) {
    emit({
      type: "BALANCE",
      payload: {
        balance: message.balance.balance,
        currency: message.balance.currency ?? "USD",
      },
    });
  }

  if (message.buy?.contract_id) {
    const contractId = message.buy.contract_id;
    sendRaw({
      proposal_open_contract: 1,
      contract_id: contractId,
      subscribe: 1,
    });
  }

  if (message.proposal_open_contract) {
    const contract = parseOpenContract(message.proposal_open_contract);
    if (contract) {
      if (contract.isSold || contract.status === "sold") {
        openContracts.delete(contract.contractId);
        emit({ type: "CONTRACT_UPDATE", payload: contract });
        emit({
          type: "CONTRACT_CLOSED",
          payload: { contractId: contract.contractId, profit: contract.profit ?? 0 },
        });
      } else {
        openContracts.set(contract.contractId, contract);
        emit({ type: "CONTRACT_UPDATE", payload: contract });
      }
    }
  }
}

async function executeTrade(request: TradeRequest): Promise<void> {
  if (!tradingEnabled) {
    emit({
      type: "TRADE_REJECTED",
      payload: {
        reason:
          "Trading requires an authenticated connection. Enable OAuth or use demo simulation.",
      },
    });
    return;
  }

  if (tradeInFlight) {
    emit({
      type: "TRADE_REJECTED",
      payload: { reason: "A trade is already in progress" },
    });
    return;
  }

  if (socket?.readyState !== WebSocket.OPEN) {
    emit({
      type: "TRADE_REJECTED",
      payload: { reason: "Not connected to market" },
    });
    return;
  }

  tradeInFlight = true;
  emit({
    type: "TRADE_EXECUTING",
    payload: { direction: request.contractType, symbol: request.symbol },
  });

  try {
    const proposalMsg = (await sendWithReqId(
      {
        proposal: 1,
        amount: request.amount,
        basis: request.basis ?? "stake",
        contract_type: request.contractType,
        currency: "USD",
        duration: request.duration,
        duration_unit: request.durationUnit,
        symbol: request.symbol,
        ...(() => {
          const tickPick =
            request.contractType === "TICKHIGH" || request.contractType === "TICKLOW";
          const barrier =
            request.barrier !== undefined && request.barrier !== null
              ? String(request.barrier)
              : !tickPick && request.lastDigitPrediction !== undefined
                ? String(request.lastDigitPrediction)
                : undefined;
          return {
            ...(barrier !== undefined ? { barrier } : {}),
            ...(request.barrier2 !== undefined && request.barrier2 !== null
              ? { barrier2: String(request.barrier2) }
              : {}),
            ...(tickPick && request.lastDigitPrediction !== undefined
              ? { selected_tick: request.lastDigitPrediction }
              : {}),
          };
        })(),
      },
      "proposal",
    )) as DerivWsMessage;

    if (proposalMsg.error) {
      throw new Error(proposalMsg.error.message ?? "Proposal failed");
    }

    const proposalId = proposalMsg.proposal?.id;
    const price = proposalMsg.proposal?.ask_price;
    if (!proposalId || price === undefined) {
      throw new Error("Invalid proposal response");
    }

    emit({
      type: "INTENT_PENDING",
      payload: {
        intentId: crypto.randomUUID(),
        symbol: request.symbol,
        amount: request.amount,
      },
    });

    const buyMsg = (await sendWithReqId(
      { buy: proposalId, price },
      "buy",
    )) as DerivWsMessage;

    if (buyMsg.error) {
      throw new Error(buyMsg.error.message ?? "Buy failed");
    }

    if (buyMsg.buy?.contract_id) {
      sendRaw({
        proposal_open_contract: 1,
        contract_id: buyMsg.buy.contract_id,
        subscribe: 1,
      });
    }
  } catch (err) {
    emit({
      type: "TRADE_REJECTED",
      payload: {
        reason: err instanceof Error ? err.message : "Trade failed",
      },
    });
  } finally {
    tradeInFlight = false;
  }
}

async function sellContract(contractId: number, price = 0): Promise<void> {
  if (!tradingEnabled) {
    emit({
      type: "TRADE_REJECTED",
      payload: { reason: "Sell requires an authenticated connection" },
    });
    return;
  }

  if (socket?.readyState !== WebSocket.OPEN) {
    emit({
      type: "TRADE_REJECTED",
      payload: { reason: "Not connected" },
    });
    return;
  }

  try {
    await sendWithReqId({ sell: contractId, price }, "sell");
  } catch (err) {
    emit({
      type: "TRADE_REJECTED",
      payload: {
        reason: err instanceof Error ? err.message : "Sell failed",
      },
    });
  }
}

function sendTickSubscribe(symbol: string): void {
  if (liveTickSubscriptions.has(symbol)) return;
  sendRaw({ ticks: symbol, subscribe: 1 });
}

function subscribeTicks(symbol: string): void {
  tickSubscriptions.add(symbol);
  if (socket?.readyState === WebSocket.OPEN) {
    sendTickSubscribe(symbol);
  }
}

function unsubscribeTicks(symbol: string): void {
  tickSubscriptions.delete(symbol);
  liveTickSubscriptions.delete(symbol);
  if (socket?.readyState === WebSocket.OPEN) {
    sendRaw({ forget_all: "ticks" });
    liveTickSubscriptions.clear();
    for (const sym of tickSubscriptions) {
      sendTickSubscribe(sym);
    }
  }
}

function setTickSubscriptions(symbols: string[]): void {
  tickSubscriptions.clear();
  for (const symbol of symbols) {
    if (symbol) tickSubscriptions.add(symbol);
  }
  if (socket?.readyState === WebSocket.OPEN) {
    sendRaw({ forget_all: "ticks" });
    liveTickSubscriptions.clear();
    for (const sym of tickSubscriptions) {
      sendTickSubscribe(sym);
    }
  }
}

async function runRecoverySequence(): Promise<void> {
  emitState("degraded");
  liveTickSubscriptions.clear();

  for (const symbol of tickSubscriptions) {
    sendTickSubscribe(symbol);
  }

  if (!isPublicConnection) {
    try {
      await sendWithReqId({ balance: 1, subscribe: 1 }, "balance");
    } catch {
      // balance unavailable on some connections
    }
  }

  emit({
    type: "RECOVERY_COMPLETE",
    payload: {
      subscriptions: [...tickSubscriptions],
      openContractCount: openContracts.size,
    },
  });

  emitState("connected");
}

function connect(url: string): void {
  wsUrl = url;
  fsm.clearReconnectTimer();
  emitState("connecting");

  if (socket) {
    socket.onopen = null;
    socket.onclose = null;
    socket.onerror = null;
    socket.onmessage = null;
    socket.close();
    socket = null;
  }

  registry.rejectAll("connection reset");
  clearPingTimers();
  liveTickSubscriptions.clear();

  socket = new WebSocket(url);

  socket.onopen = () => {
    fsm.transition("connected");
    emitState("connected");
    startPingLoop();
    void runRecoverySequence();
  };

  socket.onmessage = handleMessage;

  socket.onerror = () => {
    emit({
      type: "ERROR",
      payload: { code: "ws_error", message: "WebSocket error" },
    });
  };

  socket.onclose = () => {
    clearPingTimers();
    registry.rejectAll("connection closed");

    if (fsm.getState() === "disconnected") {
      emitState("disconnected");
      return;
    }

    requestReconnectFromMain();
  };
}

function requestReconnectFromMain(): void {
  emitState("reconnecting");
  fsm.scheduleReconnect(() => {
    self.postMessage({ type: "NEED_OTP_REFRESH" });
  });
}

function forceReconnect(reason: string): void {
  emit({
    type: "ERROR",
    payload: { code: "reconnect", message: reason },
  });
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.close();
  } else if (wsUrl) {
    requestReconnectFromMain();
  }
}

async function requestChartHistory(symbol: string, granularity: number): Promise<void> {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    emit({
      type: "ERROR",
      payload: { code: "chart", message: "Not connected to Deriv" },
    });
    return;
  }

  const ticksStyle = granularity <= 0;
  try {
    const message = (await sendWithReqId(
      {
        ticks_history: symbol,
        end: "latest",
        count: ticksStyle ? 2000 : 300,
        style: ticksStyle ? "ticks" : "candles",
        adjust_start_time: 1,
        ...(ticksStyle ? {} : { granularity }),
      },
      "ticks_history",
      20_000,
    )) as DerivWsMessage;

    if (message.error) {
      throw new Error(message.error.message ?? "ticks_history failed");
    }

    const payload: ChartHistorySnapshot = ticksStyle
      ? {
          symbol,
          granularity: 0,
          ticks: (message.history?.prices ?? []).flatMap((price, index) => {
            const quote = Number(price);
            const epoch = Number(message.history?.times?.[index] ?? 0);
            if (!Number.isFinite(quote) || !Number.isFinite(epoch) || epoch <= 0) {
              return [];
            }
            return [{ symbol, quote, epoch }];
          }),
          candles: [],
        }
      : {
          symbol,
          granularity,
          ticks: [],
          candles: (message.candles ?? []).flatMap((candle) => {
            const open = Number(candle.open);
            const high = Number(candle.high);
            const low = Number(candle.low);
            const close = Number(candle.close);
            const epoch = Number(candle.epoch);
            if (![open, high, low, close, epoch].every(Number.isFinite) || epoch <= 0) {
              return [];
            }
            return [{ open, high, low, close, epoch }];
          }),
        };

    emit({ type: "CHART_HISTORY", payload });
  } catch (err) {
    emit({
      type: "ERROR",
      payload: {
        code: "chart",
        message: err instanceof Error ? err.message : "Chart history failed",
      },
    });
  }
}

function disconnect(): void {
  fsm.reset();
  registry.clear();
  clearPingTimers();
  tickSubscriptions.clear();
  liveTickSubscriptions.clear();
  openContracts.clear();
  tradeInFlight = false;
  tradingEnabled = false;
  isPublicConnection = false;

  if (socket) {
    socket.onclose = null;
    socket.close();
    socket = null;
  }

  wsUrl = null;
  emitState("disconnected");
}

self.onmessage = (event: MessageEvent<WorkerCommand | { type: "NEED_OTP_REFRESH" }>) => {
  const command = event.data;

  if (command.type === "INIT") {
    tradingEnabled = command.payload.tradingEnabled ?? false;
    isPublicConnection = command.payload.isPublic ?? false;
    connect(command.payload.wsUrl);
    return;
  }

  if (command.type === "DISCONNECT") {
    disconnect();
    return;
  }

  if (command.type === "SUBSCRIBE_TICKS") {
    subscribeTicks(command.payload.symbol);
    return;
  }

  if (command.type === "UNSUBSCRIBE_TICKS") {
    unsubscribeTicks(command.payload.symbol);
    return;
  }

  if (command.type === "SET_TICK_SUBSCRIPTIONS") {
    setTickSubscriptions(command.payload.symbols);
    return;
  }

  if (command.type === "REQUEST_BALANCE") {
    if (socket?.readyState === WebSocket.OPEN) {
      void sendWithReqId({ balance: 1 }, "balance").catch((err: Error) => {
        emit({ type: "ERROR", payload: { code: "balance", message: err.message } });
      });
    }
    return;
  }

  if (command.type === "TRADE_REQUEST") {
    void executeTrade(command.payload);
    return;
  }

  if (command.type === "SELL") {
    void sellContract(command.payload.contractId, command.payload.price ?? 0);
    return;
  }

  if (command.type === "FORCE_RECONNECT") {
    forceReconnect("manual reconnect");
    return;
  }

  if (command.type === "REQUEST_CHART_HISTORY") {
    void requestChartHistory(command.payload.symbol, command.payload.granularity);
  }
};

export {};
