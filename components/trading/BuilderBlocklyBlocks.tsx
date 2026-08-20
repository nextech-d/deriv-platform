"use client";

import { Plus } from "lucide-react";
import {
  CANDLE_INTERVALS,
  DURATION_UNIT_LABELS,
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

function BlockHead({ index, title }: { index: string; title: string }) {
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

function categoryLabel(id: string, fallback: string) {
  return id === "synthetics" ? "Derived" : fallback;
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
  onFocus,
  onPatch,
}: BuilderBlocklyBlocksProps) {
  const hidden = snapshot.hideTradeParameters;
  const marketPath =
    findChartMarketPath(snapshot.symbol) ??
    findChartMarketPath(snapshot.market) ??
    findChartMarketPath("1HZ100V")!;

  function pickMarket(symbol: string, label: string, journal: string) {
    onPatch({ symbol, market: label }, journal);
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
                  {categoryLabel(category.id, category.label)}
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
            </>
          ) : null}

          <label className="bot-builder-check bot-builder-check-end">
            Restart buy/sell on error (disable for better performance):
            <input
              type="checkbox"
              checked={snapshot.restartBuySellOnError}
              onChange={(event) => onPatch({ restartBuySellOnError: event.target.checked })}
            />
          </label>
          <label className="bot-builder-check bot-builder-check-end">
            Restart last trade on error (bot ignores the unsuccessful trade):
            <input
              type="checkbox"
              checked={snapshot.restartOnError}
              onChange={(event) => onPatch({ restartOnError: event.target.checked })}
            />
          </label>

          <div className="bot-builder-statement">
            <span>Run once at start:</span>
            <div className="bot-builder-statement-slot" />
          </div>

          {!hidden ? (
            <div className="bot-builder-subblock">
              <header>
                {snapshot.tradeOptionsMode === "multiplier"
                  ? "Multiplier trade options:"
                  : snapshot.tradeOptionsMode === "accumulator"
                    ? "Accumulator trade options:"
                    : "Trade options:"}
              </header>
              <div className="bot-builder-subblock-body">
                {snapshot.tradeOptionsMode === "multiplier" ? (
                  <>
                    <div className="bot-builder-inline">
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
                    </div>
                    <div className="bot-builder-inline">
                      <span className="bot-builder-inline-label">Take Profit:</span>
                      <input
                        className="bot-builder-inline-input"
                        disabled={running}
                        type="number"
                        min={0.35}
                        step={0.01}
                        value={snapshot.takeProfitAmount}
                        onChange={(event) => onPatch({ takeProfitAmount: event.target.value })}
                      />
                      <span className="bot-builder-inline-label">Stop loss:</span>
                      <input
                        className="bot-builder-inline-input"
                        disabled={running}
                        type="number"
                        min={0.35}
                        step={0.01}
                        value={snapshot.stopLossAmount}
                        onChange={(event) => onPatch({ stopLossAmount: event.target.value })}
                      />
                    </div>
                  </>
                ) : snapshot.tradeOptionsMode === "accumulator" ? (
                  <>
                    <div className="bot-builder-inline">
                      <span className="bot-builder-inline-label">Initial stake:</span>
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
                    </div>
                    <div className="bot-builder-inline">
                      <span className="bot-builder-inline-label">Growth rate:</span>
                      <select
                        className="bot-builder-inline-select"
                        disabled={running}
                        value={snapshot.growthRate}
                        onChange={(event) => onPatch({ growthRate: event.target.value })}
                      >
                        {["1%", "2%", "3%", "4%", "5%"].map((rate) => (
                          <option key={rate}>{rate}</option>
                        ))}
                      </select>
                      {snapshot.sellByTicks ? (
                        <>
                          <span className="bot-builder-inline-label">Tick count:</span>
                          <input
                            className="bot-builder-inline-input"
                            disabled={running}
                            type="number"
                            min={1}
                            value={snapshot.tickCount}
                            onChange={(event) => onPatch({ tickCount: event.target.value })}
                          />
                        </>
                      ) : (
                        <>
                          <span className="bot-builder-inline-label">Take Profit:</span>
                          <input
                            className="bot-builder-inline-input"
                            disabled={running}
                            type="number"
                            min={0.35}
                            step={0.01}
                            value={snapshot.takeProfitAmount}
                            onChange={(event) => onPatch({ takeProfitAmount: event.target.value })}
                          />
                        </>
                      )}
                    </div>
                  </>
                ) : (
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
                  </div>
                )}
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
            <span className="bot-builder-inline-label">Purchase</span>
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
          <div className="bot-builder-mini">
            {snapshot.restartAction === "stop" ? "Stop after loss" : "Trade again"}
          </div>
          <LaneChips chips={chips} lane="restart" />
        </div>
      </article>
    </>
  );
}
