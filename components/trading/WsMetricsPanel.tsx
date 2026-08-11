"use client";

import { Button } from "@/components/ui/button";
import { TerminalPanel } from "@/components/layout/TerminalViewLayout";
import { cn } from "@/lib/utils/cn";
import {
  computeReconnectSuccessRate,
  computeUptimePct,
  type WsMetricsSnapshot,
} from "@/lib/metrics/ws-metrics";

interface WsMetricsPanelProps {
  metrics: WsMetricsSnapshot;
  connectionState: string;
  onReset: () => void;
}

type HealthTone = "ok" | "warn" | "locked";

function healthTone(
  uptime: number,
  reconnectRate: number,
  metrics: WsMetricsSnapshot,
  connectionState: string,
): HealthTone {
  if (
    connectionState !== "connected" ||
    metrics.errorCount > 3 ||
    (metrics.reconnectCount > 0 && reconnectRate < 95)
  ) {
    return "locked";
  }
  if (uptime < 99 || metrics.errorCount > 0 || reconnectRate < 99) return "warn";
  return "ok";
}

const HEALTH_LABEL: Record<HealthTone, string> = {
  ok: "Healthy",
  warn: "Degraded",
  locked: "Unstable",
};

export function WsMetricsPanel({
  metrics,
  connectionState,
  onReset,
}: WsMetricsPanelProps) {
  const uptime = computeUptimePct(metrics);
  const reconnectRate = computeReconnectSuccessRate(metrics);
  const tone = healthTone(uptime, reconnectRate, metrics, connectionState);

  const cells = [
    { label: "State", value: connectionState },
    { label: "Uptime", value: `${uptime.toFixed(1)}%`, warn: uptime < 99 },
    { label: "Reconnects", value: String(metrics.reconnectCount) },
    {
      label: "Reconnect OK",
      value: `${reconnectRate.toFixed(0)}%`,
      warn: metrics.reconnectCount > 0 && reconnectRate < 99,
    },
    { label: "Connects", value: String(metrics.connectCount) },
    { label: "Disconnects", value: String(metrics.disconnectCount) },
    {
      label: "Errors",
      value: String(metrics.errorCount),
      warn: metrics.errorCount > 0,
      critical: metrics.errorCount > 3,
    },
    {
      label: "Connected ms",
      value: String(Math.round(metrics.totalConnectedMs)),
    },
  ];

  return (
    <TerminalPanel
      label="WebSocket metrics"
      hint="Chaos QA · target ≥99% reconnect success"
      action={
        <div className="flex items-center gap-2 pr-1">
          <span className="session-status-chip" data-tone={tone}>
            <span className="session-status-dot" aria-hidden />
            {HEALTH_LABEL[tone]}
          </span>
          <Button variant="ghost" size="sm" className="interactive h-8" onClick={onReset}>
            Reset
          </Button>
        </div>
      }
      bodyClassName="p-0"
    >
      <div className="metrics-desk">
        <p className="metrics-desk-copy">
          Session stats for chaos QA — target ≥99% reconnect success
        </p>

        <div className="bot-stat-strip metrics-stat-strip">
          {cells.map((cell, index, arr) => (
            <div
              key={cell.label}
              className={cn(
                "bot-stat-cell",
                index < arr.length - 1 && "bot-stat-cell-divider",
                cell.critical && "session-metric-critical",
                cell.warn && !cell.critical && "session-metric-warn",
              )}
            >
              <p className="session-metric-label">{cell.label}</p>
              <p
                className={cn(
                  "bot-stat-value",
                  cell.critical && "text-negative",
                  cell.warn && !cell.critical && "text-warning",
                )}
              >
                {cell.value}
              </p>
            </div>
          ))}
        </div>

        {metrics.lastErrorMessage ? (
          <p className="workspace-inline-alert workspace-inline-alert-danger mx-3 mb-0 text-[10px] md:mx-4">
            Last error: {metrics.lastErrorMessage}
            {metrics.lastErrorAt
              ? ` · ${new Date(metrics.lastErrorAt).toLocaleTimeString()}`
              : null}
          </p>
        ) : null}

        {metrics.recentErrors.length > 0 ? (
          <ul className="metrics-error-log">
            {metrics.recentErrors.map((err) => (
              <li key={err.ts} className="metrics-error-row">
                <span className="font-mono tabular-nums text-muted">
                  {new Date(err.ts).toLocaleTimeString()}
                </span>
                <span>{err.message}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </TerminalPanel>
  );
}
