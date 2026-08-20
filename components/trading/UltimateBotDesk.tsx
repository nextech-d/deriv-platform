"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TraderAuthLinks } from "@/components/auth/TraderAuthLinks";
import { lastDigitFromQuote } from "@/lib/terminal/analysis-tool";
import { ULTIMATE_BOT_MARKETS } from "@/lib/terminal/chart-markets";
import {
  clampEdgingDuration,
  exitTickAfter,
  pendingProgress,
  ticksForMarket,
} from "@/lib/terminal/edging";
import { clampFastStake } from "@/lib/terminal/fast-trader";
import {
  ULTIMATE_INITIAL,
  ULTIMATE_MIN_STAKE,
  ULTIMATE_RECOVERY,
  clampMartMultiplier,
  clampUltimateWindow,
  digitsFromTicks,
  ultimateFamily,
  ultimateInitialScan,
  ultimatePnl,
  ultimateRecoveryScan,
  ultimateStake,
  ultimateWins,
  type UltimateSide,
} from "@/lib/terminal/ultimate-bot";
import type { TickEvent } from "@/lib/ws/protocol";
import { cn } from "@/lib/utils/cn";

interface UltimateBotDeskProps {
  symbol?: string;
  onSymbolChange?: (symbol: string) => void;
  tickHistory: TickEvent[];
  isConnected: boolean;
  tradingLocked?: boolean;
  busy?: boolean;
  formatLocal?: (value: number) => string;
  onTrade?: (payload: {
    symbol?: string;
    contractType: string;
    lastDigitPrediction?: number;
    barrier?: number;
    duration?: number;
    durationUnit?: string;
    amount?: number;
  }) => void;
  onOpenDTrader?: (family: ReturnType<typeof ultimateFamily>, digit: number, duration: number) => void;
}

function dollars(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function UltimateBotDesk({
  symbol,
  onSymbolChange,
  tickHistory,
  isConnected,
  tradingLocked = false,
  busy = false,
  formatLocal = dollars,
  onTrade,
  onOpenDTrader,
}: UltimateBotDeskProps) {
  const [initId, setInitId] = useState("OU_2_7_LAST4");
  const [recId, setRecId] = useState("EO_PATTERN_REVERSAL");
  const [lastN, setLastN] = useState(7);
  const [stake, setStake] = useState(ULTIMATE_MIN_STAKE);
  const [duration, setDuration] = useState(1);
  const [tp, setTp] = useState(0);
  const [sl, setSl] = useState(0);
  const [useMartingale, setUseMartingale] = useState(true);
  const [martMult, setMartMult] = useState(2);
  const [filter, setFilter] = useState("");
  const [running, setRunning] = useState(false);
  const [pendingUi, setPendingUi] = useState(false);
  const [stats, setStats] = useState({
    trades: 0,
    wins: 0,
    losses: 0,
    profit: 0,
    consecutiveLosses: 0,
  });

  const pendingRef = useRef<{
    epoch: number;
    symbol: string;
    stake: number;
    duration: number;
    entryQuote: number;
    side: UltimateSide;
  } | null>(null);
  const skipEpochRef = useRef(0);

  const init = ULTIMATE_INITIAL.find((item) => item.id === initId) ?? ULTIMATE_INITIAL[2]!;
  const recovery = ULTIMATE_RECOVERY.find((item) => item.id === recId) ?? ULTIMATE_RECOVERY[1]!;
  const nextStake = ultimateStake(stake, stats.consecutiveLosses, useMartingale, martMult);
  const canTrade = Boolean(onTrade) && isConnected && !tradingLocked && !busy;
  const bySymbol = useMemo(() => {
    const map = new Map<string, TickEvent[]>();
    for (const market of ULTIMATE_BOT_MARKETS) {
      map.set(market.id, ticksForMarket(tickHistory, market.id) as TickEvent[]);
    }
    return map;
  }, [tickHistory]);

  const rows = useMemo(() => {
    return ULTIMATE_BOT_MARKETS.map((market) => {
      const series = bySymbol.get(market.id) ?? [];
      const digits = digitsFromTicks(series, Math.max(init.window, lastN));
      const initial = ultimateInitialScan(digits, init);
      const rec = ultimateRecoveryScan(series, recovery, lastN, init.over, init.under);
      return {
        market,
        series,
        last: series.at(-1) ?? null,
        digits: digits.slice(-4),
        initial,
        recovery: rec,
      };
    });
  }, [bySymbol, init, recovery, lastN]);

  const liveCount = rows.filter((row) => row.series.length > 0).length;
  const hasPulse = liveCount > 0;
  const filtered = filter.trim()
    ? rows.filter((row) => {
        const q = filter.trim().toLowerCase();
        return row.market.label.toLowerCase().includes(q) || row.market.id.toLowerCase().includes(q);
      })
    : rows;

  function fire(marketId: string, side: UltimateSide, size = nextStake) {
    if (!onTrade || !canTrade || pendingRef.current) return;
    const series = bySymbol.get(marketId) ?? [];
    const tick = series.at(-1);
    pendingRef.current = {
      epoch: tick?.epoch ?? 0,
      symbol: marketId,
      stake: size,
      duration,
      entryQuote: tick?.quote ?? 0,
      side,
    };
    setPendingUi(true);
    onTrade({
      symbol: marketId,
      contractType: side.contractType,
      duration,
      durationUnit: "t",
      amount: size,
      ...(side.barrier != null ? { barrier: side.barrier, lastDigitPrediction: side.barrier } : {}),
    });
  }

  function pickSignal(): { marketId: string; side: UltimateSide } | null {
    const recovering = stats.consecutiveLosses > 0;
    const ranked = [...rows].sort((a, b) => {
      if (a.market.id === symbol) return -1;
      if (b.market.id === symbol) return 1;
      return 0;
    });
    for (const row of ranked) {
      if (!row.series.length) continue;
      const epoch = row.last?.epoch ?? 0;
      if (epoch <= skipEpochRef.current) continue;
      const side = recovering ? row.recovery : row.initial.side;
      if (side) return { marketId: row.market.id, side };
    }
    return null;
  }

  useEffect(() => {
    pendingRef.current = null;
    setPendingUi(false);
  }, [initId, recId]);

  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending) {
      if (!running || !canTrade) return;
      const hitTp = tp > 0 && stats.profit >= tp;
      const hitSl = sl > 0 && stats.profit <= -sl;
      if (hitTp || hitSl) {
        setRunning(false);
        return;
      }
      const next = pickSignal();
      if (!next) return;
      fire(next.marketId, next.side);
      if (pendingRef.current) {
        skipEpochRef.current = pendingRef.current.epoch;
      }
      return;
    }
    const series = bySymbol.get(pending.symbol) ?? [];
    const exit = exitTickAfter(series, pending.epoch, pending.duration);
    if (!exit?.quote) return;
    const win = ultimateWins(
      pending.side,
      lastDigitFromQuote(exit.quote),
      exit.quote,
      pending.entryQuote,
    );
    const pnl = ultimatePnl(win, pending.stake);
    pendingRef.current = null;
    setPendingUi(false);
    skipEpochRef.current = exit.epoch ?? skipEpochRef.current;
    setStats((prev) => ({
      trades: prev.trades + 1,
      wins: prev.wins + (win ? 1 : 0),
      losses: prev.losses + (win ? 0 : 1),
      profit: Number((prev.profit + pnl).toFixed(2)),
      consecutiveLosses: win ? 0 : prev.consecutiveLosses + 1,
    }));
  }, [bySymbol, running, canTrade, nextStake, duration, tp, sl, stats.profit, stats.consecutiveLosses]);

  const progress = pendingRef.current
    ? pendingProgress(
        bySymbol.get(pendingRef.current.symbol) ?? [],
        pendingRef.current.epoch,
        pendingRef.current.duration,
      )
    : null;
  const focused = pendingRef.current?.symbol ?? symbol ?? rows[0]?.market.id;
  const pendingSide = pendingRef.current?.side.label;

  return (
    <div data-testid="ultimate-bot-desk" data-desk className="ultimate-bot" data-scroll-pane>
      <header className="edging-toolbar">
        <h1>Ultimate Bot</h1>
        <div className="edging-toolbar-status">
          <span className={cn("edging-chip", (isConnected || hasPulse) && "is-live")}>
            {isConnected ? "Live" : hasPulse ? "Feed ready" : "Waiting"}
          </span>
          <span className="edging-chip">
            {liveCount}/{ULTIMATE_BOT_MARKETS.length} markets
          </span>
        </div>
      </header>

      <div className="edging-body">
        <section className="edging-card edging-controls">
          <div className="edging-kpis">
            <Kpi label="Won" value={String(stats.wins)} />
            <Kpi label="Lost" value={String(stats.losses)} />
            <Kpi label="P/L" value={formatLocal(stats.profit)} />
          </div>

          <div className="edging-fields">
            <label>
              <span>Initial type</span>
              <select value={initId} onChange={(event) => setInitId(event.target.value)} aria-label="Initial trade type">
                {ULTIMATE_INITIAL.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <em>First ticket</em>
            </label>
            <label>
              <span>Recovery type</span>
              <select value={recId} onChange={(event) => setRecId(event.target.value)} aria-label="Recovery type">
                {ULTIMATE_RECOVERY.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <em>After a loss</em>
            </label>
            <label>
              <span>Last N ticks</span>
              <input
                type="number"
                min={2}
                max={20}
                value={lastN}
                onChange={(event) => setLastN(clampUltimateWindow(Number(event.target.value)))}
              />
              <em>Recovery window</em>
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
          </div>

          <div className="edging-fields">
            <label>
              <span>Stake</span>
              <input
                type="number"
                min={ULTIMATE_MIN_STAKE}
                step={0.05}
                value={stake}
                onChange={(event) => setStake(clampFastStake(Number(event.target.value)))}
              />
              <em>{formatLocal(nextStake)} next</em>
            </label>
            <label>
              <span>Take profit</span>
              <input
                type="number"
                min={0}
                step={0.5}
                value={tp}
                onChange={(event) => setTp(Math.max(0, Number(event.target.value) || 0))}
              />
              <em>{tp ? `Stop at ${formatLocal(tp)}` : "Off"}</em>
            </label>
            <label>
              <span>Stop loss</span>
              <input
                type="number"
                min={0}
                step={0.5}
                value={sl}
                onChange={(event) => setSl(Math.max(0, Number(event.target.value) || 0))}
              />
              <em>{sl ? `Stop at -${formatLocal(sl)}` : "Off"}</em>
            </label>
            <label>
              <span>Martingale</span>
              <input
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={useMartingale ? martMult : 0}
                onChange={(event) => {
                  const value = Number(event.target.value) || 0;
                  if (value < 1) {
                    setUseMartingale(false);
                    return;
                  }
                  setUseMartingale(true);
                  setMartMult(clampMartMultiplier(value));
                }}
                aria-label="Martingale multiplier"
              />
              <em>{useMartingale ? `${martMult}× after a loss` : "Off"}</em>
            </label>
          </div>

          <div className="fast-actions">
            <button
              type="button"
              className={cn("edging-cta", running ? "is-ghost" : "is-ink")}
              disabled={!canTrade && !running}
              onClick={() => {
                if (running) {
                  setRunning(false);
                  return;
                }
                skipEpochRef.current = Math.max(
                  0,
                  ...rows.map((row) => row.last?.epoch ?? 0),
                );
                setRunning(true);
              }}
            >
              {running ? "Stop bot" : `Start bot · ${formatLocal(nextStake)}`}
            </button>
            {onOpenDTrader ? (
              <button
                type="button"
                className="edging-cta is-ghost"
                onClick={() =>
                  onOpenDTrader(ultimateFamily({ contractType: "DIGITOVER", label: "Over", barrier: init.over }), init.over, duration)
                }
              >
                Open in D-Trader
              </button>
            ) : (
              <div className="edging-tick">
                <span>Ticket</span>
                <strong>
                  {pendingUi && progress ? `${progress.done}/${progress.need}` : running ? "Scanning" : "Idle"}
                </strong>
                <em>{pendingSide ?? "Open tickets"}</em>
              </div>
            )}
          </div>
          {pendingUi && progress ? (
            <div className="edging-meter" aria-label={`Ticket ${progress.done} of ${progress.need} ticks`}>
              <i style={{ width: `${(progress.done / progress.need) * 100}%` }} />
            </div>
          ) : null}
        </section>

        {tradingLocked ? (
          <div className="edging-notice">
            <p>Log in with Deriv to run Ultimate Bot.</p>
            <TraderAuthLinks />
          </div>
        ) : null}

        <section className="edging-card">
          <h2>Active markets ({filtered.length}/{ULTIMATE_BOT_MARKETS.length})</h2>
          <label className="ultimate-filter">
            <input
              type="search"
              placeholder="Filter by market or symbol"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Filter markets"
            />
          </label>
          <div className="ultimate-table-wrap">
            <table className="ultimate-table">
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Price</th>
                  <th>Digits</th>
                  <th>Initial</th>
                  <th>Recovery</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const live = row.series.length > 0;
                  return (
                    <tr
                      key={row.market.id}
                      className={cn(row.market.id === focused && "is-on")}
                      onClick={() => onSymbolChange?.(row.market.id)}
                    >
                      <td>
                        <strong>{row.market.label}</strong>
                        <em>{live ? "Live" : "Waiting"}</em>
                      </td>
                      <td>{live && row.last ? row.last.quote.toFixed(3) : "—"}</td>
                      <td className="ultimate-digits">
                        {row.digits.length ? row.digits.join(" · ") : "—"}
                      </td>
                      <td>
                        <span className={cn("ultimate-flag", row.initial.over && "is-yes")}>
                          Over {init.over}
                        </span>
                        <span className={cn("ultimate-flag", row.initial.under && "is-yes")}>
                          Under {init.under}
                        </span>
                      </td>
                      <td>{row.recovery?.label ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="edging-cta is-ghost is-reset"
            onClick={() => {
              pendingRef.current = null;
              setPendingUi(false);
              setRunning(false);
              setStats({ trades: 0, wins: 0, losses: 0, profit: 0, consecutiveLosses: 0 });
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
