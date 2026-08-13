import {
  ArrowRight,
  Bot,
  Copy,
  LayoutList,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  DeskPanel,
  DeskPanelHead,
} from "@/components/layout/TerminalViewLayout";
import { ConnectionPill } from "@/components/trading/ConnectionPill";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const PREVIEW_SYMBOL = "R_10";
const PREVIEW_QUOTE = 5432.184;

const QUICK_LAUNCH = [
  { label: "Trade", desc: "Open a Rise/Fall ticket", icon: TrendingUp },
  { label: "Auto", desc: "Run a bot on the feed", icon: Bot },
  { label: "Copy", desc: "Follow signal providers", icon: Copy },
  { label: "Portfolio", desc: "Review the open book", icon: LayoutList },
  { label: "Wallet", desc: "Cashier and agents", icon: Wallet },
];

/**
 * Static mirror of TerminalHomeView for the marketing hero — same structure
 * and desk classes as the live dashboard home command center.
 */
export function MarketingTerminalHomePreview() {
  return (
    <div className="marketing-terminal-preview" aria-hidden inert>
      <div className="terminal-home">
        <header className="terminal-home-command">
          <div className="terminal-home-command-main">
            <p className="terminal-home-kicker">Command center</p>
            <h2 className="terminal-home-title">
              Demo desk
              <span className="terminal-home-title-id font-mono">VRT1000000</span>
            </h2>
            <p className="terminal-home-sub">Desk ready — feed connected</p>
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
              hint="Feed live"
              trailing={
                <span className="terminal-home-inline-link pointer-events-none">
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

        <div className="terminal-home-launch marketing-terminal-preview-launch">
          {QUICK_LAUNCH.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="terminal-home-launch-tile text-left">
                <span className="terminal-home-launch-icon">
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <span className="terminal-home-launch-copy">
                  <span className="terminal-home-launch-label">{item.label}</span>
                  <span className="terminal-home-launch-desc">{item.desc}</span>
                </span>
                <ArrowRight className="terminal-home-launch-arrow h-3.5 w-3.5" strokeWidth={2} />
              </div>
            );
          })}
        </div>

        <div className="terminal-home-secondary-grid marketing-terminal-preview-secondary">
          <DeskPanel className="terminal-home-watchlist">
            <DeskPanelHead title="Watchlist" hint="Tap a symbol to trade" />
            <div className="terminal-home-watchlist-rail">
              {["R_10", "R_100", "BOOM1000", "CRASH1000"].map((item) => (
                <div
                  key={item}
                  className={cn(
                    "terminal-home-watch-chip text-left",
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
      </div>
    </div>
  );
}
