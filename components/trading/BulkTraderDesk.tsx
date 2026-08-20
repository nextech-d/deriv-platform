"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TraderAuthLinks } from "@/components/auth/TraderAuthLinks";
import {
  analyzeBarrier,
  analyzeFrequency,
  analyzeMatches,
  analyzeParity,
  digitsFromQuotes,
  lastDigitFromQuote,
} from "@/lib/terminal/analysis-tool";
import { TRADER_DESK_MARKETS } from "@/lib/terminal/chart-markets";
import {
  BULK_MIN_STAKE,
  BULK_WINDOWS,
  bulkDefaultDigit,
  bulkFamily,
  bulkNeedsDigit,
  clampBulkCount,
  clampBulkWindow,
  type BulkTradeFamily,
} from "@/lib/terminal/bulk-trader";
import {
  clampEdgingDuration,
  exitTickAfter,
  pendingProgress,
  ticksForMarket,
} from "@/lib/terminal/edging";
import {
  clampFastStake,
  fastPnl,
  fastTradeKind,
  fastWins,
  type FastTradeType,
} from "@/lib/terminal/fast-trader";
import type { TickEvent } from "@/lib/ws/protocol";
import { cn } from "@/lib/utils/cn";

interface BulkTraderDeskProps {
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
    family: ReturnType<typeof bulkFamily>,
    digit: number,
    duration: number,
  ) => void;
}

function dollars(n: number): string {
  return `$${n.toFixed(2)}`;
}

function toneFor(pct: number): "hot" | "mid" | "cold" {
  if (pct >= 15) return "hot";
  if (pct >= 10) return "mid";
  return "cold";
}

export function BulkTraderDesk({
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
}: BulkTraderDeskProps) {
  const [windowSize, setWindowSize] = useState(120);
  const [tradeType, setTradeType] = useState<BulkTradeFamily>("evenodd");
  const [duration, setDuration] = useState(1);
  const [stake, setStake] = useState(BULK_MIN_STAKE);
  const [bulk, setBulk] = useState(1);
  const [digit, setDigit] = useState(5);
  const [mode, setMode] = useState<"manual" | "auto">("manual");
  const [pendingUi, setPendingUi] = useState(false);
  const [autoLeft, setAutoLeft] = useState(0);
  const [stats, setStats] = useState({ trades: 0, wins: 0, losses: 0, profit: 0 });
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
  const samples = useMemo(() => digitsFromQuotes(ticks, windowSize), [ticks, windowSize]);
  const freq = useMemo(() => analyzeFrequency(samples), [samples]);
  const parity = useMemo(() => analyzeParity(samples), [samples]);
  const barrier = useMemo(() => analyzeBarrier(samples, digit), [samples, digit]);
  const matches = useMemo(() => analyzeMatches(samples, digit), [samples, digit]);
  const quote =
    ticks.at(-1)?.quote ?? (lastTick?.symbol === symbol ? lastTick.quote : null);
  const lastDigit = quote == null ? null : lastDigitFromQuote(quote);
  const pcts = freq.counts.map((count) =>
    freq.window ? Math.round((count / freq.window) * 1000) / 10 : 0,
  );
  const strip = samples.slice(-16);
  const hasPulse = ticks.length >= 2;
  const needsDigit = bulkNeedsDigit(tradeType);
  const outcomes =
    tradeType === "overunder"
      ? [
          { id: "over" as const, label: "Over", pct: barrier.overPct, contract: "DIGITOVER" },
          { id: "under" as const, label: "Under", pct: barrier.underPct, contract: "DIGITUNDER" },
        ]
      : tradeType === "matchesdiffers"
        ? [
            { id: "matches" as const, label: "Matches", pct: matches.matchPct, contract: "DIGITMATCH" },
            { id: "differs" as const, label: "Differs", pct: matches.differPct, contract: "DIGITDIFF" },
          ]
        : [
            { id: "even" as const, label: "Even", pct: parity.evenPct, contract: "DIGITEVEN" },
            { id: "odd" as const, label: "Odd", pct: parity.oddPct, contract: "DIGITODD" },
          ];
  const lead = outcomes[0]!.pct >= outcomes[1]!.pct ? outcomes[0]!.id : outcomes[1]!.id;
  const canTrade = Boolean(onTrade) && isConnected && !tradingLocked && !busy && !pendingRef.current;
  const winRate = stats.trades ? ((stats.wins / stats.trades) * 100).toFixed(1) : "0.0";

  const markets = TRADER_DESK_MARKETS.some((item) => item.id === symbol)
    ? TRADER_DESK_MARKETS
    : [{ id: symbol, label: symbol }, ...TRADER_DESK_MARKETS];

  function play(type: FastTradeType) {
    const kind = fastTradeKind(type);
    if (!onTrade || !canTrade) return;
    if (kind.needsDigit && digit == null) return;
    const tick = ticks.at(-1);
    pendingRef.current = {
      epoch: tick?.epoch ?? 0,
      type,
      stake,
      duration,
      digit,
      entryQuote: tick?.quote ?? quote ?? 0,
    };
    setPendingUi(true);
    onTrade({
      contractType: kind.contract,
      duration,
      durationUnit: "t",
      amount: stake,
      ...(kind.needsDigit ? { lastDigitPrediction: digit, barrier: digit } : {}),
    });
  }

  useEffect(() => {
    pendingRef.current = null;
    setPendingUi(false);
    setMode("manual");
    setAutoLeft(0);
  }, [symbol]);

  useEffect(() => {
    setDigit(bulkDefaultDigit(tradeType));
  }, [tradeType]);

  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending) {
      if (mode === "auto" && autoLeft > 0 && canTrade && ticks.at(-1) && (ticks.at(-1)?.epoch ?? 0) > skipEpochRef.current) {
        skipEpochRef.current = ticks.at(-1)!.epoch;
        play(lead);
      }
      return;
    }
    const exit = exitTickAfter(ticks, pending.epoch, pending.duration);
    if (!exit?.quote) return;
    const win = fastWins({
      type: pending.type,
      exitDigit: lastDigitFromQuote(exit.quote),
      exitQuote: exit.quote,
      entryQuote: pending.entryQuote,
      digit: pending.digit,
    });
    pendingRef.current = null;
    setPendingUi(false);
    setStats((prev) => ({
      trades: prev.trades + 1,
      wins: prev.wins + (win ? 1 : 0),
      losses: prev.losses + (win ? 0 : 1),
      profit: Number((prev.profit + fastPnl(win, pending.stake)).toFixed(2)),
    }));
    setAutoLeft((left) => {
      const next = Math.max(0, left - 1);
      if (next <= 0) setMode("manual");
      return next;
    });
  }, [ticks, mode, autoLeft, canTrade, lead, stake, duration, digit]);

  const progress = pendingRef.current
    ? pendingProgress(ticks, pendingRef.current.epoch, pendingRef.current.duration)
    : null;

  return (
    <div data-testid="bulk-trader-desk" data-desk className="bulk-trader" data-scroll-pane>
      <header className="edging-toolbar">
        <h1>Bulk Trader</h1>
        <div className="edging-toolbar-status">
          <span className={cn("edging-chip", (isConnected || hasPulse) && "is-live")}>
            {isConnected ? "Live" : hasPulse ? "Feed ready" : "Waiting"}
          </span>
          <span className="edging-chip">{freq.window} ticks</span>
        </div>
      </header>

      <div className="edging-body">
        <section className="edging-card edging-controls">
          <div className="fast-types bulk-types" role="tablist" aria-label="Trade family">
            {(
              [
                ["evenodd", "Even / Odd"],
                ["overunder", "Over / Under"],
                ["matchesdiffers", "Matches / Differs"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tradeType === id}
                className={cn("fast-type", tradeType === id && "is-on")}
                onClick={() => setTradeType(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="edging-fields">
            <label>
              <span>Market</span>
              <select
                value={symbol}
                onChange={(event) => onSymbolChange(event.target.value)}
                aria-label="Bulk Trader market"
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
              <span>Window</span>
              <select
                value={windowSize}
                onChange={(event) => setWindowSize(clampBulkWindow(Number(event.target.value)))}
                aria-label="Sample window"
              >
                {BULK_WINDOWS.map((size) => (
                  <option key={size} value={size}>
                    Last {size}
                  </option>
                ))}
              </select>
              <em>Frequency sample</em>
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
            <label>
              <span>Stake</span>
              <input
                type="number"
                min={BULK_MIN_STAKE}
                step={0.05}
                value={stake}
                onChange={(event) => setStake(clampFastStake(Number(event.target.value)))}
              />
              <em>{formatLocal(stake)}</em>
            </label>
            <label>
              <span>Bulk trades</span>
              <input
                type="number"
                min={1}
                max={5}
                value={bulk}
                onChange={(event) => setBulk(clampBulkCount(Number(event.target.value)))}
              />
              <em>Auto rounds</em>
            </label>
            {needsDigit ? (
              <label>
                <span>{tradeType === "overunder" ? "Barrier" : "Digit"}</span>
                <input
                  type="number"
                  min={0}
                  max={9}
                  value={digit}
                  onChange={(event) =>
                    setDigit(Math.max(0, Math.min(9, Number(event.target.value) || 0)))
                  }
                />
                <em>{tradeType === "overunder" ? `Over / Under ${digit}` : `Matches / Differs ${digit}`}</em>
              </label>
            ) : (
              <div className="edging-tick">
                <span>Lead</span>
                <strong>{lead === "even" ? "Even" : "Odd"}</strong>
                <em>Stronger side</em>
              </div>
            )}
            <div className="edging-tick">
              <span>Queue</span>
              <strong>
                {pendingUi && progress ? `${progress.done}/${progress.need}` : mode === "auto" ? String(autoLeft) : "Idle"}
              </strong>
              <em>Open tickets</em>
            </div>
          </div>
        </section>

        <section className="edging-card edging-readout">
          <div className={cn("edging-tick", lastDigit != null && lastDigit === digit && needsDigit && "is-match")}>
            <span>Tape</span>
            <strong>{lastDigit ?? "—"}</strong>
            <em>{quote == null ? "Waiting" : quote.toFixed(3)}</em>
          </div>
          {strip.length ? (
            <div className="edging-strip" aria-label="Recent digits">
              {strip.map((sample, index) => (
                <span
                  key={`${sample.epoch ?? index}-${sample.digit}`}
                  className={cn(
                    needsDigit
                      ? sample.digit === digit && "is-win"
                      : sample.digit % 2 === 0
                        ? "is-win"
                        : "is-lose",
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
            <h2>Digit frequency</h2>
            <div className="edging2-pad">
              {Array.from({ length: 10 }, (_, value) => {
                const pct = pcts[value] ?? 0;
                return (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      "edging2-digit",
                      `is-${toneFor(pct)}`,
                      digit === value && needsDigit && "is-on",
                      lastDigit === value && "is-now",
                    )}
                    onClick={() => setDigit(value)}
                  >
                    <strong>{value}</strong>
                    <em>{pct.toFixed(1)}%</em>
                  </button>
                );
              })}
            </div>
            <p className="edging-legend">Teal ≥15% · Ink &lt;10% · last tick ringed</p>
          </section>

          <section className="edging-card">
            <h2>Ticket</h2>
            <div className="edging2-actions">
              {outcomes.map((side, index) => (
                <button
                  key={side.id}
                  type="button"
                  className={cn(
                    "edging-cta",
                    index === 0 ? "is-teal" : "is-ink",
                    lead === side.id && "is-lead",
                  )}
                  disabled={!canTrade || mode === "auto"}
                  onClick={() => play(side.id)}
                >
                  {side.label}
                  {needsDigit ? ` ${digit}` : ""} · {side.pct.toFixed(1)}%
                </button>
              ))}
            </div>
            <button
              type="button"
              className={cn("edging-cta is-reset", mode === "auto" ? "is-ghost" : "is-ink")}
              disabled={!canTrade && mode !== "auto"}
              onClick={() => {
                if (mode === "auto") {
                  setMode("manual");
                  setAutoLeft(0);
                  return;
                }
                skipEpochRef.current = ticks.at(-1)?.epoch ?? 0;
                setAutoLeft(bulk);
                setMode("auto");
              }}
            >
              {mode === "auto" ? `Stop auto · ${autoLeft} left` : `Start auto · ${bulk}`}
            </button>
            {pendingUi && progress ? (
              <div className="edging-meter" aria-label={`Ticket ${progress.done} of ${progress.need} ticks`}>
                <i style={{ width: `${(progress.done / progress.need) * 100}%` }} />
              </div>
            ) : null}
            {onOpenDTrader ? (
              <button
                type="button"
                className="edging-cta is-ghost is-reset"
                onClick={() => onOpenDTrader(bulkFamily(tradeType), digit, duration)}
              >
                Open in D-Trader
              </button>
            ) : null}
            {tradingLocked ? (
              <div className="edging-notice">
                <p>Log in with Deriv to place bulk tickets.</p>
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
            <Stat label="Lead" value={outcomes.find((item) => item.id === lead)?.label ?? "—"} />
          </div>
          <button
            type="button"
            className="edging-cta is-ghost is-reset"
            onClick={() => {
              pendingRef.current = null;
              setPendingUi(false);
              setMode("manual");
              setAutoLeft(0);
              setStats({ trades: 0, wins: 0, losses: 0, profit: 0 });
            }}
          >
            Reset
          </button>
        </section>
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
