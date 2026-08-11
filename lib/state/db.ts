import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  ConnectionSnapshot,
  EventLogRecord,
  OpenContractRecord,
  PendingIntentRecord,
  SubscriptionRecord,
  TradingDbSchema,
} from "./types";

const DB_NAME = "deriv-platform-v1";
const DB_VERSION = 1;

interface AppDb extends DBSchema {
  open_contracts: TradingDbSchema["open_contracts"];
  pending_intents: TradingDbSchema["pending_intents"];
  subscriptions: TradingDbSchema["subscriptions"];
  event_log: TradingDbSchema["event_log"];
  connection_snapshot: TradingDbSchema["connection_snapshot"];
}

let dbPromise: Promise<IDBPDatabase<AppDb>> | null = null;

export function getTradingDb() {
  if (!dbPromise) {
    dbPromise = openDB<AppDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("open_contracts")) {
          db.createObjectStore("open_contracts", { keyPath: "contractId" });
        }
        if (!db.objectStoreNames.contains("pending_intents")) {
          db.createObjectStore("pending_intents", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("subscriptions")) {
          db.createObjectStore("subscriptions", { keyPath: "symbol" });
        }
        if (!db.objectStoreNames.contains("event_log")) {
          db.createObjectStore("event_log", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("connection_snapshot")) {
          db.createObjectStore("connection_snapshot");
        }
      },
    });
  }
  return dbPromise;
}

export async function clearTradingDb(): Promise<void> {
  const db = await getTradingDb();
  const tx = db.transaction(
    ["open_contracts", "pending_intents", "subscriptions", "event_log", "connection_snapshot"],
    "readwrite",
  );
  await Promise.all([
    tx.objectStore("open_contracts").clear(),
    tx.objectStore("pending_intents").clear(),
    tx.objectStore("subscriptions").clear(),
    tx.objectStore("event_log").clear(),
    tx.objectStore("connection_snapshot").clear(),
    tx.done,
  ]);
}

export async function getAllOpenContracts(): Promise<OpenContractRecord[]> {
  const db = await getTradingDb();
  return db.getAll("open_contracts");
}

export async function upsertOpenContract(record: OpenContractRecord): Promise<void> {
  const db = await getTradingDb();
  await db.put("open_contracts", record);
}

export async function removeOpenContract(contractId: number): Promise<void> {
  const db = await getTradingDb();
  await db.delete("open_contracts", contractId);
}

export async function upsertSubscription(record: SubscriptionRecord): Promise<void> {
  const db = await getTradingDb();
  await db.put("subscriptions", record);
}

export async function getSubscriptions(): Promise<SubscriptionRecord[]> {
  const db = await getTradingDb();
  return db.getAll("subscriptions");
}

export async function appendEventLog(record: EventLogRecord): Promise<void> {
  const db = await getTradingDb();
  await db.put("event_log", record);
}

export async function saveConnectionSnapshot(snapshot: ConnectionSnapshot): Promise<void> {
  const db = await getTradingDb();
  await db.put("connection_snapshot", snapshot, "latest");
}

export async function getConnectionSnapshot(): Promise<ConnectionSnapshot | undefined> {
  const db = await getTradingDb();
  return db.get("connection_snapshot", "latest");
}

export async function upsertPendingIntent(record: PendingIntentRecord): Promise<void> {
  const db = await getTradingDb();
  await db.put("pending_intents", record);
}

export async function getPendingIntents(): Promise<PendingIntentRecord[]> {
  const db = await getTradingDb();
  return db.getAll("pending_intents");
}
