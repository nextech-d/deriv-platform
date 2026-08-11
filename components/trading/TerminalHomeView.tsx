"use client";

import {
  ArrowRight,
  LayoutList,
  TrendingUp,
} from "lucide-react";
import type { AppView } from "@/components/layout/AppShell";
import {
  DeskPanel,
  DeskPanelHead,
} from "@/components/layout/TerminalViewLayout";
import { POPULAR_SYMBOLS } from "@/components/trading/MarketTicker";
import { ConnectionPill } from "@/components/trading/ConnectionPill";
import { Button } from "@/components/ui/button";
import {
  PLATFORM_NAV_GROUPS,
  PLATFORM_NAV_ITEMS,
  type PlatformNavId,
} from "@/lib/navigation/platform-nav";
import type { HomeOnboardingStep } from "@/lib/terminal/home-onboarding";
import { onboardingIncomplete } from "@/lib/terminal/home-onboarding";
import type { DisplayCurrency } from "@/hooks/useDisplayCurrency";
import type { DerivAccount } from "@/lib/session/types";
import type { OpenContractRecord } from "@/lib/state/types";
import type { ConnectionState } from "@/lib/ws/protocol";
import { cn } from "@/lib/utils/cn";

interface TerminalHomeViewProps {
  demoMode?: boolean;
  connectionState: ConnectionState;
  activeAccount?: DerivAccount;
  balance?: { amount: number; currency: string } | null;
  sessionPnl: number;
  openCount: number;
  openPnl: number;
  symbol: string;
  lastQuote: number | null;
  formatLocal: (usd: number) => string;
  displayCurrency: DisplayCurrency;
  copyProviderCount: number;
  followedProviderCount: number;
  tradingLocked?: boolean;
  sessionLoss: number;
  sessionStopLoss: number;
  dailyLoss: number;
  dailyMaxDrawdown: number;
  lastWorkspace?: AppView | null;
  recentContracts?: OpenContractRecord[];
  onboardingSteps?: HomeOnboardingStep[];
  showFundingCta?: boolean;
  onSymbolChange?: (symbol: string) => void;
  onNavigate: (view: AppView) => void;
}

function connectionLabel(state: ConnectionState): string {
  if (state === "connected") return "Market feed live";
  if (state === "connecting" || state === "reconnecting") return "Connecting to feed…";
  return "Market feed offline";
}

function workspaceLabel(view: AppView): string {
  return PLATFORM_NAV_ITEMS.find((item) => item.id === view)?.label ?? view;
}

function sourceLabel(source?: OpenContractRecord["source"]): string {
  if (source === "copy") return "Copy";
  if (source === "bot") return "Auto";
  return "Manual";
}

export function TerminalHomeView({
  demoMode = false,
  connectionState,
  activeAccount,
  balance,
  sessionPnl,
  openCount,
  openPnl,
  symbol,
  lastQuote,
  formatLocal,
  displayCurrency,
  copyProviderCount,
  followedProviderCount,
  tradingLocked = false,
  sessionLoss,
  sessionStopLoss,
  dailyLoss,
  dailyMaxDrawdown,
  lastWorkspace = null,
  recentContracts = [],
  onboardingSteps = [],
  showFundingCta = false,
  onSymbolChange,
  onNavigate,
}: TerminalHomeViewProps) {
  const balanceUsd = balance?.amount ?? null;
  const pnlPositive = sessionPnl > 0;
  const pnlNegative = sessionPnl < 0;
  const sessionPct = Math.min(100, (sessionLoss / sessionStopLoss) * 100);
  const dailyPct = Math.min(100, (dailyLoss / dailyMaxDrawdown) * 100);
  const feedLive = connectionState === "connected";
  const showOnboarding = onboardingIncomplete(onboardingSteps);

  const statusLine = tradingLocked
    ? "Trading locked — review risk limits"
    : sessionPct >= 80 || dailyPct >= 80
      ? "Approaching session or daily limit"
      : feedLive
        ? "All systems ready"
        : "Waiting for market feed";

  function openSymbol(nextSymbol: string) {
    onSymbolChange?.(nextSymbol);
    onNavigate("trade");
  }

  return (
    <div className="terminal-home view-in">
      {showFundingCta ? (
        <div className="terminal-home-funding-banner shell-float">
          <div>
            <p className="terminal-home-funding-title">Low balance</p>
            <p className="terminal-home-funding-sub">
              Add funds via Deriv Cashier or a local payment agent before your next live trade.
            </p>
          </div>
          <Button
            size="sm"
            className="interactive shrink-0"
            onClick={() => onNavigate("wallet")}
          >
            Add funds
          </Button>
        </div>
      ) : null}

      <header className="terminal-home-command shell-float">
        <div className="terminal-home-command-main">
          <p className="trade-field-label">Home</p>
          <h1 className="terminal-home-title">
            {activeAccount
              ? `${activeAccount.isDemo ? "Demo" : "Live"} desk · ${activeAccount.loginid}`
              : "Command center"}
          </h1>
          <p className="terminal-home-sub">{statusLine}</p>
        </div>
        <div className="terminal-home-command-actions">
          <ConnectionPill state={connectionState} />
          {demoMode ? (
            <span className="home-status-chip home-status-chip-demo">Demo</span>
          ) : null}
          {tradingLocked ? (
            <span className="home-status-chip home-status-chip-warn">Locked</span>
          ) : null}
          {lastWorkspace ? (
            <Button
              variant="secondary"
              size="sm"
              className="interactive"
              onClick={() => onNavigate(lastWorkspace)}
            >
              Resume {workspaceLabel(lastWorkspace)}
            </Button>
          ) : null}
          <Button
            size="sm"
            className="interactive gap-1.5"
            onClick={() => onNavigate("trade")}
          >
            <TrendingUp className="h-3.5 w-3.5" strokeWidth={2} />
            Trade {symbol}
          </Button>
        </div>
      </header>

      <div className="terminal-home-hero-grid">
        <DeskPanel className="terminal-home-balance">
          <div className="terminal-home-balance-inner">
            <div>
              <p className="session-metric-label">Balance · {displayCurrency}</p>
              <p className="terminal-home-balance-value font-mono tabular-nums">
                {balanceUsd != null ? formatLocal(balanceUsd) : "—"}
              </p>
              {balanceUsd != null ? (
                <p className="terminal-home-balance-sub font-mono tabular-nums">
                  {balanceUsd.toFixed(2)} USD
                </p>
              ) : null}
            </div>
            <div
              className={cn(
                "terminal-home-pnl-block",
                pnlPositive && "terminal-home-pnl-positive",
                pnlNegative && "terminal-home-pnl-negative",
              )}
            >
              <p className="session-metric-label">Session P/L</p>
              <p className="terminal-home-pnl-value font-mono tabular-nums">
                {pnlPositive ? "+" : ""}
                {sessionPnl.toFixed(2)}
                <span className="text-sm font-medium text-muted"> USD</span>
              </p>
              <p className="terminal-home-balance-sub font-mono tabular-nums">
                {formatLocal(sessionPnl)}
              </p>
            </div>
          </div>
        </DeskPanel>

        <DeskPanel variant="metrics" className="terminal-home-market">
          <DeskPanelHead
            title="Market pulse"
            hint={connectionLabel(connectionState)}
            trailing={
              <button
                type="button"
                className="copy-count-chip interactive"
                onClick={() => onNavigate("trade")}
              >
                Open trade
              </button>
            }
          />
          <div className="terminal-home-market-body">
            <div className="terminal-home-market-quote">
              <p className="font-mono text-lg font-semibold tracking-tight">{symbol}</p>
              <p className="market-quote-value font-mono tabular-nums">
                {lastQuote != null ? lastQuote.toFixed(4) : "—.----"}
              </p>
            </div>
            <div className="terminal-home-market-stats">
              <div className="terminal-home-mini-stat">
                <p className="session-metric-label">Open</p>
                <p className="font-mono text-base font-semibold">{openCount}</p>
                {openCount > 0 ? (
                  <p
                    className={cn(
                      "text-[10px] font-mono tabular-nums",
                      openPnl >= 0 ? "text-positive" : "text-negative",
                    )}
                  >
                    {openPnl >= 0 ? "+" : ""}
                    {openPnl.toFixed(2)} USD
                  </p>
                ) : null}
              </div>
              <div className="terminal-home-mini-stat">
                <p className="session-metric-label">Copy</p>
                <p className="font-mono text-base font-semibold">
                  {followedProviderCount}
                </p>
                <p className="text-[10px] text-muted">
                  of {copyProviderCount} providers
                </p>
              </div>
            </div>
          </div>
        </DeskPanel>
      </div>

      <div className="terminal-home-actions">
        <Button
          variant="secondary"
          size="sm"
          className="interactive gap-1.5"
          disabled={openCount === 0}
          onClick={() => onNavigate("portfolio")}
        >
          <LayoutList className="h-3.5 w-3.5" strokeWidth={2} />
          Portfolio{openCount > 0 ? ` (${openCount})` : ""}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="interactive"
          onClick={() => onNavigate("wallet")}
        >
          Wallet
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="interactive"
          onClick={() => onNavigate("settings")}
        >
          Risk settings
        </Button>
      </div>

      {showOnboarding ? (
        <DeskPanel className="terminal-home-onboarding">
          <DeskPanelHead title="Getting started" hint="Complete your desk setup" />
          <ul className="terminal-home-onboarding-list">
            {onboardingSteps.map((step) => (
              <li key={step.id}>
                <button
                  type="button"
                  className={cn(
                    "terminal-home-onboarding-row interactive w-full text-left",
                    step.done && "terminal-home-onboarding-row-done",
                  )}
                  onClick={() => onNavigate(step.view)}
                >
                  <span
                    className={cn(
                      "terminal-home-onboarding-check",
                      step.done && "terminal-home-onboarding-check-done",
                    )}
                    aria-hidden
                  />
                  <span className="flex-1 text-sm">{step.label}</span>
                  {!step.done ? (
                    <ArrowRight className="h-3.5 w-3.5 text-muted" strokeWidth={2} />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </DeskPanel>
      ) : null}

      <div className="terminal-home-secondary-grid">
        <DeskPanel className="terminal-home-watchlist">
          <DeskPanelHead title="Watchlist" hint="Tap symbol to trade" />
          <div className="terminal-home-watchlist-rail">
            {POPULAR_SYMBOLS.map((item) => {
              const isActive = item.id === symbol;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "terminal-home-watch-chip interactive desk-tile text-left",
                    isActive && "terminal-home-watch-chip-active",
                  )}
                  onClick={() => openSymbol(item.id)}
                >
                  <span className="font-mono text-sm font-semibold">{item.id}</span>
                  <span className="text-[10px] text-muted">{item.label}</span>
                  {isActive && lastQuote != null ? (
                    <span className="font-mono text-[10px] tabular-nums text-muted">
                      {lastQuote.toFixed(4)}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </DeskPanel>

        {recentContracts.length > 0 ? (
          <DeskPanel className="terminal-home-recent">
            <DeskPanelHead
              title="Recent positions"
              hint="Latest activity"
              trailing={
                <button
                  type="button"
                  className="copy-count-chip interactive"
                  onClick={() => onNavigate("portfolio")}
                >
                  View all
                </button>
              }
            />
            <ul className="terminal-home-recent-list">
              {recentContracts.map((contract) => {
                const profit = contract.profit ?? 0;
                const positive = profit > 0;
                const negative = profit < 0;
                return (
                  <li key={contract.contractId}>
                    <button
                      type="button"
                      className="terminal-home-recent-row interactive w-full text-left"
                      onClick={() => onNavigate("portfolio")}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-sm font-semibold">
                          {contract.symbol}
                        </span>
                        <span className="block text-[10px] text-muted">
                          {sourceLabel(contract.source)}
                          {contract.isSold ? " · Closed" : " · Open"}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "font-mono text-sm tabular-nums",
                          positive && "text-positive",
                          negative && "text-negative",
                        )}
                      >
                        {positive ? "+" : ""}
                        {profit.toFixed(2)} USD
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </DeskPanel>
        ) : null}
      </div>

      <div className="terminal-home-workspaces">
        {PLATFORM_NAV_GROUPS.map((group) => (
          <DeskPanel key={group.label} className="terminal-home-workspace-group">
            <DeskPanelHead title={group.label} hint="Launch workspace" />
            <div className="terminal-home-workspace-grid">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isHome = item.id === "home";
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isHome}
                    aria-current={isHome ? "page" : undefined}
                    className={cn(
                      "terminal-home-workspace-tile interactive desk-tile text-left",
                      isHome && "terminal-home-workspace-tile-active",
                    )}
                    onClick={() => onNavigate(item.id as PlatformNavId)}
                  >
                    <span className="terminal-home-workspace-icon">
                      <Icon className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <span className="terminal-home-workspace-label">{item.label}</span>
                    <span className="terminal-home-workspace-desc">{item.desc}</span>
                    {!isHome ? (
                      <ArrowRight className="terminal-home-workspace-arrow h-3.5 w-3.5" strokeWidth={2} />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </DeskPanel>
        ))}
      </div>
    </div>
  );
}
