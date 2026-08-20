"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TraderAuthLinks } from "@/components/auth/TraderAuthLinks";
import { DERIV_SYMBOLS } from "@/lib/markets/symbols";
import {
  digitsFromQuotes,
  lastDigitFromQuote,
} from "@/lib/terminal/analysis-tool";
import {
  EDGING_LOSE_DIGITS,
  EDGING_MIN_TOTAL,
  EDGING_OVER_BARRIER,
  EDGING_UNDER_BARRIER,
  clampEdgingDuration,
  edgingPnl,
  edgingWins,
  exitTickAfter,
  pendingProgress,
  perLegStake,
  ticksForMarket,
} from "@/lib/terminal/edging";
import type { TickEvent } from "@/lib/ws/protocol";
import { cn } from "@/lib/utils/cn";

interface EdgingDeskProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  lastTick: TickEvent | null;
  tickHistory: TickEvent[];
  isConnected: boolean;
  tradingLocked?: boolean;
  busy?: boolean;
  formatLocal?: (value: number) => string;
  onTrade?: (totalStake: number, duration: number) => void;
  onOpenDTrader?: (duration: number) => void;
}

const MARKETS = DERIV_SYMBOLS.filter(
  (item) => item.group === "volatility" || item.group === "volatility_1s",
);

function dollars(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function EdgingDesk({
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
}: EdgingDeskProps) {
  const [stake, setStake] = useState(0.7);
  const [duration, setDuration] = useState(1);
  const [mode, setMode] = useState<"manual" | "auto">("manual");
  const [useMartingale, setUseMartingale] = useState(true);
  const [stopAfter, setStopAfter] = useState(3);
  const [stats, setStats] = useState({
    trades: 0,
    wins: 0,
    losses: 0,
    profit: 0,
    consecutiveLosses: 0,
  });

  const ticks = useMemo(
    () => ticksForMarket(tickHistory, symbol) as TickEvent[],
    [tickHistory, symbol],
  );
  const samples = useMemo(() => digitsFromQuotes(ticks, 20), [ticks]);
  const quote =
    ticks.at(-1)?.quote ?? (lastTick?.symbol === symbol ? lastTick.quote : null);
  const lastDigit = quote == null ? null : lastDigitFromQuote(quote);
  const freqs = useMemo(() => {
    const counts = Array.from({ length: 10 }, () => 0);
    for (const sample of samples) counts[sample.digit] += 1;
    return counts;
  }, [samples]);
  const cover = samples.filter((sample) => edgingWins(sample.digit)).length;
  const kills = samples.length - cover;

  const nextStake = useMemo(() => {
    const losses = useMartingale ? stats.consecutiveLosses : 0;
    const sized = stake * 2 ** Math.min(losses, 4);
    return Math.round(Math.max(EDGING_MIN_TOTAL, sized) * 100) / 100;
  }, [stake, stats.consecutiveLosses, useMartingale]);
  const perContract = perLegStake(nextStake);
  const canTrade = Boolean(onTrade) && isConnected && !tradingLocked && !busy;
  const winRate = stats.trades ? ((stats.wins / stats.trades) * 100).toFixed(1) : "0.0";
  const hasPulse = ticks.length >= 2;

  const pendingRef = useRef<{ epoch: number; stake: number; duration: number } | null>(null);
  const skipEpochRef = useRef<number>(0);
  const [pendingUi, setPendingUi] = useState(false);

  function fire(size = nextStake) {
    if (!onTrade || !isConnected || tradingLocked || busy || pendingRef.current) return;
    const tick = ticks.at(-1);
    pendingRef.current = {
      epoch: tick?.epoch ?? 0,
      stake: size,
      duration,
    };
    setPendingUi(true);
    onTrade(size, duration);
  }

  useEffect(() => {
    pendingRef.current = null;
    setPendingUi(false);
  }, [symbol]);

  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending) {
      if (
        mode === "auto" &&
        canTrade &&
        ticks.at(-1) &&
        (ticks.at(-1)?.epoch ?? 0) > skipEpochRef.current
      ) {
        skipEpochRef.current = ticks.at(-1)!.epoch;
        fire(nextStake);
      }
      return;
    }
    const exit = exitTickAfter(ticks, pending.epoch, pending.duration);
    if (!exit?.quote) return;
    const digit = lastDigitFromQuote(exit.quote);
    const win = edgingWins(digit);
    const pnl = edgingPnl(digit, pending.stake);
    pendingRef.current = null;
    setPendingUi(false);
    let stopAuto = false;
    setStats((prev) => {
      const consecutiveLosses = win ? 0 : prev.consecutiveLosses + 1;
      stopAuto =
        !win && stopAfter > 0 && consecutiveLosses >= stopAfter && mode === "auto";
      return {
        trades: prev.trades + 1,
        wins: prev.wins + (win ? 1 : 0),
        losses: prev.losses + (win ? 0 : 1),
        profit: Number((prev.profit + pnl).toFixed(2)),
        consecutiveLosses,
      };
    });
    if (stopAuto) setMode("manual");
  }, [ticks, mode, canTrade, nextStake, stopAfter]);

  const progress = pendingRef.current
    ? pendingProgress(ticks, pendingRef.current.epoch, pendingRef.current.duration)
    : null;

  const markets = MARKETS.some((item) => item.id === symbol)
    ? MARKETS
    : [
        {
          id: symbol,
          label: symbol,
          shortLabel: symbol,
          group: "volatility" as const,
          tickMs: 2000,
        },
        ...MARKETS,
      ];

  return (
    <div data-testid="edging-desk" data-desk className="edging" data-scroll-pane>
      <header className="edging-toolbar">
        <h1>Edging</h1>
        <div className="edging-toolbar-status">
          <span className={cn("edging-chip", (isConnected || hasPulse) && "is-live")}>
            {isConnected ? "Live" : hasPulse ? "Feed ready" : "Waiting"}
          </span>
          <span className="edging-chip">
            Over {EDGING_OVER_BARRIER} · Under {EDGING_UNDER_BARRIER}
          </span>
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
                aria-label="Edging market"
              >
                {markets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.shortLabel ?? item.label}
                  </option>
                ))}
              </select>
              <em>Synthetic</em>
            </label>
            <label>
              <span>Total stake</span>
              <input
                type="number"
                min={EDGING_MIN_TOTAL}
                step={0.1}
                value={stake}
                onChange={(event) =>
                  setStake(Math.max(EDGING_MIN_TOTAL, Number(event.target.value) || EDGING_MIN_TOTAL))
                }
              />
              <em>Per leg {formatLocal(perContract)}</em>
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
            <div
              className={cn(
                "edging-tick",
                lastDigit != null && (EDGING_LOSE_DIGITS.has(lastDigit) ? "is-lose" : "is-cover"),
              )}
            >
              <span>Last digit</span>
              <strong>{lastDigit ?? "—"}</strong>
              <em>
                {quote == null
                  ? "Waiting"
                  : lastDigit != null && EDGING_LOSE_DIGITS.has(lastDigit)
                    ? "Kill"
                    : "Cover"}
              </em>
            </div>
          </div>

          <div className="edging-kpis">
            <Kpi label="Cover in window" value={samples.length ? `${cover}/${samples.length}` : "—"} />
            <Kpi label="Kill (4/5)" value={samples.length ? String(kills) : "—"} />
            <Kpi label="Next pair" value={formatLocal(nextStake)} />
          </div>

          <div className="edging-fields">
            <div className="edging-field-control">
              <span>Mode</span>
              <div className="edging-segment" role="tablist" aria-label="Edging mode">
                {(["manual", "auto"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="tab"
                    aria-selected={mode === item}
                    className={cn("edging-seg", mode === item && "is-on")}
                    onClick={() => {
                      if (item === "auto") {
                        skipEpochRef.current = ticks.at(-1)?.epoch ?? 0;
                      }
                      setMode(item);
                    }}
                  >
                    {item === "manual" ? "Manual" : "Auto"}
                  </button>
                ))}
              </div>
              <em>{mode === "auto" ? "Fires on the next tick" : "Place the pair yourself"}</em>
            </div>
            <label className="edging-check-field">
              <span>Martingale</span>
              <span className="edging-check-box">
                <input
                  type="checkbox"
                  checked={useMartingale}
                  onChange={(event) => setUseMartingale(event.target.checked)}
                />
                {useMartingale ? "On" : "Off"}
              </span>
              <em>Doubles after a kill</em>
            </label>
            <label>
              <span>Stop after</span>
              <input
                type="number"
                min={0}
                max={10}
                value={stopAfter}
                onChange={(event) =>
                  setStopAfter(Math.max(0, Math.min(10, Number(event.target.value) || 0)))
                }
                aria-label="Stop auto after consecutive losses"
              />
              <em>{stopAfter ? `${stopAfter} kills` : "No auto stop"}</em>
            </label>
            <div className="edging-tick">
              <span>Pair</span>
              <strong>
                {pendingUi && progress ? `${progress.done}/${progress.need}` : "Idle"}
              </strong>
              <em>Open tickets</em>
            </div>
          </div>

          <button
            type="button"
            className="edging-cta is-ink"
            disabled={!canTrade || mode === "auto" || pendingUi}
            onClick={() => fire()}
          >
            Buy Over {EDGING_OVER_BARRIER} & Under {EDGING_UNDER_BARRIER} · {formatLocal(nextStake)}
          </button>
          {pendingUi && progress ? (
            <div
              className="edging-meter"
              aria-label={`Pair ${progress.done} of ${progress.need} ticks`}
            >
              <i style={{ width: `${(progress.done / progress.need) * 100}%` }} />
            </div>
          ) : null}
        </section>

        {tradingLocked ? (
          <div className="edging-notice">
            <p>Log in with Deriv to place the pair.</p>
            <TraderAuthLinks />
          </div>
        ) : null}

        <div className="edging-grid">
          <section className="edging-card">
            <h2>Recent digits</h2>
            <div className="edging-strip">
              {samples.length ? (
                samples.map((sample, index) => (
                  <span
                    key={`${sample.epoch ?? index}-${sample.digit}`}
                    className={cn(
                      EDGING_LOSE_DIGITS.has(sample.digit) ? "is-lose" : "is-win",
                      index === samples.length - 1 && "is-now",
                    )}
                  >
                    {sample.digit}
                  </span>
                ))
              ) : (
                <p>Waiting on ticks for this market.</p>
              )}
            </div>
          </section>

          <section className="edging-card">
            <h2>Session</h2>
            <div className="edging-stats">
              <Stat label="Pairs" value={String(stats.trades)} />
              <Stat label="Cover" value={String(stats.wins)} />
              <Stat label="Kill" value={String(stats.losses)} />
              <Stat label="Cover rate" value={`${winRate}%`} />
              <Stat label="P/L" value={formatLocal(stats.profit)} />
              <Stat label="Kill streak" value={String(stats.consecutiveLosses)} />
            </div>
            <button
              type="button"
              className="edging-cta is-ghost is-reset"
              onClick={() => {
                pendingRef.current = null;
                setPendingUi(false);
                setMode("manual");
                setStats({ trades: 0, wins: 0, losses: 0, profit: 0, consecutiveLosses: 0 });
              }}
            >
              Reset statistics
            </button>
          </section>

          <section className="edging-card">
            <h2>Digit frequency (last {samples.length || 20})</h2>
            <div className="edging-freq">
              {freqs.map((count, digit) => (
                <div
                  key={digit}
                  className={cn("edging-freq-row", EDGING_LOSE_DIGITS.has(digit) && "is-lose")}
                >
                  <span className={cn(EDGING_LOSE_DIGITS.has(digit) && "is-lose")}>{digit}</span>
                  <i>
                    <b style={{ width: `${samples.length ? (count / samples.length) * 100 : 0}%` }} />
                  </i>
                  <em>{count}</em>
                </div>
              ))}
            </div>
          </section>

          <section className="edging-card">
            <h2>How it works</h2>
            <p>
              Places Over {EDGING_OVER_BARRIER} and Under {EDGING_UNDER_BARRIER} together.
              0–3 pays the Under leg, 6–9 pays the Over leg. Both legs lose only on 4 and 5.
              Cover ticks are one win and one loss, so P/L stays small unless a kill digit lands.
            </p>
            {onOpenDTrader ? (
              <button
                type="button"
                className="edging-cta is-ghost is-reset"
                onClick={() => onOpenDTrader(duration)}
              >
                Open Over / Under in D-Trader
              </button>
            ) : null}
          </section>
        </div>
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
