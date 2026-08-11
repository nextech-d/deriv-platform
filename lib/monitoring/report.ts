export type ReportLevel = "error" | "warning" | "info";

export interface ClientReport {
  level: ReportLevel;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  ts?: number;
}

export async function reportClientError(
  error: unknown,
  context?: Record<string, unknown>,
): Promise<void> {
  const message =
    error instanceof Error ? error.message : String(error ?? "Unknown error");
  const stack = error instanceof Error ? error.stack : undefined;

  if (process.env.NODE_ENV === "development") {
    console.error("[monitoring]", message, context, error);
  }

  try {
    await fetch("/api/monitoring/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: "error",
        message,
        stack,
        context,
        ts: Date.now(),
      } satisfies ClientReport),
    });
  } catch {
    // monitoring must never throw
  }
}

export async function reportClientMessage(
  level: ReportLevel,
  message: string,
  context?: Record<string, unknown>,
): Promise<void> {
  try {
    await fetch("/api/monitoring/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level,
        message,
        context,
        ts: Date.now(),
      } satisfies ClientReport),
    });
  } catch {
    // ignore
  }
}
