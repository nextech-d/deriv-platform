"use client";

import {
  DeskPanel,
  DeskPanelHead,
} from "@/components/layout/TerminalViewLayout";
import { cn } from "@/lib/utils/cn";

interface SessionStatsProps {
  sessionPnl: number;
  sessionLoss: number;
  sessionStopLoss: number;
  dailyLoss: number;
  dailyMaxDrawdown: number;
  formatLocal: (usd: number) => string;
  openCount: number;
  tradingLocked?: boolean;
}

type RiskTone = "ok" | "warn" | "locked";

function riskTone(
  tradingLocked: boolean,
  sessionPct: number,
  dailyPct: number,
): RiskTone {
  if (tradingLocked || sessionPct >= 100 || dailyPct >= 100) return "locked";
  if (sessionPct >= 80 || dailyPct >= 80) return "warn";
  return "ok";
}

const RISK_CHIP: Record<RiskTone, { label: string; hint: string }> = {
  ok: { label: "Within limits", hint: "Session and daily risk are clear" },
  warn: { label: "Approaching limit", hint: "One or more limits above 80%" },
  locked: { label: "Trading locked", hint: "Risk limit reached — adjust in Settings" },
};

export function SessionStats({
  sessionPnl,
  sessionLoss,
  sessionStopLoss,
  dailyLoss,
  dailyMaxDrawdown,
  formatLocal,
  openCount,
  tradingLocked = false,
}: SessionStatsProps) {
  const sessionPct = Math.min(100, (sessionLoss / sessionStopLoss) * 100);
  const dailyPct = Math.min(100, (dailyLoss / dailyMaxDrawdown) * 100);
  const pnlPositive = sessionPnl > 0;
  const pnlNegative = sessionPnl < 0;
  const tone = riskTone(tradingLocked, sessionPct, dailyPct);
  const chip = RISK_CHIP[tone];

  return (
    <DeskPanel variant="metrics" className="session-desk view-in" aria-label="Session metrics">
      <DeskPanelHead
        title="Session"
        hint="P/L and risk"
        trailing={
          <div
            className="session-status-chip"
            data-tone={tone}
            title={chip.hint}
          >
            <span className="session-status-dot" aria-hidden />
            {chip.label}
          </div>
        }
      />

      <div className="session-desk-grid">
        <div
          className={cn(
            "session-metric session-metric-hero",
            pnlPositive && "session-metric-positive",
            pnlNegative && "session-metric-negative",
          )}
        >
          <p className="session-metric-label">Session P/L</p>
          <p
            className={cn(
              "session-metric-value",
              pnlPositive && "text-positive",
              pnlNegative && "text-negative",
            )}
          >
            {pnlPositive ? "+" : ""}
            {sessionPnl.toFixed(2)}
            <span className="session-metric-unit"> USD</span>
          </p>
          <p className="session-metric-sub">{formatLocal(sessionPnl)}</p>
        </div>

        <div className="session-metric">
          <p className="session-metric-label">Open</p>
          <p className="session-metric-value">{openCount}</p>
          <p className="session-metric-sub">
            {openCount === 1 ? "position" : "positions"}
          </p>
        </div>

        <SessionGaugeMetric
          label="Session loss"
          used={sessionLoss}
          limit={sessionStopLoss}
          pct={sessionPct}
        />

        <SessionGaugeMetric
          label="Daily drawdown"
          used={dailyLoss}
          limit={dailyMaxDrawdown}
          pct={dailyPct}
        />
      </div>
    </DeskPanel>
  );
}

function SessionGaugeMetric({
  label,
  used,
  limit,
  pct,
}: {
  label: string;
  used: number;
  limit: number;
  pct: number;
}) {
  const warn = pct >= 80;
  const critical = pct >= 100;

  return (
    <div
      className={cn(
        "session-metric session-metric-gauge",
        warn && !critical && "session-metric-warn",
        critical && "session-metric-critical",
      )}
    >
      <div className="session-metric-row">
        <p className="session-metric-label">{label}</p>
        <p className="session-metric-pct">{pct.toFixed(0)}%</p>
      </div>
      <p className="session-metric-value session-metric-value-compact">
        ${used.toFixed(0)}
        <span className="session-metric-limit"> / ${limit}</span>
      </p>
      <div className="session-gauge" aria-hidden>
        <div className="session-gauge-track">
          <div
            className={cn(
              "session-gauge-fill",
              warn && !critical && "session-gauge-fill-warn",
              critical && "session-gauge-fill-critical",
            )}
            style={{ width: `${pct}%` }}
          />
          <span className="session-gauge-mark" style={{ left: "80%" }} />
        </div>
      </div>
      <p className="session-metric-sub">
        {critical ? "Limit reached" : warn ? "Near stop" : "Of limit"}
      </p>
    </div>
  );
}
