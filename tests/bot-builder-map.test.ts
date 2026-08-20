import { describe, expect, it, beforeEach } from "vitest";
import { BOT_BUILDER_TOOLBOX } from "@/lib/terminal/bot-builder";
import { effectForBuilderBlock } from "@/lib/terminal/builder-block-map";
import {
  writeBuilderHandoff,
  consumeBuilderHandoff,
  clearBuilderHandoff,
  writeBuilderRunAfter,
  consumeBuilderRunAfter,
} from "@/lib/terminal/desk-handoff";
import {
  DEFAULT_BUILDER_SNAPSHOT,
  courseStrategyToSnapshot,
  snapshotToBotConfig,
  snapshotFromXml,
  speedBotSnapshot,
  quickStrategyToSnapshot,
  validateQuickStrategy,
  workspaceChipsForSnapshot,
  symbolFromMarketLabel,
  marketLabelForSymbol,
} from "@/lib/terminal/strategy-seed";
import { findChartMarketPath, findBuilderMarketPath, BUILDER_MARKET_TREE } from "@/lib/terminal/chart-markets";
import { COURSE_STRATEGIES } from "@/lib/terminal/deriv-course";

function block(id: string) {
  for (const category of BOT_BUILDER_TOOLBOX) {
    const found = category.blocks.find((item) => item.id === id);
    if (found) return found;
  }
  throw new Error(`Missing block ${id}`);
}

describe("builder block map", () => {
  const ctx = { snapshot: DEFAULT_BUILDER_SNAPSHOT, lastDigit: 7, balance: { amount: 100, currency: "USD" } };

  it("maps Even/Odd analysis onto the parity runner", () => {
    const effect = effectForBuilderBlock(block("parity-logic"), ctx);
    expect(effect.patch?.tradeType).toBe("Even/Odd");
    expect(effect.patch?.botStrategy).toBe("parity_bias");
    const config = snapshotToBotConfig({
      ...DEFAULT_BUILDER_SNAPSHOT,
      ...effect.patch,
    });
    expect(config.strategy).toBe("parity_bias");
    expect(config.tradeType).toBe("Even/Odd");
  });

  it("maps RSI onto the RSI runner with periods", () => {
    const effect = effectForBuilderBlock(block("ind-rsi"), ctx);
    expect(effect.patch?.botStrategy).toBe("rsi_threshold");
    expect(effect.patch?.rsiPeriod).toBe(14);
    const config = snapshotToBotConfig({
      ...DEFAULT_BUILDER_SNAPSHOT,
      ...effect.patch,
    });
    expect(config.strategy).toBe("rsi_threshold");
    expect(config.rsiPeriod).toBe(14);
  });

  it("maps sell-at-market and stop-after-loss onto the runner", () => {
    const sell = effectForBuilderBlock(block("sell-at-market"), ctx);
    expect(sell.patch?.sellAction).toBe("sell_at_market");
    const stop = effectForBuilderBlock(block("stop-after-loss"), ctx);
    expect(stop.patch?.restartAction).toBe("stop");
  });

  it("maps last-digit onto Matches when already on a digit lane", () => {
    const effect = effectForBuilderBlock(block("tick-last-digit"), {
      ...ctx,
      snapshot: { ...DEFAULT_BUILDER_SNAPSHOT, tradeType: "Even/Odd" },
    });
    expect(effect.patch?.digitTarget).toBe(7);
    expect(effect.patch?.tradeType).toBe("Matches");
  });

  it("maps virtual hook toggle", () => {
    const on = effectForBuilderBlock(block("virtual-hook-switcher"), ctx);
    expect(on.patch?.virtualHook).toBe(true);
    const off = effectForBuilderBlock(block("virtual-hook-switcher"), {
      ...ctx,
      snapshot: { ...DEFAULT_BUILDER_SNAPSHOT, virtualHook: true },
    });
    expect(off.patch?.virtualHook).toBe(false);
  });

  it("maps account-balance to the live wallet notice", () => {
    const effect = effectForBuilderBlock(block("stats-balance"), ctx);
    expect(effect.notice).toContain("100.00 USD");
  });
});

describe("strategy seeds", () => {
  it("Speed Bot snapshot is martingale recovery on a real market", () => {
    const snapshot = speedBotSnapshot();
    expect(snapshot.sourceLabel).toBe("Dashboard · Speed Bot");
    expect(snapshot.virtualHook).toBe(true);
    expect(snapshot.quickStrategy?.type).toBe("martingale");
    const config = snapshotToBotConfig(snapshot);
    expect(config.virtualHook).toBe(true);
    expect(config.quickStrategy?.type).toBe("martingale");
  });

  it("course Martingale copies stake and multiplier into the runner", () => {
    const strategy = COURSE_STRATEGIES.find((item) => item.id === "martingale")!;
    const snapshot = courseStrategyToSnapshot(strategy, {
      stake: 0.5,
      multiplier: 2.5,
      takeProfit: 12,
      stopLoss: 8,
    });
    expect(snapshot.virtualHook).toBe(true);
    expect(snapshot.quickStrategy?.type).toBe("martingale");
    expect(snapshot.quickStrategy?.size).toBe(2.5);
    expect(snapshot.quickStrategy?.profitThreshold).toBe(12);
    expect(snapshotToBotConfig(snapshot).stake).toBe(0.5);
  });

  it("maps bulk purchase, run-once, and buy/sell restart onto the runner", () => {
    const config = snapshotToBotConfig({
      ...DEFAULT_BUILDER_SNAPSHOT,
      allowBulkPurchase: true,
      bulkTradeCount: 3,
      runOnceAtStart: true,
      restartBuySellOnError: true,
      restartOnError: false,
    });
    expect(config.maxOpenPositions).toBe(3);
    expect(config.cooldownTicks).toBe(0);
    expect(config.restartOnError).toBe(true);
  });

  it("maps quick strategy parameters onto the snapshot, chips, and runner", () => {
    const snapshot = quickStrategyToSnapshot({
      type: "martingale",
      market: "Volatility 75 Index",
      tradeType: "Even/Odd",
      purchase: "Odd",
      duration: "5",
      durationUnit: "t",
      stake: "1.25",
      params: { size: 2.1, profitThreshold: 20, lossThreshold: 8, maxStake: 40 },
    });
    expect(validateQuickStrategy(snapshot)).toBeNull();
    expect(snapshot.symbol).toBe("R_75");
    expect(snapshot.botStrategy).toBe("parity_bias");
    expect(snapshot.virtualHook).toBe(true);
    expect(snapshot.sourceLabel).toBe("Quick strategy · Martingale");
    const config = snapshotToBotConfig(snapshot);
    expect(config.strategy).toBe("parity_bias");
    expect(config.stake).toBe(1.25);
    expect(config.duration).toBe(5);
    expect(config.quickStrategy?.size).toBe(2.1);
    expect(config.quickStrategy?.profitThreshold).toBe(20);
    expect(config.purchase).toBe("Odd");
    const chips = workspaceChipsForSnapshot(snapshot);
    expect(chips.map((chip) => chip.label)).toEqual(
      expect.arrayContaining(["Even/Odd", "Volatility 75 Index", "Purchase Odd", "Martingale recovery"]),
    );
  });

  it("rejects invalid quick strategy stake and size", () => {
    expect(
      validateQuickStrategy(quickStrategyToSnapshot({ type: "martingale", stake: "0.10" })),
    ).toMatch(/0\.35/);
    expect(
      validateQuickStrategy(
        quickStrategyToSnapshot({
          type: "martingale",
          params: { size: 1 },
        }),
      ),
    ).toMatch(/greater than 1/);
  });

  it("resolves the dangote market breadcrumb including forex and metals", () => {
    const path = findChartMarketPath("1HZ100V");
    expect(path?.category.label).toBe("synthetics");
    expect(path?.group.label).toBe("Continuous Indices");
    expect(path?.market.label).toBe("Volatility 100 (1s) Index");
    expect(symbolFromMarketLabel("Volatility 100 (1s) Index")).toBe("1HZ100V");
    expect(symbolFromMarketLabel("EUR/USD")).toBe("frxEURUSD");
    expect(marketLabelForSymbol("frxXAUUSD")).toBe("Gold/USD");
    expect(findChartMarketPath("Crash 500 Index")?.group.label).toBe("Crash Index");
  });

  it("loads official Deriv Bot XML onto the workspace", () => {
    const snapshot = snapshotFromXml(`
      <xml xmlns="http://www.w3.org/1999/xhtml" is_dbot="true">
        <block type="trade_definition">
          <field name="SYMBOL_LIST">R_100</field>
          <field name="TRADETYPECAT_LIST">digits</field>
          <field name="TRADETYPE_LIST">evenodd</field>
          <field name="TYPE_LIST">both</field>
          <field name="CANDLEINTERVAL_LIST">60</field>
          <field name="DURATIONTYPE_LIST">t</field>
          <field name="PURCHASE_LIST">DIGITEVEN</field>
          <value name="DURATION"><field name="NUM">1</field></value>
          <value name="AMOUNT"><field name="NUM">0.60</field></value>
          <block type="purchase"></block>
          <block type="trade_again"></block>
        </block>
      </xml>
    `);
    expect(snapshot?.symbol).toBe("R_100");
    expect(snapshot?.tradeType).toBe("Even/Odd");
    expect(snapshot?.contractType).toBe("Both");
    expect(snapshot?.purchase).toBe("Even");
    expect(snapshot?.stake).toBe("0.60");
    expect(snapshotFromXml("<strategy/>")).toBeNull();
  });

  it("loads nested official Deriv Bot XML with BOM and extra field attributes", () => {
    const xml = `\uFEFF<xml xmlns="https://developers.google.com/blockly/xml" is_dbot="true">
      <block type="trade_definition" id="root" x="0" y="0">
        <statement name="TRADE_OPTIONS">
          <block type="trade_definition_market">
            <field name="MARKET_LIST" id="m1">basket_index</field>
            <field name="SUBMARKET_LIST" id="m2">forex_basket</field>
            <field name="SYMBOL_LIST" id="s1">WLDAUD</field>
            <next>
              <block type="trade_definition_tradetype">
                <field name="TRADETYPECAT_LIST">callput</field>
                <field name="TRADETYPE_LIST">callput</field>
                <next>
                  <block type="trade_definition_contracttype">
                    <field name="TYPE_LIST">both</field>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </statement>
        <statement name="SUBMARKET">
          <block type="trade_definition_tradeoptions">
            <field name="DURATIONTYPE_LIST">m</field>
            <value name="DURATION" limit="1,60">
              <shadow type="math_number_positive">
                <field name="NUM" id="n1">5</field>
              </shadow>
            </value>
            <value name="AMOUNT">
              <shadow type="math_number_positive">
                <field name="NUM">1</field>
              </shadow>
            </value>
          </block>
        </statement>
      </block>
      <block type="after_purchase">
        <statement name="AFTERPURCHASE_STACK">
          <block type="trade_again"></block>
        </statement>
      </block>
      <block type="variables_get">
        <field name="VAR">martingale:size</field>
      </block>
    </xml>`;
    const snapshot = snapshotFromXml(xml);
    expect(snapshot?.symbol).toBe("WLDAUD");
    expect(snapshot?.market).toBe("AUD Basket");
    expect(snapshot?.tradeType).toBe("Rise/Fall");
    expect(snapshot?.duration).toBe("5");
    expect(snapshot?.durationUnit).toBe("m");
    expect(snapshot?.stake).toBe("1");
    expect(snapshot?.virtualHook).toBe(true);
    expect(snapshot?.quickStrategy?.type).toBe("martingale");
  });

  it("loads legacy Binary Bot XML with block type trade", () => {
    const snapshot = snapshotFromXml(`
      <xml xmlns="http://www.w3.org/1999/xhtml" collection="false">
        <block type="trade" x="0" y="0">
          <field name="MARKET_LIST">synthetic_index</field>
          <field name="SUBMARKET_LIST">random_index</field>
          <field name="SYMBOL_LIST">R_75</field>
          <field name="TRADETYPECAT_LIST">digits</field>
          <field name="TRADETYPE_LIST">evenodd</field>
          <field name="TYPE_LIST">both</field>
          <field name="CANDLEINTERVAL_LIST">60</field>
          <field name="TIME_MACHINE_ENABLED">FALSE</field>
          <field name="RESTARTONERROR">TRUE</field>
          <statement name="SUBMARKET">
            <block type="trade_definition_tradeoptions">
              <field name="DURATIONTYPE_LIST">t</field>
              <value name="DURATION"><field name="NUM">1</field></value>
              <value name="AMOUNT"><field name="NUM">0.35</field></value>
            </block>
          </statement>
        </block>
      </xml>
    `);
    expect(snapshot?.symbol).toBe("R_75");
    expect(snapshot?.tradeType).toBe("Even/Odd");
    expect(snapshot?.stake).toBe("0.35");
  });

  it("uses official Deriv Derived groups on Bot Builder", () => {
    const path = findBuilderMarketPath("R_100");
    expect(path?.category.label).toBe("Derived");
    expect(path?.group.label).toBe("Continuous Indices");
    expect(findBuilderMarketPath("CRASH500")?.group.label).toBe("Crash/Boom Indices");
    expect(findBuilderMarketPath("JD10")?.group.label).toBe("Jump Indices");
    expect(findBuilderMarketPath("RB100")?.group.label).toBe("Range Break Indices");
    expect(findBuilderMarketPath("WLDAUD")?.group.label).toBe("Forex Basket");
    expect(findBuilderMarketPath("WLDXAU")?.group.label).toBe("Commodities Basket");
    expect(findBuilderMarketPath("stpRNG")?.group.label).toBe("Step Indices");
    expect(BUILDER_MARKET_TREE[0]?.groups.map((group) => group.label)).toEqual([
      "Continuous Indices",
      "Crash/Boom Indices",
      "Jump Indices",
      "Range Break Indices",
      "Daily Reset Indices",
      "Forex Basket",
      "Commodities Basket",
      "Step Indices",
    ]);
  });

  it("maps trade-each-tick onto a zero cooldown", () => {
    const config = snapshotToBotConfig({
      ...DEFAULT_BUILDER_SNAPSHOT,
      tradeEachTick: true,
    });
    expect(config.cooldownTicks).toBe(0);
  });
});

describe("builder handoff", () => {
  beforeEach(() => {
    clearBuilderHandoff();
    writeBuilderRunAfter(false);
  });

  it("consumeBuilderHandoff returns once then clears", () => {
    writeBuilderHandoff(speedBotSnapshot());
    const first = consumeBuilderHandoff();
    expect(first?.sourceLabel).toBe("Dashboard · Speed Bot");
    expect(consumeBuilderHandoff()).toBeNull();
  });

  it("consumeBuilderRunAfter returns once then clears", () => {
    writeBuilderRunAfter();
    expect(consumeBuilderRunAfter()).toBe(true);
    expect(consumeBuilderRunAfter()).toBe(false);
  });
});
