"use client";

import { Plus } from "lucide-react";
import { QUICK_STRATEGY_METAS, type QuickStrategyType } from "@/lib/bot/types";
import {
  BUILDER_TRADE_TYPES,
  CANDLE_INTERVALS,
  DURATION_UNIT_LABELS,
  defaultQuickParams,
  type BotBuilderSnapshot,
  type BuilderTradeType,
  type DurationRule,
  type DurationUnit,
} from "@/lib/terminal/strategy-seed";
import { CHART_MARKET_TREE, findChartMarketPath } from "@/lib/terminal/chart-markets";
import { cn } from "@/lib/utils/cn";

type FocusBlock = "trade" | "purchase" | "sell" | "restart";

interface CanvasChip {
  id: string;
  label: string;
  category: string;
  lane: FocusBlock;
}

interface BuilderBlocklyBlocksProps {
  snapshot: BotBuilderSnapshot;
  running: boolean;
  walletCurrency: string;
  tradeFamily: string;
  familyTypes: BuilderTradeType[];
  purchaseOptions: string[];
  durationRule?: DurationRule;
  durationLimit: { min: number; max: number };
  chips: CanvasChip[];
  focusBlock: FocusBlock;
  vhOpen: boolean;
  onFocus: (lane: FocusBlock) => void;
  onPatch: (partial: Partial<BotBuilderSnapshot>, journalText?: string) => void;
  onToggleVh: () => void;
  onOpenVh: (open: boolean) => void;
}

function BlockHead({
  index,
  title,
}: {
  index: string;
  title: string;
}) {
  return (
    <header className="bot-builder-block-head">
      <h3>
        {index}. {title}
      </h3>
    </header>
  );
}

function LaneChips({ chips, lane }: { chips: CanvasChip[]; lane: FocusBlock }) {
  const shown = chips.filter((chip) => chip.lane === lane).slice(0, 10);
  if (!shown.length) return null;
  return (
    <div className="bot-builder-chips" data-testid={`tc-builder-chips-${lane}`}>
      {shown.map((chip) => (
        <span key={chip.id} className="bot-builder-chip">
          {chip.label}
        </span>
      ))}
    </div>
  );
}

function Caret() {
  return (
    <span className="bot-builder-caret" aria-hidden>
      {">"}
    </span>
  );
}

export function BuilderBlocklyBlocks({
  snapshot,
  running,
  walletCurrency,
  tradeFamily,
  familyTypes,
  purchaseOptions,
  durationRule,
  durationLimit,
  chips,
  focusBlock,
  vhOpen,
  onFocus,
  onPatch,
  onToggleVh,
  onOpenVh,
}: BuilderBlocklyBlocksProps) {
  const vhMeta =
    QUICK_STRATEGY_METAS.find(
      (meta) => meta.type === (snapshot.quickStrategy?.type ?? "martingale"),
    ) ?? QUICK_STRATEGY_METAS[0];
  const hidden = snapshot.hideTradeParameters;
  const tradeSpec = BUILDER_TRADE_TYPES[snapshot.tradeType];
  const marketPath =
    findChartMarketPath(snapshot.symbol) ??
    findChartMarketPath(snapshot.market) ??
    findChartMarketPath("1HZ100V")!;
  const continuous = marketPath.group.label === "Continuous Indices";

  function pickMarket(symbol: string, label: string, journal: string) {
    onPatch(
      {
        symbol,
        market: label,
        alternateMarkets:
          findChartMarketPath(symbol)?.group.label === "Continuous Indices"
            ? snapshot.alternateMarkets
            : false,
      },
      journal,
    );
  }

  return (
    <>
      <article
        data-lane="trade"
        className={cn("bot-builder-block", focusBlock === "trade" && "bot-builder-block-focused")}
        onClick={() => onFocus("trade")}
      >
        <BlockHead index="1" title="Trade parameters" />
        <div className="bot-builder-block-body">
          <div className="bot-builder-inline bot-builder-market-strip">
            <span className="bot-builder-inline-label">Market:</span>
            <select
              className="bot-builder-inline-select"
              disabled={running}
              aria-label="Market category"
              value={marketPath.category.id}
              onChange={(event) => {
                const category = CHART_MARKET_TREE.find((item) => item.id === event.target.value);
                const group = category?.groups[0];
                const market = group?.markets[0];
                if (market) pickMarket(market.id, market.label, "Market category changed");
              }}
            >
              {CHART_MARKET_TREE.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
            <Caret />
            <select
              className="bot-builder-inline-select"
              disabled={running}
              aria-label="Market group"
              value={marketPath.group.id}
              onChange={(event) => {
                const group = marketPath.category.groups.find((item) => item.id === event.target.value);
                const market = group?.markets[0];
                if (market) pickMarket(market.id, market.label, "Market group changed");
              }}
            >
              {marketPath.category.groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.label}
                </option>
              ))}
            </select>
            <Caret />
            <select
              className="bot-builder-inline-select"
              disabled={running}
              aria-label="Market"
              value={marketPath.market.id}
              onChange={(event) => {
                const market = marketPath.group.markets.find((item) => item.id === event.target.value);
                if (market) pickMarket(market.id, market.label, "Market updated");
              }}
            >
              {marketPath.group.markets.map((market) => (
                <option key={market.id} value={market.id}>
                  {market.label}
                </option>
              ))}
            </select>
          </div>

          <label className="bot-builder-check">
            <input
              type="checkbox"
              disabled={running || !continuous}
              checked={snapshot.alternateMarkets && continuous}
              onChange={(event) =>
                onPatch({
                  alternateMarkets: event.target.checked,
                  maxOpenPositions: event.target.checked
                    ? Math.max(2, snapshot.maxOpenPositions)
                    : 1,
                })
              }
            />
            Alternate markets (Continuous Indices only):
          </label>
          <div className="bot-builder-inline">
            <span className="bot-builder-inline-label">Alternate mode:</span>
            <select
              className="bot-builder-inline-select"
              disabled={running || !snapshot.alternateMarkets || !continuous}
              value={snapshot.alternateMode}
              onChange={(event) =>
                onPatch({
                  alternateMode: event.target.value as BotBuilderSnapshot["alternateMode"],
                })
              }
            >
              <option value="every_x_runs">Every X runs</option>
            </select>
            <span className="bot-builder-inline-label">every</span>
            <input
              className="bot-builder-inline-input"
              disabled={running || !snapshot.alternateMarkets || !continuous}
              type="number"
              min={1}
              max={50}
              value={snapshot.alternateEvery}
              onChange={(event) =>
                onPatch({
                  alternateEvery: Math.min(50, Math.max(1, Number(event.target.value) || 1)),
                })
              }
            />
          </div>

          {!hidden ? (
            <>
              <div className="bot-builder-inline">
                <span className="bot-builder-inline-label">Trade Type:</span>
                <select
                  className="bot-builder-inline-select"
                  disabled={running}
                  value={tradeFamily}
                  onChange={(event) => {
                    const family = event.target.value;
                    if (family === "Up/Down") onPatch({ tradeType: "Rise/Fall" });
                    else if (family === "Digits") onPatch({ tradeType: "Even/Odd" });
                    else if (family === "In/Out") onPatch({ tradeType: "Touch/No Touch" });
                    else if (family === "Asian") onPatch({ tradeType: "Asian" });
                    else if (family === "Reset") onPatch({ tradeType: "Reset" });
                    else if (family === "High/Low Ticks") onPatch({ tradeType: "High/Low Ticks" });
                  }}
                >
                  <option value="Up/Down">Up/Down</option>
                  <option value="Digits">Digits</option>
                  <option value="In/Out">In/Out</option>
                  <option value="Asian">Asian</option>
                  <option value="Reset">Reset</option>
                  <option value="High/Low Ticks">High/Low Ticks</option>
                </select>
                <Caret />
                <select
                  className="bot-builder-inline-select"
                  disabled={running}
                  value={snapshot.tradeType}
                  onChange={(event) =>
                    onPatch({ tradeType: event.target.value as BuilderTradeType })
                  }
                >
                  {familyTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="bot-builder-inline">
                <span className="bot-builder-inline-label">Contract Type:</span>
                <select
                  className="bot-builder-inline-select"
                  disabled={running}
                  value={snapshot.contractType}
                  onChange={(event) =>
                    onPatch({
                      contractType: event.target.value as BotBuilderSnapshot["contractType"],
                    })
                  }
                >
                  <option>Both</option>
                  <option>Call</option>
                  <option>Put</option>
                </select>
              </div>
              <div className="bot-builder-inline">
                <span className="bot-builder-inline-label">Default Candle Interval:</span>
                <select
                  className="bot-builder-inline-select"
                  disabled={running}
                  value={snapshot.candleInterval}
                  onChange={(event) =>
                    onPatch({
                      candleInterval: event.target.value as BotBuilderSnapshot["candleInterval"],
                    })
                  }
                >
                  {CANDLE_INTERVALS.map((interval) => (
                    <option key={interval} value={interval}>
                      {interval}
                    </option>
                  ))}
                </select>
              </div>
              {tradeSpec?.needsBarrier ? (
                <div className="bot-builder-inline">
                  <span className="bot-builder-inline-label">Barrier:</span>
                  <input
                    className="bot-builder-inline-input"
                    disabled={running}
                    type="number"
                    step={0.01}
                    value={snapshot.barrier}
                    onChange={(event) => onPatch({ barrier: Number(event.target.value) || 0 })}
                  />
                </div>
              ) : null}
              {tradeSpec?.needsDigit ? (
                <div className="bot-builder-inline">
                  <span className="bot-builder-inline-label">
                    {snapshot.tradeType === "Matches" ? "Match digit:" : "Digit barrier:"}
                  </span>
                  <input
                    className="bot-builder-inline-input"
                    disabled={running}
                    type="number"
                    min={0}
                    max={9}
                    value={snapshot.tradeType === "Matches" ? snapshot.digitTarget : snapshot.barrier}
                    onChange={(event) => {
                      const value = Math.min(9, Math.max(0, Number(event.target.value) || 0));
                      onPatch(
                        snapshot.tradeType === "Matches" ? { digitTarget: value } : { barrier: value },
                      );
                    }}
                  />
                </div>
              ) : null}
            </>
          ) : null}

          <label className="bot-builder-check">
            <input
              type="checkbox"
              checked={snapshot.restartBuySellOnError}
              onChange={(event) => onPatch({ restartBuySellOnError: event.target.checked })}
            />
            Restart buy/sell on error (disable for better performance):
          </label>
          <div className="bot-builder-inline">
            <label className="bot-builder-check">
              <input
                type="checkbox"
                checked={snapshot.virtualHook}
                onChange={(event) => {
                  onPatch({ virtualHook: event.target.checked });
                  onOpenVh(event.target.checked);
                }}
              />
              Virtual Hook:
            </label>
            {snapshot.virtualHook ? (
              <button type="button" className="bot-builder-vh-link" onClick={onToggleVh}>
                VH Settings
              </button>
            ) : null}
          </div>

          {snapshot.virtualHook && vhOpen ? (
            <div
              className="bot-builder-vh-panel"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="bot-builder-inline">
                <span className="bot-builder-inline-label">Recovery:</span>
                <select
                  className="bot-builder-inline-select"
                  disabled={running}
                  value={snapshot.quickStrategy?.type ?? "martingale"}
                  onChange={(event) =>
                    onPatch({
                      virtualHook: true,
                      quickStrategy: defaultQuickParams(event.target.value as QuickStrategyType),
                    })
                  }
                >
                  {QUICK_STRATEGY_METAS.map((meta) => (
                    <option key={meta.type} value={meta.type}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>
              {vhMeta?.fields
                .filter((field) => field.key !== "type" && !field.hidden)
                .map((field) => (
                  <div key={field.key} className="bot-builder-inline">
                    <span className="bot-builder-inline-label">{field.label}:</span>
                    <input
                      className="bot-builder-inline-input"
                      disabled={running}
                      type="number"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={Number(snapshot.quickStrategy?.[field.key] ?? field.defaultValue)}
                      onChange={(event) =>
                        onPatch({
                          virtualHook: true,
                          quickStrategy: {
                            ...(snapshot.quickStrategy ?? defaultQuickParams("martingale")),
                            [field.key]: Number(event.target.value),
                          },
                        })
                      }
                    />
                  </div>
                ))}
            </div>
          ) : null}

          <label className="bot-builder-check">
            <input
              type="checkbox"
              checked={snapshot.restartOnError}
              onChange={(event) => onPatch({ restartOnError: event.target.checked })}
            />
            Restart last trade on error (bot ignores the unsuccessful trade):
          </label>

          <div className="bot-builder-statement">
            <span>Run once at start:</span>
            <div
              className={cn(
                "bot-builder-statement-slot",
                snapshot.runOnceAtStart && "is-on",
              )}
            >
              <label className="bot-builder-check">
                <input
                  type="checkbox"
                  checked={snapshot.runOnceAtStart}
                  onChange={(event) => onPatch({ runOnceAtStart: event.target.checked })}
                />
                {snapshot.runOnceAtStart ? "Once at start" : "Off"}
              </label>
            </div>
          </div>

          {!hidden ? (
            <div className="bot-builder-subblock">
              <header>Trade options:</header>
              <div className="bot-builder-subblock-body">
                <div className="bot-builder-inline">
                  <span className="bot-builder-inline-label">Duration:</span>
                  <select
                    className="bot-builder-inline-select"
                    disabled={running}
                    value={snapshot.durationUnit}
                    onChange={(event) =>
                      onPatch({ durationUnit: event.target.value as DurationUnit })
                    }
                  >
                    {(durationRule?.units ?? (["t"] as DurationUnit[])).map((unit) => (
                      <option key={unit} value={unit}>
                        {DURATION_UNIT_LABELS[unit]}
                      </option>
                    ))}
                  </select>
                  <input
                    className="bot-builder-inline-input"
                    disabled={running}
                    type="number"
                    min={durationLimit.min}
                    max={durationLimit.max}
                    value={snapshot.duration}
                    onChange={(event) => onPatch({ duration: event.target.value })}
                  />
                  <span className="bot-builder-inline-label">Stake:</span>
                  <select className="bot-builder-inline-select" disabled value={walletCurrency}>
                    <option value={walletCurrency}>{walletCurrency}</option>
                  </select>
                  <input
                    className="bot-builder-inline-input"
                    disabled={running}
                    type="number"
                    min={0.35}
                    step={0.01}
                    value={snapshot.stake}
                    onChange={(event) => onPatch({ stake: event.target.value })}
                  />
                  <span className="bot-builder-hint">(min: 0.6 - max: 77000)</span>
                </div>
                <label className="bot-builder-check">
                  <input
                    type="checkbox"
                    checked={snapshot.tradeEachTick}
                    onChange={(event) => onPatch({ tradeEachTick: event.target.checked })}
                  />
                  Trade each tick:
                </label>
              </div>
            </div>
          ) : null}

          <LaneChips chips={chips} lane="trade" />
        </div>
      </article>

      <article
        data-lane="purchase"
        className={cn(
          "bot-builder-block",
          focusBlock === "purchase" && "bot-builder-block-focused",
        )}
        onClick={() => onFocus("purchase")}
      >
        <BlockHead index="2" title="Purchase conditions" />
        <div className="bot-builder-block-body">
          <div className="bot-builder-inline">
            <span className="bot-builder-inline-label">Purchase:</span>
            <select
              className="bot-builder-inline-select"
              disabled={running}
              value={snapshot.purchase}
              onChange={(event) => onPatch({ purchase: event.target.value })}
            >
              {purchaseOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="bot-builder-inline">
            <span className="bot-builder-inline-label">Allow Bulk Purchase:</span>
                <select
                  className="bot-builder-inline-select"
                  disabled={running}
                  value={snapshot.allowBulkPurchase ? "yes" : "no"}
                  onChange={(event) =>
                    onPatch({
                      allowBulkPurchase: event.target.value === "yes",
                      bulkTradeCount:
                        event.target.value === "yes"
                          ? Math.max(1, snapshot.bulkTradeCount)
                          : 1,
                    })
                  }
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
              <div className="bot-builder-inline">
                <span className="bot-builder-inline-label">No. of Trades:</span>
                <input
                  className="bot-builder-inline-input"
                  disabled={running || !snapshot.allowBulkPurchase}
                  type="number"
                  min={1}
                  max={20}
                  value={snapshot.bulkTradeCount}
                  onChange={(event) =>
                    onPatch({
                      allowBulkPurchase: true,
                      bulkTradeCount: Math.min(20, Math.max(1, Number(event.target.value) || 1)),
                    })
                  }
                />
              </div>
          <LaneChips chips={chips} lane="purchase" />
        </div>
      </article>

      <article
        data-lane="sell"
        className={cn("bot-builder-block", focusBlock === "sell" && "bot-builder-block-focused")}
        onClick={() => onFocus("sell")}
      >
        <BlockHead index="3" title="Sell conditions" />
        <div className="bot-builder-block-body">
          <p className="bot-builder-logic-line">
            <span className="bot-builder-logic-chip">if</span>
            <select className="bot-builder-inline-select" disabled value="available">
              <option value="available">Sell is available</option>
            </select>
            <span className="bot-builder-logic-chip">then</span>
          </p>
          <div className="bot-builder-statement-slot">
            {snapshot.sellAction === "sell_at_market" ? (
              <div className="bot-builder-mini">
                <span>Sell at market</span>
                <button
                  type="button"
                  className="bot-builder-mini-clear"
                  disabled={running}
                  onClick={() => onPatch({ sellAction: "none" })}
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="bot-builder-plus"
                disabled={running}
                aria-label="Add sell action"
                onClick={() => onPatch({ sellAction: "sell_at_market" })}
              >
                <Plus strokeWidth={2.5} />
              </button>
            )}
            <select
              className="bot-builder-inline-select"
              disabled={running}
              value={snapshot.sellAction}
              onChange={(event) =>
                onPatch({
                  sellAction: event.target.value as BotBuilderSnapshot["sellAction"],
                })
              }
            >
              <option value="none">No action</option>
              <option value="sell_at_market">Sell at market</option>
            </select>
          </div>
          <LaneChips chips={chips} lane="sell" />
        </div>
      </article>

      <article
        data-lane="restart"
        className={cn(
          "bot-builder-block",
          focusBlock === "restart" && "bot-builder-block-focused",
        )}
        onClick={() => onFocus("restart")}
      >
        <BlockHead index="4" title="Restart trading conditions" />
        <div className="bot-builder-block-body">
          <div className="bot-builder-inline">
            <select
              className="bot-builder-inline-select"
              disabled={running}
              value={snapshot.restartAction}
              onChange={(event) =>
                onPatch({
                  restartAction: event.target.value as BotBuilderSnapshot["restartAction"],
                })
              }
            >
              <option value="trade_again">Trade again</option>
              <option value="stop">Stop after loss</option>
            </select>
          </div>
          <LaneChips chips={chips} lane="restart" />
        </div>
      </article>
    </>
  );
}
