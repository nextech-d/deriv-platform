"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TraderAuthLinks } from "@/components/auth/TraderAuthLinks";
import { lastDigitFromQuote } from "@/lib/terminal/analysis-tool";
import { TRADER_DESK_MARKETS } from "@/lib/terminal/chart-markets";
import {
  clampEdgingDuration,
  exitTickAfter,
  pendingProgress,
  ticksForMarket,
} from "@/lib/terminal/edging";
import {
  FAST_MIN_STAKE,
  FAST_TRADE_TYPES,
  clampFastStake,
  fastMartingaleStake,
  fastPnl,
  fastTradeKind,
  fastTraderFamily,
  fastWins,
  type FastTradeType,
} from "@/lib/terminal/fast-trader";
import type { TickEvent } from "@/lib/ws/protocol";
import { cn } from "@/lib/utils/cn";

interface FastTraderDeskProps {
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
  onOpenDTrader?: (
    family: ReturnType<typeof fastTraderFamily>,
    digit: number,
    duration: number,
  ) => void;
}

function dollars(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function FastTraderDesk({
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
}: FastTraderDeskProps) {
  const [activeType, setActiveType] = useState<FastTradeType>("even");
  const [stake, setStake] = useState(FAST_MIN_STAKE);
  const [duration, setDuration] = useState(1);
  const [digit, setDigit] = useState(5);
  const [useMartingale, setUseMartingale] = useState(true);
  const [mode, setMode] = useState<"manual" | "auto">("manual");
  const [stats, setStats] = useState({
    trades: 0,
    wins: 0,
    losses: 0,
    profit: 0,
    consecutiveLosses: 0,
  });
  const [pendingUi, setPendingUi] = useState(false);
  const pendingRef = useRef<{
    epoch: number;
    type: FastTradeType;
    stake: number;
    duration: number;
    digit: number;
    entryQuote: number;
  } | null>(null);
  const skipEpochRef = useRef(0);

  const ticks = useMemo(
    () => ticksForMarket(tickHistory, symbol) as TickEvent[],
    [tickHistory, symbol],
  );
  const quote =
    ticks.at(-1)?.quote ?? (lastTick?.symbol === symbol ? lastTick.quote : null);
  const lastDigit = quote == null ? null : lastDigitFromQuote(quote);
  const kind = fastTradeKind(activeType);
  const strip = ticks.slice(-10).map((tick) => lastDigitFromQuote(tick.quote));
  const nextStake = useMartingale
    ? fastMartingaleStake(stake, stats.consecutiveLosses)
    : clampFastStake(stake);
  const canTrade = Boolean(onTrade) && isConnected && !tradingLocked && !busy;
  const winRate = stats.trades ? ((stats.wins / stats.trades) * 100).toFixed(1) : "0.0";
  const hasPulse = ticks.length >= 2;

  function fire(size = nextStake) {
    if (!onTrade || !canTrade || pendingRef.current) return;
    const tick = ticks.at(-1);
    pendingRef.current = {
      epoch: tick?.epoch ?? 0,
      type: activeType,
      stake: size,
      duration,
      digit,
      entryQuote: tick?.quote ?? quote ?? 0,
    };
    setPendingUi(true);
    onTrade({
      contractType: kind.contract,
      duration,
      durationUnit: "t",
      amount: size,
      ...(kind.needsDigit ? { lastDigitPrediction: digit, barrier: digit } : {}),
    });
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
    const exitDigit = lastDigitFromQuote(exit.quote);
    const win = fastWins({
      type: pending.type,
      exitDigit,
      exitQuote: exit.quote,
      entryQuote: pending.entryQuote,
      digit: pending.digit,
    });
    const pnl = fastPnl(win, pending.stake);
    pendingRef.current = null;
    setPendingUi(false);
    setStats((prev) => ({
      trades: prev.trades + 1,
      wins: prev.wins + (win ? 1 : 0),
      losses: prev.losses + (win ? 0 : 1),
      profit: Number((prev.profit + pnl).toFixed(2)),
      consecutiveLosses: win ? 0 : prev.consecutiveLosses + 1,
    }));
  }, [ticks, mode, canTrade, nextStake, activeType, duration, digit]);

  const progress = pendingRef.current
    ? pendingProgress(ticks, pendingRef.current.epoch, pendingRef.current.duration)
    : null;

  const markets = TRADER_DESK_MARKETS.some((item) => item.id === symbol)
    ? TRADER_DESK_MARKETS
    : [{ id: symbol, label: symbol }, ...TRADER_DESK_MARKETS];

  return (
    <div data-testid="fast-trader-desk" data-desk className="fast-trader" data-scroll-pane>
      <header className="edging-toolbar">
        <h1>Fast Trader</h1>
        <div className="edging-toolbar-status">
          <span className={cn("edging-chip", (isConnected || hasPulse) && "is-live")}>
            {isConnected ? "Live" : hasPulse ? "Feed ready" : "Waiting"}
          </span>
          <span className="edging-chip">{kind.label}</span>
        </div>
      </header>

      <div className="edging-body">
        <section className="edging-card edging-controls">
          <div className="fast-types" role="tablist" aria-label="Trade type">
            {FAST_TRADE_TYPES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={activeType === item.id}
                className={cn("fast-type", activeType === item.id && "is-on")}
                onClick={() => setActiveType(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="edging-fields">
            <label>
              <span>Market</span>
              <select
                value={symbol}
                onChange={(event) => onSymbolChange(event.target.value)}
                aria-label="Fast Trader market"
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
                min={FAST_MIN_STAKE}
                step={0.05}
                value={stake}
                onChange={(event) => setStake(clampFastStake(Number(event.target.value)))}
              />
              <em>{formatLocal(nextStake)} next</em>
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
                lastDigit != null && lastDigit % 2 === 0 && "is-cover",
                lastDigit != null && lastDigit % 2 === 1 && "is-lose",
              )}
            >
              <span>Last digit</span>
              <strong>{lastDigit ?? "—"}</strong>
              <em>{quote == null ? "Waiting" : quote.toFixed(3)}</em>
            </div>
          </div>

          <div className="edging-fields">
            <div className="edging-field-control">
              <span>Mode</span>
              <div className="edging-segment" role="tablist" aria-label="Fast Trader mode">
                {(["manual", "auto"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="tab"
                    aria-selected={mode === item}
                    className={cn("edging-seg", mode === item && "is-on")}
                    onClick={() => {
                      if (item === "auto") skipEpochRef.current = ticks.at(-1)?.epoch ?? 0;
                      setMode(item);
                    }}
                  >
                    {item === "manual" ? "Manual" : "Auto"}
                  </button>
                ))}
              </div>
              <em>{mode === "auto" ? "Fires on the next tick" : "Place one ticket"}</em>
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
              <em>Doubles after a loss</em>
            </label>
            {kind.needsDigit ? (
              <label>
                <span>{activeType === "over" || activeType === "under" ? "Barrier" : "Digit"}</span>
                <input
                  type="number"
                  min={0}
                  max={9}
                  value={digit}
                  onChange={(event) =>
                    setDigit(Math.max(0, Math.min(9, Number(event.target.value) || 0)))
                  }
                  aria-label="Digit or barrier"
                />
                <em>
                  {activeType === "over" || activeType === "under"
                    ? `Over / Under ${digit}`
                    : `Matches / Differs ${digit}`}
                </em>
              </label>
            ) : (
              <div className="edging-tick">
                <span>Contract</span>
                <strong>{kind.label}</strong>
                <em>No digit needed</em>
              </div>
            )}
            <div className="edging-tick">
              <span>Ticket</span>
              <strong>
                {pendingUi && progress ? `${progress.done}/${progress.need}` : "Idle"}
              </strong>
              <em>Open tickets</em>
            </div>
          </div>

          {kind.needsDigit ? (
            <div className="fast-pad" role="group" aria-label="Digit pad">
              {Array.from({ length: 10 }, (_, value) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    "fast-pad-btn",
                    digit === value && "is-on",
                    lastDigit === value && "is-now",
                  )}
                  onClick={() => setDigit(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          ) : null}

          <div className="fast-actions">
            <button
              type="button"
              className="edging-cta is-ink"
              disabled={!canTrade || mode === "auto" || pendingUi}
              onClick={() => fire()}
            >
              Trade {kind.label} · {formatLocal(nextStake)}
            </button>
            <button
              type="button"
              className={cn("edging-cta", mode === "auto" ? "is-ghost" : "is-teal")}
              disabled={!canTrade && mode !== "auto"}
              onClick={() => {
                if (mode === "auto") {
                  setMode("manual");
                  return;
                }
                skipEpochRef.current = ticks.at(-1)?.epoch ?? 0;
                setMode("auto");
              }}
            >
              {mode === "auto" ? "Stop Auto" : "Start Auto"}
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
        </section>

        {tradingLocked ? (
          <div className="edging-notice">
            <p>Log in with Deriv to place Fast Trader tickets.</p>
            <TraderAuthLinks />
          </div>
        ) : null}

        <div className="edging-grid">
          <section className="edging-card">
            <h2>Recent digits</h2>
            <div className="edging-strip" aria-label="Recent digits">
              {strip.length ? (
                strip.map((value, index) => (
                  <span
                    key={`${index}-${value}`}
                    className={cn(
                      kind.needsDigit
                        ? value === digit && "is-win"
                        : value % 2 === 0
                          ? "is-win"
                          : "is-lose",
                      index === strip.length - 1 && "is-now",
                    )}
                  >
                    {value}
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
              <Stat label="Trades" value={String(stats.trades)} />
              <Stat label="Wins" value={String(stats.wins)} />
              <Stat label="Losses" value={String(stats.losses)} />
              <Stat label="Win rate" value={`${winRate}%`} />
              <Stat label="P/L" value={formatLocal(stats.profit)} />
              <Stat label="Loss streak" value={String(stats.consecutiveLosses)} />
            </div>
            {onOpenDTrader ? (
              <button
                type="button"
                className="edging-cta is-ghost is-reset"
                onClick={() => onOpenDTrader(fastTraderFamily(activeType), digit, duration)}
              >
                Open in D-Trader
              </button>
            ) : null}
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
              Reset
            </button>
          </section>
        </div>
      </div>
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
