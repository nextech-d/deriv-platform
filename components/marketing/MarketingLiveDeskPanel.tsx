"use client";

import { useState } from "react";
import { BotBuilderDesk } from "@/components/trading/BotBuilderDesk";
import { FreeBotsDesk } from "@/components/trading/FreeBotsDesk";
import { AnalysisToolDesk } from "@/components/trading/AnalysisToolDesk";
import { AiBotDesk } from "@/components/trading/MenuDesks";
import { ProAiDesk } from "@/components/trading/ProAiDesk";
import { DerivCourseDesk } from "@/components/trading/DerivCourseDesk";
import { AutoTraderDesk } from "@/components/trading/AutoTraderDesk";
import { ChartDesk } from "@/components/trading/ChartDesk";
import { DTraderDesk } from "@/components/trading/DTraderDesk";
import { TradeTicket } from "@/components/trading/TradeTicket";
import { BotPanel } from "@/components/trading/BotPanel";
import { SignalCenterDesk } from "@/components/trading/SignalCenterDesk";
import { MoneyManagementDesk } from "@/components/trading/MoneyManagementDesk";
import { EdgingDesk } from "@/components/trading/EdgingDesk";
import { Edging2Desk } from "@/components/trading/Edging2Desk";
import { FastTraderDesk } from "@/components/trading/FastTraderDesk";
import { UltimateBotDesk } from "@/components/trading/UltimateBotDesk";
import { BulkTraderDesk } from "@/components/trading/BulkTraderDesk";
import { CopyDeskView } from "@/components/trading/CopyDeskView";
import type { PlatformNavId } from "@/lib/navigation/platform-nav";
import type { BotConfig, BotHeartbeat } from "@/lib/bot/types";
import type { TickEvent } from "@/lib/ws/protocol";
import {
  analysisBiasToSnapshot,
  courseStrategyToSnapshot,
  freeBotToSnapshot,
  snapshotToBotConfig,
  type BotBuilderSnapshot,
} from "@/lib/terminal/strategy-seed";
import { writeBuilderHandoff } from "@/lib/terminal/desk-handoff";
import { ULTIMATE_BOT_MARKETS } from "@/lib/terminal/chart-markets";
import { saveBotConfig } from "@/lib/bot/settings";
import { COURSE_STRATEGIES } from "@/lib/terminal/deriv-course";

/** Build / learn / trade menus that render the live desk UI (not editorial copy). */
export const MARKETING_LIVE_DESK_IDS = [
  "bot-builder",
  "ai-bot",
  "trading-bot",
  "free-bots",
  "analysis-tool",
  "signal-center",
  "money-management",
  "pro-ai",
  "auto-trader",
  "d-trader",
  "manual-trading",
  "chart",
  "copy-trading",
  "edging",
  "edging-2",
  "fast-trader",
  "ultimate-bot",
  "bulk-trader",
  "deriv-course",
] as const satisfies readonly PlatformNavId[];

export type MarketingLiveDeskId = (typeof MARKETING_LIVE_DESK_IDS)[number];

export function isMarketingLiveDeskId(
  id: PlatformNavId,
): id is MarketingLiveDeskId {
  return (MARKETING_LIVE_DESK_IDS as readonly string[]).includes(id);
}

const DEMO_QUOTES = [
  5432.184, 5432.191, 5432.173, 5432.168, 5432.155, 5432.162, 5432.177,
  5432.189, 5432.194, 5432.181, 5432.176, 5432.169, 5432.158, 5432.164,
  5432.171, 5432.183, 5432.19, 5432.198, 5432.185, 5432.179, 5432.172,
  5432.166, 5432.159, 5432.167, 5432.174, 5432.182, 5432.188, 5432.193,
  5432.186, 5432.178,
].map((quote, index) => ({ quote, epoch: 1_700_000_000 + index, symbol: "R_100" }));

const DEMO_TICKS: TickEvent[] = DEMO_QUOTES.map((row) => ({
  symbol: "R_100",
  quote: row.quote,
  epoch: row.epoch,
}));

const ULTIMATE_DEMO_TICKS: TickEvent[] = ULTIMATE_BOT_MARKETS.flatMap((market, marketIndex) =>
  DEMO_QUOTES.map((row) => ({
    symbol: market.id,
    quote: row.quote + marketIndex * 0.013,
    epoch: row.epoch,
  })),
);

const DEMO_BOT_CONFIG: BotConfig = {
  enabled: false,
  paused: false,
  strategy: "ma_cross",
  stake: 1,
  duration: 5,
  fastPeriod: 5,
  slowPeriod: 20,
  rsiPeriod: 14,
  rsiOversold: 30,
  rsiOverbought: 70,
  cooldownTicks: 3,
  maxOpenPositions: 1,
  digitTarget: 5,
  barrierDigit: 4,
  parityPrefer: "auto",
};

const DEMO_BOT_HEARTBEAT: BotHeartbeat = {
  status: "idle",
  lastTickAt: null,
  lastSignalAt: null,
  lastSignalLabel: null,
  ticksProcessed: 0,
  tradesExecuted: 0,
  demoRuntimeMs: 0,
  blockReason: null,
};

interface MarketingLiveDeskPanelProps {
  navId: MarketingLiveDeskId;
  onNavigate?: (sectionId: string, id: PlatformNavId) => void;
}

function MarketingManualTicket() {
  const [stake, setStake] = useState(1);
  const [duration, setDuration] = useState(5);
  return (
    <TradeTicket
      symbol="R_100"
      isConnected={false}
      isTrading={false}
      demoMode
      stake={stake}
      duration={duration}
      tradeNotice="Preview — sign in to place Rise / Fall on the live feed."
      hasLiveQuote={false}
      tradingLocked
      onStakeChange={setStake}
      onDurationChange={setDuration}
      onTrade={() => undefined}
      formatLocal={(v) => `$${v.toFixed(2)}`}
      embedded
    />
  );
}

function MarketingAnalysisDesk({
  onOpenDTrader,
  onSendToBuilder,
}: {
  onOpenDTrader: () => void;
  onSendToBuilder: (snapshot: BotBuilderSnapshot) => void;
}) {
  const [symbol, setSymbol] = useState("R_100");
  return (
    <AnalysisToolDesk
      symbol={symbol}
      quotes={DEMO_QUOTES}
      onSymbolChange={setSymbol}
      onTradeBias={onOpenDTrader}
      onSendToBuilder={(bias) =>
        onSendToBuilder(
          analysisBiasToSnapshot({
            symbol,
            mode: bias.mode,
            side: bias.side,
            barrier: bias.barrier,
            digitTarget: bias.digitTarget,
            label: bias.label,
          }),
        )
      }
    />
  );
}

function MarketingDTraderDesk() {
  const [stake, setStake] = useState(1);
  const [duration, setDuration] = useState(1);
  const [symbol, setSymbol] = useState("R_100");
  const ticks = DEMO_TICKS.filter((tick) => tick.symbol === symbol);
  return (
    <DTraderDesk
      symbol={symbol}
      onSymbolChange={setSymbol}
      lastQuote={ticks.at(-1)?.quote ?? null}
      tickHistory={DEMO_TICKS}
      isConnected={false}
      isTrading={false}
      demoMode
      stake={stake}
      duration={duration}
      tradeNotice="Preview — sign in for live Digits / Rise-Fall tickets."
      tradingLocked
      dTraderFamily="rise_fall"
      dTraderBarrier={4}
      onStakeChange={setStake}
      onDurationChange={setDuration}
      onTrade={() => undefined}
      formatLocal={(v) => `$${v.toFixed(2)}`}
    />
  );
}

function MarketingTradingBot({
  config,
  onConfigChange,
}: {
  config: BotConfig;
  onConfigChange: (config: BotConfig) => void;
}) {
  return (
    <BotPanel
      config={config}
      heartbeat={DEMO_BOT_HEARTBEAT}
      hydrated
      demoMode
      liveAllowed={false}
      demoRemainingMs={3_600_000}
      isConnected={false}
      onConfigChange={onConfigChange}
      onStart={() => undefined}
      onPause={() => undefined}
      onStop={() => undefined}
      embedded
      title="Trading bot"
      subtitle="Preview runner — sign in to start on your feed"
    />
  );
}

export function MarketingLiveDeskPanel({
  navId,
  onNavigate,
}: MarketingLiveDeskPanelProps) {
  const [builderSeed, setBuilderSeed] = useState<BotBuilderSnapshot | null>(null);
  const [builderSeedKey, setBuilderSeedKey] = useState(0);
  const [previewConfig, setPreviewConfig] = useState(DEMO_BOT_CONFIG);

  function goBuilder(snapshot: BotBuilderSnapshot) {
    writeBuilderHandoff(snapshot);
    setBuilderSeed(snapshot);
    setBuilderSeedKey((key) => key + 1);
    onNavigate?.("bot-builder", "bot-builder");
  }

  function sendToRunner(config: BotConfig, snapshot: BotBuilderSnapshot) {
    writeBuilderHandoff(snapshot);
    const next = { ...config, enabled: false, paused: false };
    saveBotConfig(next);
    setPreviewConfig(next);
  }

  return (
    <section
      id={navId === "bot-builder" ? "bot-builder" : navId}
      className="marketing-live-desk"
      data-panel={navId}
      tabIndex={-1}
    >
      <div className="marketing-live-desk-frame">
        {navId === "bot-builder" ? (
          <BotBuilderDesk
            seed={builderSeed}
            seedKey={builderSeedKey}
            onOpenAiBot={() => onNavigate?.("ai-bot", "ai-bot")}
            onRun={sendToRunner}
          />
        ) : null}

        {navId === "free-bots" ? (
          <FreeBotsDesk
            onLoadInBuilder={(strategy) => goBuilder(freeBotToSnapshot(strategy))}
          />
        ) : null}

        {navId === "analysis-tool" ? (
          <MarketingAnalysisDesk
            onOpenDTrader={() => onNavigate?.("d-trader", "d-trader")}
            onSendToBuilder={goBuilder}
          />
        ) : null}

        {navId === "ai-bot" ? (
          <AiBotDesk
            onSendToBuilder={(_brief, snapshot) => goBuilder(snapshot)}
          />
        ) : null}

        {navId === "pro-ai" ? (
          <ProAiDesk
            quotes={DEMO_QUOTES}
            symbol="R_100"
            onNavigate={(view) => {
              if (
                view === "analysis-tool" ||
                view === "free-bots" ||
                view === "bot-builder" ||
                view === "trading-bot"
              ) {
                onNavigate?.(view, view);
              }
            }}
            onApplyAssist={(snapshot) => goBuilder(snapshot)}
            onRunPack={(snapshot) =>
              sendToRunner(snapshotToBotConfig(snapshot), snapshot)
            }
          />
        ) : null}

        {navId === "deriv-course" ? (
          <DerivCourseDesk
            onOpenBuilder={() => onNavigate?.("bot-builder", "bot-builder")}
            onOpenFreeBots={() => onNavigate?.("free-bots", "free-bots")}
            onLoadStrategy={(id, values) => {
              const strategy = COURSE_STRATEGIES.find((item) => item.id === id);
              if (strategy) goBuilder(courseStrategyToSnapshot(strategy, values));
              else onNavigate?.("bot-builder", "bot-builder");
            }}
          />
        ) : null}

        {navId === "auto-trader" ? (
          <AutoTraderDesk
            onLaunch={() => onNavigate?.("trading-bot", "trading-bot")}
          />
        ) : null}

        {navId === "trading-bot" ? (
          <MarketingTradingBot
            config={previewConfig}
            onConfigChange={setPreviewConfig}
          />
        ) : null}

        {navId === "manual-trading" ? <MarketingManualTicket /> : null}

        {navId === "d-trader" ? <MarketingDTraderDesk /> : null}

        {navId === "chart" ? (
          <ChartDesk
            symbol="R_100"
            onSymbolChange={() => undefined}
            lastQuote={DEMO_TICKS.at(-1)?.quote ?? null}
            tickHistory={DEMO_TICKS}
            isConnected={false}
            onSubscribe={() => undefined}
            onOpenAnalysis={() => onNavigate?.("analysis-tool", "analysis-tool")}
            onOpenDTrader={() => onNavigate?.("d-trader", "d-trader")}
          />
        ) : null}

        {navId === "copy-trading" ? <CopyDeskView demoMode hydrated /> : null}

        {navId === "signal-center" ? (
          <SignalCenterDesk
            symbol="R_100"
            onSymbolChange={() => undefined}
            lastQuote={DEMO_TICKS.at(-1)?.quote ?? null}
            tickHistory={DEMO_TICKS}
            isConnected={false}
            onOpenDTrader={() => onNavigate?.("d-trader", "d-trader")}
            onOpenAnalysis={() => onNavigate?.("analysis-tool", "analysis-tool")}
          />
        ) : null}

        {navId === "money-management" ? <MoneyManagementDesk /> : null}

        {navId === "edging" ? (
          <EdgingDesk
            symbol="R_100"
            onSymbolChange={() => undefined}
            lastTick={DEMO_TICKS.at(-1) ?? null}
            tickHistory={DEMO_TICKS}
            isConnected={false}
          />
        ) : null}

        {navId === "edging-2" ? (
          <Edging2Desk
            symbol="R_100"
            onSymbolChange={() => undefined}
            lastTick={DEMO_TICKS.at(-1) ?? null}
            tickHistory={DEMO_TICKS}
            isConnected={false}
            onOpenDTrader={() => onNavigate?.("d-trader", "d-trader")}
          />
        ) : null}

        {navId === "fast-trader" ? (
          <FastTraderDesk
            symbol="R_100"
            onSymbolChange={() => undefined}
            lastTick={DEMO_TICKS.at(-1) ?? null}
            tickHistory={DEMO_TICKS}
            isConnected={false}
            tradingLocked
            onOpenDTrader={() => onNavigate?.("d-trader", "d-trader")}
          />
        ) : null}

        {navId === "ultimate-bot" ? (
          <UltimateBotDesk
            symbol="R_100"
            onSymbolChange={() => undefined}
            tickHistory={ULTIMATE_DEMO_TICKS}
            isConnected={false}
            tradingLocked
            onOpenDTrader={() => onNavigate?.("d-trader", "d-trader")}
          />
        ) : null}

        {navId === "bulk-trader" ? (
          <BulkTraderDesk
            symbol="R_100"
            onSymbolChange={() => undefined}
            lastTick={DEMO_TICKS.at(-1) ?? null}
            tickHistory={DEMO_TICKS}
            isConnected={false}
            tradingLocked
          />
        ) : null}
      </div>
    </section>
  );
}
