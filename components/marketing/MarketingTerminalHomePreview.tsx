import {
  ArrowRight,
  LayoutList,
  TrendingUp,
} from "lucide-react";
import {
  DeskPanel,
  DeskPanelHead,
} from "@/components/layout/TerminalViewLayout";
import { ConnectionPill } from "@/components/trading/ConnectionPill";
import { Button } from "@/components/ui/button";
import {
  PLATFORM_NAV_GROUPS,
} from "@/lib/navigation/platform-nav";
import { cn } from "@/lib/utils/cn";

const PREVIEW_SYMBOL = "R_10";
const PREVIEW_QUOTE = 5432.184;

/**
 * Static mirror of TerminalHomeView for the marketing hero — same structure
 * and desk classes as the live dashboard home command center.
 */
export function MarketingTerminalHomePreview() {
  return (
    <div className="marketing-terminal-preview" aria-hidden inert>
      <div className="terminal-home">
        <header className="terminal-home-command shell-float">
          <div className="terminal-home-command-main">
            <p className="trade-field-label">Home</p>
            <h2 className="terminal-home-title">Demo desk · VRT1000000</h2>
            <p className="terminal-home-sub">All systems ready</p>
          </div>
          <div className="terminal-home-command-actions">
            <ConnectionPill state="connected" />
            <span className="home-status-chip home-status-chip-demo">Demo</span>
            <Button size="sm" className="pointer-events-none gap-1.5" tabIndex={-1}>
              <TrendingUp className="h-3.5 w-3.5" strokeWidth={2} />
              Trade {PREVIEW_SYMBOL}
            </Button>
          </div>
        </header>

        <div className="terminal-home-hero-grid">
          <DeskPanel className="terminal-home-balance">
            <div className="terminal-home-balance-inner">
              <div>
                <p className="session-metric-label">Balance · KES</p>
                <p className="terminal-home-balance-value font-mono tabular-nums">
                  KES 1,294,750.00
                </p>
                <p className="terminal-home-balance-sub font-mono tabular-nums">
                  10000.00 USD
                </p>
              </div>
              <div className="terminal-home-pnl-block terminal-home-pnl-positive">
                <p className="session-metric-label">Session P/L</p>
                <p className="terminal-home-pnl-value font-mono tabular-nums">
                  +124.50
                  <span className="text-sm font-medium text-muted"> USD</span>
                </p>
                <p className="terminal-home-balance-sub font-mono tabular-nums">
                  KES 16,107.00
                </p>
              </div>
            </div>
          </DeskPanel>

          <DeskPanel variant="metrics" className="terminal-home-market">
            <DeskPanelHead
              title="Market pulse"
              hint="Market feed live"
              trailing={
                <span className="copy-count-chip pointer-events-none">
                  Open trade
                </span>
              }
            />
            <div className="terminal-home-market-body">
              <div className="terminal-home-market-quote">
                <p className="font-mono text-lg font-semibold tracking-tight">
                  {PREVIEW_SYMBOL}
                </p>
                <p className="market-quote-value font-mono tabular-nums">
                  {PREVIEW_QUOTE.toFixed(4)}
                </p>
              </div>
              <div className="terminal-home-market-stats">
                <div className="terminal-home-mini-stat">
                  <p className="session-metric-label">Open</p>
                  <p className="font-mono text-base font-semibold">3</p>
                  <p className="text-[10px] font-mono tabular-nums text-positive">
                    +42.10 USD
                  </p>
                </div>
                <div className="terminal-home-mini-stat">
                  <p className="session-metric-label">Copy</p>
                  <p className="font-mono text-base font-semibold">2</p>
                  <p className="text-[10px] text-muted">of 5 providers</p>
                </div>
              </div>
            </div>
          </DeskPanel>
        </div>

        <div className="terminal-home-actions">
          <Button
            variant="secondary"
            size="sm"
            className="pointer-events-none gap-1.5"
            tabIndex={-1}
          >
            <LayoutList className="h-3.5 w-3.5" strokeWidth={2} />
            Portfolio (3)
          </Button>
          <Button variant="secondary" size="sm" className="pointer-events-none" tabIndex={-1}>
            Wallet
          </Button>
          <Button variant="ghost" size="sm" className="pointer-events-none" tabIndex={-1}>
            Risk settings
          </Button>
        </div>

        <div className="terminal-home-secondary-grid marketing-terminal-preview-secondary">
          <DeskPanel className="terminal-home-watchlist">
            <DeskPanelHead title="Watchlist" hint="Tap symbol to trade" />
            <div className="terminal-home-watchlist-rail">
              {["R_10", "R_100", "BOOM1000", "CRASH1000"].map((item) => (
                <div
                  key={item}
                  className={cn(
                    "terminal-home-watch-chip desk-tile text-left",
                    item === PREVIEW_SYMBOL && "terminal-home-watch-chip-active",
                  )}
                >
                  <span className="font-mono text-sm font-semibold">{item}</span>
                  {item === PREVIEW_SYMBOL ? (
                    <span className="font-mono text-[10px] tabular-nums text-muted">
                      {PREVIEW_QUOTE.toFixed(4)}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </DeskPanel>
        </div>

        <div className="terminal-home-workspaces marketing-terminal-preview-workspaces">
          {PLATFORM_NAV_GROUPS.map((group) => (
            <DeskPanel key={group.label} className="terminal-home-workspace-group">
              <DeskPanelHead title={group.label} hint="Launch workspace" />
              <div className="terminal-home-workspace-grid">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isHome = item.id === "home";
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "terminal-home-workspace-tile desk-tile text-left",
                        isHome && "terminal-home-workspace-tile-active",
                      )}
                    >
                      <span className="terminal-home-workspace-icon">
                        <Icon className="h-4 w-4" strokeWidth={2} />
                      </span>
                      <span className="terminal-home-workspace-label">{item.label}</span>
                      <span className="terminal-home-workspace-desc">{item.desc}</span>
                      {!isHome ? (
                        <ArrowRight
                          className="terminal-home-workspace-arrow h-3.5 w-3.5"
                          strokeWidth={2}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </DeskPanel>
          ))}
        </div>
      </div>
    </div>
  );
}
