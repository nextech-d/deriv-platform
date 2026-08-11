import type { ConnectionState } from "@/lib/ws/protocol";

export interface WsMetricsSnapshot {
  sessionStartedAt: number;
  connectCount: number;
  reconnectCount: number;
  reconnectSuccessCount: number;
  disconnectCount: number;
  errorCount: number;
  lastConnectedAt: number | null;
  lastDisconnectedAt: number | null;
  lastErrorAt: number | null;
  lastErrorMessage: string | null;
  totalConnectedMs: number;
  recentErrors: Array<{ ts: number; message: string }>;
}

const STORAGE_KEY = "deriv_platform_ws_metrics";
const MAX_RECENT_ERRORS = 10;

export function createEmptyMetrics(): WsMetricsSnapshot {
  return {
    sessionStartedAt: Date.now(),
    connectCount: 0,
    reconnectCount: 0,
    reconnectSuccessCount: 0,
    disconnectCount: 0,
    errorCount: 0,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
    totalConnectedMs: 0,
    recentErrors: [],
  };
}

export function loadPersistedMetrics(): WsMetricsSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WsMetricsSnapshot;
  } catch {
    return null;
  }
}

export function persistMetrics(snapshot: WsMetricsSnapshot): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function computeUptimePct(snapshot: WsMetricsSnapshot): number {
  const elapsed = Date.now() - snapshot.sessionStartedAt;
  if (elapsed <= 0) return 100;
  return Math.min(100, (snapshot.totalConnectedMs / elapsed) * 100);
}

export function computeReconnectSuccessRate(snapshot: WsMetricsSnapshot): number {
  if (snapshot.reconnectCount === 0) return 100;
  return Math.min(
    100,
    (snapshot.reconnectSuccessCount / snapshot.reconnectCount) * 100,
  );
}

export class WsMetricsTracker {
  private snapshot: WsMetricsSnapshot;
  private connectedSince: number | null = null;

  constructor(initial?: WsMetricsSnapshot | null) {
    this.snapshot = initial ?? createEmptyMetrics();
    if (!initial) {
      this.snapshot.sessionStartedAt = Date.now();
    }
  }

  getSnapshot(): WsMetricsSnapshot {
    this.flushConnectedTime();
    return { ...this.snapshot, recentErrors: [...this.snapshot.recentErrors] };
  }

  private flushConnectedTime(): void {
    if (this.connectedSince !== null) {
      this.snapshot.totalConnectedMs += Date.now() - this.connectedSince;
      this.connectedSince = Date.now();
    }
  }

  onConnectionState(state: ConnectionState, prev: ConnectionState): WsMetricsSnapshot {
    if (state === "connected" && prev !== "connected") {
      this.connectedSince = Date.now();
      this.snapshot.lastConnectedAt = Date.now();
      if (prev === "reconnecting") {
        this.snapshot.reconnectSuccessCount += 1;
      } else if (prev === "connecting") {
        this.snapshot.connectCount += 1;
      } else if (prev === "disconnected") {
        this.snapshot.connectCount += 1;
      }
    }

    if (state === "reconnecting" && prev !== "reconnecting") {
      this.flushConnectedTime();
      this.connectedSince = null;
      this.snapshot.reconnectCount += 1;
    }

    if (state === "disconnected" && prev !== "disconnected") {
      this.flushConnectedTime();
      this.connectedSince = null;
      this.snapshot.lastDisconnectedAt = Date.now();
      this.snapshot.disconnectCount += 1;
    }

    persistMetrics(this.getSnapshot());
    return this.getSnapshot();
  }

  onError(message: string): WsMetricsSnapshot {
    this.snapshot.errorCount += 1;
    this.snapshot.lastErrorAt = Date.now();
    this.snapshot.lastErrorMessage = message;
    this.snapshot.recentErrors = [
      { ts: Date.now(), message },
      ...this.snapshot.recentErrors,
    ].slice(0, MAX_RECENT_ERRORS);
    persistMetrics(this.getSnapshot());
    return this.getSnapshot();
  }

  reset(): WsMetricsSnapshot {
    this.connectedSince = null;
    this.snapshot = createEmptyMetrics();
    persistMetrics(this.snapshot);
    return this.getSnapshot();
  }
}
