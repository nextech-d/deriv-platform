"use client";

import { AppShell, type AppView } from "@/components/layout/AppShell";
import {
  TerminalPanel,
  TerminalSplitPanel,
  TerminalViewLayout,
} from "@/components/layout/TerminalViewLayout";
import { ViewTransition } from "@/components/layout/ViewTransition";
import { ErrorBoundary } from "@/components/monitoring/ErrorBoundary";
import { MarketTicker } from "@/components/trading/MarketTicker";
import { SessionStats } from "@/components/trading/SessionStats";
import { TradeTicket } from "@/components/trading/TradeTicket";
import { PortfolioList } from "@/components/trading/PortfolioList";
import { CopyDeskView } from "@/components/trading/CopyDeskView";
import { BotPanel } from "@/components/trading/BotPanel";
import { BotBuilderDesk } from "@/components/trading/BotBuilderDesk";
import { FreeBotsDesk } from "@/components/trading/FreeBotsDesk";
import { AnalysisToolDesk } from "@/components/trading/AnalysisToolDesk";
import { AiBotDesk } from "@/components/trading/MenuDesks";
import { ProAiDesk } from "@/components/trading/ProAiDesk";
import { DerivCourseDesk } from "@/components/trading/DerivCourseDesk";
import { AutoTraderDesk } from "@/components/trading/AutoTraderDesk";
import { DTraderDesk } from "@/components/trading/DTraderDesk";
import { ChartDesk } from "@/components/trading/ChartDesk";
import { MoneyManagementDesk } from "@/components/trading/MoneyManagementDesk";
import { EdgingDesk } from "@/components/trading/EdgingDesk";
import { Edging2Desk } from "@/components/trading/Edging2Desk";
import { FastTraderDesk } from "@/components/trading/FastTraderDesk";
import { UltimateBotDesk } from "@/components/trading/UltimateBotDesk";
import { BulkTraderDesk } from "@/components/trading/BulkTraderDesk";
import { SignalCenterDesk } from "@/components/trading/SignalCenterDesk";
import type { AutoTraderCard } from "@/lib/terminal/auto-trader-cards";
import {
  analysisBiasToSnapshot,
  autoTraderCardToSnapshot,
  courseStrategyToSnapshot,
  freeBotToSnapshot,
  snapshotToBotConfig,
  type BotBuilderSnapshot,
} from "@/lib/terminal/strategy-seed";
import { clearBuilderHandoff, writeBuilderHandoff, writeFreeBotsTier } from "@/lib/terminal/desk-handoff";
import { COURSE_STRATEGIES } from "@/lib/terminal/deriv-course";
import { WalletPanel } from "@/components/trading/WalletPanel";
import { SettingsPanel } from "@/components/trading/SettingsPanel";
import { TerminalHomeView } from "@/components/trading/TerminalHomeView";
import { useDisplayCurrency } from "@/hooks/useDisplayCurrency";
import { useDerivWorker } from "@/hooks/useDerivWorker";
import { useTradingBot } from "@/hooks/useTradingBot";
import { useCopyTrading } from "@/hooks/useCopyTrading";
import { useCopyRiskSettings } from "@/hooks/useCopyRiskSettings";
import { useRiskSettings } from "@/hooks/useRiskSettings";
import type { TradeRequest } from "@/lib/ws/protocol";
import {
  checkCopyRiskGate,
  copyLockoutReason,
  isCopyLockedOut,
} from "@/lib/copy/risk-settings";
import {
  checkRiskGate,
  checkStakeCap,
  isRiskLockedOut,
} from "@/lib/risk/settings";
import type { DerivAccount } from "@/lib/session/types";
import type { OpenContractRecord } from "@/lib/state/types";
import { cn } from "@/lib/utils/cn";
import { clearTradingDb } from "@/lib/state/db";
import { csrfFetch } from "@/lib/auth/csrf";
import { AUTH_LOGIN_PATH } from "@/lib/auth/auth-links";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { TickEvent } from "@/lib/ws/protocol";
import {
  mergeWatchSymbols,
  symbolsForFollowedProviders,
} from "@/lib/copy/watch-symbols";
import {
  ANALYSIS_DCIRCLE_SYMBOLS,
  ULTIMATE_BOT_MARKETS,
} from "@/lib/terminal/chart-markets";
import { BULK_SCAN_SYMBOLS } from "@/lib/terminal/bulk-trader";
import { buildHomeOnboardingSteps } from "@/lib/terminal/home-onboarding";
import {
  readLastWorkspace,
  writeLastWorkspace,
} from "@/lib/terminal/last-workspace";
import {
  dashboardScrollKey,
  usePageScrollRestoration,
} from "@/lib/navigation/scroll-restoration";
import {
  clearBootHold,
  resolveDashboardView,
  viewFromLocationHash,
  writeViewHash,
} from "@/lib/navigation/workspace-boot";

interface DashboardClientProps {
  accounts: DerivAccount[];
  activeAccountId?: string;
  demoMode?: boolean;
}

export function DashboardClient({
  accounts,
  activeAccountId: initialAccountId,
  demoMode = false,
}: DashboardClientProps) {
  const router = useRouter();
  const [activeView, setActiveView] = useState<AppView>("dashboard");
  const [viewReady, setViewReady] = useState(false);
  const [allowViewAnim, setAllowViewAnim] = useState(false);
  const [scrollReady, setScrollReady] = useState(false);
  const [activeAccountId, setActiveAccountId] = useState(
    initialAccountId ?? accounts[0]?.accountId,
  );
  const [symbol, setSymbol] = useState("R_10");
  const [stake, setStake] = useState(1);
  const [duration, setDuration] = useState(5);
  const [riskNotice, setRiskNotice] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<number | null>(null);
  const [lastWorkspace, setLastWorkspace] = useState<AppView | null>(null);
  const [builderSeed, setBuilderSeed] = useState<BotBuilderSnapshot | null>(null);
  const [builderSeedKey, setBuilderSeedKey] = useState(0);
  const [dTraderFamily, setDTraderFamily] = useState<
    import("@/components/trading/DTraderTicket").DTraderFamily
  >("rise_fall");
  const [dTraderBarrier, setDTraderBarrier] = useState(4);
  const [dTraderDigitTarget, setDTraderDigitTarget] = useState(5);
  const viewChangeRef = useRef(false);
  const seedingRef = useRef(false);

  const getTerminalWorkspace = useCallback(
    () => document.querySelector<HTMLElement>(".terminal-workspace"),
    [],
  );

  const { scrollToTop } = usePageScrollRestoration(dashboardScrollKey(activeView), {
    getContainer: getTerminalWorkspace,
    enabled: scrollReady,
  });

  const { currency, setCurrency, formatLocal, labels, fxSource, fxUpdatedAt } =
    useDisplayCurrency();
  const { settings, setSettings, stats, recordLoss, resetSession } =
    useRiskSettings();
  const {
    settings: copyRiskSettings,
    setSettings: setCopyRiskSettings,
    stats: copyRiskStats,
    recordCopyOutcome,
    recordCopyAttempt,
    resetCopySession,
  } = useCopyRiskSettings();

  const contractsRef = useRef<OpenContractRecord[]>([]);
  const onContractClosedRef = useRef<(profit: number, contractId: number) => void>(
    () => {},
  );

  const botTickRef = useRef<(tick: TickEvent, history: TickEvent[]) => void>(
    () => {},
  );
  const botRoundRef = useRef<(profit: number) => void>(() => {});
  const botRejectedRef = useRef<() => void>(() => {});
  const copyTickRef = useRef<(tick: TickEvent, history: TickEvent[]) => void>(
    () => {},
  );

  const {
    connectionState,
    balance,
    lastTick,
    tickHistory,
    contracts,
    error,
    isHydrated,
    isTrading,
    tradeNotice,
    sessionPnl,
    syncTickSubscriptions,
    placeTrade,
    placeTradeSequence,
    closeContract,
    reconnect,
    requestBalance,
    requestChartHistory,
    chartHistory,
    chartHistoryLoading,
    wsMetrics,
    resetWsMetrics,
  } = useDerivWorker(activeAccountId, {
    onContractClosed: (profit, contractId) =>
      onContractClosedRef.current(profit, contractId),
    onTick: (tick, history) => {
      botTickRef.current(tick, history);
      copyTickRef.current(tick, history);
    },
    onTradeRejected: () => botRejectedRef.current(),
  });

  useEffect(() => {
    contractsRef.current = contracts;
  }, [contracts]);

  useEffect(() => {
    onContractClosedRef.current = (profit, contractId) => {
      const source = contractsRef.current.find(
        (contract) => contract.contractId === contractId,
      )?.source;
      if (source === "copy") {
        recordCopyOutcome(profit);
      } else if (profit < 0) {
        recordLoss(Math.abs(profit));
      }
      if (source === "bot") {
        botRoundRef.current(profit);
      }
      setClosingId(null);
    };
  }, [recordCopyOutcome, recordLoss]);

  const isConnected = connectionState === "connected";
  const tradingLocked = isRiskLockedOut(settings, stats);
  const copyRiskLocked = isCopyLockedOut(copyRiskSettings, copyRiskStats);
  const openCount = contracts.filter((c) => !c.isSold).length;
  const openPnl = contracts
    .filter((c) => !c.isSold)
    .reduce((sum, c) => sum + (c.profit ?? 0), 0);
  const activeAccount = accounts.find((a) => a.accountId === activeAccountId);
  const balanceUsd = balance?.amount ?? null;

  const recentContracts = useMemo(
    () =>
      [...contracts]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 3),
    [contracts],
  );

  const hasTraded = useMemo(
    () =>
      openCount > 0 ||
      contracts.some((contract) => contract.isSold) ||
      Math.abs(sessionPnl) > 0.001,
    [contracts, openCount, sessionPnl],
  );

  const showFundingCta =
    !demoMode &&
    activeAccount != null &&
    !activeAccount.isDemo &&
    balanceUsd != null &&
    balanceUsd < 10;

  const handleAccountChange = useCallback(
    async (accountId: string) => {
      setActiveAccountId(accountId);
      if (demoMode) return;
      try {
        await csrfFetch("/api/auth/session", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activeAccountId: accountId }),
        });
      } catch {
        // Local switch still applies; session sync is best-effort
      }
    },
    [demoMode],
  );

  const handleViewChange = useCallback((view: AppView) => {
    viewChangeRef.current = true;
    if (view === "bot-builder" && !seedingRef.current) {
      setBuilderSeed(null);
      clearBuilderHandoff();
    }
    seedingRef.current = false;
    setActiveView(view);
    writeViewHash(view);
  }, []);

  const openSettings = useCallback(() => handleViewChange("settings"), [handleViewChange]);

  useLayoutEffect(() => {
    const view = resolveDashboardView();
    setActiveView(view);
    setLastWorkspace(readLastWorkspace());
    setViewReady(true);
    setScrollReady(true);
    writeViewHash(view);
  }, []);

  useLayoutEffect(() => {
    if (!viewReady) return;
    clearBootHold();
  }, [viewReady]);

  useEffect(() => {
    if (!viewReady) return;
    setAllowViewAnim(true);
  }, [viewReady]);

  useEffect(() => {
    const syncFromHash = () => {
      setActiveView(viewFromLocationHash() ?? "dashboard");
    };
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  useEffect(() => {
    if (!viewReady) return;
    writeViewHash(activeView);
    if (activeView === "dashboard") return;
    writeLastWorkspace(activeView);
    setLastWorkspace(activeView);
  }, [activeView, viewReady]);

  /** Only jump to top on intentional nav — never on tick/balance re-renders. */
  useLayoutEffect(() => {
    if (!viewChangeRef.current) return;
    viewChangeRef.current = false;
    scrollToTop(getTerminalWorkspace());
  }, [activeView, getTerminalWorkspace, scrollToTop]);

  const botPlaceTrade = useCallback(
    (request: TradeRequest) => {
      if (tradingLocked) return;
      const block = checkRiskGate(settings, stats, request.amount);
      if (block) return;
      placeTrade({ ...request, source: "bot" });
    },
    [placeTrade, settings, stats, tradingLocked],
  );

  const bot = useTradingBot({
    symbol,
    isConnected,
    isTrading,
    demoMode,
    tradingLocked,
    openContractCount: openCount,
    placeTrade: botPlaceTrade,
  });

  const copyPlaceTrade = useCallback(
    (request: TradeRequest) => {
      if (copyRiskLocked) {
        return {
          ok: false as const,
          reason:
            copyLockoutReason(copyRiskSettings, copyRiskStats) ??
            "Copy risk lockout — adjust limits in Settings.",
        };
      }
      const copyBlock = checkCopyRiskGate(copyRiskSettings, copyRiskStats);
      if (copyBlock) {
        return { ok: false as const, reason: copyBlock };
      }
      const stakeBlock = checkStakeCap(settings, request.amount);
      if (stakeBlock) {
        return { ok: false as const, reason: stakeBlock };
      }
      if (!isConnected) {
        return { ok: false as const, reason: "Market feed offline — reconnect to copy." };
      }
      if (demoMode && lastTick?.quote == null) {
        return {
          ok: false as const,
          reason: "Wait for live ticks before copying.",
        };
      }
      recordCopyAttempt();
      placeTrade({ ...request, source: "copy" });
      return { ok: true as const };
    },
    [
      copyRiskLocked,
      copyRiskSettings,
      copyRiskStats,
      settings,
      isConnected,
      demoMode,
      lastTick?.quote,
      placeTrade,
      recordCopyAttempt,
    ],
  );

  const copy = useCopyTrading({
    demoMode,
    isAuthenticated: !demoMode,
    copyRiskLocked,
    placeTrade: copyPlaceTrade,
  });

  const homeOnboardingSteps = useMemo(
    () =>
      buildHomeOnboardingSteps({
        demoMode,
        hasTraded,
        hasFunded: balanceUsd != null && balanceUsd >= 10,
        settings,
        followedProviders: copy.follow.followedIds.length,
      }),
    [
      balanceUsd,
      copy.follow.followedIds.length,
      demoMode,
      hasTraded,
      settings,
    ],
  );

  useEffect(() => {
    botTickRef.current = bot.handleTick;
    botRoundRef.current = bot.handleRound;
    botRejectedRef.current = bot.handleTradeRejected;
    copyTickRef.current = copy.handleTick;
  }, [bot.handleTick, bot.handleRound, bot.handleTradeRejected, copy.handleTick]);

  useEffect(() => {
    if (
      bot.config.sellAction !== "sell_at_market" ||
      !bot.config.enabled ||
      bot.config.paused
    ) {
      return;
    }
    const open = contracts.find(
      (contract) =>
        contract.source === "bot" &&
        !contract.isSold &&
        (contract.profit ?? 0) > 0,
    );
    if (open) closeContract(open.contractId);
  }, [
    contracts,
    bot.config.sellAction,
    bot.config.enabled,
    bot.config.paused,
    closeContract,
  ]);

  const copyWatchSymbols = useMemo(
    () => symbolsForFollowedProviders(copy.providers, copy.follow.followedIds),
    [copy.providers, copy.follow.followedIds],
  );

  const tickWatchSymbols = useMemo(() => {
    if (activeView === "ultimate-bot") {
      return ULTIMATE_BOT_MARKETS.map((m) => m.id);
    }
    if (activeView === "analysis-tool" || activeView === "signal-center") {
      return [...ANALYSIS_DCIRCLE_SYMBOLS];
    }
    if (activeView === "bulk-trader") {
      return mergeWatchSymbols(symbol, [...BULK_SCAN_SYMBOLS]);
    }
    return mergeWatchSymbols(symbol, copyWatchSymbols);
  }, [activeView, symbol, copyWatchSymbols]);

  useEffect(() => {
    if (!isConnected) return;
    syncTickSubscriptions(tickWatchSymbols);
  }, [isConnected, tickWatchSymbols, syncTickSubscriptions]);

  useEffect(() => {
    if (activeView !== "copy-trading" || !tradeNotice) return;
    if (/opened/i.test(tradeNotice)) return;
    copy.pushCopyNotice({ tone: "error", message: tradeNotice });
    copy.reportCopyRejection(tradeNotice);
  }, [activeView, tradeNotice, copy.pushCopyNotice, copy.reportCopyRejection]);

  async function handleLogout() {
    if (demoMode) {
      router.push("/");
      return;
    }
    await csrfFetch("/api/auth/logout", { method: "POST" });
    await clearTradingDb();
    router.push(AUTH_LOGIN_PATH);
    router.refresh();
  }

  function handleTrade(direction: "CALL" | "PUT") {
    setRiskNotice(null);
    if (tradingLocked) return;

    const block = checkRiskGate(settings, stats, stake);
    if (block) {
      setRiskNotice(block);
      return;
    }

    placeTrade({
      symbol,
      contractType: direction,
      amount: stake,
      duration,
      durationUnit: "t",
      basis: "stake",
      source: "manual",
    });
  }

  function handleContractTrade(payload: {
    contractType: string;
    barrier?: number | string;
    barrier2?: number | string;
    lastDigitPrediction?: number;
    durationUnit?: string;
    duration?: number;
    amount?: number;
    symbol?: string;
    count?: number;
  }) {
    setRiskNotice(null);
    if (tradingLocked) return;

    const amount = payload.amount ?? stake;
    const count = Math.max(1, Math.min(20, Math.round(payload.count ?? 1)));
    const block = checkRiskGate(settings, stats, amount * count);
    if (block) {
      setRiskNotice(block);
      return;
    }

    const request = {
      symbol: payload.symbol ?? symbol,
      contractType: payload.contractType,
      amount,
      duration: payload.duration ?? duration,
      durationUnit: (payload.durationUnit as "t" | "s" | "m" | "h" | "d") ?? "t",
      basis: "stake" as const,
      source: "manual" as const,
      ...(payload.barrier !== undefined ? { barrier: payload.barrier } : {}),
      ...(payload.barrier2 !== undefined ? { barrier2: payload.barrier2 } : {}),
      ...(payload.lastDigitPrediction !== undefined
        ? { lastDigitPrediction: payload.lastDigitPrediction }
        : {}),
    };
    if (count === 1) {
      placeTrade(request);
      return;
    }
    placeTradeSequence(Array.from({ length: count }, () => ({ ...request })));
  }

  function handleEdgingBuy(totalStake: number, ticks = 1) {
    setRiskNotice(null);
    if (tradingLocked) return;
    const amount = Math.max(0.35, Math.round((totalStake / 2) * 100) / 100);
    const durationTicks = Math.max(1, Math.min(10, ticks));
    const block = checkRiskGate(settings, stats, amount * 2);
    if (block) {
      setRiskNotice(block);
      return;
    }
    placeTradeSequence([
      {
        symbol,
        contractType: "DIGITOVER",
        amount,
        duration: durationTicks,
        durationUnit: "t",
        basis: "stake",
        barrier: 5,
        source: "manual",
      },
      {
        symbol,
        contractType: "DIGITUNDER",
        amount,
        duration: durationTicks,
        durationUnit: "t",
        basis: "stake",
        barrier: 4,
        source: "manual",
      },
    ]);
  }

  function applyBuilderSeed(snapshot: BotBuilderSnapshot) {
    seedingRef.current = true;
    setBuilderSeed(snapshot);
    setBuilderSeedKey((key) => key + 1);
    setSymbol(snapshot.symbol);
    handleViewChange("bot-builder");
  }

  function handleCloseContract(contractId: number) {
    setClosingId(contractId);
    closeContract(contractId);
  }

  function renderView() {
    const sessionStats = (
      <SessionStats
        sessionPnl={sessionPnl}
        sessionLoss={stats.sessionLoss}
        sessionStopLoss={settings.sessionStopLoss}
        dailyLoss={stats.dailyLoss}
        dailyMaxDrawdown={settings.dailyMaxDrawdown}
        formatLocal={formatLocal}
        openCount={openCount}
        tradingLocked={tradingLocked}
      />
    );

    const tradeDesk = (
      <TerminalViewLayout stats={sessionStats}>
        <TerminalSplitPanel
          secondaryLabel="Manual trading"
          secondaryHint={`${symbol} · Rise / Fall`}
          primarySections={[
            {
              label: "Market",
              content: (
                <MarketTicker
                  symbol={symbol}
                  onSymbolChange={setSymbol}
                  lastQuote={lastTick?.quote ?? null}
                  tickHistory={tickHistory}
                  isConnected={isConnected}
                  onSubscribe={setSymbol}
                  embedded
                />
              ),
            },
            {
              label: "Open book",
              description: openCount > 0 ? `${openCount} active` : "None open",
              content: (
                <PortfolioList
                  contracts={contracts}
                  isHydrated={isHydrated}
                  formatLocal={formatLocal}
                  onClose={handleCloseContract}
                  closingId={closingId}
                  embedded
                />
              ),
            },
          ]}
          secondary={
            <TradeTicket
              symbol={symbol}
              isConnected={isConnected}
              isTrading={isTrading}
              demoMode={demoMode}
              stake={stake}
              duration={duration}
              tradeNotice={riskNotice ?? tradeNotice}
              hasLiveQuote={lastTick?.quote != null}
              tradingLocked={tradingLocked}
              onStakeChange={setStake}
              onDurationChange={setDuration}
              onTrade={handleTrade}
              formatLocal={formatLocal}
              embedded
            />
          }
        />
      </TerminalViewLayout>
    );

    const botDesk = (
      <TerminalViewLayout stats={sessionStats}>
        <TerminalSplitPanel
          secondaryLabel="Trading bot"
          secondaryHint={`${symbol} · MA cross & RSI`}
          primary={
            <MarketTicker
              symbol={symbol}
              onSymbolChange={setSymbol}
              lastQuote={lastTick?.quote ?? null}
              tickHistory={tickHistory}
              isConnected={isConnected}
              onSubscribe={setSymbol}
              embedded
            />
          }
          secondary={
            <BotPanel
              config={bot.config}
              heartbeat={bot.heartbeat}
              hydrated={bot.hydrated}
              demoMode={demoMode}
              liveAllowed={bot.liveAllowed}
              demoRemainingMs={bot.demoRemainingMs}
              isConnected={isConnected}
              onConfigChange={bot.setConfig}
              onStart={bot.start}
              onPause={bot.pause}
              onStop={bot.stop}
              embedded
              title="Trading bot"
              subtitle="MA cross & RSI runner — launch from Auto trader cards or tune here"
            />
          }
        />
      </TerminalViewLayout>
    );

    const dTraderDesk = (
      <DTraderDesk
        symbol={symbol}
        onSymbolChange={setSymbol}
        lastQuote={
          tickHistory.filter((tick) => tick.symbol === symbol).at(-1)?.quote ??
          lastTick?.quote ??
          null
        }
        tickHistory={tickHistory}
        isConnected={isConnected}
        isTrading={isTrading}
        demoMode={demoMode}
        stake={stake}
        duration={duration}
        tradeNotice={riskNotice ?? tradeNotice}
        tradingLocked={tradingLocked || (!demoMode && !activeAccount)}
        dTraderFamily={dTraderFamily}
        dTraderBarrier={dTraderBarrier}
        dTraderDigitTarget={dTraderDigitTarget}
        onStakeChange={setStake}
        onDurationChange={setDuration}
        onTrade={handleContractTrade}
        formatLocal={formatLocal}
        chartHistory={chartHistory}
        chartHistoryLoading={chartHistoryLoading}
        onRequestHistory={requestChartHistory}
      />
    );

    const handleAutoTraderLaunch = (card: AutoTraderCard) => {
      applyBuilderSeed(autoTraderCardToSnapshot(card));
    };

    const botContracts = contracts.filter((contract) => contract.source === "bot");
    const botWon = botContracts.filter((c) => (c.profit ?? 0) > 0).length;
    const botLost = botContracts.filter((c) => (c.profit ?? 0) < 0).length;
    const botStake = botContracts.reduce((sum, c) => sum + (c.buyPrice ?? 0), 0);
    const botPnl = botContracts.reduce((sum, c) => sum + (c.profit ?? 0), 0);
    const builderRunStats = {
      totalStake: botStake,
      totalPayout: botStake + botPnl,
      runs: botContracts.length,
      lost: botLost,
      won: botWon,
      pnl: botPnl,
    };

    switch (activeView) {
      case "dashboard":
        return (
          <>
            <TerminalHomeView
              demoMode={demoMode}
              connectionState={connectionState}
              activeAccount={activeAccount}
              balance={balance}
              sessionPnl={sessionPnl}
              openCount={openCount}
              openPnl={openPnl}
              symbol={symbol}
              lastQuote={lastTick?.quote ?? null}
              formatLocal={formatLocal}
              displayCurrency={currency}
              copyProviderCount={copy.providers.length}
              followedProviderCount={copy.follow.followedIds.length}
              tradingLocked={tradingLocked}
              sessionLoss={stats.sessionLoss}
              sessionStopLoss={settings.sessionStopLoss}
              dailyLoss={stats.dailyLoss}
              dailyMaxDrawdown={settings.dailyMaxDrawdown}
              lastWorkspace={lastWorkspace}
              recentContracts={recentContracts}
              onboardingSteps={homeOnboardingSteps}
              showFundingCta={showFundingCta}
              onSymbolChange={setSymbol}
              onNavigate={handleViewChange}
              onApplySnapshot={applyBuilderSeed}
              onOpenFreeBots={(tier) => {
                seedingRef.current = true;
                writeFreeBotsTier(tier);
                handleViewChange("free-bots");
              }}
            />
          </>
        );

      case "manual-trading":
        return tradeDesk;

      case "d-trader":
        return dTraderDesk;

      case "trading-bot":
        return botDesk;

      case "auto-trader":
        return (
          <TerminalViewLayout stats={sessionStats}>
            <AutoTraderDesk onLaunch={handleAutoTraderLaunch} />
          </TerminalViewLayout>
        );

      case "chart":
        return (
          <ChartDesk
            symbol={symbol}
            onSymbolChange={setSymbol}
            lastQuote={
              tickHistory.filter((tick) => tick.symbol === symbol).at(-1)?.quote ??
              (lastTick?.symbol === symbol ? lastTick.quote : null)
            }
            tickHistory={tickHistory}
            isConnected={isConnected}
            onSubscribe={setSymbol}
            onOpenAnalysis={() => handleViewChange("analysis-tool")}
            onOpenDTrader={() => handleViewChange("d-trader")}
            chartHistory={chartHistory}
            chartHistoryLoading={chartHistoryLoading}
            onRequestHistory={requestChartHistory}
          />
        );

      case "copy-trading":
        return (
          <CopyDeskView
            providers={copy.providers}
            follow={copy.follow}
            signals={copy.signals}
            copyHistory={copy.copyHistory}
            hydrated={copy.hydrated}
            demoMode={demoMode}
            liveCopyAllowed={copy.liveCopyAllowed}
            isConnected={isConnected}
            riskMaxStake={settings.maxStake}
            signedIn={Boolean(activeAccount)}
            copyRisk={copyRiskSettings}
            copyRiskStats={copyRiskStats}
            copyNotice={copy.copyNotice}
            onToggleFollow={copy.toggleFollow}
            onFollowChange={copy.setFollow}
            onCopySignal={copy.copySignal}
            onClearCopyHistory={copy.clearCopyHistory}
            onDismissCopyNotice={copy.dismissCopyNotice}
            onOpenSettings={openSettings}
          />
        );

      case "bot-builder":
        return (
          <BotBuilderDesk
              seed={builderSeed}
              seedKey={builderSeedKey}
              onOpenAiBot={() => handleViewChange("ai-bot")}
              onRun={(config, snapshot) => {
                setSymbol(snapshot.symbol);
                bot.start(config);
              }}
              onStop={() => bot.stop()}
              running={bot.config.enabled && !bot.config.paused}
              blockReason={bot.heartbeat.blockReason}
              lastQuote={
                tickHistory.filter((tick) => tick.symbol === symbol).at(-1)?.quote ??
                lastTick?.quote ??
                null
              }
              balance={balance}
              accountCurrency={activeAccount?.currency ?? "USD"}
              onSymbolChange={setSymbol}
              fills={botContracts}
              runStats={builderRunStats}
              recentJournal={
                bot.heartbeat.lastSignalLabel
                  ? [bot.heartbeat.lastSignalLabel]
                  : []
              }
            />
        );

      case "free-bots":
        return (
          <FreeBotsDesk
            onLoadInBuilder={(strategy) => {
              applyBuilderSeed(freeBotToSnapshot(strategy));
            }}
          />
        );

      case "ai-bot":
        return (
          <AiBotDesk
            onSendToBuilder={(_brief, snapshot) => {
              applyBuilderSeed(snapshot);
            }}
          />
        );

      case "analysis-tool":
        return (
          <AnalysisToolDesk
              symbol={symbol}
              quotes={tickHistory.map((tick) => ({
                quote: tick.quote,
                epoch: tick.epoch,
                symbol: tick.symbol,
              }))}
              onSymbolChange={setSymbol}
              onTradeBias={(bias) => {
                if (bias.mode === "parity") setDTraderFamily("even_odd");
                else if (bias.mode === "barrier") {
                  setDTraderFamily("over_under");
                  setDTraderDigitTarget(bias.barrier ?? bias.digitTarget ?? 4);
                } else {
                  setDTraderFamily("matches_differs");
                  if (bias.digitTarget != null) setDTraderDigitTarget(bias.digitTarget);
                }
                if (bias.barrier != null) setDTraderBarrier(bias.barrier);
                setDuration(1);
                handleViewChange("d-trader");
              }}
              onSendToBuilder={(bias) => {
                applyBuilderSeed(
                  analysisBiasToSnapshot({
                    symbol,
                    mode: bias.mode,
                    side: bias.side,
                    barrier: bias.barrier,
                    digitTarget: bias.digitTarget,
                    label: bias.label,
                  }),
                );
              }}
            />
        );

      case "pro-ai":
        return (
          <TerminalViewLayout>
            <ProAiDesk
              onNavigate={handleViewChange}
              symbol={symbol}
              quotes={tickHistory.map((tick) => ({ quote: tick.quote }))}
              onApplyAssist={(snapshot) => applyBuilderSeed(snapshot)}
              onRunPack={(snapshot) => {
                writeBuilderHandoff(snapshot);
                bot.setConfig({
                  ...snapshotToBotConfig(snapshot, bot.config),
                  enabled: false,
                  paused: false,
                });
                setSymbol(snapshot.symbol);
                handleViewChange("trading-bot");
              }}
            />
          </TerminalViewLayout>
        );

      case "deriv-course":
        return (
          <TerminalViewLayout>
            <DerivCourseDesk
              onOpenBuilder={() => handleViewChange("bot-builder")}
              onOpenFreeBots={() => handleViewChange("free-bots")}
              onLoadStrategy={(strategyId, values) => {
                const strategy = COURSE_STRATEGIES.find(
                  (item) => item.id === strategyId,
                );
                if (!strategy) {
                  handleViewChange("bot-builder");
                  return;
                }
                applyBuilderSeed(courseStrategyToSnapshot(strategy, values));
              }}
            />
          </TerminalViewLayout>
        );

      case "signal-center":
        return (
          <SignalCenterDesk
            symbol={symbol}
            onSymbolChange={setSymbol}
            lastQuote={
              tickHistory.filter((tick) => tick.symbol === symbol).at(-1)?.quote ??
              null
            }
            tickHistory={tickHistory}
            isConnected={isConnected}
            onOpenAnalysis={() => handleViewChange("analysis-tool")}
            onOpenDTrader={(bias) => {
              setDTraderFamily(bias.family === "even_odd" ? "even_odd" : "rise_fall");
              setDuration(1);
              handleViewChange("d-trader");
            }}
          />
        );

      case "money-management":
        return (
          <MoneyManagementDesk
            signedIn={Boolean(activeAccount)}
            formatLocal={formatLocal}
          />
        );

      case "edging":
        return (
          <EdgingDesk
            symbol={symbol}
            onSymbolChange={setSymbol}
            lastTick={lastTick}
            tickHistory={tickHistory}
            isConnected={isConnected}
            tradingLocked={tradingLocked || (!demoMode && !activeAccount)}
            busy={isTrading}
            formatLocal={formatLocal}
            onTrade={handleEdgingBuy}
            onOpenDTrader={(ticks) => {
              setDTraderFamily("over_under");
              setDTraderBarrier(5);
              setDTraderDigitTarget(5);
              setDuration(ticks);
              handleViewChange("d-trader");
            }}
          />
        );

      case "edging-2":
        return (
          <Edging2Desk
            symbol={symbol}
            onSymbolChange={setSymbol}
            lastTick={lastTick}
            tickHistory={tickHistory}
            isConnected={isConnected}
            tradingLocked={tradingLocked || (!demoMode && !activeAccount)}
            busy={isTrading}
            formatLocal={formatLocal}
            onTrade={handleContractTrade}
            onOpenDTrader={(digit, _side, ticks) => {
              setDTraderFamily("matches_differs");
              setDTraderDigitTarget(digit);
              setDuration(ticks);
              handleViewChange("d-trader");
            }}
          />
        );

      case "fast-trader":
        return (
          <FastTraderDesk
            symbol={symbol}
            onSymbolChange={setSymbol}
            lastTick={lastTick}
            tickHistory={tickHistory}
            isConnected={isConnected}
            tradingLocked={tradingLocked || (!demoMode && !activeAccount)}
            busy={isTrading}
            formatLocal={formatLocal}
            onTrade={handleContractTrade}
            onOpenDTrader={(family, digit, ticks) => {
              setDTraderFamily(family);
              setDTraderDigitTarget(digit);
              setDTraderBarrier(digit);
              setDuration(ticks);
              handleViewChange("d-trader");
            }}
          />
        );

      case "ultimate-bot":
        return (
          <UltimateBotDesk
            symbol={symbol}
            onSymbolChange={setSymbol}
            tickHistory={tickHistory}
            isConnected={isConnected}
            tradingLocked={tradingLocked || (!demoMode && !activeAccount)}
            busy={isTrading}
            formatLocal={formatLocal}
            onTrade={handleContractTrade}
            onOpenDTrader={(family, digit, ticks) => {
              setDTraderFamily(family);
              setDTraderDigitTarget(digit);
              setDTraderBarrier(digit);
              setDuration(ticks);
              handleViewChange("d-trader");
            }}
            contracts={contracts}
            onCloseContract={handleCloseContract}
            closingId={closingId}
          />
        );

      case "bulk-trader":
        return (
          <BulkTraderDesk
            symbol={symbol}
            onSymbolChange={setSymbol}
            lastTick={lastTick}
            tickHistory={tickHistory}
            isConnected={isConnected}
            tradingLocked={tradingLocked || (!demoMode && !activeAccount)}
            busy={isTrading}
            chartHistory={chartHistory}
            chartHistoryLoading={chartHistoryLoading}
            onRequestHistory={requestChartHistory}
            onTrade={handleContractTrade}
            contracts={contracts}
            formatLocal={formatLocal}
            onCloseContract={handleCloseContract}
            closingId={closingId}
            notice={riskNotice ?? tradeNotice}
          />
        );

      case "portfolio":
        return (
          <TerminalViewLayout stats={sessionStats}>
            <TerminalPanel
              label="Open book"
              hint="Live P/L · kept on this device"
              bodyClassName="p-0"
              action={
                openCount > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="portfolio-count-chip">{openCount} open</span>
                    {openPnl !== 0 ? (
                      <span
                        className={cn(
                          "portfolio-pnl-chip font-mono tabular-nums",
                          openPnl >= 0 ? "text-positive" : "text-negative",
                        )}
                      >
                        {openPnl >= 0 ? "+" : ""}
                        {openPnl.toFixed(2)}
                      </span>
                    ) : null}
                  </div>
                ) : null
              }
            >
              <PortfolioList
                contracts={contracts}
                isHydrated={isHydrated}
                formatLocal={formatLocal}
                onClose={handleCloseContract}
                closingId={closingId}
                embedded
                bare
              />
            </TerminalPanel>
          </TerminalViewLayout>
        );

      case "wallet":
        return (
          <TerminalViewLayout alerts={null}>
            <WalletPanel demoMode={demoMode} />
          </TerminalViewLayout>
        );

      case "settings":
        return (
          <SettingsPanel
            currency={currency}
            onCurrencyChange={setCurrency}
            labels={labels}
            fxSource={fxSource}
            fxUpdatedAt={fxUpdatedAt}
            risk={settings}
            onRiskChange={setSettings}
            onResetSession={resetSession}
            wsMetrics={wsMetrics}
            connectionState={connectionState}
            onResetWsMetrics={resetWsMetrics}
            copyFollow={copy.follow}
            onCopyFollowChange={copy.setFollow}
            liveCopyAllowed={copy.liveCopyAllowed}
            copyRisk={copyRiskSettings}
            onCopyRiskChange={setCopyRiskSettings}
            onResetCopySession={resetCopySession}
            onOpenCopy={() => handleViewChange("copy-trading")}
          />
        );
    }
  }

  return (
    <ErrorBoundary>
      {viewReady ? (
      <AppShell
        activeView={activeView}
        onViewChange={handleViewChange}
        accounts={accounts}
        activeAccountId={activeAccountId}
        onAccountChange={handleAccountChange}
        displayCurrency={currency}
        onLogout={handleLogout}
        toolbar={{
          demoMode,
          connectionState,
          error,
          onReconnect: reconnect,
          balance,
          onRefreshBalance: requestBalance,
          sessionPnl,
          openCount,
          tradingLocked,
          onOpenSettings: openSettings,
          formatLocal,
          symbol,
        }}
      >
        <ViewTransition viewKey={activeView} animate={allowViewAnim}>
          {renderView()}
        </ViewTransition>
      </AppShell>
      ) : (
        <div className="tc-shell" aria-busy="true" />
      )}
    </ErrorBoundary>
  );
}
