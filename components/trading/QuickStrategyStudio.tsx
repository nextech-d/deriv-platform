"use client";

import { useEffect, useMemo, useState } from "react";
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
  builderTradeTypeLabel,
  type BuilderTradeType,
  type DurationUnit,
  type BotBuilderSnapshot,
} from "@/lib/terminal/strategy-seed";
import { cn } from "@/lib/utils/cn";

interface QuickStrategyStudioProps {
  open: boolean;
  onClose: () => void;
  onCreate: (snapshot: BotBuilderSnapshot) => void;
  onRun?: (snapshot: BotBuilderSnapshot) => void;
}

type QsFamily = "options" | "accumulators";
type QsStep = "template" | "parameters";
type QsFilter = "all" | "accumulators" | "options";

type QsTemplate = {
  id: string;
  family: QsFamily;
  type: QuickStrategyType;
  name: string;
  testId?: string;
};

const OPTIONS_TEMPLATES: QsTemplate[] = [
  { id: "opt-martingale", family: "options", type: "martingale", name: "Martingale", testId: "tc-qs-type-martingale" },
  { id: "opt-dalembert", family: "options", type: "dalembert", name: "D'Alembert", testId: "tc-qs-type-dalembert" },
  { id: "opt-reverse-martingale", family: "options", type: "reverse_martingale", name: "Reverse Martingale" },
  { id: "opt-reverse-dalembert", family: "options", type: "reverse_dalembert", name: "Reverse D'Alembert" },
  { id: "opt-oscars", family: "options", type: "oscars_grind", name: "Oscar's Grind" },
  { id: "opt-1326", family: "options", type: "one_three_two_six", name: "1-3-2-6" },
];

const ACCUMULATOR_TEMPLATES: QsTemplate[] = [
  { id: "acc-martingale", family: "accumulators", type: "martingale", name: "Martingale" },
  { id: "acc-martingale-reset", family: "accumulators", type: "martingale", name: "Martingale on Stat Reset" },
  { id: "acc-dalembert", family: "accumulators", type: "dalembert", name: "D'Alembert" },
  { id: "acc-dalembert-reset", family: "accumulators", type: "dalembert", name: "D'Alembert on Stat Reset" },
  { id: "acc-rev-martingale", family: "accumulators", type: "reverse_martingale", name: "Reverse Martingale" },
  {
    id: "acc-rev-martingale-reset",
    family: "accumulators",
    type: "reverse_martingale",
    name: "Reverse Martingale on Stat Reset",
  },
  { id: "acc-rev-dalembert", family: "accumulators", type: "reverse_dalembert", name: "Reverse D'Alembert" },
  {
    id: "acc-rev-dalembert-reset",
    family: "accumulators",
    type: "reverse_dalembert",
    name: "Reverse D'Alembert on Stat Reset",
  },
];

const ALL_TEMPLATES = [...ACCUMULATOR_TEMPLATES, ...OPTIONS_TEMPLATES];
const TRADE_TYPES = Object.keys(BUILDER_TRADE_TYPES) as BuilderTradeType[];
const GROWTH_RATES = ["1%", "2%", "3%", "4%", "5%"];

const FIELD_HELP: Record<string, string> = {
  asset: "The underlying market your bot will trade with this strategy.",
  contract: "Your bot will use this contract type for every run.",
  purchase: "Your bot uses a single trade type for each run.",
  digit: "Your prediction of the last digit of the asset price.",
  stake: "The amount that you stake for the first trade. Note that this is the minimum stake amount.",
  duration: "How long each trade takes to expire.",
  profit: "The bot will stop trading if your total profit exceeds this amount.",
  loss: "The bot will stop trading if your total loss exceeds this amount.",
  size: "The size used to multiply the stake after a losing trade for the next trade.",
  sizeWin: "The size used to multiply the stake after a successful trade for the next trade.",
  unit: "Number of unit(s) to be added to the next trade after a losing trade. One unit is equivalent to the amount of initial stake.",
  unitWin:
    "Number of unit(s) to be added to the next trade after a successful trade. One unit is equivalent to the amount of initial stake.",
  maxStake: "The stake for your next trade will reset to the initial stake if it exceeds this value.",
  growth:
    "Your stake will grow at the specified growth rate per tick as long as the current spot price remains within the range of the previous spot price.",
  sell: "Choose whether the bot sells on take profit or after a number of ticks.",
};

function Info({ text }: { text: string }) {
  return (
    <button type="button" className="bot-qs-info" title={text} aria-label={text}>
      i
    </button>
  );
}

export function QuickStrategyStudio({
  open,
  onClose,
  onCreate,
  onRun,
}: QuickStrategyStudioProps) {
  const [step, setStep] = useState<QsStep>("template");
  const [filter, setFilter] = useState<QsFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("opt-martingale");
  const [market, setMarket] = useState("Volatility 100 Index");
  const [tradeType, setTradeType] = useState<BuilderTradeType>("Rise/Fall");
  const [purchase, setPurchase] = useState("Rise");
  const [duration, setDuration] = useState("1");
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("t");
  const [stake, setStake] = useState("0.60");
  const [digitTarget, setDigitTarget] = useState("5");
  const [barrier, setBarrier] = useState("4");
  const [fields, setFields] = useState<Record<string, number>>({});
  const [maxStakeOn, setMaxStakeOn] = useState(false);
  const [growthRate, setGrowthRate] = useState("1%");
  const [sellByTicks, setSellByTicks] = useState(false);
  const [tickCount, setTickCount] = useState("5");
  const [takeProfitAmount, setTakeProfitAmount] = useState("10");

  const selected = ALL_TEMPLATES.find((item) => item.id === selectedId) ?? OPTIONS_TEMPLATES[0]!;
  const type = selected.type;
  const isAccumulator = selected.family === "accumulators";
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
    if (!maxStakeOn) delete params.maxStake;
    const built = quickStrategyToSnapshot({
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
    const label =
      selected.family === "accumulators"
        ? `Quick strategy · Accumulators · ${selected.name}`
        : `Quick strategy · ${meta.label}`;
    return {
      ...built,
      sourceLabel: label,
      tradeOptionsMode: selected.family === "accumulators" ? "accumulator" : "vanilla",
      growthRate,
      takeProfitAmount,
      tickCount,
      sellByTicks,
    } satisfies BotBuilderSnapshot;
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
    maxStakeOn,
    selected,
    growthRate,
    takeProfitAmount,
    tickCount,
    sellByTicks,
  ]);

  const error = validateQuickStrategy(snapshot);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byFamily =
      filter === "all" ? ALL_TEMPLATES : filter === "accumulators" ? ACCUMULATOR_TEMPLATES : OPTIONS_TEMPLATES;
    if (!q) return byFamily;
    return byFamily.filter((item) => item.name.toLowerCase().includes(q));
  }, [filter, query]);

  useEffect(() => {
    if (!open) return;
    setStep("template");
    setFilter("all");
    setQuery("");
    setSelectedId("opt-martingale");
    setFields({});
    setMaxStakeOn(false);
  }, [open]);

  if (!open) return null;

  function selectTemplate(template: QsTemplate) {
    setSelectedId(template.id);
    setFields({});
    setMaxStakeOn(false);
    setStep("parameters");
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

  const accumulators = filtered.filter((item) => item.family === "accumulators");
  const options = filtered.filter((item) => item.family === "options");
  const sizeHelp =
    type === "reverse_martingale" ? FIELD_HELP.sizeWin : type === "reverse_dalembert" ? FIELD_HELP.unitWin : FIELD_HELP.size;
  const unitHelp = type === "reverse_dalembert" ? FIELD_HELP.unitWin : FIELD_HELP.unit;

  return (
    <div
      className="tc-modal-scrim"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bot-qs-title"
      data-testid="tc-qs-studio"
      onClick={onClose}
    >
      <div className="bot-qs-official" onClick={(event) => event.stopPropagation()}>
        <header className="bot-qs-official-head">
          <div>
            <h2 id="bot-qs-title">Quick Strategy</h2>
            <p>Choose a template below and set your trade parameters.</p>
          </div>
          <button type="button" className="bot-qs-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <ol className="bot-qs-stepper">
          <li className={step === "template" ? "is-active" : "is-done"}>
            <button type="button" onClick={() => setStep("template")}>
              <span>1</span>
              Strategy template
            </button>
          </li>
          <li className={step === "parameters" ? "is-active" : ""}>
            <button type="button" onClick={() => setStep("parameters")}>
              <span>2</span>
              Trade parameters
            </button>
          </li>
        </ol>

        {step === "template" ? (
          <div className="bot-qs-templates">
            <div className="bot-qs-filters" role="tablist" aria-label="Strategy type">
              {(["all", "accumulators", "options"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={filter === id}
                  className={filter === id ? "is-active" : ""}
                  onClick={() => setFilter(id)}
                >
                  {id === "all" ? "All" : id === "accumulators" ? "Accumulators" : "Options"}
                </button>
              ))}
            </div>
            <label className="bot-qs-search">
              <span className="sr-only">Search</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" />
            </label>
            <div className="bot-qs-template-groups">
              {accumulators.length === 0 && options.length === 0 ? (
                <p className="bot-qs-empty">No results found</p>
              ) : null}
              {(filter === "all" || filter === "accumulators") && accumulators.length > 0 ? (
                <section>
                  <h3>Accumulators</h3>
                  <ul>
                    {accumulators.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={cn(selectedId === item.id && "is-active")}
                          onClick={() => selectTemplate(item)}
                        >
                          {item.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {(filter === "all" || filter === "options") && options.length > 0 ? (
                <section>
                  <h3>Options</h3>
                  <ul>
                    {options.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={cn(selectedId === item.id && "is-active")}
                          data-testid={item.testId}
                          onClick={() => selectTemplate(item)}
                        >
                          {item.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="bot-qs-params">
            <div className="bot-qs-param-tabs">
              <span className="is-on">Trade parameters</span>
              <span className="is-disabled" title="Coming soon">
                Learn more
              </span>
            </div>
            <p className="bot-qs-selected">
              {isAccumulator ? "Accumulators" : "Options"} · {selected.name}
            </p>
            <form className="bot-qs-form" onSubmit={(event) => event.preventDefault()}>
              <div className="bot-qs-form-col">
                <label className="bot-qs-field">
                  <span>
                    Asset
                    <Info text={FIELD_HELP.asset} />
                  </span>
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

                {isAccumulator ? (
                  <>
                    <label className="bot-qs-field">
                      <span>
                        Initial stake
                        <Info text={FIELD_HELP.stake} />
                      </span>
                      <input
                        type="number"
                        min={0.35}
                        step={0.01}
                        value={stake}
                        onChange={(event) => setStake(event.target.value)}
                      />
                    </label>
                    <label className="bot-qs-field">
                      <span>
                        Growth rate
                        <Info text={FIELD_HELP.growth} />
                      </span>
                      <select value={growthRate} onChange={(event) => setGrowthRate(event.target.value)}>
                        {GROWTH_RATES.map((rate) => (
                          <option key={rate}>{rate}</option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : (
                  <>
                    <label className="bot-qs-field">
                      <span>
                        Contract type
                        <Info text={FIELD_HELP.contract} />
                      </span>
                      <select
                        value={tradeType}
                        onChange={(event) => selectTradeType(event.target.value as BuilderTradeType)}
                      >
                        {TRADE_TYPES.map((item) => (
                          <option key={item} value={item}>
                            {builderTradeTypeLabel(item)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="bot-qs-field">
                      <span>
                        Purchase condition
                        <Info text={FIELD_HELP.purchase} />
                      </span>
                      <select value={purchase} onChange={(event) => setPurchase(event.target.value)}>
                        {purchases.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                    {spec?.needsDigit ? (
                      <label className="bot-qs-field">
                        <span>
                          Last Digit Prediction
                          <Info text={FIELD_HELP.digit} />
                        </span>
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
                      <label className="bot-qs-field">
                        <span>Barrier</span>
                        <input
                          type="number"
                          step={0.01}
                          value={barrier}
                          onChange={(event) => setBarrier(event.target.value)}
                        />
                      </label>
                    ) : null}
                    <label className="bot-qs-field">
                      <span>
                        Initial stake
                        <Info text={FIELD_HELP.stake} />
                      </span>
                      <input
                        type="number"
                        min={0.35}
                        step={0.01}
                        value={stake}
                        onChange={(event) => setStake(event.target.value)}
                      />
                    </label>
                    <div className="bot-qs-row">
                      <label className="bot-qs-field">
                        <span>
                          Duration
                          <Info text={FIELD_HELP.duration} />
                        </span>
                        <input
                          type="number"
                          min={durationRule.min}
                          max={durationRule.max}
                          value={duration}
                          onChange={(event) => setDuration(event.target.value)}
                        />
                      </label>
                      <label className="bot-qs-field">
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
                  </>
                )}
              </div>

              <div className="bot-qs-form-col">
                {meta.fields
                  .filter((field) => field.key !== "type" && field.key !== "maxStake" && !field.hidden)
                  .map((field) => (
                    <label key={field.key} className="bot-qs-field">
                      <span>
                        {field.label}
                        <Info
                          text={
                            field.key === "profitThreshold"
                              ? FIELD_HELP.profit
                              : field.key === "lossThreshold"
                                ? FIELD_HELP.loss
                                : field.key === "size"
                                  ? sizeHelp
                                  : field.key === "unit"
                                    ? unitHelp
                                    : field.label
                          }
                        />
                      </span>
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

                {isAccumulator ? (
                  <>
                    <label className="bot-qs-field">
                      <span>
                        Sell conditions
                        <Info text={FIELD_HELP.sell} />
                      </span>
                      <select
                        value={sellByTicks ? "ticks" : "profit"}
                        onChange={(event) => setSellByTicks(event.target.value === "ticks")}
                      >
                        <option value="profit">Take profit</option>
                        <option value="ticks">Tick count</option>
                      </select>
                    </label>
                    {sellByTicks ? (
                      <label className="bot-qs-field">
                        <span>Tick count</span>
                        <input
                          type="number"
                          min={1}
                          value={tickCount}
                          onChange={(event) => setTickCount(event.target.value)}
                        />
                      </label>
                    ) : (
                      <label className="bot-qs-field">
                        <span>Take profit</span>
                        <input
                          type="number"
                          min={0.35}
                          step={0.01}
                          value={takeProfitAmount}
                          onChange={(event) => setTakeProfitAmount(event.target.value)}
                        />
                      </label>
                    )}
                  </>
                ) : null}

                {meta.fields.some((field) => field.key === "maxStake") ? (
                  <>
                    <label className="bot-qs-check">
                      <input
                        type="checkbox"
                        checked={maxStakeOn}
                        onChange={(event) => setMaxStakeOn(event.target.checked)}
                      />
                      <span>
                        Max stake
                        <Info text={FIELD_HELP.maxStake} />
                      </span>
                    </label>
                    {maxStakeOn ? (
                      <label className="bot-qs-field">
                        <span>Max stake</span>
                        <input
                          type="number"
                          min={0.35}
                          step={0.01}
                          value={fields.maxStake ?? 50}
                          onChange={(event) =>
                            setFields((prev) => ({
                              ...prev,
                              maxStake: Number(event.target.value),
                            }))
                          }
                        />
                      </label>
                    ) : null}
                  </>
                ) : null}
              </div>
            </form>
            {error ? (
              <p className="bot-qs-error" role="alert">
                {error}
              </p>
            ) : (
              <p className="bot-qs-hint">{meta.description}</p>
            )}
          </div>
        )}

        <footer className="bot-qs-official-foot">
          <button
            type="button"
            className="tc-btn tc-btn-ghost"
            disabled={step === "template"}
            onClick={() => setStep("template")}
          >
            Back
          </button>
          <div className="bot-qs-official-actions">
            <button
              type="button"
              className="tc-btn tc-btn-ghost"
              data-testid="tc-qs-create"
              disabled={Boolean(error)}
              onClick={() => submit(false)}
            >
              Load
            </button>
            <button
              type="button"
              className="bot-qs-run"
              data-testid="tc-qs-run"
              disabled={Boolean(error)}
              onClick={() => submit(true)}
            >
              Run
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
