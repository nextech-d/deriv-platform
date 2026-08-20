export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "degraded";

export interface TradeRequest {
  symbol: string;
  contractType: string;
  amount: number;
  duration: number;
  durationUnit: "t" | "s" | "m" | "h" | "d";
  basis?: "stake" | "payout";
  /** Barrier for DIGITOVER/UNDER, ONETOUCH/NOTOUCH, Higher/Lower, etc. */
  barrier?: number | string;
  /** Second barrier for Ends Between/Outside, Stays Between/Goes Outside. */
  barrier2?: number | string;
  /** Digit prediction 0-9 for Matches/Differs. */
  lastDigitPrediction?: number;
  source?: import("@/lib/trading/source").TradeSource;
}

export interface TickEvent {
  symbol: string;
  quote: number;
  epoch: number;
}

export interface OpenContractEvent {
  contractId: number;
  symbol: string;
  buyPrice: number;
  profit?: number;
  isSold: boolean;
  status: string;
  currency: string;
  source?: import("@/lib/trading/source").TradeSource;
}

export interface RecoverySnapshot {
  subscriptions: string[];
  openContractCount: number;
}

export type WorkerCommand =
  | { type: "INIT"; payload: { wsUrl: string; tradingEnabled?: boolean; isPublic?: boolean } }
  | { type: "DISCONNECT" }
  | { type: "SUBSCRIBE_TICKS"; payload: { symbol: string } }
  | { type: "UNSUBSCRIBE_TICKS"; payload: { symbol: string } }
  | { type: "SET_TICK_SUBSCRIPTIONS"; payload: { symbols: string[] } }
  | { type: "REQUEST_BALANCE" }
  | { type: "TRADE_REQUEST"; payload: TradeRequest }
  | { type: "SELL"; payload: { contractId: number; price?: number } }
  | { type: "FORCE_RECONNECT" }
  | {
      type: "REQUEST_CHART_HISTORY";
      payload: { symbol: string; granularity: number };
    }
  | {
      type: "REQUEST_CHART_QUOTES";
      payload: {
        requestId: string;
        symbol: string;
        granularity: number;
        count?: number;
        start?: number;
        end?: number | "latest";
      };
    }
  | {
      type: "SUBSCRIBE_CHART_STREAM";
      payload: { streamId: string; symbol: string; granularity: number };
    }
  | {
      type: "UNSUBSCRIBE_CHART_STREAM";
      payload: { streamId: string };
    };

export interface ChartCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  epoch: number;
}

export interface ChartHistorySnapshot {
  symbol: string;
  granularity: number;
  ticks: TickEvent[];
  candles: ChartCandle[];
}

export type WorkerEvent =
  | { type: "CONNECTION_STATE"; payload: ConnectionState }
  | { type: "TICK"; payload: TickEvent }
  | { type: "BALANCE"; payload: { balance: number; currency: string } }
  | { type: "CONTRACT_UPDATE"; payload: OpenContractEvent }
  | { type: "CONTRACT_CLOSED"; payload: { contractId: number; profit: number } }
  | { type: "TRADE_REJECTED"; payload: { reason: string } }
  | { type: "TRADE_EXECUTING"; payload: { direction: string; symbol: string } }
  | { type: "INTENT_PENDING"; payload: { intentId: string; symbol: string; amount: number } }
  | { type: "ERROR"; payload: { code: string; message: string } }
  | { type: "RECOVERY_COMPLETE"; payload: RecoverySnapshot }
  | { type: "PONG"; payload: { reqId: number; epoch?: number } }
  | { type: "CHART_HISTORY"; payload: ChartHistorySnapshot }
  | {
      type: "CHART_QUOTES";
      payload: {
        requestId: string;
        symbol: string;
        granularity: number;
        prices?: number[];
        times?: number[];
        candles?: ChartCandle[];
        error?: string;
      };
    }
  | {
      type: "CHART_STREAM_QUOTE";
      payload: {
        streamId: string;
        symbol: string;
        granularity: number;
        epoch: number;
        quote: number;
        open?: number;
        high?: number;
        low?: number;
        close?: number;
      };
    };

export interface DerivWsMessage {
  msg_type?: string;
  req_id?: number;
  ping?: string | number;
  echo_req?: {
    req_id?: number;
    ping?: number;
    ticks?: string;
    subscribe?: number;
    ticks_history?: string;
  };
  error?: { code?: string; message?: string };
  tick?: { symbol?: string; quote?: number; ask?: number; bid?: number; epoch?: number };
  ohlc?: {
    symbol?: string;
    epoch?: number | string;
    open?: number | string;
    high?: number | string;
    low?: number | string;
    close?: number | string;
  };
  subscription?: { id?: string };
  balance?: { balance?: number; currency?: string };
  proposal?: { id?: string; ask_price?: number; payout?: number };
  buy?: { contract_id?: number; buy_price?: number; balance_after?: number };
  proposal_open_contract?: Record<string, unknown>;
  history?: { prices?: Array<number | string>; times?: Array<number | string> };
  candles?: Array<{
    epoch?: number | string;
    open?: number | string;
    high?: number | string;
    low?: number | string;
    close?: number | string;
  }>;
  [key: string]: unknown;
}
