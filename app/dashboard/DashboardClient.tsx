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
import { CopySessionStats } from "@/components/trading/CopySessionStats";
import { BotPanel } from "@/components/trading/BotPanel";
import { WalletPanel } from "@/components/trading/WalletPanel";
import { SettingsPanel } from "@/components/trading/SettingsPanel";
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
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TickEvent } from "@/lib/ws/protocol";
import {
  mergeWatchSymbols,
  symbolsForFollowedProviders,
} from "@/lib/copy/watch-symbols";

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
  const [activeView, setActiveView] = useState<AppView>("trade");
  const [activeAccountId, setActiveAccountId] = useState(
    initialAccountId ?? accounts[0]?.accountId,
  );
  const [symbol, setSymbol] = useState("R_10");
  const [stake, setStake] = useState(1);
  const [duration, setDuration] = useState(5);
  const [riskNotice, setRiskNotice] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<number | null>(null);

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
    closeContract,
    reconnect,
    requestBalance,
    wsMetrics,
    resetWsMetrics,
  } = useDerivWorker(activeAccountId, {
    onContractClosed: (profit, contractId) =>
      onContractClosedRef.current(profit, contractId),
    onTick: (tick, history) => {
      botTickRef.current(tick, history);
      copyTickRef.current(tick, history);
    },
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

  const handleAccountChange = useCallback(
    async (accountId: string) => {
      setActiveAccountId(accountId);
      if (demoMode) return;
      try {
        await fetch("/api/auth/session", {
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

  const openSettings = useCallback(() => setActiveView("settings"), []);

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

  useEffect(() => {
    botTickRef.current = bot.handleTick;
    copyTickRef.current = copy.handleTick;
  }, [bot.handleTick, copy.handleTick]);

  const copyWatchSymbols = useMemo(
    () => symbolsForFollowedProviders(copy.providers, copy.follow.followedIds),
    [copy.providers, copy.follow.followedIds],
  );

  const tickWatchSymbols = useMemo(
    () => mergeWatchSymbols(symbol, copyWatchSymbols),
    [symbol, copyWatchSymbols],
  );

  useEffect(() => {
    if (!isConnected) return;
    syncTickSubscriptions(tickWatchSymbols);
  }, [isConnected, tickWatchSymbols, syncTickSubscriptions]);

  useEffect(() => {
    if (activeView !== "copy" || !tradeNotice) return;
    if (/opened/i.test(tradeNotice)) return;
    copy.pushCopyNotice({ tone: "error", message: tradeNotice });
    copy.reportCopyRejection(tradeNotice);
  }, [activeView, tradeNotice, copy.pushCopyNotice, copy.reportCopyRejection]);

  async function handleLogout() {
    if (demoMode) {
      router.push("/");
      return;
    }
    await fetch("/api/auth/logout", { method: "POST" });
    await clearTradingDb();
    router.push("/login");
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

    switch (activeView) {
      case "trade":
        return (
          <TerminalViewLayout stats={sessionStats}>
            <TerminalSplitPanel
              secondaryLabel="Order ticket"
              secondaryHint={`${symbol} · Rise / Fall`}
              primarySections={[
                {
                  label: "Market feed",
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
                  label: "Open positions",
                  description:
                    openCount > 0 ? `${openCount} active` : "None open",
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

      case "auto":
        return (
          <TerminalViewLayout stats={sessionStats}>
            <TerminalSplitPanel
              secondaryLabel="Auto-trader"
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
                />
              }
            />
          </TerminalViewLayout>
        );

      case "copy":
        return (
          <TerminalViewLayout
            stats={
              <CopySessionStats
                providers={copy.providers}
                follow={copy.follow}
                signals={copy.signals}
                copyHistory={copy.copyHistory}
                copyRisk={copyRiskSettings}
                copyRiskStats={copyRiskStats}
                liveCopyAllowed={copy.liveCopyAllowed}
                copyNotice={copy.copyNotice}
                onDismissCopyNotice={copy.dismissCopyNotice}
                onOpenSettings={openSettings}
              />
            }
          >
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
              onToggleFollow={copy.toggleFollow}
              onFollowChange={copy.setFollow}
              onCopySignal={copy.copySignal}
              onClearCopyHistory={copy.clearCopyHistory}
            />
          </TerminalViewLayout>
        );

      case "portfolio":
        return (
          <TerminalViewLayout stats={sessionStats}>
            <TerminalPanel
              label="Open positions"
              hint="Live P/L · persisted locally"
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
            onOpenCopy={() => setActiveView("copy")}
          />
        );
    }
  }

  return (
    <ErrorBoundary>
      <AppShell
        activeView={activeView}
        onViewChange={setActiveView}
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
        <ViewTransition viewKey={activeView}>{renderView()}</ViewTransition>
      </AppShell>
    </ErrorBoundary>
  );
}
