"use client";

import { useMemo, useState } from "react";
import { ANALYSIS_DCIRCLE_SYMBOLS } from "@/lib/terminal/chart-markets";
import { DERIV_SYMBOLS } from "@/lib/markets/symbols";
import { readSignalHack, type SignalHackBias } from "@/lib/terminal/signal-hack";
import type { TickEvent } from "@/lib/ws/protocol";
import { cn } from "@/lib/utils/cn";

interface SignalCenterDeskProps {
  symbol?: string;
  onSymbolChange?: (symbol: string) => void;
  lastQuote?: number | null;
  tickHistory?: TickEvent[];
  isConnected?: boolean;
  onOpenDTrader?: (bias: SignalHackBias) => void;
  onOpenAnalysis?: () => void;
}

const MARKETS = ANALYSIS_DCIRCLE_SYMBOLS.map((id) => ({
  id,
  label: DERIV_SYMBOLS.find((item) => item.id === id)?.shortLabel ?? id,
}));

const FALLBACK_BIAS: SignalHackBias = {
  family: "rise_fall",
  side: "CALL",
  label: "Rise",
  confidence: 0,
};

const STRIP_LIMIT = 24;

export function SignalCenterDesk({
  symbol = "R_100",
  onSymbolChange,
  lastQuote = null,
  tickHistory = [],
  isConnected = false,
  onOpenDTrader,
  onOpenAnalysis,
}: SignalCenterDeskProps) {
  const [localSymbol, setLocalSymbol] = useState(symbol);
  const market = onSymbolChange ? symbol : localSymbol;

  function pickMarket(id: string) {
    if (onSymbolChange) onSymbolChange(id);
    else setLocalSymbol(id);
  }

  const ticks = useMemo(() => {
    const tagged = tickHistory.some((tick) => tick.symbol);
    return tagged
      ? tickHistory.filter((tick) => tick.symbol === market)
      : tickHistory;
  }, [tickHistory, market]);
  const reading = useMemo(() => readSignalHack(ticks), [ticks]);
  const quote = reading.quote ?? lastQuote;
  const hasPulse = ticks.length >= 2;
  const live = isConnected && hasPulse;
  const tone =
    reading.bias?.side === "CALL" ? "is-call" : reading.bias?.side === "PUT" ? "is-put" : "";
  const strip = reading.digits.slice(-STRIP_LIMIT);

  function openDTrader(bias: SignalHackBias = reading.bias ?? FALLBACK_BIAS) {
    onOpenDTrader?.(bias);
  }

  return (
    <div data-testid="signal-center-desk" data-desk className="signal-center" data-scroll-pane>
      <header className="signal-center-toolbar">
        <div className="signal-center-segment">
          <button type="button" className="signal-center-seg is-on">
            Signal Hack
          </button>
        </div>
        <div className="signal-center-toolbar-status">
          <span className={cn("signal-center-chip", hasPulse && "is-live")}>
            {live ? "Live pulse" : hasPulse ? "Feed ready" : "Waiting"}
          </span>
        </div>
      </header>

      <div className="signal-center-subbar">
        <label>
          <span>Market</span>
          <select
            value={market}
            onChange={(event) => pickMarket(event.target.value)}
            aria-label="Signal Hack market"
          >
            {MARKETS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <span className="signal-center-chip">{ticks.length} ticks</span>
        <span className="signal-center-live" aria-live="polite">
          {reading.bias ? (
            <span className="signal-center-chip is-signal">
              {reading.bias.label} · {reading.bias.confidence}%
            </span>
          ) : (
            <span className="signal-center-chip">No lead yet</span>
          )}
        </span>
      </div>

      <div className="signal-center-body">
        <div
          className={cn("signal-center-stage", hasPulse && "is-live", tone)}
          aria-hidden
        >
          <span className="signal-center-orb is-teal" />
          <span className="signal-center-orb is-ink" />
          <span className="signal-center-core" />
          {quote != null ? (
            <strong key={quote} className="signal-center-quote">
              {quote.toFixed(3)}
            </strong>
          ) : null}
          {reading.window ? (
            <span className="signal-center-split">
              <i style={{ width: `${reading.evenPct}%` }} />
            </span>
          ) : null}
          <Sparkline values={reading.values.slice(-40)} />
        </div>

        <div className="signal-center-copy">
          <p className="signal-center-kicker">Trading tools hub</p>
          <h1>Signal Hack</h1>
          <p>
            Reads MA stack and last-digit parity on the live feed, then hands the
            stronger window to D-Trader or Analysis Tool.
          </p>

          {strip.length ? (
            <div className="signal-center-strip" aria-label="Last digits">
              {strip.map((digit, index) => (
                <span
                  key={`${index}-${digit}`}
                  className={digit % 2 === 0 ? "is-even" : "is-odd"}
                >
                  {digit}
                </span>
              ))}
            </div>
          ) : (
            <p className="signal-center-empty">Waiting on ticks for this market.</p>
          )}

          <div className="signal-center-stats">
            <Stat label="Last digit" value={reading.lastDigit == null ? "—" : String(reading.lastDigit)} />
            <Stat
              label="Even / Odd"
              value={
                reading.window
                  ? `${reading.evenPct.toFixed(1)} / ${reading.oddPct.toFixed(1)}`
                  : "—"
              }
            />
            <Stat
              label="Streak"
              value={
                reading.streakLength
                  ? `${reading.streakLength} ${reading.streakSide ?? ""}`
                  : "—"
              }
            />
            <Stat
              label="MA 5 / 20"
              value={
                reading.fastMa != null && reading.slowMa != null
                  ? `${reading.fastMa.toFixed(2)} / ${reading.slowMa.toFixed(2)}`
                  : "—"
              }
            />
          </div>

          <div className="signal-center-rails">
            <Rail
              kicker="Rise / Fall"
              bias={reading.riseFall}
              lead={reading.bias?.family === "rise_fall"}
              empty="Need 20 ticks"
              onOpen={openDTrader}
            />
            <Rail
              kicker="Even / Odd"
              bias={reading.evenOdd}
              lead={reading.bias?.family === "even_odd"}
              empty="Need 8 ticks"
              onOpen={openDTrader}
            />
          </div>

          {reading.cross ? (
            <p className="signal-center-note">
              {reading.cross === "bullish" ? "Bullish" : "Bearish"} MA cross on this window.
            </p>
          ) : null}

          <div className="signal-center-actions">
            <button
              type="button"
              className="signal-center-cta is-ink"
              onClick={() => openDTrader()}
            >
              {reading.bias ? "Trade this signal" : "Open in D-Trader"}
            </button>
            <button
              type="button"
              className="signal-center-cta is-teal"
              onClick={() => onOpenAnalysis?.()}
            >
              Open Analysis Tool
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Rail({
  kicker,
  bias,
  lead,
  empty,
  onOpen,
}: {
  kicker: string;
  bias: SignalHackBias | null;
  lead: boolean;
  empty: string;
  onOpen: (bias: SignalHackBias) => void;
}) {
  return (
    <button
      type="button"
      className={cn("signal-center-rail", lead && "is-lead")}
      disabled={!bias}
      onClick={() => bias && onOpen(bias)}
    >
      <span>{kicker}</span>
      <strong>{bias?.label ?? empty}</strong>
      <i>
        <b style={{ width: `${bias?.confidence ?? 0}%` }} />
      </i>
    </button>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 36 - ((value - min) / span) * 34 - 1;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg className="signal-center-spark" viewBox="0 0 100 36" preserveAspectRatio="none">
      <polyline points={points} />
    </svg>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="signal-center-stat">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}
