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
  | { type: "FORCE_RECONNECT" };

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
  | { type: "PONG"; payload: { reqId: number; epoch?: number } };

export interface DerivWsMessage {
  msg_type?: string;
  req_id?: number;
  ping?: string | number;
  echo_req?: { req_id?: number; ping?: number; ticks?: string; subscribe?: number };
  error?: { code?: string; message?: string };
  tick?: { symbol?: string; quote?: number; ask?: number; bid?: number; epoch?: number };
  balance?: { balance?: number; currency?: string };
  proposal?: { id?: string; ask_price?: number; payout?: number };
  buy?: { contract_id?: number; buy_price?: number; balance_after?: number };
  proposal_open_contract?: Record<string, unknown>;
  [key: string]: unknown;
}
