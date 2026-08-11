import type { ConnectionState } from "./protocol";

const INITIAL_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 30_000;
const BACKOFF_MULTIPLIER = 2;
const JITTER_RATIO = 0.2;

export class ConnectionFsm {
  private state: ConnectionState = "disconnected";
  private retryCount = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  getState(): ConnectionState {
    return this.state;
  }

  transition(next: ConnectionState): ConnectionState {
    this.state = next;
    if (next === "connected") {
      this.retryCount = 0;
    }
    return this.state;
  }

  scheduleReconnect(callback: () => void): void {
    this.clearReconnectTimer();
    this.transition("reconnecting");

    const base = Math.min(
      INITIAL_BACKOFF_MS * BACKOFF_MULTIPLIER ** this.retryCount,
      MAX_BACKOFF_MS,
    );
    const jitter = base * JITTER_RATIO * (Math.random() * 2 - 1);
    const delay = Math.max(0, Math.round(base + jitter));

    this.retryCount += 1;
    this.reconnectTimer = setTimeout(callback, delay);
  }

  clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  reset(): void {
    this.clearReconnectTimer();
    this.retryCount = 0;
    this.state = "disconnected";
  }
}

export const WS_TIMING = {
  pingIntervalMs: 25_000,
  pingTimeoutMs: 10_000,
  defaultRequestTimeoutMs: 10_000,
} as const;
