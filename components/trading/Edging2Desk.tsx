"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TraderAuthLinks } from "@/components/auth/TraderAuthLinks";
import { EDGING2_MARKETS } from "@/lib/terminal/chart-markets";
import {
  analyzeFrequency,
  analyzeMatches,
  digitsFromQuotes,
  lastDigitFromQuote,
} from "@/lib/terminal/analysis-tool";
import {
  clampEdgingDuration,
  exitTickAfter,
  pendingProgress,
  ticksForMarket,
} from "@/lib/terminal/edging";
import type { TickEvent } from "@/lib/ws/protocol";
import { cn } from "@/lib/utils/cn";

interface Edging2DeskProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  lastTick: TickEvent | null;
  tickHistory: TickEvent[];
  isConnected: boolean;
  tradingLocked?: boolean;
  busy?: boolean;
  formatLocal?: (value: number) => string;
  onTrade?: (payload: {
    contractType: string;
    lastDigitPrediction?: number;
    barrier?: number;
    duration?: number;
    durationUnit?: string;
    amount?: number;
  }) => void;
  onOpenDTrader?: (digit: number, side: "CALL" | "PUT", duration: number) => void;
}

const WINDOWS = [50, 100, 200];

function dollars(n: number): string {
  return `$${n.toFixed(2)}`;
}

function toneFor(pct: number): "hot" | "mid" | "cold" {
  if (pct >= 15) return "hot";
  if (pct >= 10) return "mid";
  return "cold";
}

export function Edging2Desk({
  symbol,
  onSymbolChange,
  lastTick,
  tickHistory,
  isConnected,
  tradingLocked = false,
  busy = false,
  formatLocal = dollars,
  onTrade,
  onOpenDTrader,
}: Edging2DeskProps) {
  const [stake, setStake] = useState(0.35);
  const [duration, setDuration] = useState(1);
  const [windowSize, setWindowSize] = useState(100);
  const [selectedDigit, setSelectedDigit] = useState<number | null>(null);
  const [stats, setStats] = useState({ trades: 0, wins: 0, losses: 0, profit: 0 });
  const [pendingUi, setPendingUi] = useState(false);
  const pendingRef = useRef<{
    epoch: number;
    digit: number;
    matches: boolean;
    stake: number;
    duration: number;
  } | null>(null);

  const ticks = useMemo(
    () => ticksForMarket(tickHistory, symbol) as TickEvent[],
    [tickHistory, symbol],
  );
  const samples = useMemo(() => digitsFromQuotes(ticks, windowSize), [ticks, windowSize]);
  const freq = useMemo(() => analyzeFrequency(samples), [samples]);
  const quote =
    ticks.at(-1)?.quote ?? (lastTick?.symbol === symbol ? lastTick.quote : null);
  const lastDigit = quote == null ? null : lastDigitFromQuote(quote);
  const pcts = freq.counts.map((count) =>
    freq.window ? Math.round((count / freq.window) * 1000) / 10 : 0,
  );
  const matchStats = useMemo(
    () => (selectedDigit == null ? null : analyzeMatches(samples, selectedDigit)),
    [samples, selectedDigit],
  );
  const canTrade =
    Boolean(onTrade) &&
    isConnected &&
    !tradingLocked &&
    !busy &&
    selectedDigit != null &&
    !pendingRef.current;
  const winRate = stats.trades ? ((stats.wins / stats.trades) * 100).toFixed(1) : "0.0";
  const selectedPct = selectedDigit == null ? null : pcts[selectedDigit];
  const suggest =
    selectedPct == null ? null : selectedPct >= 15 ? "matches" : selectedPct < 10 ? "differs" : null;
  const hasPulse = ticks.length >= 2;
  const strip = samples.slice(-24);

  function play(side: "matches" | "differs") {
    if (selectedDigit == null || !canTrade) return;
    const tick = ticks.at(-1);
    pendingRef.current = {
      epoch: tick?.epoch ?? 0,
      digit: selectedDigit,
      matches: side === "matches",
      stake,
      duration,
    };
    setPendingUi(true);
    onTrade?.({
      contractType: side === "matches" ? "DIGITMATCH" : "DIGITDIFF",
      lastDigitPrediction: selectedDigit,
      barrier: selectedDigit,
      duration,
      durationUnit: "t",
      amount: stake,
    });
  }

  useEffect(() => {
    pendingRef.current = null;
    setPendingUi(false);
  }, [symbol]);

  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    const exit = exitTickAfter(ticks, pending.epoch, pending.duration);
    if (!exit?.quote) return;
    const digit = lastDigitFromQuote(exit.quote);
    const win = pending.matches ? digit === pending.digit : digit !== pending.digit;
    pendingRef.current = null;
    setPendingUi(false);
    setStats((prev) => ({
      trades: prev.trades + 1,
      wins: prev.wins + (win ? 1 : 0),
      losses: prev.losses + (win ? 0 : 1),
      profit: Number((prev.profit + (win ? pending.stake * 0.95 : -pending.stake)).toFixed(2)),
    }));
  }, [ticks]);

  const progress = pendingRef.current
    ? pendingProgress(ticks, pendingRef.current.epoch, pendingRef.current.duration)
    : null;

  const markets = EDGING2_MARKETS.some((item) => item.id === symbol)
    ? EDGING2_MARKETS
    : [{ id: symbol, label: symbol }, ...EDGING2_MARKETS];

  return (
    <div data-testid="edging-2-desk" data-desk className="edging-2" data-scroll-pane>
      <header className="edging-toolbar">
        <h1>Edging 2</h1>
        <div className="edging-toolbar-status">
          <span className={cn("edging-chip", (isConnected || hasPulse) && "is-live")}>
            {isConnected ? "Live" : hasPulse ? "Feed ready" : "Waiting"}
          </span>
          <span className="edging-chip">{freq.window} ticks</span>
        </div>
      </header>

      <div className="edging-body">
        <section className="edging-card edging-controls">
          <div className="edging-fields">
            <label>
              <span>Market</span>
              <select
                value={symbol}
                onChange={(event) => onSymbolChange(event.target.value)}
                aria-label="Edging 2 market"
              >
                {markets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <em>Synthetic</em>
            </label>
            <label>
              <span>Stake</span>
              <input
                type="number"
                min={0.35}
                step={0.05}
                value={stake}
                onChange={(event) => setStake(Math.max(0.35, Number(event.target.value) || 0.35))}
              />
              <em>{formatLocal(stake)}</em>
            </label>
            <label>
              <span>Duration (ticks)</span>
              <input
                type="number"
                min={1}
                max={10}
                value={duration}
                onChange={(event) => setDuration(clampEdgingDuration(Number(event.target.value)))}
              />
              <em>1–10 ticks</em>
            </label>
            <label>
              <span>Window</span>
              <select
                value={windowSize}
                onChange={(event) => setWindowSize(Number(event.target.value))}
                aria-label="Digit window"
              >
                {WINDOWS.map((size) => (
                  <option key={size} value={size}>
                    Last {size}
                  </option>
                ))}
              </select>
              <em>Sample size</em>
            </label>
          </div>
          <div className="edging-kpis">
            <Kpi label="Hot" value={freq.hot.length ? freq.hot.join(" · ") : "—"} />
            <Kpi label="Cold" value={freq.cold.length ? freq.cold.join(" · ") : "—"} />
            <Kpi label="Selected" value={selectedDigit == null ? "—" : String(selectedDigit)} />
          </div>
        </section>

        <section className="edging-card edging-readout">
          <div className={cn("edging-tick", lastDigit != null && lastDigit === selectedDigit && "is-match")}>
            <span>Last digit</span>
            <strong>{lastDigit ?? "—"}</strong>
            <em>{quote == null ? "Waiting" : quote.toFixed(3)}</em>
          </div>
          {strip.length ? (
            <div className="edging-strip" aria-label="Recent digits">
              {strip.map((sample, index) => (
                <span
                  key={`${sample.epoch ?? index}-${sample.digit}`}
                  className={cn(
                    sample.digit === selectedDigit && "is-win",
                    index === strip.length - 1 && "is-now",
                  )}
                >
                  {sample.digit}
                </span>
              ))}
            </div>
          ) : (
            <p className="edging-note">Waiting on ticks for this market.</p>
          )}
        </section>

        <div className="edging-grid">
          <section className="edging-card">
            <h2>Digit analysis</h2>
            <div className="edging2-pad">
              {Array.from({ length: 10 }, (_, digit) => {
                const pct = pcts[digit] ?? 0;
                return (
                  <button
                    key={digit}
                    type="button"
                    className={cn(
                      "edging2-digit",
                      `is-${toneFor(pct)}`,
                      selectedDigit === digit && "is-on",
                      lastDigit === digit && "is-now",
                      freq.hot.includes(digit) && "is-hot-rank",
                    )}
                    onClick={() => setSelectedDigit(digit)}
                  >
                    <strong>{digit}</strong>
                    <em>{pct.toFixed(1)}%</em>
                  </button>
                );
              })}
            </div>
            <p className="edging-legend">
              Teal ≥15% Matches · Ink &lt;10% Differs · last tick ringed
            </p>
          </section>

          <section className="edging-card">
            <h2>Ticket</h2>
            <p>
              Selected digit: <strong>{selectedDigit ?? "None"}</strong>
              {matchStats
                ? ` · matches ${matchStats.matchPct.toFixed(1)}% / differs ${matchStats.differPct.toFixed(1)}%`
                : ""}
              {suggest ? ` · bias ${suggest}` : ""}
            </p>
            <div className="edging2-actions">
              <button
                type="button"
                className={cn("edging-cta is-teal", suggest === "matches" && "is-lead")}
                disabled={!canTrade}
                onClick={() => play("matches")}
              >
                Matches {selectedDigit ?? ""}
              </button>
              <button
                type="button"
                className={cn("edging-cta is-ink", suggest === "differs" && "is-lead")}
                disabled={!canTrade}
                onClick={() => play("differs")}
              >
                Differs {selectedDigit ?? ""}
              </button>
            </div>
            {pendingUi && progress ? (
              <div
                className="edging-meter"
                aria-label={`Ticket ${progress.done} of ${progress.need} ticks`}
              >
                <i style={{ width: `${(progress.done / progress.need) * 100}%` }} />
              </div>
            ) : null}
            {selectedDigit != null && onOpenDTrader ? (
              <button
                type="button"
                className="edging-cta is-ghost is-reset"
                onClick={() =>
                  onOpenDTrader(
                    selectedDigit,
                    suggest === "differs" ? "PUT" : "CALL",
                    duration,
                  )
                }
              >
                Open in D-Trader
              </button>
            ) : null}
            {tradingLocked ? (
              <div className="edging-notice">
                <p>Log in with Deriv to place Matches / Differs.</p>
                <TraderAuthLinks />
              </div>
            ) : null}
          </section>
        </div>

        <section className="edging-card">
          <h2>Session</h2>
          <div className="edging-stats">
            <Stat label="Trades" value={String(stats.trades)} />
            <Stat label="Wins" value={String(stats.wins)} />
            <Stat label="Losses" value={String(stats.losses)} />
            <Stat label="Win rate" value={`${winRate}%`} />
            <Stat label="P/L" value={formatLocal(stats.profit)} />
            <Stat label="Bias" value={suggest ?? "—"} />
          </div>
          <button
            type="button"
            className="edging-cta is-ghost is-reset"
            onClick={() => {
              pendingRef.current = null;
              setPendingUi(false);
              setStats({ trades: 0, wins: 0, losses: 0, profit: 0 });
              setSelectedDigit(null);
            }}
          >
            Reset
          </button>
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="edging-kpi">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="edging-stat">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}
