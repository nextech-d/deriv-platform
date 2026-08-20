"use client";

import { Bot, Pause, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { deskActionPane, workspacePane } from "@/components/layout/TerminalViewLayout";
import { DEMO_RUNTIME_REQUIRED_MS } from "@/lib/bot/settings";
import type { BotConfig, BotHeartbeat } from "@/lib/bot/types";
import { cn } from "@/lib/utils/cn";

interface BotPanelProps {
  config: BotConfig;
  heartbeat: BotHeartbeat;
  hydrated: boolean;
  demoMode: boolean;
  liveAllowed: boolean;
  demoRemainingMs: number;
  isConnected: boolean;
  onConfigChange: (config: BotConfig) => void;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  embedded?: boolean;
  title?: string;
  subtitle?: string;
}

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const STATUS_LABEL: Record<BotHeartbeat["status"], string> = {
  idle: "Idle",
  running: "Running",
  paused: "Paused",
  blocked: "Blocked",
};

const STATUS_TONE: Record<
  BotHeartbeat["status"],
  "ok" | "warn" | "locked" | "idle"
> = {
  idle: "idle",
  running: "ok",
  paused: "warn",
  blocked: "locked",
};

export function BotPanel({
  config,
  heartbeat,
  hydrated,
  demoMode,
  liveAllowed,
  demoRemainingMs,
  isConnected,
  onConfigChange,
  onStart,
  onPause,
  onStop,
  embedded = false,
  title = "Trading bot",
  subtitle = "MA cross & RSI rules — demo-first (RSK-05)",
}: BotPanelProps) {
  if (!hydrated) {
    const skeleton = (
      <div className="bot-desk">
        {!embedded ? (
          <CardHeader title={title} subtitle="Loading bot settings…" />
        ) : null}
        <div className="bot-stat-strip">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bot-skeleton-cell animate-pulse bg-surface-elevated" />
          ))}
        </div>
      </div>
    );
    if (embedded) return <div className={workspacePane}>{skeleton}</div>;
    return (
      <Card className="border-accent/20" studio>
        {skeleton}
      </Card>
    );
  }

  const isRunning = config.enabled && !config.paused;
  const demoProgress = Math.min(
    100,
    (heartbeat.demoRuntimeMs / DEMO_RUNTIME_REQUIRED_MS) * 100,
  );
  const statusTone = STATUS_TONE[heartbeat.status];

  function patch(partial: Partial<BotConfig>) {
    onConfigChange({ ...config, ...partial });
  }

  const body = (
    <div className={cn("bot-desk", embedded && "bot-desk--desk")}>
      {!embedded ? (
        <CardHeader
          title={title}
          subtitle={subtitle}
          action={
            <BotStatusChip status={heartbeat.status} tone={statusTone} />
          }
        />
      ) : (
        <div className="bot-desk-status-row">
          <BotStatusChip status={heartbeat.status} tone={statusTone} />
        </div>
      )}

      <div className="bot-stat-strip">
        {[
          { label: "Ticks", value: String(heartbeat.ticksProcessed) },
          { label: "Trades", value: String(heartbeat.tradesExecuted) },
          {
            label: "Last signal",
            value: heartbeat.lastSignalLabel
              ? heartbeat.lastSignalLabel.slice(0, 20)
              : "—",
          },
          {
            label: "Last tick",
            value: heartbeat.lastTickAt
              ? new Date(heartbeat.lastTickAt).toLocaleTimeString()
              : "—",
          },
        ].map((stat, index, arr) => (
          <div
            key={stat.label}
            className={cn(
              "bot-stat-cell",
              index < arr.length - 1 && "bot-stat-cell-divider",
            )}
          >
            <p className="session-metric-label">{stat.label}</p>
            <p className="bot-stat-value">{stat.value}</p>
          </div>
        ))}
      </div>

      {!demoMode && !liveAllowed ? (
        <div className="bot-runtime-panel">
          <div className="bot-runtime-head">
            <p className="session-metric-label">Demo runtime gate</p>
            <p className="bot-runtime-pct">{demoProgress.toFixed(0)}%</p>
          </div>
          <p className="bot-runtime-copy">
            Live auto-trade locked until demo runtime completes.
          </p>
          <p className="bot-runtime-values">
            <span className="font-mono tabular-nums">
              {formatDuration(heartbeat.demoRuntimeMs)}
            </span>
            <span className="text-muted"> / {formatDuration(DEMO_RUNTIME_REQUIRED_MS)}</span>
            <span className="text-muted"> · {formatDuration(demoRemainingMs)} left</span>
          </p>
          <div className="session-gauge">
            <div className="session-gauge-track">
              <div
                className="session-gauge-fill session-gauge-fill-warn"
                style={{ width: `${demoProgress}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {heartbeat.blockReason ? (
        <p className="workspace-inline-alert workspace-inline-alert-danger text-[10px] text-negative">
          {heartbeat.blockReason}
        </p>
      ) : null}

      {demoMode ? (
        <p className="workspace-inline-alert workspace-inline-alert-demo text-[10px]">
          Demo mode — bot executes simulated trades only
        </p>
      ) : null}

      <div className="bot-fields space-y-3.5">
        <div className="trade-field-group">
          <p className="trade-field-label">Strategy</p>
          <div className="bot-strategy-row">
            {(
              [
                { id: "ma_cross" as const, label: "MA cross" },
                { id: "rsi_threshold" as const, label: "RSI" },
                { id: "parity_bias" as const, label: "Parity" },
                { id: "barrier_edge" as const, label: "Barrier" },
                { id: "digit_match" as const, label: "Matches" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={isRunning}
                onClick={() => patch({ strategy: option.id })}
                className={cn(
                  "bot-strategy-chip interactive",
                  config.strategy === option.id && "bot-strategy-chip-active",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bot-field-grid">
          <Field
            label="Stake (USD)"
            type="number"
            min={0.35}
            step={0.01}
            value={config.stake}
            disabled={isRunning}
            onChange={(v) => patch({ stake: v })}
          />
          <Field
            label={`Duration (${
              config.durationUnit === "s"
                ? "seconds"
                : config.durationUnit === "m"
                  ? "minutes"
                  : config.durationUnit === "h"
                    ? "hours"
                    : config.durationUnit === "d"
                      ? "days"
                      : "ticks"
            })`}
            type="number"
            min={1}
            value={config.duration}
            disabled={isRunning}
            onChange={(v) => patch({ duration: v })}
          />
        </div>

        {config.strategy === "ma_cross" ? (
          <div className="bot-field-grid">
            <Field
              label="Fast MA"
              type="number"
              min={2}
              value={config.fastPeriod}
              disabled={isRunning}
              onChange={(v) => patch({ fastPeriod: v })}
            />
            <Field
              label="Slow MA"
              type="number"
              min={3}
              value={config.slowPeriod}
              disabled={isRunning}
              onChange={(v) => patch({ slowPeriod: v })}
            />
          </div>
        ) : null}

        {config.strategy === "rsi_threshold" ? (
          <div className="bot-field-grid bot-field-grid-3">
            <Field
              label="RSI period"
              type="number"
              min={5}
              value={config.rsiPeriod}
              disabled={isRunning}
              onChange={(v) => patch({ rsiPeriod: v })}
            />
            <Field
              label="Oversold"
              type="number"
              min={1}
              max={50}
              value={config.rsiOversold}
              disabled={isRunning}
              onChange={(v) => patch({ rsiOversold: v })}
            />
            <Field
              label="Overbought"
              type="number"
              min={50}
              max={99}
              value={config.rsiOverbought}
              disabled={isRunning}
              onChange={(v) => patch({ rsiOverbought: v })}
            />
          </div>
        ) : null}

        {config.strategy === "barrier_edge" ? (
          <Field
            label="Digit barrier"
            type="number"
            min={0}
            max={9}
            value={config.barrierDigit ?? 4}
            disabled={isRunning}
            onChange={(v) => patch({ barrierDigit: v })}
          />
        ) : null}

        {config.strategy === "digit_match" ? (
          <Field
            label="Match digit"
            type="number"
            min={0}
            max={9}
            value={config.digitTarget ?? 5}
            disabled={isRunning}
            onChange={(v) => patch({ digitTarget: v })}
          />
        ) : null}

        {config.strategy === "parity_bias" ? (
          <div className="trade-field-group">
            <p className="trade-field-label">Prefer parity</p>
            <div className="bot-strategy-row">
              {(
                [
                  { id: "auto" as const, label: "Auto" },
                  { id: "even" as const, label: "Even" },
                  { id: "odd" as const, label: "Odd" },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={isRunning}
                  onClick={() => patch({ parityPrefer: option.id })}
                  className={cn(
                    "bot-strategy-chip interactive",
                    (config.parityPrefer ?? "auto") === option.id &&
                      "bot-strategy-chip-active",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <Field
          label="Cooldown (ticks between trades)"
          type="number"
          min={1}
          value={config.cooldownTicks}
          disabled={isRunning}
          onChange={(v) => patch({ cooldownTicks: v })}
        />
      </div>

      <div className="bot-control-bar">
        {!config.enabled ? (
          <Button
            disabled={!isConnected}
            className="bot-control-primary interactive gap-2"
            onClick={onStart}
          >
            <Play className="h-4 w-4" strokeWidth={2} />
            Start bot
          </Button>
        ) : config.paused ? (
          <Button
            disabled={!isConnected}
            className="bot-control-primary interactive gap-2"
            onClick={onStart}
          >
            <Play className="h-4 w-4" strokeWidth={2} />
            Resume
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="bot-control-secondary interactive gap-2"
            onClick={onPause}
          >
            <Pause className="h-4 w-4" strokeWidth={2} />
            Pause
          </Button>
        )}
        {config.enabled ? (
          <Button
            variant="secondary"
            className="bot-control-secondary interactive gap-2"
            onClick={onStop}
          >
            <Square className="h-3.5 w-3.5 fill-current" strokeWidth={2} />
            Stop
          </Button>
        ) : null}
      </div>

      {!isConnected ? (
        <p className="trade-ticket-hint text-center text-xs text-muted">
          Connect to market data to run the bot
        </p>
      ) : null}
    </div>
  );

  if (embedded) {
    return <div className={cn("view-in", deskActionPane)}>{body}</div>;
  }

  return (
    <Card className="border-accent/20 view-in" studio>
      {body}
    </Card>
  );
}

function BotStatusChip({
  status,
  tone,
}: {
  status: BotHeartbeat["status"];
  tone: "ok" | "warn" | "locked" | "idle";
}) {
  return (
    <span
      className="session-status-chip"
      data-tone={tone}
      title={`Bot is ${STATUS_LABEL[status].toLowerCase()}`}
    >
      <span
        className={cn(
          "session-status-dot",
          status === "running" && "animate-pulse-dot",
        )}
        aria-hidden
      />
      <Bot className="h-3 w-3 opacity-70" strokeWidth={2} />
      {STATUS_LABEL[status]}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  type,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  type: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="trade-field-group">
      <label className="trade-field-label">{label}</label>
      <Input
        type={type}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        mono
        className="h-9 disabled:opacity-50"
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
