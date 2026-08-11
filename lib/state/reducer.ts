import type { TradeSource } from "@/lib/trading/source";
import type { OpenContractEvent } from "@/lib/ws/protocol";
import type { OpenContractRecord, TradingEvent } from "./types";

export function contractEventToRecord(
  event: OpenContractEvent,
): OpenContractRecord {
  return {
    contractId: event.contractId,
    symbol: event.symbol,
    buyPrice: event.buyPrice,
    profit: event.profit,
    isSold: event.isSold,
    status: event.status,
    currency: event.currency,
    updatedAt: Date.now(),
    source: event.source,
  };
}

export function applyTradingEvent(
  contracts: OpenContractRecord[],
  event: TradingEvent,
): OpenContractRecord[] {
  switch (event.type) {
    case "CONTRACT_OPENED":
    case "CONTRACT_UPDATED": {
      const idx = contracts.findIndex(
        (c) => c.contractId === event.payload.contractId,
      );
      if (idx >= 0) {
        const next = [...contracts];
        next[idx] = {
          ...event.payload,
          source: event.payload.source ?? next[idx].source,
        };
        return next;
      }
      return [...contracts, event.payload];
    }
    case "CONTRACT_CLOSED":
      return contracts.filter((c) => c.contractId !== event.payload.contractId);
    default:
      return contracts;
  }
}
