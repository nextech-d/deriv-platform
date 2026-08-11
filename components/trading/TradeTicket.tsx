"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, segmentClassName } from "@/components/ui/input";
import { deskActionPane, workspacePane } from "@/components/layout/TerminalViewLayout";
import { cn } from "@/lib/utils/cn";

interface TradeTicketProps {
  symbol: string;
  isConnected: boolean;
  isTrading: boolean;
  demoMode: boolean;
  stake: number;
  duration: number;
  tradeNotice: string | null;
  hasLiveQuote?: boolean;
  tradingLocked?: boolean;
  onStakeChange: (value: number) => void;
  onDurationChange: (value: number) => void;
  onTrade: (direction: "CALL" | "PUT") => void;
  formatLocal: (usd: number) => string;
  embedded?: boolean;
}

export function TradeTicket({
  symbol,
  isConnected,
  isTrading,
  demoMode,
  stake,
  duration,
  tradeNotice,
  hasLiveQuote = true,
  tradingLocked = false,
  onStakeChange,
  onDurationChange,
  onTrade,
  formatLocal,
  embedded = false,
}: TradeTicketProps) {
  const presets = [0.35, 1, 5, 10, 25];
  const durations = [1, 3, 5, 10];
  const canTrade =
    isConnected &&
    !isTrading &&
    !tradingLocked &&
    (!demoMode || hasLiveQuote);

  const body = (
    <div className={cn("trade-ticket", embedded && "trade-ticket--desk")}>
      {!embedded ? (
        <CardHeader
          title="Trade ticket"
          subtitle={`${symbol} · ${demoMode ? "Demo simulation" : "Rise/Fall"}`}
        />
      ) : null}

      <div
        className={cn(
          "trade-ticket-summary",
          embedded && "trade-ticket-summary-compact",
        )}
      >
        {!embedded ? (
          <div className="trade-summary-cell">
            <p className="trade-summary-label">Symbol</p>
            <p className="trade-summary-value font-mono">{symbol}</p>
          </div>
        ) : null}
        <div className="trade-summary-cell">
          <p className="trade-summary-label">Stake</p>
          <p className="trade-summary-value">
            ${stake.toFixed(2)}
            <span className="trade-summary-sub">≈ {formatLocal(stake)}</span>
          </p>
        </div>
        <div className="trade-summary-cell">
          <p className="trade-summary-label">Duration</p>
          <p className="trade-summary-value">{duration} ticks</p>
        </div>
      </div>

      {demoMode ? (
        <p className="trade-ticket-mode workspace-inline-alert workspace-inline-alert-demo text-[10px]">
          Demo session — orders are simulated
        </p>
      ) : null}

      <div className="trade-ticket-fields space-y-4">
        <div className="trade-field-group">
          <label className="trade-field-label" htmlFor="trade-stake">
            Stake (USD)
          </label>
          <Input
            id="trade-stake"
            type="number"
            min={0.35}
            step={0.01}
            value={stake}
            mono
            className="trade-stake-input h-11"
            onChange={(e) => onStakeChange(Number(e.target.value))}
          />
          <div className="trade-preset-row">
            {presets.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => onStakeChange(amount)}
                className={cn(
                  "trade-preset-chip interactive",
                  stake === amount && "trade-preset-chip-active",
                )}
              >
                ${amount}
              </button>
            ))}
          </div>
        </div>

        <div className="trade-field-group">
          <p className="trade-field-label">Duration (ticks)</p>
          <div className="trade-preset-row">
            {durations.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onDurationChange(d)}
                className={cn(
                  "trade-preset-chip interactive font-mono",
                  duration === d && "trade-preset-chip-active",
                )}
              >
                {d}t
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="trade-ticket-actions">
        <Button
          size="lg"
          disabled={!canTrade}
          onClick={() => onTrade("CALL")}
          className="trade-action trade-action-rise interactive gap-2"
        >
          {isTrading ? (
            "…"
          ) : (
            <>
              <TrendingUp className="h-4 w-4" strokeWidth={2.5} />
              Rise
            </>
          )}
        </Button>
        <Button
          size="lg"
          disabled={!canTrade}
          onClick={() => onTrade("PUT")}
          className="trade-action trade-action-fall interactive gap-2"
        >
          {isTrading ? (
            "…"
          ) : (
            <>
              <TrendingDown className="h-4 w-4" strokeWidth={2.5} />
              Fall
            </>
          )}
        </Button>
      </div>

      {tradingLocked ? (
        <p className="workspace-inline-alert workspace-inline-alert-danger text-center text-[10px] text-negative">
          Trading locked — adjust limits in Settings
        </p>
      ) : null}

      {tradeNotice ? (
        <p className="workspace-inline-alert text-center text-[10px] text-muted">
          {tradeNotice}
        </p>
      ) : null}

      {!isConnected ? (
        <p className="trade-ticket-hint text-center text-xs text-muted">
          Connect to market data to trade
        </p>
      ) : null}
    </div>
  );

  if (embedded) {
    return <div className={cn("view-in", deskActionPane)}>{body}</div>;
  }

  return (
    <Card className="view-in" studio>
      {body}
    </Card>
  );
}
