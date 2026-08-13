"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import {
  PLATFORM_NAV_GROUPS,
  type PlatformNavId,
} from "@/lib/navigation/platform-nav";
import {
  TerminalTopStrip,
  type TerminalNavGroup,
  type TerminalToolbarState,
} from "@/components/layout/TerminalTopStrip";
import type { DerivAccount } from "@/lib/session/types";
import type { DisplayCurrency } from "@/hooks/useDisplayCurrency";

export type AppView = PlatformNavId;

export const NAV_GROUPS: TerminalNavGroup[] = PLATFORM_NAV_GROUPS.map(
  (group) => ({
    label: group.label,
    items: group.items.map(({ id, label, desc, icon }) => ({
      id,
      label,
      desc,
      icon,
    })),
  }),
);

const VIEW_META: Record<AppView, { section: string; title: string }> = {
  home: { section: "Desk", title: "Home" },
  trade: { section: "Trade", title: "Rise / Fall" },
  auto: { section: "Trade", title: "Auto" },
  copy: { section: "Trade", title: "Copy" },
  portfolio: { section: "Trade", title: "Portfolio" },
  wallet: { section: "Account", title: "Wallet" },
  settings: { section: "Account", title: "Settings" },
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
    <div className="terminal-shell relative flex h-dvh overflow-hidden bg-canvas bg-background">
      <div className="page-accent-wash pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="page-accent-orb pointer-events-none absolute -right-24 top-0 h-[28rem] w-[28rem] rounded-full blur-3xl"
        aria-hidden
      />

      <aside
        className="terminal-sidebar relative z-10 hidden min-h-0 w-[14rem] shrink-0 flex-col md:flex"
        aria-label="Terminal navigation"
      >
        <div className="sidebar-brand-panel">
          <Link
            href="/"
            className="sidebar-brand interactive w-full text-left"
            title="Back to website"
            aria-label="Back to website"
          >
            <div className="sidebar-brand-mark">
              <span className="sidebar-brand-name">Deriv EA</span>
              <span
                className={cn(
                  "sidebar-feed-dot",
                  feedLive && "sidebar-feed-dot-live",
                  feedPending && "sidebar-feed-dot-pending",
                  !feedLive && !feedPending && "sidebar-feed-dot-offline",
                )}
                title={
                  feedLive
                    ? "Feed live"
                    : feedPending
                      ? "Connecting"
                      : "Feed offline"
                }
                aria-hidden
              />
            </div>
            <p className="sidebar-brand-sub">Back to website</p>
          </Link>
        </div>

        <nav className="sidebar-nav flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-y-contain scrollbar-thin">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="sidebar-nav-group">
              <p className="sidebar-group-label">{group.label}</p>
              <ul className="sidebar-nav-list">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        data-active={isActive}
                        title={`${item.label} — ${item.desc}`}
                        onClick={() => onViewChange(item.id)}
                        aria-current={isActive ? "page" : undefined}
                        className="sidebar-nav-row interactive w-full text-left"
                      >
                        <span
                          className={cn(
                            "sidebar-nav-icon-wrap",
                            isActive && "sidebar-nav-icon-wrap-active",
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-3.5 w-3.5",
                              isActive ? "text-accent" : "text-muted",
                            )}
                            strokeWidth={isActive ? 2.4 : 2}
                          />
                        </span>
                        <span className="sidebar-nav-copy">
                          <span
                            className={cn(
                              "sidebar-nav-label",
                              isActive ? "text-foreground" : "text-muted",
                            )}
                          >
                            {item.label}
                          </span>
                          <span className="sidebar-nav-desc">{item.desc}</span>
                        </span>
                        {isActive ? (
                          <span className="sidebar-nav-active-mark" aria-hidden />
                        ) : null}
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
            <div className="sidebar-session-row">
              <p className="sidebar-group-label">Session</p>
              <span
                className={cn(
                  "sidebar-session-badge",
                  activeAccount.isDemo
                    ? "sidebar-session-badge-demo"
                    : "sidebar-session-badge-live",
                )}
              >
                {activeAccount.isDemo ? "Demo" : "Live"}
              </span>
            </div>
            <p className="sidebar-session-id font-mono">{activeAccount.loginid}</p>
            <p className="sidebar-session-meta">{displayCurrency} display</p>
          </div>
        ) : null}
      </aside>

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <TerminalTopStrip
          activeView={activeView}
          viewSection={viewMeta.section}
          viewTitle={viewMeta.title}
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
          <div className="terminal-workspace-inner mx-auto max-w-[1240px] px-3 pb-6 pt-3 md:px-5 md:pt-3.5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
