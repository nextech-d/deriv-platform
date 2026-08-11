"use client";

import {
  Bot,
  Copy,
  LayoutList,
  Settings,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  TerminalTopStrip,
  type TerminalNavGroup,
  type TerminalToolbarState,
} from "@/components/layout/TerminalTopStrip";
import type { DerivAccount } from "@/lib/session/types";
import type { DisplayCurrency } from "@/hooks/useDisplayCurrency";

export type AppView =
  | "trade"
  | "auto"
  | "copy"
  | "portfolio"
  | "wallet"
  | "settings";

export const NAV_GROUPS: TerminalNavGroup[] = [
  {
    label: "Trading",
    items: [
      { id: "trade", label: "Trade", desc: "Markets & ticket", icon: TrendingUp },
      { id: "auto", label: "Auto", desc: "Bot strategies", icon: Bot },
      { id: "copy", label: "Copy", desc: "Signal providers", icon: Copy },
      { id: "portfolio", label: "Portfolio", desc: "Open positions", icon: LayoutList },
    ],
  },
  {
    label: "Account",
    items: [
      { id: "wallet", label: "Wallet", desc: "Deposit & agents", icon: Wallet },
      { id: "settings", label: "Settings", desc: "Risk & prefs", icon: Settings },
    ],
  },
];

const VIEW_META: Record<AppView, { section: string; title: string }> = {
  trade: { section: "Live terminal", title: "Trade" },
  auto: { section: "Automation", title: "Trading bot" },
  copy: { section: "Social", title: "Copy trading" },
  portfolio: { section: "Positions", title: "Portfolio" },
  wallet: { section: "Funding", title: "Wallet" },
  settings: { section: "Preferences", title: "Settings" },
};

const SYMBOL_VIEWS: AppView[] = ["trade", "auto", "copy"];

interface AppShellProps {
  children: React.ReactNode;
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  accounts: DerivAccount[];
  activeAccountId?: string;
  onAccountChange: (id: string) => void;
  displayCurrency: DisplayCurrency;
  onLogout: () => void;
  toolbar: TerminalToolbarState;
}

export function AppShell({
  children,
  activeView,
  onViewChange,
  accounts,
  activeAccountId,
  onAccountChange,
  displayCurrency,
  onLogout,
  toolbar,
}: AppShellProps) {
  const activeAccount = accounts.find((a) => a.accountId === activeAccountId);
  const viewMeta = VIEW_META[activeView];
  const feedLive = toolbar.connectionState === "connected";
  const feedPending =
    toolbar.connectionState === "connecting" ||
    toolbar.connectionState === "reconnecting";

  return (
    <div className="terminal-shell relative flex h-dvh overflow-hidden bg-grid bg-background">
      <div className="page-accent-wash pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="page-accent-orb pointer-events-none absolute -right-24 top-0 h-[28rem] w-[28rem] rounded-full blur-3xl"
        aria-hidden
      />

      <aside className="terminal-sidebar relative z-10 hidden min-h-0 w-52 shrink-0 flex-col md:flex">
        <div className="sidebar-brand-panel">
          <div className="shell-float shell-float-brand sidebar-brand-inner">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
              Deriv EA
            </p>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm font-semibold tracking-tight">Terminal</p>
              <span
                className={cn(
                  "command-feed-dot h-1.5 w-1.5 rounded-full",
                  feedLive && "bg-positive",
                  feedPending && "animate-pulse-dot bg-warning",
                  !feedLive && !feedPending && "bg-negative",
                )}
                title={feedLive ? "Feed live" : feedPending ? "Connecting" : "Feed offline"}
                aria-hidden
              />
            </div>
          </div>
        </div>

        <div className="shell-float sidebar-stack-panel">
          <nav className="sidebar-nav flex flex-1 flex-col gap-4 overflow-y-auto scrollbar-thin">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="sidebar-group-label mb-1.5 px-1">{group.label}</p>
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          data-active={isActive}
                          onClick={() => onViewChange(item.id)}
                          aria-current={isActive ? "page" : undefined}
                          className="sidebar-nav-row interactive w-full px-2.5 py-2 text-left"
                        >
                          <div className="flex items-start gap-2.5">
                            <span
                              className={cn(
                                "sidebar-nav-icon-wrap",
                                isActive && "sidebar-nav-icon-wrap-active",
                              )}
                            >
                              <Icon
                                className={cn(
                                  "h-4 w-4",
                                  isActive ? "text-accent" : "text-muted",
                                )}
                                strokeWidth={isActive ? 2.25 : 2}
                              />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p
                                className={cn(
                                  "text-sm font-medium leading-tight",
                                  isActive ? "text-foreground" : "text-muted",
                                )}
                              >
                                {item.label}
                              </p>
                              <p className="mt-0.5 truncate text-[10px] leading-tight text-muted">
                                {item.desc}
                              </p>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {activeAccount ? (
            <div className="sidebar-session">
              <p className="sidebar-group-label">Session</p>
              <p className="mt-1 truncate font-mono text-xs font-medium">
                {activeAccount.loginid}
              </p>
              <p className="mt-0.5 text-[10px] text-muted">
                <span
                  className={cn(
                    "mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle",
                    activeAccount.isDemo ? "bg-warning" : "bg-positive",
                  )}
                  aria-hidden
                />
                {activeAccount.isDemo ? "Demo" : "Live"} · {displayCurrency}
              </p>
            </div>
          ) : null}
        </div>
      </aside>

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <TerminalTopStrip
          activeView={activeView}
          viewSection={viewMeta.section}
          viewTitle={viewMeta.title}
          navGroups={NAV_GROUPS}
          onViewChange={onViewChange}
          accounts={accounts}
          activeAccountId={activeAccountId}
          onAccountChange={onAccountChange}
          onLogout={onLogout}
          displayCurrency={displayCurrency}
          toolbar={{
            ...toolbar,
            symbol: SYMBOL_VIEWS.includes(activeView) ? toolbar.symbol : undefined,
          }}
        />

        <main className="terminal-workspace relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain scrollbar-thin">
          <div className="terminal-workspace-inner mx-auto max-w-[1240px] px-3 pb-4 pt-2 md:px-4 md:pt-2.5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
