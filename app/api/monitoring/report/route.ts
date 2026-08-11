import { NextRequest, NextResponse } from "next/server";
import type { ClientReport } from "@/lib/monitoring/report";

const MAX_BODY = 8_192;

function parseSentryDsn(dsn: string): { host: string; projectId: string; publicKey: string } | null {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, "");
    const publicKey = url.username;
    if (!projectId || !publicKey) return null;
    return { host: url.host, projectId, publicKey };
  } catch {
    return null;
  }
}

async function forwardToSentry(report: ClientReport): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  const parsed = parseSentryDsn(dsn);
  if (!parsed) return;

  const envelope = {
    event_id: crypto.randomUUID().replace(/-/g, ""),
    timestamp: (report.ts ?? Date.now()) / 1000,
    platform: "javascript",
    level: report.level === "error" ? "error" : "info",
    message: report.message,
    exception: report.stack
      ? { values: [{ type: "Error", value: report.message, stacktrace: { frames: [] } }] }
      : undefined,
    extra: report.context,
  };

  const body = JSON.stringify(envelope);
  const url = `https://${parsed.host}/api/${parsed.projectId}/store/?sentry_key=${parsed.publicKey}&sentry_version=7`;

  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${parsed.publicKey}`,
    },
    body,
  }).catch(() => {
    // best-effort forward
  });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > MAX_BODY) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let report: ClientReport;
  try {
    report = JSON.parse(raw) as ClientReport;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!report.message || typeof report.message !== "string") {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const logLine = {
    level: report.level ?? "error",
    message: report.message,
    context: report.context,
    ts: report.ts ?? Date.now(),
  };

  if (report.level === "error") {
    console.error("[client-report]", logLine);
  } else {
    console.warn("[client-report]", logLine);
  }

  if (process.env.SENTRY_DSN) {
    await forwardToSentry(report);
  }

  return NextResponse.json({ ok: true });
}
