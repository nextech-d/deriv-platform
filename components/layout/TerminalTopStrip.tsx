"use client";

import { useState } from "react";
import { Check, ChevronDown, LogOut, RefreshCw, Settings } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ThemeToggle } from "@/components/trading/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  WorkspaceModal,
  WorkspaceModalFrame,
} from "@/components/ui/workspace-modal";
import type { AppView } from "@/components/layout/AppShell";
import type { LucideIcon } from "lucide-react";
import type { ConnectionState } from "@/lib/ws/protocol";
import type { DerivAccount } from "@/lib/session/types";
import type { DisplayCurrency } from "@/hooks/useDisplayCurrency";

export interface TerminalToolbarState {
  demoMode?: boolean;
  connectionState: ConnectionState;
  error?: string | null;
  onReconnect: () => void;
  balance?: { amount: number; currency: string } | null;
  onRefreshBalance?: () => void;
  sessionPnl?: number;
  openCount?: number;
  tradingLocked?: boolean;
  onOpenSettings?: () => void;
  formatLocal?: (usd: number) => string;
  symbol?: string;
}

/** What the center ticker shows — avoids duplicating workspace stats. */
type TickerMode = "balance" | "balance-open" | "none";

function tickerModeForView(view: AppView): TickerMode {
  switch (view) {
    case "trade":
    case "auto":
    case "copy":
      return "balance";
    case "portfolio":
      return "balance-open";
    case "wallet":
    case "settings":
      return "none";
    default:
      return "balance";
  }
}

export interface TerminalNavItem {
  id: AppView;
  label: string;
  desc: string;
  icon: LucideIcon;
}

export interface TerminalNavGroup {
  label: string;
  items: TerminalNavItem[];
}

interface TerminalTopStripProps {
  activeView: AppView;
  viewSection: string;
  viewTitle: string;
  navGroups: TerminalNavGroup[];
  onViewChange: (view: AppView) => void;
  accounts: DerivAccount[];
  activeAccountId?: string;
  onAccountChange: (id: string) => void;
  onLogout: () => void;
  displayCurrency: DisplayCurrency;
  toolbar: TerminalToolbarState;
}

export function TerminalTopStrip({
  activeView,
  viewSection,
  viewTitle,
  navGroups,
  onViewChange,
  accounts,
  activeAccountId,
  onAccountChange,
  onLogout,
  displayCurrency,
  toolbar,
}: TerminalTopStripProps) {
  const {
    demoMode,
    connectionState,
    error,
    onReconnect,
    balance,
    onRefreshBalance,
    sessionPnl = 0,
    openCount = 0,
    tradingLocked,
    onOpenSettings,
    symbol,
  } = toolbar;

  const tickerMode = tickerModeForView(activeView);
  const isConnected = connectionState === "connected";
  const pending =
    connectionState === "connecting" || connectionState === "reconnecting";
  const balanceUsd = balance?.amount ?? null;

  const alert =
    demoMode || tradingLocked || error || !isConnected || pending
      ? {
          demo: demoMode,
          risk: tradingLocked,
          offline: !isConnected && !pending,
          pending,
          error,
        }
      : null;

  const balanceText =
    balanceUsd !== null
      ? `${balanceUsd.toFixed(2)} ${balance?.currency ?? "USD"}`
      : "—.——";

  return (
    <header className="terminal-command-bar terminal-command-bar-locked shrink-0">
      <div className="command-bar-outer mx-auto max-w-[1240px] px-3 pt-2.5 md:px-4 md:pt-3">
        <div className="shell-float command-bar-panel">
          <div className="command-bar-main flex items-center gap-4">
            <div className="flex min-w-0 shrink-0 items-baseline gap-2 md:min-w-[9rem] md:flex-col md:items-start md:justify-center md:gap-0">
              <p className="command-bar-eyebrow">{viewSection}</p>
              <div className="flex min-w-0 items-baseline gap-2">
                <h1 className="truncate text-sm font-semibold tracking-tight md:text-[15px]">
                  {viewTitle}
                </h1>
                {symbol ? (
                  <span className="command-symbol shrink-0 font-mono text-[11px] text-muted">
                    {symbol}
                  </span>
                ) : null}
              </div>
            </div>

          {tickerMode !== "none" ? (
            <div className="command-ticker hidden min-w-0 flex-1 items-center justify-center md:flex">
              <div className="command-ticker-pill">
                <p className="truncate font-mono text-[13px] tabular-nums tracking-tight text-foreground/90">
                  <TickerPart label="Bal">{balanceText}</TickerPart>
                  {tickerMode === "balance-open" ? (
                    <>
                      <TickerSep />
                      <TickerPart label="Open">{openCount}</TickerPart>
                    </>
                  ) : null}
                </p>
              </div>
            </div>
          ) : (
            <div className="hidden flex-1 md:block" aria-hidden />
          )}

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <div className="command-actions flex items-center gap-0.5">
                {onRefreshBalance ? (
                  <CommandIcon icon={RefreshCw} label="Refresh balance" onClick={onRefreshBalance} />
                ) : null}
                {onOpenSettings ? (
                  <CommandIcon
                    icon={Settings}
                    label="Settings"
                    onClick={onOpenSettings}
                    emphasis={tradingLocked}
                  />
                ) : null}
                <ThemeToggle variant="icon" className="command-icon-btn" />
              </div>

              <div className="command-session flex items-center gap-0.5 border-l border-border-subtle pl-2">
                <StripAccount
                  accounts={accounts}
                  activeAccountId={activeAccountId}
                  onAccountChange={onAccountChange}
                  displayCurrency={displayCurrency}
                  connectionState={connectionState}
                  onReconnect={!isConnected ? onReconnect : undefined}
                />
                <CommandIcon icon={LogOut} label="Log out" onClick={onLogout} />
              </div>
            </div>
          </div>

          <nav className="command-nav-band command-nav-mobile md:hidden" aria-label="Terminal views">
            <div className="command-nav-inner">
              {navGroups.flatMap((g) => g.items).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-current={activeView === item.id ? "page" : undefined}
                  data-active={activeView === item.id}
                  onClick={() => onViewChange(item.id)}
                  className="command-nav-tab workspace-tab interactive"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </nav>

          {tickerMode !== "none" ? (
            <div className="command-ticker-mobile md:hidden">
              <p className="truncate font-mono text-[11px] tabular-nums text-muted">
                {balanceText}
                {tickerMode === "balance-open" ? (
                  <>
                    <span className="mx-2 text-border">·</span>
                    {openCount} open
                  </>
                ) : null}
                {activeView === "trade" ? (
                  <>
                    <span className="mx-2 text-border">·</span>
                    <span className="text-[10px] text-muted">P/L in session panel</span>
                  </>
                ) : null}
                </p>
              </div>
          ) : null}
        </div>
      </div>

      {alert ? (
        <div className="command-alert-outer mx-auto max-w-[1240px] px-3 md:px-4">
          <div
            className={cn(
              "command-alert command-alert-panel text-xs",
              alert.risk && "command-alert-warn",
              alert.offline && "command-alert-danger",
              alert.demo && !alert.offline && !alert.risk && "command-alert-demo",
            )}
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {alert.demo ? <span className="text-muted">Demo session — no live execution</span> : null}
            {alert.risk ? (
              <span className="text-warning">
                Risk lockout
                {onOpenSettings ? (
                  <>
                    {" · "}
                    <button
                      type="button"
                      onClick={onOpenSettings}
                      className="interactive underline-offset-2 hover:underline"
                    >
                      Adjust limits
                    </button>
                  </>
                ) : null}
              </span>
            ) : null}
            {alert.pending ? (
              <span className="text-muted">Connecting to market data…</span>
            ) : null}
            {alert.offline ? (
              <span className="text-muted">
                Feed offline
                {" · "}
                <button
                  type="button"
                  onClick={onReconnect}
                  className="interactive font-medium text-foreground underline-offset-2 hover:underline"
                >
                  Reconnect
                </button>
              </span>
            ) : null}
            {alert.error ? (
              <span className="truncate text-negative" title={alert.error}>
                {alert.error.length > 96 ? `${alert.error.slice(0, 96)}…` : alert.error}
              </span>
            ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function TickerPart({
  children,
  label,
  className,
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <span className={className}>
      <span className="mr-1.5 text-[10px] font-sans font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
    </span>
  );
}

function TickerSep() {
  return <span className="mx-3 text-border select-none">|</span>;
}

function CommandIcon({
  icon: Icon,
  label,
  onClick,
  emphasis,
}: {
  icon: typeof RefreshCw;
  label: string;
  onClick: () => void;
  emphasis?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "command-icon-btn interactive flex h-8 w-8 items-center justify-center rounded-md text-muted hover:text-foreground",
        emphasis && "text-warning",
      )}
    >
      <Icon className="h-[15px] w-[15px]" strokeWidth={1.75} />
    </button>
  );
}

function StripAccount({
  accounts,
  activeAccountId,
  onAccountChange,
  displayCurrency,
  connectionState,
  onReconnect,
}: {
  accounts: DerivAccount[];
  activeAccountId?: string;
  onAccountChange: (id: string) => void;
  displayCurrency: DisplayCurrency;
  connectionState: ConnectionState;
  onReconnect?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const active = accounts.find((a) => a.accountId === activeAccountId) ?? accounts[0];

  if (!active) return null;

  const canSwitch = accounts.length > 1;
  const live = connectionState === "connected";
  const pending =
    connectionState === "connecting" || connectionState === "reconnecting";

  const FeedDot = onReconnect ? "button" : "span";

  function selectAccount(accountId: string) {
    onAccountChange(accountId);
    setOpen(false);
  }

  return (
    <>
      <div className="relative flex items-center gap-2.5">
        <FeedDot
          type={onReconnect ? "button" : undefined}
          onClick={onReconnect}
          title={live ? "Market feed live" : pending ? "Connecting" : "Reconnect feed"}
          className={cn(
            "flex shrink-0 items-center",
            onReconnect && "interactive rounded-full p-1 hover:bg-surface-elevated/60",
          )}
        >
          <span
            className={cn(
              "command-feed-dot block h-2 w-2 rounded-full",
              live && "bg-positive",
              pending && "animate-pulse-dot bg-warning",
              !live && !pending && "bg-negative",
            )}
            aria-hidden
          />
        </FeedDot>

        <button
          type="button"
          disabled={!canSwitch}
          aria-expanded={canSwitch ? open : undefined}
          onClick={() => canSwitch && setOpen(true)}
          className={cn(
            "command-account interactive flex items-center gap-2 rounded-md py-1 pl-1 pr-2 text-left",
            canSwitch && "hover:bg-surface-elevated/60",
            !canSwitch && "cursor-default",
          )}
        >
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate">
              <span className="font-mono text-xs font-medium">{active.loginid}</span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
                {active.isDemo ? "Demo" : "Live"}
              </span>
            </p>
            <p className="truncate text-[10px] text-muted">
              {active.currency} wallet · {displayCurrency} view
            </p>
          </div>
          {canSwitch ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={2} />
          ) : null}
        </button>
      </div>

      {open && canSwitch ? (
        <WorkspaceModal
          open
          onClose={() => setOpen(false)}
          label="Switch account"
          labelledBy="account-switch-title"
          size="sm"
        >
          <WorkspaceModalFrame
            title="Switch account"
            footer={
              <Button
                variant="secondary"
                size="sm"
                className="interactive flex-1"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            }
          >
            <h2 id="account-switch-title" className="text-sm font-semibold">
              Choose account
            </h2>
            <p className="mt-1 text-[11px] text-muted">
              Trades and balance use the selected wallet.
            </p>
            <ul className="-mx-1 mt-3 divide-y divide-border-subtle border-y border-border-subtle">
              {accounts.map((account) => {
                const selected = account.accountId === active.accountId;
                return (
                  <li key={account.accountId}>
                    <button
                      type="button"
                      onClick={() => selectAccount(account.accountId)}
                      className={cn(
                        "interactive flex w-full items-center gap-2 px-1 py-2.5 text-left",
                        selected && "bg-surface-elevated/50",
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          account.isDemo ? "bg-warning" : "bg-positive",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-xs">{account.loginid}</p>
                        <p className="text-[10px] text-muted">
                          {account.isDemo ? "Demo" : "Live"} · {account.currency}
                        </p>
                      </div>
                      {selected ? (
                        <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </WorkspaceModalFrame>
        </WorkspaceModal>
      ) : null}
    </>
  );
}
