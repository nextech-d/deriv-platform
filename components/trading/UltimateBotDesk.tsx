"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TraderAuthLinks } from "@/components/auth/TraderAuthLinks";
import { formatChartTime } from "@/lib/chart/candles";
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
  parityTape,
  ultimateFamily,
  ultimateInitialScan,
  ultimatePnl,
  ultimateRecoveryScan,
  ultimateStake,
  ultimateWins,
  type UltimateSide,
} from "@/lib/terminal/ultimate-bot";
import type { TickEvent } from "@/lib/ws/protocol";
import type { OpenContractRecord } from "@/lib/state/types";
import { cn } from "@/lib/utils/cn";
import { TradesDrawer, type TradesDrawerTab } from "@/components/trading/TradesDrawer";

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
  onOpenDTrader?: (
    family: ReturnType<typeof ultimateFamily>,
    digit: number,
    duration: number,
  ) => void;
  contracts?: OpenContractRecord[];
  onCloseContract?: (contractId: number) => void;
  closingId?: number | null;
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
  contracts = [],
  onCloseContract,
  closingId = null,
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
  const [armedUi, setArmedUi] = useState(false);
  const [stats, setStats] = useState({
    trades: 0,
    wins: 0,
    losses: 0,
    profit: 0,
    consecutiveLosses: 0,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<TradesDrawerTab>("transactions");
  const [journal, setJournal] = useState<string[]>([]);
  const [hiddenIds, setHiddenIds] = useState<number[]>([]);

  type PendingTicket = {
    epoch: number;
    symbol: string;
    stake: number;
    duration: number;
    entryQuote: number;
    side: UltimateSide;
  };
  type ArmedTicket = { marketId: string; side: UltimateSide };

  const [pendingTicket, setPendingTicket] = useState<PendingTicket | null>(null);
  const [armedTicket, setArmedTicket] = useState<ArmedTicket | null>(null);

  const pendingRef = useRef<PendingTicket | null>(null);
  const skipEpochRef = useRef(0);
  const armedRef = useRef<ArmedTicket | null>(null);

  function resetTickets() {
    pendingRef.current = null;
    armedRef.current = null;
    setPendingTicket(null);
    setArmedTicket(null);
    setPendingUi(false);
    setArmedUi(false);
  }

  const init = ULTIMATE_INITIAL.find((item) => item.id === initId) ?? ULTIMATE_INITIAL[2]!;
  const recovery = ULTIMATE_RECOVERY.find((item) => item.id === recId) ?? ULTIMATE_RECOVERY[1]!;
  const nextStake = ultimateStake(stake, stats.consecutiveLosses, useMartingale, martMult);
  const canTrade = Boolean(onTrade) && isConnected && !tradingLocked && !busy;
  const limitStop =
    (tp > 0 && stats.profit >= tp) || (sl > 0 && stats.profit <= -sl);
  const isRunning = running && !limitStop;
  const visibleContracts = useMemo(
    () => contracts.filter((contract) => !hiddenIds.includes(contract.contractId)),
    [contracts, hiddenIds],
  );

  function openTradesDrawer(tab: TradesDrawerTab = "transactions") {
    setDrawerTab(tab);
    setDrawerOpen(true);
  }

  function logJournal(line: string) {
    setJournal((prev) => [`${new Date().toLocaleTimeString()}  ${line}`, ...prev].slice(0, 80));
  }
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
        tape: parityTape(digits.slice(-7)),
        initial,
        recovery: rec,
      };
    });
  }, [bySymbol, init, recovery, lastN]);

  const liveCount = rows.filter((row) => row.series.length > 0).length;
  const hasPulse = liveCount > 0;
  const lastEpoch = rows.reduce((max, row) => Math.max(max, row.last?.epoch ?? 0), 0);
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
    const ticket: PendingTicket = {
      epoch: tick?.epoch ?? 0,
      symbol: marketId,
      stake: size,
      duration,
      entryQuote: tick?.quote ?? 0,
      side,
    };
    pendingRef.current = ticket;
    setPendingTicket(ticket);
    armedRef.current = null;
    setArmedTicket(null);
    setArmedUi(false);
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

  function arm(marketId: string, side: UltimateSide) {
    if (!canTrade || pendingRef.current || running) return;
    skipEpochRef.current = bySymbol.get(marketId)?.at(-1)?.epoch ?? 0;
    const ticket: ArmedTicket = { marketId, side };
    armedRef.current = ticket;
    setArmedTicket(ticket);
    setArmedUi(true);
    onSymbolChange?.(marketId);
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
    const pending = pendingRef.current;
    if (!pending) {
      const armed = armedRef.current;
      if (armed && canTrade) {
        const series = bySymbol.get(armed.marketId) ?? [];
        const epoch = series.at(-1)?.epoch ?? 0;
        if (epoch > skipEpochRef.current) {
          armedRef.current = null;
          setArmedTicket(null);
          fire(armed.marketId, armed.side);
        }
        return;
      }
      if (!isRunning || !canTrade) return;
      const next = pickSignal();
      if (!next) return;
      fire(next.marketId, next.side);
      if (pendingRef.current) skipEpochRef.current = pendingRef.current.epoch;
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
    setPendingTicket(null);
    setPendingUi(false);
    skipEpochRef.current = exit.epoch ?? skipEpochRef.current;
    setStats((prev) => ({
      trades: prev.trades + 1,
      wins: prev.wins + (win ? 1 : 0),
      losses: prev.losses + (win ? 0 : 1),
      profit: Number((prev.profit + pnl).toFixed(2)),
      consecutiveLosses: win ? 0 : prev.consecutiveLosses + 1,
    }));
  }, [bySymbol, isRunning, canTrade, nextStake, duration, tp, sl, stats.profit, stats.consecutiveLosses]);

  const progress = pendingTicket
    ? pendingProgress(
        bySymbol.get(pendingTicket.symbol) ?? [],
        pendingTicket.epoch,
        pendingTicket.duration,
      )
    : null;
  const focused =
    pendingTicket?.symbol ?? armedTicket?.marketId ?? symbol ?? rows[0]?.market.id;
  const pendingSide = pendingTicket?.side ?? armedTicket?.side;
  const dTraderSide =
    pendingSide ??
    rows.find((row) => row.market.id === focused)?.initial.side ??
    ({ contractType: "DIGITOVER", label: `Over ${init.over}`, barrier: init.over } satisfies UltimateSide);

  return (
    <div
      data-testid="ultimate-bot-desk"
      data-desk
      className={cn("ultimate-bot", drawerOpen && "has-drawer")}
      data-scroll-pane
    >
      <div className="ultimate-bot-main">
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
          <div className="ultimate-scores">
            <div className="ultimate-score is-won">
              <p>Won Trades</p>
              <strong>{stats.wins}</strong>
            </div>
            <div className="ultimate-score is-lost">
              <p>Lost Trades</p>
              <strong>{stats.losses}</strong>
            </div>
            <div className="edging-kpi">
              <p>P/L</p>
              <strong>{formatLocal(stats.profit)}</strong>
            </div>
          </div>

          <div className="edging-fields">
            <label>
              <span>Initial Trade Type</span>
              <select
                value={initId}
                onChange={(event) => {
                  setInitId(event.target.value);
                  resetTickets();
                }}
                aria-label="Initial Trade Type"
              >
                {ULTIMATE_INITIAL.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <em>First ticket</em>
            </label>
            <label>
              <span>Recovery Type</span>
              <select
                value={recId}
                onChange={(event) => {
                  setRecId(event.target.value);
                  resetTickets();
                }}
                aria-label="Recovery Type"
              >
                {ULTIMATE_RECOVERY.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <em>After a loss</em>
            </label>
            <label>
              <span>Last N Ticks</span>
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
              <span>TP</span>
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
              <span>SL</span>
              <input
                type="number"
                min={0}
                step={0.5}
                value={sl}
                onChange={(event) => setSl(Math.max(0, Number(event.target.value) || 0))}
              />
              <em>{sl ? `Stop at -${formatLocal(sl)}` : "Off"}</em>
            </label>
            <label className="edging-check-field">
              <span>Enable Martingale</span>
              <span className="edging-check-box">
                <input
                  type="checkbox"
                  checked={useMartingale}
                  onChange={(event) => setUseMartingale(event.target.checked)}
                />
                {useMartingale ? "On" : "Off"}
              </span>
              <em>After a loss</em>
            </label>
          </div>

          <div className="edging-fields">
            <label>
              <span>Martingale Multiplier</span>
              <input
                type="number"
                min={1}
                max={5}
                step={0.1}
                value={martMult}
                disabled={!useMartingale}
                onChange={(event) => setMartMult(clampMartMultiplier(Number(event.target.value)))}
              />
              <em>{useMartingale ? `${martMult}× after a loss` : "Off"}</em>
            </label>
            <div className="edging-tick">
              <span>Ticket</span>
              <strong>
                {pendingUi && progress
                  ? `${progress.done}/${progress.need}`
                  : armedUi
                    ? "Next tick"
                    : isRunning
                      ? "Scanning"
                      : limitStop
                        ? "Limit hit"
                        : "Idle"}
              </strong>
              <em>{pendingSide?.label ?? "Open tickets"}</em>
            </div>
          </div>

          <div className="fast-actions">
            <button
              type="button"
              className={cn("edging-cta", isRunning ? "is-ghost" : "is-ink")}
              disabled={!canTrade && !isRunning}
              onClick={() => {
                if (isRunning || (running && limitStop)) {
                  setRunning(false);
                  logJournal(limitStop ? "Bot stopped at limit." : "Bot stopped.");
                  return;
                }
                resetTickets();
                skipEpochRef.current = Math.max(0, ...rows.map((row) => row.last?.epoch ?? 0));
                setRunning(true);
                logJournal("Bot started.");
              }}
            >
              {isRunning ? "Stop Bot" : "Start Bot"}
            </button>
            {onOpenDTrader ? (
              <button
                type="button"
                className="edging-cta is-ghost"
                onClick={() =>
                  onOpenDTrader(ultimateFamily(dTraderSide), dTraderSide.barrier ?? init.over, duration)
                }
              >
                Open in D-Trader
              </button>
            ) : null}
            <button
              type="button"
              className="edging-cta is-ghost is-reset"
              aria-expanded={drawerOpen}
              onClick={() => openTradesDrawer("transactions")}
            >
              View trades
            </button>
          </div>
          {pendingUi && progress ? (
            <div className="edging-meter" aria-label={`Ticket ${progress.done} of ${progress.need} ticks`}>
              <i style={{ width: `${(progress.done / progress.need) * 100}%` }} />
            </div>
          ) : null}
        </section>

        {tradingLocked ? (
          <div className="edging-notice">
            <p>Log in with Deriv to run Ultimate Bot. Market scan works without an account.</p>
            <TraderAuthLinks />
          </div>
        ) : null}

        <section className="edging-card">
          <h2>Active Markets ({filtered.length}/{ULTIMATE_BOT_MARKETS.length})</h2>
          <p className="ultimate-meta">
            Subscribed {isConnected ? ULTIMATE_BOT_MARKETS.length : liveCount}/{ULTIMATE_BOT_MARKETS.length}
            {" · "}Live {liveCount}
            {lastEpoch ? ` · Last tick ${formatChartTime(lastEpoch, 0)}` : null}
          </p>
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
                  <th>Recovery Signal</th>
                  <th>Over {init.over}</th>
                  <th>Under {init.under}</th>
                  <th>Trade</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const live = row.series.length > 0;
                  const recovering = stats.consecutiveLosses > 0;
                  const side = recovering ? row.recovery : row.initial.side;
                  return (
                    <tr
                      key={row.market.id}
                      className={cn(row.market.id === focused && "is-on")}
                      onClick={() => onSymbolChange?.(row.market.id)}
                    >
                      <td>
                        <strong>{row.market.label}</strong>
                        <em>{live ? (isConnected ? "Live · subscribed" : "Feed ready") : "Waiting"}</em>
                      </td>
                      <td>{live && row.last ? row.last.quote.toFixed(3) : "—"}</td>
                      <td className="ultimate-digits">
                        {row.digits.length ? row.digits.join(",") : "—"}
                      </td>
                      <td className="ultimate-digits">{row.tape || "—"}</td>
                      <td>
                        <span className={cn("ultimate-flag", row.initial.over && "is-yes")}>
                          {row.initial.over ? "Yes" : "No"}
                        </span>
                      </td>
                      <td>
                        <span className={cn("ultimate-flag", row.initial.under && "is-yes")}>
                          {row.initial.under ? "Yes" : "No"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="ultimate-row-trade"
                          disabled={!canTrade || running || !side || !live}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (side) arm(row.market.id, side);
                          }}
                        >
                          {side ? side.label : "—"}
                        </button>
                      </td>
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
              armedRef.current = null;
              setPendingUi(false);
              setArmedUi(false);
              setRunning(false);
              setStats({ trades: 0, wins: 0, losses: 0, profit: 0, consecutiveLosses: 0 });
            }}
          >
            Reset
          </button>
        </section>
      </div>
      </div>
      <TradesDrawer
        open={drawerOpen}
        tab={drawerTab}
        onTabChange={setDrawerTab}
        onClose={() => setDrawerOpen(false)}
        contracts={visibleContracts}
        formatLocal={formatLocal}
        onCloseContract={onCloseContract}
        closingId={closingId}
        journal={journal}
        onReset={() => {
          setHiddenIds(contracts.map((contract) => contract.contractId));
          setJournal([]);
        }}
      />
    </div>
  );
}
