export interface PendingRequest {
  reqId: number;
  method: string;
  sentAt: number;
  timeoutMs: number;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

export class RequestRegistry {
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();

  createId(): number {
    return this.nextId++;
  }

  register(
    reqId: number,
    method: string,
    timeoutMs: number,
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const entry: PendingRequest = {
        reqId,
        method,
        sentAt: Date.now(),
        timeoutMs,
        resolve,
        reject,
      };
      this.pending.set(reqId, entry);

      setTimeout(() => {
        if (this.pending.has(reqId)) {
          this.pending.delete(reqId);
          reject(new Error(`Request ${method} timed out (req_id=${reqId})`));
        }
      }, timeoutMs);
    });
  }

  resolve(reqId: number, payload: unknown): boolean {
    const entry = this.pending.get(reqId);
    if (!entry) return false;
    this.pending.delete(reqId);
    entry.resolve(payload);
    return true;
  }

  rejectAll(reason: string): void {
    for (const entry of this.pending.values()) {
      entry.reject(new Error(reason));
    }
    this.pending.clear();
  }

  clear(): void {
    this.pending.clear();
  }
}
