"use client";

import { useMemo, useState } from "react";
import { Play } from "lucide-react";
import { QUICK_STRATEGY_METAS, type QuickStrategyType } from "@/lib/bot/types";
import {
  BUILDER_TRADE_TYPES,
  DURATION_RULES,
  DURATION_UNIT_LABELS,
  builderGroupedMarketOptions,
  durationBounds,
  purchasesForTradeType,
  quickStrategyToSnapshot,
  validateQuickStrategy,
  type BuilderTradeType,
  type DurationUnit,
} from "@/lib/terminal/strategy-seed";
import type { BotBuilderSnapshot } from "@/lib/terminal/strategy-seed";
import { cn } from "@/lib/utils/cn";

interface QuickStrategyStudioProps {
  open: boolean;
  onClose: () => void;
  onCreate: (snapshot: BotBuilderSnapshot) => void;
  onRun?: (snapshot: BotBuilderSnapshot) => void;
}

const TRADE_TYPES = Object.keys(BUILDER_TRADE_TYPES) as BuilderTradeType[];

export function QuickStrategyStudio({
  open,
  onClose,
  onCreate,
  onRun,
}: QuickStrategyStudioProps) {
  const [type, setType] = useState<QuickStrategyType>("martingale");
  const [market, setMarket] = useState("Volatility 100 Index");
  const [tradeType, setTradeType] = useState<BuilderTradeType>("Rise/Fall");
  const [purchase, setPurchase] = useState("Rise");
  const [duration, setDuration] = useState("1");
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("t");
  const [stake, setStake] = useState("0.60");
  const [digitTarget, setDigitTarget] = useState("5");
  const [barrier, setBarrier] = useState("4");
  const [fields, setFields] = useState<Record<string, number>>({});

  const groups = builderGroupedMarketOptions();
  const meta = QUICK_STRATEGY_METAS.find((item) => item.type === type) ?? QUICK_STRATEGY_METAS[0]!;
  const purchases = purchasesForTradeType(tradeType);
  const spec = BUILDER_TRADE_TYPES[tradeType];
  const units = DURATION_RULES[tradeType]?.units ?? (["t"] as DurationUnit[]);
  const durationRule = durationBounds(tradeType, durationUnit);

  const snapshot = useMemo(() => {
    const params: Record<string, number> = {};
    for (const field of meta.fields) {
      if (field.key === "type") continue;
      params[field.key] = fields[field.key] ?? field.defaultValue;
    }
    return quickStrategyToSnapshot({
      type,
      market,
      tradeType,
      purchase,
      duration,
      durationUnit,
      stake,
      digitTarget: Number(digitTarget),
      barrier: Number(barrier),
      params: params as never,
    });
  }, [
    type,
    market,
    tradeType,
    purchase,
    duration,
    durationUnit,
    stake,
    digitTarget,
    barrier,
    fields,
    meta,
  ]);

  const error = validateQuickStrategy(snapshot);

  if (!open) return null;

  function selectType(next: QuickStrategyType) {
    setType(next);
    setFields({});
  }

  function selectTradeType(next: BuilderTradeType) {
    setTradeType(next);
    setPurchase(purchasesForTradeType(next)[0]!);
    const unit = DURATION_RULES[next]?.defaultUnit ?? "t";
    setDurationUnit(unit);
    setDuration(String(durationBounds(next, unit).min));
  }

  function selectDurationUnit(next: DurationUnit) {
    setDurationUnit(next);
    const bounds = durationBounds(tradeType, next);
    const value = Number(duration);
    if (!Number.isFinite(value) || value < bounds.min) setDuration(String(bounds.min));
    else if (value > bounds.max) setDuration(String(bounds.max));
  }

  function submit(run: boolean) {
    if (error) return;
    if (run && onRun) onRun(snapshot);
    else onCreate(snapshot);
    onClose();
  }

  return (
    <div
      className="tc-modal-scrim"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tc-qs-title"
      data-testid="tc-qs-studio"
      onClick={onClose}
    >
      <div
        className="tc-modal tc-qs-studio"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="tc-modal-title" id="tc-qs-title">
          Quick strategy
        </p>
        <p className="tc-modal-body">
          Choose a strategy, set the trade parameters, then Create the bot on the workspace or Run it.
        </p>

        <div className="tc-qs-layout">
          <ul className="tc-qs-types">
            {QUICK_STRATEGY_METAS.map((item) => (
              <li key={item.type}>
                <button
                  type="button"
                  className={cn("tc-qs-type", type === item.type && "is-on")}
                  data-testid={`tc-qs-type-${item.type}`}
                  onClick={() => selectType(item.type)}
                >
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="tc-qs-form">
            <label className="tc-qs-field">
              <span>Asset</span>
              <select value={market} onChange={(event) => setMarket(event.target.value)}>
                {groups.map((group) => (
                  <optgroup key={group.group} label={group.group}>
                    {group.options.map((option) => (
                      <option key={option.symbol} value={option.label}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <label className="tc-qs-field">
              <span>Trade type</span>
              <select
                value={tradeType}
                onChange={(event) => selectTradeType(event.target.value as BuilderTradeType)}
              >
                {TRADE_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="tc-qs-field">
              <span>Purchase</span>
              <select value={purchase} onChange={(event) => setPurchase(event.target.value)}>
                {purchases.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <div className="tc-qs-row">
              <label className="tc-qs-field">
                <span>Duration</span>
                <input
                  type="number"
                  min={durationRule.min}
                  max={durationRule.max}
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                />
              </label>
              <label className="tc-qs-field">
                <span>Unit</span>
                <select
                  value={durationUnit}
                  onChange={(event) => selectDurationUnit(event.target.value as DurationUnit)}
                >
                  {units.map((unit) => (
                    <option key={unit} value={unit}>
                      {DURATION_UNIT_LABELS[unit]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="tc-qs-field">
              <span>Initial stake</span>
              <input
                type="number"
                min={0.35}
                step={0.01}
                value={stake}
                onChange={(event) => setStake(event.target.value)}
              />
            </label>

            {spec?.needsDigit ? (
              <label className="tc-qs-field">
                <span>Last digit</span>
                <input
                  type="number"
                  min={0}
                  max={9}
                  step={1}
                  value={digitTarget}
                  onChange={(event) => setDigitTarget(event.target.value)}
                />
              </label>
            ) : null}

            {spec?.needsBarrier ? (
              <label className="tc-qs-field">
                <span>Barrier</span>
                <input
                  type="number"
                  step={0.01}
                  value={barrier}
                  onChange={(event) => setBarrier(event.target.value)}
                />
              </label>
            ) : null}

            {meta.fields
              .filter((field) => field.key !== "type" && !field.hidden)
              .map((field) => (
                <label key={field.key} className="tc-qs-field">
                  <span>{field.label}</span>
                  <input
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={fields[field.key] ?? field.defaultValue}
                    onChange={(event) =>
                      setFields((prev) => ({
                        ...prev,
                        [field.key]: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              ))}

            {error ? (
              <p className="tc-qs-error" role="alert">
                {error}
              </p>
            ) : (
              <p className="tc-qs-hint">{meta.description}</p>
            )}
          </div>
        </div>

        <div className="tc-load-dialog-actions tc-qs-actions">
          <button type="button" className="tc-btn tc-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="tc-btn tc-btn-ghost"
            data-testid="tc-qs-create"
            disabled={Boolean(error)}
            onClick={() => submit(false)}
          >
            Create
          </button>
          <button
            type="button"
            className="tc-btn tc-btn-solid"
            data-testid="tc-qs-run"
            disabled={Boolean(error)}
            onClick={() => submit(true)}
          >
            <Play style={{ width: 14, height: 14 }} strokeWidth={2} />
            Run
          </button>
        </div>
      </div>
    </div>
  );
}
