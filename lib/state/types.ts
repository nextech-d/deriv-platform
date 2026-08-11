export interface OpenContractRecord {
  contractId: number;
  symbol: string;
  buyPrice: number;
  profit?: number;
  isSold: boolean;
  status: string;
  currency: string;
  updatedAt: number;
  /** How the position was opened — manual ticket, copy desk, or trading bot */
  source?: import("@/lib/trading/source").TradeSource;
}

export interface PendingIntentRecord {
  id: string;
  symbol: string;
  contractType: string;
  amount: number;
  proposalId?: string;
  status: "pending" | "sent" | "failed" | "filled";
  createdAt: number;
}

export interface SubscriptionRecord {
  symbol: string;
  streamType: "tick" | "proposal";
  subscriptionId?: string;
}

export interface EventLogRecord {
  id: string;
  ts: number;
  type: string;
  payload: unknown;
}

export interface ConnectionSnapshot {
  state: string;
  lastConnectedAt?: number;
  subscriptions: string[];
}

export interface TradingDbSchema {
  open_contracts: {
    key: number;
    value: OpenContractRecord;
  };
  pending_intents: {
    key: string;
    value: PendingIntentRecord;
  };
  subscriptions: {
    key: string;
    value: SubscriptionRecord;
  };
  event_log: {
    key: string;
    value: EventLogRecord;
  };
  connection_snapshot: {
    key: string;
    value: ConnectionSnapshot;
  };
}

export type TradingEvent =
  | { type: "CONTRACT_OPENED"; payload: OpenContractRecord }
  | { type: "CONTRACT_UPDATED"; payload: OpenContractRecord }
  | { type: "CONTRACT_CLOSED"; payload: { contractId: number } }
  | { type: "INTENT_CREATED"; payload: PendingIntentRecord }
  | { type: "INTENT_FAILED"; payload: { id: string; reason: string } }
  | { type: "CONNECTION_SNAPSHOT"; payload: ConnectionSnapshot };
