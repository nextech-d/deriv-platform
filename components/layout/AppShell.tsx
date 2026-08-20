"use client";

import { useEffect, useState } from "react";
import {
  PLATFORM_NAV_GROUPS,
  type AppView,
  type PlatformNavId,
} from "@/lib/navigation/platform-nav";
import { ProductNavbar } from "@/components/navigation/ProductChrome";
import {
  type TerminalNavGroup,
  type TerminalToolbarState,
} from "@/components/layout/TerminalTopStrip";
import { RunSidebar } from "@/components/trading/RunSidebar";
import { useScrollAnywhere } from "@/hooks/useScrollAnywhere";
import type { DerivAccount } from "@/lib/session/types";
import type { DisplayCurrency } from "@/hooks/useDisplayCurrency";
import { cn } from "@/lib/utils/cn";

export type { AppView, PlatformNavId };

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

const NO_SIDEBAR_VIEWS: AppView[] = [
  "dashboard",
  "settings",
  "wallet",
  "money-management",
  "copy-trading",
  "deriv-course",
  "bot-builder",
  "free-bots",
  "d-trader",
  "analysis-tool",
  "signal-center",
  "ai-bot",
  "edging",
  "edging-2",
  "fast-trader",
  "chart",
  "ultimate-bot",
  "bulk-trader",
];

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

function formatGmt(date: Date): string {
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss} GMT`;
}

export function AppShell({
  children,
  activeView,
  onViewChange,
  accounts,
  activeAccountId,
  onLogout,
  toolbar,
}: AppShellProps) {
  const activeAccount = accounts.find((a) => a.accountId === activeAccountId);
  const feedLive = toolbar.connectionState === "connected";
  const showRunSidebar = !NO_SIDEBAR_VIEWS.includes(activeView);
  const [clock, setClock] = useState("");
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  useEffect(() => {
    const tick = () => setClock(formatGmt(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!disclaimerOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setDisclaimerOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [disclaimerOpen]);

  const fillWorkspace =
    activeView === "bot-builder" ||
    activeView === "chart" ||
    activeView === "d-trader" ||
    activeView === "free-bots" ||
    activeView === "analysis-tool" ||
    activeView === "signal-center" ||
    activeView === "money-management" ||
    activeView === "copy-trading" ||
    activeView === "edging" ||
    activeView === "edging-2" ||
    activeView === "fast-trader" ||
    activeView === "ultimate-bot" ||
    activeView === "bulk-trader";

  useScrollAnywhere();

  return (
    <div className="dangote-layout tc-shell">
      <ProductNavbar
        brandHref="/"
        activeId={activeView}
        onSelect={onViewChange}
        account={activeAccount}
        onLogout={onLogout}
      />

      <div className="dangote-body">
        <main
          className="terminal-workspace"
          data-scroll-root
          style={{
            flex: 1,
            overflowY: fillWorkspace ? "hidden" : "auto",
            background: "#fff",
            display: fillWorkspace ? "flex" : undefined,
            minHeight: 0,
          }}
        >
          {children}
        </main>
        {showRunSidebar && <RunSidebar />}
      </div>

      <footer className="tc-footer">
        <button
          type="button"
          className="tc-footer-risk"
          aria-expanded={disclaimerOpen}
          onClick={() => setDisclaimerOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3.2 2.8 19.5h18.4z" />
            <path d="M12 9.5v5" />
            <circle cx="12" cy="16.8" r="0.7" fill="currentColor" stroke="none" />
          </svg>
          Risk
        </button>
        <span className="tc-clock" suppressHydrationWarning>
          {clock || "—"}
        </span>
        <div className="tc-footer-right">
          <span className={cn("tc-feed", feedLive && "is-live")}>
            <span className="tc-feed-dot" />
            {feedLive ? "Live" : "Offline"}
          </span>
          <span className="tc-footer-rule" aria-hidden />
          <button
            type="button"
            aria-label="Fullscreen"
            className="tc-fullscreen"
            onClick={() => {
              if (!document.fullscreenElement) {
                void document.documentElement.requestFullscreen?.();
              } else {
                void document.exitFullscreen?.();
              }
            }}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M20 15v5h-5" />
            </svg>
          </button>
        </div>
      </footer>

      <button
        type="button"
        className="tc-ai-fab"
        onClick={() => onViewChange("ai-bot")}
        aria-label="AI"
      >
        <span className="tc-ai-fab-orbit" aria-hidden>
          <span />
          <span />
          <span />
        </span>
        AI
      </button>

      {disclaimerOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tc-risk-title"
          className="tc-modal-scrim"
          onClick={() => setDisclaimerOpen(false)}
        >
          <div className="tc-modal" onClick={(event) => event.stopPropagation()}>
            <p className="tc-modal-title" id="tc-risk-title">Risk disclaimer</p>
            <p className="tc-modal-body">
              Trading involves risk. Never trade money you cannot afford to lose. Past
              performance does not guarantee future results.
            </p>
            <button
              type="button"
              className="tc-btn tc-btn-solid"
              onClick={() => setDisclaimerOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
