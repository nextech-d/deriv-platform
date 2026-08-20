"use client";

import { Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import {
  AdvancedChart,
  useTickFlash,
} from "@/components/trading/AdvancedChart";
import { deskContentPane } from "@/components/layout/TerminalViewLayout";
import { cn } from "@/lib/utils/cn";
import {
  DERIV_SYMBOLS,
  SYMBOL_GROUPS,
} from "@/lib/markets/symbols";
import type { TickEvent } from "@/lib/ws/protocol";

export const POPULAR_SYMBOLS = DERIV_SYMBOLS.map((s) => ({
  id: s.id,
  label: s.shortLabel,
  group: SYMBOL_GROUPS.find((g) => g.id === s.group)?.label ?? s.group,
}));

interface MarketTickerProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  lastQuote: number | null;
  tickHistory: TickEvent[];
  isConnected: boolean;
  onSubscribe: (symbol: string) => void;
  embedded?: boolean;
}

export function MarketTicker({
  symbol,
  onSymbolChange,
  lastQuote,
  tickHistory,
  isConnected,
  onSubscribe,
  embedded = false,
}: MarketTickerProps) {
  const active = POPULAR_SYMBOLS.find((s) => s.id === symbol);
  const tickFlash = useTickFlash(lastQuote);
  const symbolTicks = tickHistory.filter(
    (t) => !t.symbol || t.symbol === symbol,
  );
  const tickDelta =
    symbolTicks.length >= 2
      ? symbolTicks.at(-1)!.quote - symbolTicks.at(-2)!.quote
      : null;

  const chartHeight = embedded ? 200 : 180;

  const feedControls = (
    <div className="flex shrink-0 items-center gap-2">
      <span
        className="market-feed-chip"
        data-live={isConnected ? "true" : "false"}
      >
        <span
          className={cn(
            "command-feed-dot h-1.5 w-1.5",
            isConnected ? "bg-positive" : "bg-muted",
          )}
          aria-hidden
        />
        {isConnected ? "Live" : "Offline"}
      </span>
      <Button
        variant="ghost"
        size="sm"
        disabled={!isConnected}
        onClick={() => onSubscribe(symbol)}
        className="interactive h-8 gap-1.5 px-2"
      >
        <Radio className="h-3.5 w-3.5" strokeWidth={2} />
        Stream
      </Button>
    </div>
  );

  const quoteBlock = (
    <div className="market-quote-block">
      <p
        className={cn(
          "market-quote-value",
          tickFlash === "up" && "tick-flash-up",
          tickFlash === "down" && "tick-flash-down",
        )}
      >
        {lastQuote !== null ? lastQuote.toFixed(4) : "—.————"}
      </p>
      {tickDelta !== null && lastQuote !== null ? (
        <p
          className={cn(
            "market-quote-delta",
            tickDelta >= 0 ? "text-positive" : "text-negative",
          )}
        >
          {tickDelta >= 0 ? "+" : ""}
          {tickDelta.toFixed(4)}
        </p>
      ) : (
        <p className="market-quote-delta text-muted">
          {isConnected ? "Awaiting tick" : "Connect to stream"}
        </p>
      )}
    </div>
  );

  const symbolRail = (
    <div className="market-symbol-rail">
      {POPULAR_SYMBOLS.map((item) => {
        const selected = symbol === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onSymbolChange(item.id);
              if (isConnected) onSubscribe(item.id);
            }}
            className={cn(
              "market-symbol-chip interactive",
              selected && "market-symbol-chip-active",
            )}
            aria-pressed={selected}
          >
            <span className="market-symbol-id">{item.id}</span>
            <span className="market-symbol-label">{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  const content = (
    <div className={cn("market-desk", embedded && "market-desk--embedded")}>
      <div
        className={cn(
          embedded ? cn("market-desk-body", deskContentPane) : "border-b border-border-subtle p-4",
        )}
      >
        {embedded ? (
          <div className="market-desk-toolbar">
            <div className="min-w-0">
              <p className="market-desk-title">{active?.label ?? symbol}</p>
              <p className="market-desk-meta">
                <span className="font-mono">{symbol}</span>
                <span className="mx-1.5 text-border">·</span>
                {active?.group ?? "Market"}
              </p>
            </div>
            {feedControls}
          </div>
        ) : (
          <CardHeader
            title={active?.label ?? symbol}
            subtitle={`${symbol} · ${active?.group ?? "Market"}`}
            action={
              <Button
                variant="secondary"
                size="sm"
                disabled={!isConnected}
                onClick={() => onSubscribe(symbol)}
                className="interactive"
              >
                Stream ticks
              </Button>
            }
          />
        )}

        {quoteBlock}

        <div className="market-chart-frame">
          <AdvancedChart
            ticks={tickHistory}
            symbol={symbol}
            height={chartHeight}
            embedded
          />
        </div>
      </div>

      {symbolRail}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <Card className="overflow-hidden" padding="none" studio>
      {content}
    </Card>
  );
}
