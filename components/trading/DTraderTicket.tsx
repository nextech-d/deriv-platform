"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

export type DTraderFamily =
  | "rise_fall"
  | "higher_lower"
  | "even_odd"
  | "over_under"
  | "matches_differs"
  | "touch_notouch"
  | "ends_between"
  | "stays_between"
  | "asian"
  | "high_low_ticks";

interface DTraderTicketProps {
  symbol: string;
  isConnected: boolean;
  isTrading: boolean;
  demoMode: boolean;
  stake: number;
  duration: number;
  tradeNotice: string | null;
  hasLiveQuote: boolean;
  tradingLocked: boolean;
  initialFamily?: DTraderFamily;
  initialBarrier?: number;
  initialDigitTarget?: number;
  onStakeChange: (value: number) => void;
  onDurationChange: (value: number) => void;
  onTrade: (payload: {
    contractType: string;
    barrier?: number | string;
    barrier2?: number | string;
    lastDigitPrediction?: number;
    durationUnit?: string;
    duration?: number;
  }) => void;
  formatLocal: (value: number) => string;
  embedded?: boolean;
}

interface FamilyMeta {
  id: DTraderFamily;
  label: string;
  primary: string;
  secondary: string;
  primaryContract: string;
  secondaryContract: string;
  needsBarrier?: boolean;
  needsBarrier2?: boolean;
  needsDigit?: boolean;
  tickOnly?: boolean;
  fixedTicks?: number;
  minDurationSec?: number;
  tickRange?: [number, number];
}

const FAMILIES: FamilyMeta[] = [
  { id: "rise_fall", label: "Rise / Fall", primary: "Rise", secondary: "Fall", primaryContract: "CALL", secondaryContract: "PUT" },
  { id: "higher_lower", label: "Higher / Lower", primary: "Higher", secondary: "Lower", primaryContract: "CALLE", secondaryContract: "PUTE", needsBarrier: true, minDurationSec: 15 },
  { id: "even_odd", label: "Even / Odd", primary: "Even", secondary: "Odd", primaryContract: "DIGITEVEN", secondaryContract: "DIGITODD", tickOnly: true },
  { id: "over_under", label: "Over / Under", primary: "Over", secondary: "Under", primaryContract: "DIGITOVER", secondaryContract: "DIGITUNDER", needsDigit: true, tickOnly: true },
  { id: "matches_differs", label: "Matches / Differs", primary: "Matches", secondary: "Differs", primaryContract: "DIGITMATCH", secondaryContract: "DIGITDIFF", needsDigit: true, tickOnly: true },
  { id: "touch_notouch", label: "Touch / No Touch", primary: "Touch", secondary: "No Touch", primaryContract: "ONETOUCH", secondaryContract: "NOTOUCH", needsBarrier: true, minDurationSec: 15 },
  { id: "ends_between", label: "Ends Between / Outside", primary: "Ends Between", secondary: "Ends Outside", primaryContract: "EXPIRYRANGE", secondaryContract: "EXPIRYMISS", needsBarrier: true, needsBarrier2: true, minDurationSec: 15 },
  { id: "stays_between", label: "Stays Between / Goes Outside", primary: "Stays Between", secondary: "Goes Outside", primaryContract: "RANGE", secondaryContract: "UPORDOWN", needsBarrier: true, needsBarrier2: true, minDurationSec: 15 },
  { id: "asian", label: "Asian", primary: "Asian Up", secondary: "Asian Down", primaryContract: "ASIANU", secondaryContract: "ASIAND", tickOnly: true, tickRange: [5, 10] },
  { id: "high_low_ticks", label: "High / Low Ticks", primary: "High Tick", secondary: "Low Tick", primaryContract: "TICKHIGH", secondaryContract: "TICKLOW", tickOnly: true, fixedTicks: 5 },
];

const FAMILY_GROUPS: Array<{ label: string; ids: DTraderFamily[] }> = [
  { label: "Up / Down", ids: ["rise_fall", "higher_lower"] },
  { label: "Digits", ids: ["even_odd", "over_under", "matches_differs"] },
  { label: "In / Out", ids: ["touch_notouch", "ends_between", "stays_between"] },
  { label: "Ticks", ids: ["asian", "high_low_ticks"] },
];

export function DTraderTicket({
  symbol,
  isConnected,
  isTrading,
  demoMode,
  stake,
  duration,
  tradeNotice,
  hasLiveQuote,
  tradingLocked,
  initialFamily = "rise_fall",
  initialBarrier = 4,
  initialDigitTarget = 5,
  onStakeChange,
  onDurationChange,
  onTrade,
  formatLocal,
}: DTraderTicketProps) {
  const [family, setFamily] = useState<DTraderFamily>(initialFamily);
  const [barrier, setBarrier] = useState(initialBarrier);
  const [barrier2, setBarrier2] = useState(0);
  const [digitTarget, setDigitTarget] = useState(initialDigitTarget);

  useEffect(() => {
    setFamily(initialFamily);
  }, [initialFamily]);
  useEffect(() => {
    setBarrier(initialBarrier);
  }, [initialBarrier]);
  useEffect(() => {
    setDigitTarget(initialDigitTarget);
  }, [initialDigitTarget]);

  const meta = FAMILIES.find((item) => item.id === family) ?? FAMILIES[0]!;
  const blocked = !isConnected || isTrading || tradingLocked || !hasLiveQuote;
  const durationUnit = meta.minDurationSec ? ("s" as const) : ("t" as const);
  const durationMin = meta.tickRange?.[0] ?? meta.minDurationSec ?? 1;
  const durationMax = meta.tickRange?.[1] ?? (meta.minDurationSec ? 86400 : 10);

  useEffect(() => {
    if (meta.fixedTicks) return;
    if (duration < durationMin) onDurationChange(durationMin);
    else if (duration > durationMax) onDurationChange(durationMax);
  }, [duration, durationMax, durationMin, meta.fixedTicks, onDurationChange]);

  function payload() {
    const digit = meta.needsDigit ? digitTarget : undefined;
    return {
      ...(meta.needsBarrier && !meta.needsDigit ? { barrier } : {}),
      ...(meta.needsBarrier2 ? { barrier2 } : {}),
      ...(digit !== undefined ? { lastDigitPrediction: digit, barrier: digit } : {}),
      duration: meta.fixedTicks ?? duration,
      durationUnit,
    };
  }

  const durationLabel = meta.tickOnly
    ? meta.fixedTicks
      ? `Fixed ${meta.fixedTicks} ticks`
      : meta.tickRange
        ? `Duration (${meta.tickRange[0]}–${meta.tickRange[1]} ticks)`
        : "Duration (ticks)"
    : meta.minDurationSec
      ? "Duration (min 15s)"
      : "Duration (ticks)";

  return (
    <div className="d-trader-ticket" data-testid="d-trader-ticket">
      <header className="d-trader-ticket-head">
        <p className="d-trader-kicker">Ticket</p>
        <h2>D-Trader</h2>
        <div className="d-trader-chips">
          <span>{symbol}</span>
          <span className={demoMode ? "is-demo" : "is-live"}>
            {demoMode ? "Demo" : "Live"}
          </span>
        </div>
      </header>

      <div className="d-trader-families" role="tablist" aria-label="Contract type">
        {FAMILY_GROUPS.map((group) => (
          <div key={group.label} className="d-trader-family-group">
            <p>{group.label}</p>
            <div>
              {group.ids.map((id) => {
                const item = FAMILIES.find((family) => family.id === id);
                if (!item) return null;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={family === item.id}
                    className={cn("d-trader-family", family === item.id && "is-on")}
                    onClick={() => setFamily(item.id)}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="d-trader-meta">
        {meta.tickOnly ? "Tick contracts" : "Timed contracts"}
      </p>

      <div className="d-trader-fields">
        {meta.needsDigit ? (
          <label className="d-trader-field">
            <span>Digit (0–9)</span>
            <input
              type="number"
              min={0}
              max={9}
              value={digitTarget}
              onChange={(event) =>
                setDigitTarget(Math.min(9, Math.max(0, Number(event.target.value) || 0)))
              }
            />
          </label>
        ) : null}

        {meta.needsBarrier ? (
          <label className="d-trader-field">
            <span>{meta.needsBarrier2 ? "High barrier" : "Barrier"}</span>
            <input
              type="number"
              step={meta.needsDigit ? 1 : 0.01}
              min={meta.needsDigit ? 0 : undefined}
              max={meta.needsDigit ? 9 : undefined}
              value={barrier}
              onChange={(event) => setBarrier(Number(event.target.value) || 0)}
            />
          </label>
        ) : null}

        {meta.needsBarrier2 ? (
          <label className="d-trader-field">
            <span>Low barrier</span>
            <input
              type="number"
              step={0.01}
              value={barrier2}
              onChange={(event) => setBarrier2(Number(event.target.value) || 0)}
            />
          </label>
        ) : null}

        <label className="d-trader-field">
          <span>Stake</span>
          <input
            type="number"
            min={0.35}
            step={0.01}
            value={stake}
            onChange={(event) => onStakeChange(Number(event.target.value) || 0)}
          />
          <em>{formatLocal(stake)}</em>
        </label>

        {!meta.fixedTicks ? (
          <label className="d-trader-field">
            <span>{durationLabel}</span>
            <input
              type="number"
              min={durationMin}
              max={durationMax}
              value={duration}
              onChange={(event) => {
                const next = Number(event.target.value) || durationMin;
                onDurationChange(Math.min(durationMax, Math.max(durationMin, next)));
              }}
            />
          </label>
        ) : (
          <p className="d-trader-fixed">{durationLabel}</p>
        )}
      </div>

      {tradeNotice ? <p className="d-trader-notice">{tradeNotice}</p> : null}

      <div className="d-trader-actions">
        <button
          type="button"
          className="d-trader-buy is-primary"
          disabled={blocked}
          onClick={() =>
            onTrade({ contractType: meta.primaryContract, ...payload() })
          }
        >
          {meta.primary}
        </button>
        <button
          type="button"
          className="d-trader-buy is-secondary"
          disabled={blocked}
          onClick={() =>
            onTrade({ contractType: meta.secondaryContract, ...payload() })
          }
        >
          {meta.secondary}
        </button>
      </div>
      <p className="d-trader-foot">
        {meta.primaryContract} / {meta.secondaryContract} on {symbol}
      </p>
    </div>
  );
}
