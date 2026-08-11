"use client";

import {
  appendEventLog,
  getAllOpenContracts,
  getConnectionSnapshot,
  getPendingIntents,
  getSubscriptions,
  removeOpenContract,
  saveConnectionSnapshot,
  upsertOpenContract,
  upsertPendingIntent,
  upsertSubscription,
} from "@/lib/state/db";
import { applyTradingEvent, contractEventToRecord } from "@/lib/state/reducer";
import type {
  ConnectionSnapshot,
  OpenContractRecord,
  PendingIntentRecord,
} from "@/lib/state/types";
import type { ConnectionState, OpenContractEvent } from "@/lib/ws/protocol";

// uuid fallback without extra dep — use crypto.randomUUID
function eventId(): string {
  return crypto.randomUUID();
}

export async function hydrateTradingState(): Promise<{
  contracts: OpenContractRecord[];
  connectionSnapshot?: ConnectionSnapshot;
  subscriptions: string[];
  pendingIntents: PendingIntentRecord[];
}> {
  const [contracts, connectionSnapshot, subscriptions, pendingIntents] =
    await Promise.all([
      getAllOpenContracts(),
      getConnectionSnapshot(),
      getSubscriptions(),
      getPendingIntents(),
    ]);

  return {
    contracts,
    connectionSnapshot,
    subscriptions: subscriptions.map((s) => s.symbol),
    pendingIntents,
  };
}

export async function persistContractUpdate(
  event: OpenContractEvent,
): Promise<OpenContractRecord[]> {
  const existing = (await getAllOpenContracts()).find(
    (contract) => contract.contractId === event.contractId,
  );
  const record = {
    ...contractEventToRecord(event),
    source: event.source ?? existing?.source,
  };

  if (event.isSold || event.status === "sold") {
    await removeOpenContract(event.contractId);
    await appendEventLog({
      id: eventId(),
      ts: Date.now(),
      type: "CONTRACT_CLOSED",
      payload: { contractId: event.contractId },
    });
  } else {
    await upsertOpenContract(record);
    await appendEventLog({
      id: eventId(),
      ts: Date.now(),
      type: "CONTRACT_UPDATED",
      payload: record,
    });
  }

  const contracts = await getAllOpenContracts();
  return contracts;
}

export async function persistPendingIntent(
  record: Omit<PendingIntentRecord, "createdAt"> & { createdAt?: number },
): Promise<PendingIntentRecord[]> {
  const full: PendingIntentRecord = {
    ...record,
    createdAt: record.createdAt ?? Date.now(),
  };
  await upsertPendingIntent(full);
  await appendEventLog({
    id: eventId(),
    ts: Date.now(),
    type: "INTENT_CREATED",
    payload: full,
  });
  return getPendingIntents();
}

export async function resolvePendingIntent(
  id: string,
  status: PendingIntentRecord["status"],
): Promise<PendingIntentRecord[]> {
  const intents = await getPendingIntents();
  const intent = intents.find((i) => i.id === id);
  if (intent) {
    await upsertPendingIntent({ ...intent, status });
  }
  return getPendingIntents();
}

export async function failStalePendingIntents(reason: string): Promise<void> {
  const intents = await getPendingIntents();
  await Promise.all(
    intents
      .filter((i) => i.status === "pending" || i.status === "sent")
      .map((i) =>
        upsertPendingIntent({ ...i, status: "failed" }).then(() =>
          appendEventLog({
            id: eventId(),
            ts: Date.now(),
            type: "INTENT_FAILED",
            payload: { id: i.id, reason },
          }),
        ),
      ),
  );
}

export async function persistConnectionState(
  state: ConnectionState,
  subscriptions: string[],
): Promise<void> {
  const snapshot: ConnectionSnapshot = {
    state,
    subscriptions,
    lastConnectedAt: state === "connected" ? Date.now() : undefined,
  };
  await saveConnectionSnapshot(snapshot);
}

export async function persistTickSubscription(symbol: string): Promise<void> {
  await upsertSubscription({ symbol, streamType: "tick" });
  await appendEventLog({
    id: eventId(),
    ts: Date.now(),
    type: "SUBSCRIBE_TICKS",
    payload: { symbol },
  });
}

export function mergeContractLists(
  cached: OpenContractRecord[],
  incoming: OpenContractRecord,
): OpenContractRecord[] {
  return applyTradingEvent(cached, {
    type: "CONTRACT_UPDATED",
    payload: incoming,
  });
}
