"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  analyzeFrequency,
  digitsFromQuotes,
  lastDigitFromQuote,
} from "@/lib/terminal/analysis-tool";
import { BULK_TRADER_MARKETS } from "@/lib/terminal/chart-markets";
import {
  BULK_AUTO_ACTION_DEFAULT,
  BULK_AUTO_CONDITION_DEFAULT,
  BULK_AUTO_RISK_DEFAULT,
  BULK_CONTRACTS,
  BULK_DEFAULT_STAKE,
  BULK_DEFAULT_SYMBOL,
  BULK_DEFAULT_WINDOW,
  BULK_MIN_STAKE,
  BULK_SCANNER_DEFAULT,
  BULK_SCAN_SYMBOLS,
  bulkConditionMet,
  bulkContractNeedsDigit,
  bulkDigitTones,
  bulkLabel,
  bulkLastDigit,
  bulkMartingaleStake,
  bulkNeedsDigit,
  bulkPair,
  bulkPipSize,
  bulkPayout,
  bulkRiskStop,
  bulkScannerSignal,
  bulkWinRates,
  clampBulkCount,
  clampBulkDigit,
  clampBulkStake,
  clampBulkWindow,
  type BulkAutoAction,
  type BulkAutoCondition,
  type BulkAutoRisk,
  type BulkContract,
  type BulkScannerConfig,
  type BulkTradeFamily,
} from "@/lib/terminal/bulk-trader";
import {
  clampEdgingDuration,
  exitTickAfter,
  ticksForMarket,
} from "@/lib/terminal/edging";
import { fastPnl } from "@/lib/terminal/fast-trader";
import type { ChartHistorySnapshot, TickEvent } from "@/lib/ws/protocol";
import type { OpenContractRecord } from "@/lib/state/types";
import { cn } from "@/lib/utils/cn";
import { TradesDrawer, type TradesDrawerTab } from "@/components/trading/TradesDrawer";

interface BulkTraderDeskProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  lastTick: TickEvent | null;
  tickHistory: TickEvent[];
  isConnected: boolean;
  tradingLocked?: boolean;
  busy?: boolean;
  chartHistory?: ChartHistorySnapshot | null;
  chartHistoryLoading?: boolean;
  onRequestHistory?: (symbol: string, granularity: number) => void;
  onTrade?: (payload: {
    symbol?: string;
    contractType: string;
    lastDigitPrediction?: number;
    barrier?: number;
    duration?: number;
    durationUnit?: string;
    amount?: number;
    count?: number;
  }) => void;
  contracts?: OpenContractRecord[];
  formatLocal?: (value: number) => string;
  onCloseContract?: (contractId: number) => void;
  closingId?: number | null;
  notice?: string | null;
}

export function BulkTraderDesk({
  symbol,
  onSymbolChange,
  lastTick,
  tickHistory,
  isConnected,
  tradingLocked = false,
  busy = false,
  chartHistory = null,
  chartHistoryLoading = false,
  onRequestHistory,
  onTrade,
  contracts = [],
  formatLocal = (value) => `$${value.toFixed(2)}`,
  onCloseContract,
  closingId = null,
  notice = null,
}: BulkTraderDeskProps) {
  const [family, setFamily] = useState<BulkTradeFamily>("evenodd");
  const [digit, setDigit] = useState(5);
  const [duration, setDuration] = useState(1);
  const [stake, setStake] = useState(BULK_DEFAULT_STAKE);
  const [bulk, setBulk] = useState(1);
  const [windowSize, setWindowSize] = useState(BULK_DEFAULT_WINDOW);
  const [message, setMessage] = useState("");
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerRunning, setScannerRunning] = useState(false);
  const [scannerConfig, setScannerConfig] = useState(BULK_SCANNER_DEFAULT);
  const [scannerStake, setScannerStake] = useState(BULK_DEFAULT_STAKE);
  const [scannerCount, setScannerCount] = useState(5);
  const [scannerLog, setScannerLog] = useState<string[]>([]);
  const [scannerTiles, setScannerTiles] = useState<Record<string, number[]>>({});
  const [scannerStatus, setScannerStatus] = useState("Ready to scan for last-digit pressure.");
  const [condition, setCondition] = useState<BulkAutoCondition>(BULK_AUTO_CONDITION_DEFAULT);
  const [action, setAction] = useState<BulkAutoAction>(BULK_AUTO_ACTION_DEFAULT);
  const [risk, setRisk] = useState<BulkAutoRisk>(BULK_AUTO_RISK_DEFAULT);
  const [result, setResult] = useState<{
    win: boolean;
    profit: number;
    symbol: string;
    contractType: string;
    closed: number;
    total: number;
  } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<TradesDrawerTab>("transactions");
  const [journal, setJournal] = useState<string[]>([]);
  const [hiddenIds, setHiddenIds] = useState<number[]>([]);

  const pendingRef = useRef<{
    epoch: number;
    stake: number;
    duration: number;
    count: number;
    type: BulkContract;
    prediction: number;
    track: boolean;
  } | null>(null);
  const autoArmedRef = useRef(false);
  const autoPnlRef = useRef(0);
  const autoStakeRef = useRef(BULK_DEFAULT_STAKE);
  const scannerFiredRef = useRef(false);
  const pipSize = bulkPipSize(symbol);
  const visibleContracts = useMemo(
    () => contracts.filter((contract) => !hiddenIds.includes(contract.contractId)),
    [contracts, hiddenIds],
  );

  function openTradesDrawer(tab: TradesDrawerTab = "transactions") {
    setDrawerTab(tab);
    setDrawerOpen(true);
  }

  const ticks = useMemo(() => {
    if (
      chartHistory &&
      chartHistory.symbol === symbol &&
      chartHistory.granularity === 0 &&
      chartHistory.ticks.length >= 2
    ) {
      return chartHistory.ticks;
    }
    return ticksForMarket(tickHistory, symbol) as TickEvent[];
  }, [chartHistory, symbol, tickHistory]);

  const samples = useMemo(
    () => digitsFromQuotes(ticks, windowSize, pipSize),
    [ticks, windowSize, pipSize],
  );
  const freq = useMemo(() => analyzeFrequency(samples), [samples]);
  const quote =
    ticks.at(-1)?.quote ?? (lastTick?.symbol === symbol ? lastTick.quote : null);
  const lastDigit = quote == null ? null : bulkLastDigit(quote, pipSize);
  const pcts = freq.counts.map((count) =>
    freq.window ? Math.round((count / freq.window) * 1000) / 10 : 0,
  );
  const tones = useMemo(() => bulkDigitTones(pcts), [pcts]);
  const strip = samples.slice(-8).map((sample) => sample.digit);
  const digits = samples.map((sample) => sample.digit);
  const needsDigit = bulkNeedsDigit(family);
  const [left, right] = bulkPair(family);
  const rates = useMemo(() => bulkWinRates(pcts, digit), [pcts, digit]);
  const payout = bulkPayout(stake);
  const conditionMet = bulkConditionMet(digits, condition);

  useEffect(() => {
    if (!notice) return;
    setMessage(notice);
  }, [notice]);

  useEffect(() => {
    if (!message) return;
    setJournal((prev) => {
      const line = `${new Date().toLocaleTimeString()}  ${message}`;
      if (prev[0] === line || prev[0]?.endsWith(`  ${message}`)) return prev;
      return [line, ...prev].slice(0, 80);
    });
  }, [message]);

  const markets = BULK_TRADER_MARKETS.some((item) => item.id === symbol)
    ? BULK_TRADER_MARKETS
    : [{ id: symbol, label: symbol }, ...BULK_TRADER_MARKETS];

  useEffect(() => {
    if (symbol !== BULK_DEFAULT_SYMBOL) onSymbolChange(BULK_DEFAULT_SYMBOL);
    // Land on Volatility 100 Index the way dangote does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!onRequestHistory || !isConnected) return;
    onRequestHistory(symbol, 0);
  }, [symbol, onRequestHistory, isConnected]);

  useEffect(() => {
    setCondition((prev) => (prev.family === family ? prev : { ...prev, family }));
  }, [family]);

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(""), 6000);
    return () => window.clearTimeout(id);
  }, [message]);

  function buy(contractType: BulkContract, options?: {
    market?: string;
    stake?: number;
    count?: number;
    prediction?: number;
    track?: boolean;
  }) {
    const market = options?.market ?? symbol;
    const sized = options?.stake ?? stake;
    const count = options?.count ?? bulk;
    const prediction = options?.prediction ?? digit;
    if (tradingLocked) {
      setMessage("Log in to your Deriv account to place trades.");
      return;
    }
    if (!onTrade) return;
    if (sized < BULK_MIN_STAKE) {
      setMessage("Enter a valid stake (minimum 0.35) before buying.");
      return;
    }
    if (count < 1) {
      setMessage("Enter a valid number of bulk trades.");
      return;
    }
    if (!onTrade || !isConnected) {
      setMessage("Waiting for the feed.");
      return;
    }
    const tick = ticks.at(-1);
    pendingRef.current = {
      epoch: tick?.epoch ?? 0,
      stake: sized,
      duration,
      count,
      type: contractType,
      prediction,
      track: Boolean(options?.track),
    };
    onTrade({
      symbol: market,
      contractType,
      duration,
      durationUnit: "t",
      amount: sized,
      count,
      ...(bulkContractNeedsDigit(contractType)
        ? { lastDigitPrediction: prediction, barrier: prediction }
        : {}),
    });
    const name = contractType.replace("DIGIT", "");
    setMessage(`Sent ${count} ${name} contract${count > 1 ? "s" : ""}.`);
  }

  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    const exit = exitTickAfter(ticks, pending.epoch, pending.duration);
    if (!exit?.quote) return;
    const exitDigit = lastDigitFromQuote(exit.quote, pipSize);
    const win =
      pending.type === "DIGITEVEN"
        ? exitDigit % 2 === 0
        : pending.type === "DIGITODD"
          ? exitDigit % 2 === 1
          : pending.type === "DIGITOVER"
            ? exitDigit > pending.prediction
            : pending.type === "DIGITUNDER"
              ? exitDigit < pending.prediction
              : pending.type === "DIGITMATCH"
                ? exitDigit === pending.prediction
                : exitDigit !== pending.prediction;
    const profit = Number((fastPnl(win, pending.stake) * pending.count).toFixed(2));
    pendingRef.current = null;
    autoPnlRef.current = Number((autoPnlRef.current + profit).toFixed(2));
    autoStakeRef.current = bulkMartingaleStake(autoStakeRef.current, win, risk);
    if (pending.track) {
      setResult({
        win: profit >= 0,
        profit,
        symbol,
        contractType: bulkLabel(pending.type),
        closed: pending.count,
        total: pending.count,
      });
      setDrawerTab("transactions");
      setDrawerOpen(true);
    }
    if (autoRunning) {
      const stop = bulkRiskStop(autoPnlRef.current, risk);
      if (stop) {
        setAutoRunning(false);
        autoArmedRef.current = false;
        setMessage(
          stop === "stop_loss"
            ? "Auto trader stopped: stop-loss hit."
            : "Auto trader stopped: take-profit hit.",
        );
      }
    }
  }, [ticks, pipSize, risk, autoRunning, symbol]);

  useEffect(() => {
    if (!autoRunning) {
      autoArmedRef.current = false;
      return;
    }
    if (!conditionMet) {
      autoArmedRef.current = false;
      return;
    }
    if (autoArmedRef.current || pendingRef.current) return;
    if (!tradingLocked && (!onTrade || !isConnected || busy)) return;
    autoArmedRef.current = true;
    buy(action.contractType, {
      stake: risk.useMartingale ? autoStakeRef.current : stake,
      prediction: action.prediction,
    });
    // buy is stable enough for this edge trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRunning, conditionMet, digits, tradingLocked, isConnected, busy, onTrade, action, risk, stake]);

  useEffect(() => {
    if (!scannerRunning) {
      scannerFiredRef.current = false;
      return;
    }
    if (scannerFiredRef.current) return;
    const nextTiles: Record<string, number[]> = {};
    for (const market of BULK_SCAN_SYMBOLS) {
      const pip = bulkPipSize(market);
      const history = ticksForMarket(tickHistory, market);
      const recent = history.slice(-scannerConfig.sampleSize).map((tick) =>
        bulkLastDigit(tick.quote, pip),
      );
      nextTiles[market] = recent;
      const signal = bulkScannerSignal(recent, scannerConfig);
      if (signal && !scannerFiredRef.current) {
        scannerFiredRef.current = true;
        setScannerTiles((prev) => ({ ...prev, ...nextTiles }));
        setScannerLog((prev) => [
          ...prev.slice(-11),
          `[SUCCESS] ${market}: ${signal.contractType.replace("DIGIT", "")} ${signal.prediction} detected.`,
        ]);
        setScannerStatus(`Trade route found on ${market}.`);
        setScannerRunning(false);
        setDrawerTab("transactions");
        setDrawerOpen(true);
        if (tradingLocked || !onTrade) {
          setMessage("Log in to your Deriv account to place trades.");
          return;
        }
        buy(signal.contractType, {
          market,
          stake: scannerStake,
          count: scannerCount,
          prediction: signal.prediction,
          track: true,
        });
        return;
      }
    }
    setScannerTiles((prev) => ({ ...prev, ...nextTiles }));
  }, [scannerRunning, tickHistory, scannerConfig, scannerStake, scannerCount, tradingLocked, onTrade]);

  return (
    <div
      data-testid="bulk-trader-desk"
      data-desk
      className={cn("bulk-trader", drawerOpen && "has-drawer")}
      data-scroll-pane
    >
      <div className="bulk-body" data-scroll-pane>
        {tradingLocked ? (
          <div className="bulk-banner">
            <p>Log in to your Deriv account to place trades. Market analysis works without an account.</p>
          </div>
        ) : null}

        <div className="bulk-tick-bar">
          <div className="bulk-tick">
            <span>Current tick</span>
            <strong>{quote == null ? "--" : quote.toFixed(pipSize)}</strong>
          </div>
          <div className="bulk-tick-actions">
            <button
              type="button"
              className="bulk-link-btn"
              aria-expanded={drawerOpen}
              onClick={() => openTradesDrawer("transactions")}
            >
              View trades
            </button>
            <button type="button" className="bulk-link-btn is-teal" onClick={() => setScannerOpen(true)}>
              Analysis
            </button>
          </div>
        </div>

        <label className="bulk-outline bulk-window-field">
          <span>Number of ticks</span>
          <input
            type="number"
            min={10}
            max={5000}
            value={windowSize}
            onChange={(event) => setWindowSize(clampBulkWindow(Number(event.target.value)))}
            aria-label="Sample window"
          />
        </label>

        <div className="bulk-circles">
          {Array.from({ length: 10 }, (_, value) => (
            <button
              key={value}
              type="button"
              className={cn(
                "bulk-circle",
                `is-${tones[value] ?? "neutral"}`,
                digit === value && "is-on",
                lastDigit === value && "is-now",
              )}
              onClick={() => setDigit(value)}
            >
              <strong>{value}</strong>
              <em>{(pcts[value] ?? 0).toFixed(1)}%</em>
            </button>
          ))}
        </div>

        {strip.length ? (
          <div className="bulk-digits" aria-label="Recent digits">
            {strip.map((value, index) => (
              <span key={`${value}-${index}`} className={cn(index === strip.length - 1 && "is-now")}>
                {value}
              </span>
            ))}
          </div>
        ) : (
          <p className="bulk-note">
            {chartHistoryLoading ? "Loading Deriv ticks…" : "Waiting on ticks for this market."}
          </p>
        )}

        <div className="bulk-config">
          <div className="bulk-config-top">
            <label className="bulk-outline">
              <span>Market</span>
              <select
                value={symbol}
                onChange={(event) => onSymbolChange(event.target.value)}
                aria-label="Market"
              >
                {markets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="bulk-outline">
              <span>Trade type</span>
              <select
                value={family}
                onChange={(event) => setFamily(event.target.value as BulkTradeFamily)}
                aria-label="Trade type"
              >
                <option value="evenodd">Even/Odd</option>
                <option value="overunder">Over/Under</option>
                <option value="matchesdiffers">Matches/Differs</option>
              </select>
            </label>
          </div>

          <div className={cn("bulk-duration-row", needsDigit && "has-prediction")}>
            <label className="bulk-outline">
              <span>Number of ticks</span>
              <input
                type="number"
                min={1}
                max={10}
                value={duration}
                onChange={(event) => setDuration(clampEdgingDuration(Number(event.target.value)))}
                aria-label="Contract ticks"
              />
            </label>
            {needsDigit ? (
              <label className="bulk-outline">
                <span>Prediction</span>
                <input
                  type="number"
                  min={0}
                  max={9}
                  value={digit}
                  onChange={(event) => setDigit(clampBulkDigit(Number(event.target.value)))}
                />
              </label>
            ) : null}
          </div>

          <div className="bulk-purchase-row">
            <label className="bulk-outline">
              <span>Ticks</span>
              <input
                type="number"
                min={1}
                max={10}
                value={duration}
                onChange={(event) => setDuration(clampEdgingDuration(Number(event.target.value)))}
              />
            </label>
            <label className="bulk-outline">
              <span>Stake</span>
              <input
                type="number"
                min={BULK_MIN_STAKE}
                step={0.01}
                value={stake}
                onChange={(event) => setStake(clampBulkStake(Number(event.target.value)))}
              />
            </label>
            <label className="bulk-outline">
              <span>No. of bulk trades</span>
              <input
                type="number"
                min={1}
                max={20}
                value={bulk}
                onChange={(event) => setBulk(clampBulkCount(Number(event.target.value)))}
              />
            </label>
          </div>
        </div>

        <div className="bulk-outcomes">
          {[left, right].map((contract, index) => (
            <button
              key={contract}
              type="button"
              className={cn("bulk-outcome", index === 0 ? "is-teal" : "is-ink")}
              style={{ flex: `${Math.max(rates[contract], 8)} 1 0` }}
              disabled={autoRunning || Boolean(busy)}
              onClick={() => buy(contract)}
            >
              <strong>
                {bulkLabel(contract)}
                {bulkContractNeedsDigit(contract) ? ` ${digit}` : ""}
              </strong>
              <b className="bulk-outcome-payout">{payout.toFixed(2)}</b>
              <em>{rates[contract].toFixed(2)}%</em>
            </button>
          ))}
        </div>

        <button
          type="button"
          className={cn("bulk-auto", autoRunning && "is-on")}
          onClick={() => {
            if (autoRunning) {
              setAutoRunning(false);
              autoArmedRef.current = false;
              setMessage("Auto trader stopped.");
              return;
            }
            setAutoOpen(true);
          }}
        >
          {autoRunning ? "Stop auto trading" : "Auto trader"}
        </button>

        {message ? <p className="bulk-message">{message}</p> : null}
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
          setMessage("");
        }}
      />

      <BulkModal
        open={autoOpen}
        title="Auto trade settings"
        kicker="Auto trades"
        onClose={() => setAutoOpen(false)}
      >
        <div className="bulk-modal-grid">
          <label className="bulk-outline">
            <span>If Last digits</span>
            <input
              type="number"
              min={1}
              value={condition.window}
              onChange={(event) =>
                setCondition((prev) => ({
                  ...prev,
                  window: Math.max(1, Math.round(Number(event.target.value) || 1)),
                }))
              }
            />
          </label>
          <label className="bulk-outline">
            <span>Are</span>
            {family === "evenodd" ? (
              <select
                value={condition.evenMode}
                onChange={(event) =>
                  setCondition((prev) => ({
                    ...prev,
                    evenMode: event.target.value as BulkAutoCondition["evenMode"],
                  }))
                }
              >
                <option value="all_even">All even</option>
                <option value="all_odd">All odd</option>
              </select>
            ) : family === "matchesdiffers" ? (
              <select value="all_same" disabled>
                <option value="all_same">All same</option>
              </select>
            ) : (
              <select
                value={condition.comparator}
                onChange={(event) =>
                  setCondition((prev) => ({
                    ...prev,
                    comparator: event.target.value as BulkAutoCondition["comparator"],
                  }))
                }
              >
                <option value="greater">&gt;</option>
                <option value="less">&lt;</option>
                <option value="equal">=</option>
              </select>
            )}
          </label>
          {family === "overunder" ? (
            <label className="bulk-outline">
              <span>Than digit</span>
              <input
                type="number"
                min={0}
                max={9}
                value={condition.thresholdDigit}
                onChange={(event) =>
                  setCondition((prev) => ({
                    ...prev,
                    thresholdDigit: clampBulkDigit(Number(event.target.value)),
                  }))
                }
              />
            </label>
          ) : null}
          <label className="bulk-outline">
            <span>then Trade</span>
            <select
              value={action.contractType}
              onChange={(event) =>
                setAction((prev) => ({
                  ...prev,
                  contractType: event.target.value as BulkContract,
                }))
              }
            >
              {BULK_CONTRACTS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="bulk-outline">
            <span>Prediction</span>
            <input
              type="number"
              min={0}
              max={9}
              disabled={!bulkContractNeedsDigit(action.contractType)}
              value={action.prediction}
              onChange={(event) =>
                setAction((prev) => ({
                  ...prev,
                  prediction: clampBulkDigit(Number(event.target.value)),
                }))
              }
            />
          </label>
          <label className="bulk-check">
            <input
              type="checkbox"
              checked={risk.useMartingale}
              onChange={(event) =>
                setRisk((prev) => ({ ...prev, useMartingale: event.target.checked }))
              }
            />
            <span>Martingale</span>
          </label>
          <label className="bulk-outline">
            <span>Base stake</span>
            <input
              type="number"
              min={BULK_MIN_STAKE}
              step={0.01}
              value={risk.baseStake}
              onChange={(event) =>
                setRisk((prev) => ({ ...prev, baseStake: clampBulkStake(Number(event.target.value)) }))
              }
            />
          </label>
          <label className="bulk-outline">
            <span>Multiplier</span>
            <input
              type="number"
              min={1}
              step={0.1}
              value={risk.multiplier}
              onChange={(event) =>
                setRisk((prev) => ({
                  ...prev,
                  multiplier: Math.max(1, Number(event.target.value) || 1),
                }))
              }
            />
          </label>
          <label className="bulk-outline">
            <span>Stop loss</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={risk.stopLoss ?? ""}
              onChange={(event) =>
                setRisk((prev) => ({
                  ...prev,
                  stopLoss: event.target.value === "" ? null : Number(event.target.value),
                }))
              }
            />
          </label>
          <label className="bulk-outline">
            <span>Take profit</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={risk.takeProfit ?? ""}
              onChange={(event) =>
                setRisk((prev) => ({
                  ...prev,
                  takeProfit: event.target.value === "" ? null : Number(event.target.value),
                }))
              }
            />
          </label>
        </div>
        <p className="bulk-modal-status">
          {conditionMet ? "Condition met" : "Waiting for condition"} ·{" "}
          {autoRunning ? "Auto trader running" : "Auto trader idle"}
        </p>
        <button
          type="button"
          className="bulk-modal-cta"
          onClick={() => {
            if (autoRunning) {
              setAutoRunning(false);
              autoArmedRef.current = false;
              setMessage("Auto trader stopped.");
              return;
            }
            autoPnlRef.current = 0;
            autoStakeRef.current = risk.baseStake;
            autoArmedRef.current = false;
            setAutoRunning(true);
            setAutoOpen(false);
            setMessage("Auto trader started.");
          }}
        >
          {autoRunning ? "Stop auto trading" : "Start auto trading"}
        </button>
      </BulkModal>

      <BulkModal
        open={scannerOpen}
        title="Digit scanner"
        kicker="Analysis dashboard"
        onClose={() => {
          setScannerOpen(false);
          setScannerRunning(false);
        }}
      >
        <div className="bulk-modal-grid">
          {(
            [
              ["Low threshold", "lowThreshold"],
              ["High threshold", "highThreshold"],
              ["Over digit", "overDigit"],
              ["Under digit", "underDigit"],
              ["Sample size", "sampleSize"],
            ] as const
          ).map(([label, key]) => (
            <label key={key} className="bulk-outline">
              <span>{label}</span>
              <input
                type="number"
                min={key === "sampleSize" ? 1 : 0}
                max={key === "sampleSize" ? 20 : 9}
                value={scannerConfig[key]}
                onChange={(event) =>
                  setScannerConfig((prev) => ({
                    ...prev,
                    [key]:
                      key === "sampleSize"
                        ? Math.max(1, Math.round(Number(event.target.value) || 1))
                        : clampBulkDigit(Number(event.target.value)),
                  }))
                }
              />
            </label>
          ))}
          <label className="bulk-outline">
            <span>Stake</span>
            <input
              type="number"
              min={BULK_MIN_STAKE}
              step={0.01}
              value={scannerStake}
              onChange={(event) => setScannerStake(clampBulkStake(Number(event.target.value)))}
            />
          </label>
          <label className="bulk-outline">
            <span>No. of bulk trades</span>
            <input
              type="number"
              min={1}
              max={20}
              value={scannerCount}
              onChange={(event) => setScannerCount(clampBulkCount(Number(event.target.value)))}
            />
          </label>
        </div>
        <div className="bulk-scanner-tiles">
          {Object.keys(scannerTiles).length
            ? Object.entries(scannerTiles).map(([market, values]) => (
                <div key={market}>
                  <span>{market}</span>
                  <strong>{values.length ? values.join(",") : "waiting"}</strong>
                </div>
              ))
            : (
                <div>
                  <span>Markets</span>
                  <strong>R_100, R_75, R_50, R_25, R_10</strong>
                </div>
              )}
        </div>
        <div className="bulk-scanner-log">
          {scannerLog.map((line, index) => (
            <p key={`${line}-${index}`}>{line}</p>
          ))}
        </div>
        <p className="bulk-modal-status">
          {scannerRunning ? "Scanning" : "Standby"} · {scannerStatus}
        </p>
        <button
          type="button"
          className="bulk-modal-cta"
          onClick={() => {
            if (scannerRunning) {
              setScannerRunning(false);
              setScannerStatus("Scanner stopped.");
              return;
            }
            scannerFiredRef.current = false;
            setScannerTiles({});
            setScannerLog(["[INFO] Pattern scanner armed"]);
            setScannerStatus("Scanning live markets…");
            setScannerRunning(true);
          }}
        >
          {scannerRunning ? "Stop scanner" : "Scan for best market"}
        </button>
      </BulkModal>

      {result ? (
        <div className="bulk-modal-overlay" role="presentation">
          <section className={cn("bulk-result", result.win ? "is-win" : "is-loss")} role="dialog">
            <button type="button" className="bulk-modal-close" onClick={() => setResult(null)}>
              ✕
            </button>
            <span>{result.win ? "Total profit" : "Total loss"}</span>
            <h3>{result.win ? "Batch won" : "Batch lost"}</h3>
            <strong>
              {result.profit >= 0 ? "+" : ""}
              {result.profit.toFixed(2)}
            </strong>
            <p>
              {result.symbol} · {result.contractType} · {result.closed}/{result.total}
            </p>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function BulkModal({
  open,
  title,
  kicker,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  kicker: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="bulk-modal-overlay" role="presentation" onClick={onClose}>
      <section className="bulk-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span>{kicker}</span>
            <h3>{title}</h3>
          </div>
          <button type="button" className="bulk-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
