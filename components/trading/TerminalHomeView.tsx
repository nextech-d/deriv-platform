"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Bell, Bot, Folder, HardDrive, Sparkles, Workflow } from "lucide-react";
import type { AppView } from "@/components/layout/AppShell";
import type { HomeOnboardingStep } from "@/lib/terminal/home-onboarding";
import type { DisplayCurrency } from "@/hooks/useDisplayCurrency";
import type { DerivAccount } from "@/lib/session/types";
import type { OpenContractRecord } from "@/lib/state/types";
import type { ConnectionState } from "@/lib/ws/protocol";
import { TourDialog } from "@/components/trading/TourDialog";
import {
  DASHBOARD_WINDOWS,
  type DashboardWindow,
} from "@/lib/terminal/dashboard-windows";
import { writeFreeBotsTier, type FreeBotsTier } from "@/lib/terminal/desk-handoff";
import { PLATFORM_NAV_ITEMS } from "@/lib/navigation/platform-nav";
import {
  quickStrategyToSnapshot,
  snapshotFromXml,
  speedBotSnapshot,
  type BotBuilderSnapshot,
} from "@/lib/terminal/strategy-seed";
import type { QuickStrategyType } from "@/lib/bot/types";
import { QUICK_STRATEGY_METAS } from "@/lib/bot/types";

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
  onApplySnapshot: (snapshot: BotBuilderSnapshot) => void;
  onOpenFreeBots?: (tier: FreeBotsTier) => void;
}

const FAQ_ITEMS = [
  {
    q: "What is tradecity.trade?",
    a: "tradecity.trade is your automated trading partner. It is a web-based strategy builder for trading binary options on Deriv. You can use it to build and run trading robots (also known as bots) that can automatically trade for you — no coding required.",
  },
  {
    q: "Where do I find the blocks I need?",
    a: "Blocks are grouped by category on the left of the Bot Builder workspace. Open the Blocks menu, then Analysis (indicators, ticks, contracts, stats) or Utility (variables, logic, loops, notifications, and more).",
  },
  {
    q: "How do I remove blocks from the workspace?",
    a: "Drag the blocks you don't want to the recycle bin on the bottom right of the workspace, or select a block and press Delete.",
  },
];

const ANNOUNCEMENTS = [
  {
    title: "Load or build your bot",
    body: "Import a bot from your computer or Google Drive, build it from scratch, or start with a quick strategy.",
  },
  {
    title: "Blocks menu",
    body: "Find Analysis and Utility on the left of Bot Builder. Analysis holds indicators and tick tools. Utility holds variables, logic, loops, and notifications.",
  },
  {
    title: "Run panel",
    body: "When you're ready to trade, hit Run. Track performance in Summary, Transactions, and Journal.",
  },
  {
    title: "Risk warning",
    body: "Trading involves risk. Never trade money you cannot afford to lose. Past performance does not guarantee future results.",
  },
];

const QUICK_PICK: QuickStrategyType[] = [
  "martingale",
  "dalembert",
  "oscars_grind",
];

const XML_ACCEPT = ".xml,application/xml,text/xml,application/json,.json";

function viewLabel(view: AppView): string {
  return (
    PLATFORM_NAV_ITEMS.find((item) => item.id === view)?.label ??
    view.replace(/-/g, " ")
  );
}

function deskTitle(demoMode: boolean, signedIn: boolean): string {
  if (demoMode) return "Demo desk";
  if (signedIn) return "Live desk";
  return "Your desk";
}

export function TerminalHomeView({
  demoMode = false,
  connectionState,
  activeAccount,
  lastWorkspace,
  onNavigate,
  onApplySnapshot,
  onOpenFreeBots,
}: TerminalHomeViewProps) {
  const xmlInputRef = useRef<HTMLInputElement>(null);
  const driveInputRef = useRef<HTMLInputElement>(null);
  const announceRef = useRef<HTMLDivElement>(null);
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [announceSeen, setAnnounceSeen] = useState(true);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [driveOpen, setDriveOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem("tc-tour-dashboard")) setTourOpen(true);
    setAnnounceSeen(Boolean(window.localStorage.getItem("tc-announce-seen")));
  }, []);

  useEffect(() => {
    if (!announceOpen && !driveOpen && !quickOpen && !loadOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setAnnounceOpen(false);
      setDriveOpen(false);
      setQuickOpen(false);
      setLoadOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [announceOpen, driveOpen, quickOpen, loadOpen]);

  useEffect(() => {
    if (!announceOpen) return;
    function onPointer(event: MouseEvent) {
      if (!announceRef.current?.contains(event.target as Node)) {
        setAnnounceOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [announceOpen]);

  function dismissTour(start: boolean) {
    window.localStorage.setItem("tc-tour-dashboard", "1");
    setTourOpen(false);
    if (start) onNavigate("bot-builder");
  }

  function markAnnouncementsSeen() {
    window.localStorage.setItem("tc-announce-seen", "1");
    setAnnounceSeen(true);
  }

  function applyXml(text: string, fileName: string): boolean {
    const parsed = snapshotFromXml(text);
    if (!parsed) {
      setLoadError(
        `"${fileName}" is not a TradeCity strategy file. Export XML from Bot Builder, then try again.`,
      );
      return false;
    }
    setLoadError(null);
    onApplySnapshot({
      ...parsed,
      sourceLabel: `Dashboard · ${fileName}`,
    });
    return true;
  }

  function handleXmlSelected(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      applyXml(String(reader.result ?? ""), file.name);
    };
    reader.onerror = () => {
      setLoadError(`Could not read ${file.name}.`);
    };
    reader.readAsText(file);
    if (xmlInputRef.current) xmlInputRef.current.value = "";
    if (driveInputRef.current) driveInputRef.current.value = "";
    setDriveOpen(false);
    setLoadOpen(false);
  }

  function openWindow(deskWindow: DashboardWindow) {
    setLoadError(null);
    if (deskWindow.id === "load-bot") {
      window.localStorage.setItem("tc-tour-dashboard", "1");
      setTourOpen(false);
      setLoadOpen(true);
      return;
    }
    if (deskWindow.id === "speed-bot") {
      onApplySnapshot(speedBotSnapshot());
      return;
    }
    if (deskWindow.id === "premium-bots") {
      if (onOpenFreeBots) onOpenFreeBots("premium");
      else {
        writeFreeBotsTier("premium");
        onNavigate("free-bots");
      }
      return;
    }
    if (deskWindow.id === "free-bots") {
      if (onOpenFreeBots) onOpenFreeBots("free");
      else {
        writeFreeBotsTier("free");
        onNavigate("free-bots");
      }
      return;
    }
    onNavigate(deskWindow.view);
  }

  const cards = [
    {
      id: "computer",
      title: "My computer",
      icon: HardDrive,
      inputId: "tc-xml-computer",
    },
    {
      id: "drive",
      title: "Google Drive",
      icon: Folder,
      onClick: () => setDriveOpen(true),
    },
    {
      id: "builder",
      title: "Bot builder",
      icon: Workflow,
      onClick: () => onNavigate("bot-builder"),
    },
    {
      id: "quick",
      title: "Quick strategy",
      icon: Sparkles,
      onClick: () => setQuickOpen(true),
    },
  ];

  const feedLive = connectionState === "connected";
  const signedIn = Boolean(activeAccount);

  return (
    <div
      className="terminal-home"
      data-testid="terminal-home"
      style={{ padding: "32px 28px 40px", maxWidth: 1100, margin: "0 auto" }}
    >
      <input
        id="tc-xml-computer"
        ref={xmlInputRef}
        type="file"
        accept={XML_ACCEPT}
        className="tc-file-input"
        tabIndex={-1}
        onChange={(event) => handleXmlSelected(event.target.files)}
      />
      <input
        id="tc-xml-drive"
        ref={driveInputRef}
        type="file"
        accept={XML_ACCEPT}
        className="tc-file-input"
        tabIndex={-1}
        onChange={(event) => handleXmlSelected(event.target.files)}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 18,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "var(--dg-text)" }}>
            {deskTitle(demoMode, signedIn)}
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--dg-muted)" }}>
            Load XML, speed-build a strategy, open premium or free bots, or study
            signals before you trade.
          </p>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 12,
              color: feedLive ? "#0f766e" : "#6b7280",
              fontWeight: 600,
            }}
          >
            {feedLive ? "Live feed" : connectionState === "connecting" ? "Connecting" : "Offline"}
            {lastWorkspace ? (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={() => onNavigate(lastWorkspace)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#0f766e",
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: 0,
                    fontSize: 12,
                  }}
                >
                  Continue {viewLabel(lastWorkspace)}
                </button>
              </>
            ) : null}
          </p>
        </div>

        <div ref={announceRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            type="button"
            aria-expanded={announceOpen}
            aria-haspopup="dialog"
            onClick={() => {
              setAnnounceOpen((open) => !open);
              markAnnouncementsSeen();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              border: "1px solid var(--dg-border)",
              borderRadius: 4,
              background: "var(--dg-surface)",
              cursor: "pointer",
              fontSize: 13,
              position: "relative",
            }}
          >
            <Bell style={{ width: 14, height: 14 }} />
            Announcements
            {!announceSeen ? (
              <span
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  background: "#0f766e",
                  color: "#fff",
                  borderRadius: 10,
                  minWidth: 18,
                  height: 18,
                  fontSize: 11,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {ANNOUNCEMENTS.length}
              </span>
            ) : null}
          </button>
          {announceOpen ? (
            <div
              role="dialog"
              aria-label="Announcements"
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 8px)",
                width: 320,
                zIndex: 20,
                border: "1px solid var(--dg-border)",
                borderRadius: 8,
                padding: 12,
                fontSize: 13,
                background: "var(--dg-surface)",
                boxShadow: "0 12px 32px rgba(15, 23, 42, 0.12)",
              }}
            >
              <p style={{ margin: "0 0 8px", fontWeight: 700 }}>Announcements</p>
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", color: "var(--dg-muted)" }}>
                {ANNOUNCEMENTS.map((item) => (
                  <li key={item.title} style={{ marginBottom: 10 }}>
                    <strong style={{ display: "block", color: "var(--dg-text)" }}>{item.title}</strong>
                    {item.body}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {loadError ? (
        <p
          role="alert"
          style={{
            margin: "0 0 16px",
            padding: "10px 12px",
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          {loadError}
        </p>
      ) : null}

      <div
        className="terminal-home-windows"
        aria-label="Dashboard windows"
        style={{ marginBottom: 28 }}
      >
          {DASHBOARD_WINDOWS.map((deskWindow, index) => {
            const Icon = deskWindow.icon;
            return (
              <button
                key={deskWindow.id}
                type="button"
                data-accent={deskWindow.accent}
                style={{ "--window-i": index } as CSSProperties}
                className="terminal-home-window interactive text-left"
                onClick={() => openWindow(deskWindow)}
              >
              <span className="terminal-home-window-chrome" aria-hidden>
                <span className="terminal-home-window-dots">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="terminal-home-window-index font-mono">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </span>
              <span className="terminal-home-window-body">
                <span className="terminal-home-window-icon" aria-hidden>
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <span className="terminal-home-window-copy">
                  <span className="terminal-home-window-title">{deskWindow.title}</span>
                  <span className="terminal-home-window-summary">{deskWindow.summary}</span>
                </span>
              </span>
              <span className="terminal-home-window-action">
                {deskWindow.action}
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              <span className="terminal-home-window-sheen" aria-hidden />
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.15fr) minmax(280px, 0.85fr)",
          gap: 32,
          alignItems: "start",
        }}
      >
        <section>
          <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "var(--dg-text)" }}>
            Load or build your bot
          </h2>
          <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--dg-muted)", maxWidth: 520 }}>
            Import a bot from your computer or Google Drive, build it from scratch, or start
            with a quick strategy.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              maxWidth: 420,
            }}
          >
            {cards.map((card) => {
              const Icon = card.icon;
              const inner = (
                <>
                  <Icon style={{ width: 22, height: 22, color: "#0d4d4d" }} strokeWidth={1.75} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--dg-text)" }}>
                    {card.title}
                  </span>
                </>
              );
              const cardStyle: CSSProperties = {
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 10,
                padding: "16px 14px",
                border: "1px solid var(--dg-border)",
                borderRadius: 8,
                background: "var(--dg-surface)",
                cursor: "pointer",
                textAlign: "left",
                minHeight: 88,
              };
              if ("inputId" in card && card.inputId) {
                return (
                  <label key={card.id} htmlFor={card.inputId} className="tc-load-source" style={cardStyle}>
                    {inner}
                  </label>
                );
              }
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={card.onClick}
                  className="tc-load-source"
                  style={cardStyle}
                >
                  {inner}
                </button>
              );
            })}
          </div>
        </section>

        <aside>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Bot style={{ width: 18, height: 18, color: "#0d4d4d" }} />
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--dg-text)" }}>
              Welcome to tradecity.trade!
            </h2>
          </div>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--dg-muted)", lineHeight: 1.5 }}>
            Ready to automate your trading strategy without writing any code? You&apos;ve come to
            the right place.
          </p>
          <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--dg-muted)" }}>
            Check out these guides and FAQs to learn more about building your bot:
          </p>
          <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "var(--dg-text)" }}>Guide</p>
          <button
            type="button"
            onClick={() => onNavigate("deriv-course")}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "8px 0",
              border: "none",
              background: "transparent",
              color: "#0d4d4d",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            tradecity.trade - your automated trading partner
          </button>
          <p style={{ margin: "12px 0 6px", fontSize: 12, fontWeight: 700, color: "var(--dg-text)" }}>
            FAQs
          </p>
          {FAQ_ITEMS.map((item) => {
            const open = openFaq === item.q;
            return (
              <div key={item.q} style={{ borderBottom: "1px solid var(--dg-border)" }}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : item.q)}
                  aria-expanded={open}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 0",
                    border: "none",
                    background: "transparent",
                    fontSize: 13,
                    color: "var(--dg-text)",
                    cursor: "pointer",
                  }}
                >
                  {item.q}
                  <span style={{ float: "right", color: "#9ca3af" }}>{open ? "▴" : "▾"}</span>
                </button>
                {open ? (
                  <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--dg-muted)", lineHeight: 1.5 }}>
                    {item.a}
                  </p>
                ) : null}
              </div>
            );
          })}
        </aside>
      </div>

      {loadOpen ? (
        <div
          className="tc-modal-scrim tc-load-scrim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tc-load-bot-title"
          onClick={() => setLoadOpen(false)}
        >
          <div className="tc-modal" onClick={(event) => event.stopPropagation()}>
            <p className="tc-modal-title" id="tc-load-bot-title">
              Load Bot
            </p>
            <p className="tc-modal-body">
              Import XML from your computer or Google Drive, open Bot Builder, or start with a
              quick strategy.
            </p>
            <div className="tc-load-grid">
              {cards.map((card) => {
                const Icon = card.icon;
                const inner = (
                  <>
                    <Icon style={{ width: 20, height: 20, color: "#0f766e" }} strokeWidth={1.75} />
                    {card.title}
                  </>
                );
                if ("inputId" in card && card.inputId) {
                  return (
                    <label key={card.id} htmlFor={card.inputId} className="tc-load-source">
                      {inner}
                    </label>
                  );
                }
                return (
                  <button
                    key={card.id}
                    type="button"
                    className="tc-load-source"
                    onClick={() => {
                      setLoadOpen(false);
                      card.onClick?.();
                    }}
                  >
                    {inner}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="tc-btn tc-btn-ghost"
              onClick={() => setLoadOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {driveOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tc-drive-title"
          className="tc-modal-scrim"
          onClick={() => setDriveOpen(false)}
        >
          <div className="tc-modal" onClick={(event) => event.stopPropagation()}>
            <p className="tc-modal-title" id="tc-drive-title">
              Google Drive
            </p>
            <p className="tc-modal-body">
              Choose a bot XML saved from Google Drive. This desk opens a local file picker — pick
              the file you downloaded from Drive.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button
                type="button"
                className="tc-btn tc-btn-ghost"
                onClick={() => setDriveOpen(false)}
              >
                Cancel
              </button>
              <label htmlFor="tc-xml-drive" className="tc-btn tc-btn-solid" style={{ cursor: "pointer" }}>
                Choose from Google Drive
              </label>
            </div>
          </div>
        </div>
      ) : null}

      {quickOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tc-quick-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 55,
          }}
          onClick={() => setQuickOpen(false)}
        >
          <div
            style={{
              background: "#fff",
              width: "min(460px, calc(100vw - 32px))",
              borderRadius: 8,
              padding: 20,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <p id="tc-quick-title" style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 16 }}>
              Quick strategy
            </p>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
              Pick a ready-made stake progression. Trade parameters open in Bot Builder so you can
              tweak them before you run.
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {QUICK_PICK.map((type) => {
                const meta = QUICK_STRATEGY_METAS.find((item) => item.type === type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setQuickOpen(false);
                      onApplySnapshot(quickStrategyToSnapshot(type));
                    }}
                    style={{
                      textAlign: "left",
                      padding: "12px 14px",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <strong style={{ display: "block", fontSize: 14, color: "#111" }}>
                      {meta?.label ?? type}
                    </strong>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>{meta?.description}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
              <button
                type="button"
                onClick={() => setQuickOpen(false)}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #d1d5db",
                  borderRadius: 4,
                  background: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {tourOpen ? (
        <TourDialog
          title="Get started on tradecity.trade"
          body={
            <p style={{ margin: 0 }}>
              Hi! Hit <strong>Start</strong> for a quick tour of Bot Builder.
            </p>
          }
          onSkip={() => dismissTour(false)}
          onStart={() => dismissTour(true)}
        />
      ) : null}
    </div>
  );
}
