"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, HardDrive } from "lucide-react";
import { MarketingAuthButtons } from "@/components/marketing/MarketingAuthButtons";
import {
  isPlatformNavId,
  platformSectionIdFromNavId,
  type PlatformNavId,
} from "@/lib/navigation/platform-nav";
import { DASHBOARD_WINDOWS, type DashboardWindow } from "@/lib/terminal/dashboard-windows";
import { writeBuilderHandoff, writeFreeBotsTier } from "@/lib/terminal/desk-handoff";
import {
  snapshotFromXml,
  speedBotSnapshot,
} from "@/lib/terminal/strategy-seed";

interface MarketingDashboardPanelProps {
  onNavigate?: (sectionId: string, id: PlatformNavId) => void;
}

function marketingNavTarget(
  view: (typeof DASHBOARD_WINDOWS)[number]["view"],
): PlatformNavId {
  return isPlatformNavId(view) ? view : "dashboard";
}

function go(onNavigate: MarketingDashboardPanelProps["onNavigate"], id: PlatformNavId) {
  onNavigate?.(platformSectionIdFromNavId(id), id);
}

export function MarketingDashboardPanel({
  onNavigate,
}: MarketingDashboardPanelProps) {
  const xmlInputRef = useRef<HTMLInputElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadOpen, setLoadOpen] = useState(false);

  useEffect(() => {
    if (!loadOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setLoadOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [loadOpen]);

  function openWindow(deskWindow: DashboardWindow) {
    setLoadError(null);
    if (deskWindow.id === "load-bot") {
      setLoadOpen(true);
      return;
    }
    if (deskWindow.id === "speed-bot") {
      writeBuilderHandoff(speedBotSnapshot());
      go(onNavigate, "bot-builder");
      return;
    }
    if (deskWindow.id === "premium-bots") {
      writeFreeBotsTier("premium");
      go(onNavigate, "free-bots");
      return;
    }
    if (deskWindow.id === "free-bots") {
      writeFreeBotsTier("free");
      go(onNavigate, "free-bots");
      return;
    }
    go(onNavigate, marketingNavTarget(deskWindow.view));
  }

  function handleXmlSelected(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = snapshotFromXml(String(reader.result ?? ""));
      if (!parsed) {
        setLoadError(
          `"${file.name}" is not a TradeCity strategy file. Export XML from Bot Builder, then try again.`,
        );
        setLoadOpen(false);
        return;
      }
      writeBuilderHandoff({
        ...parsed,
        sourceLabel: `Dashboard · ${file.name}`,
      });
      setLoadOpen(false);
      go(onNavigate, "bot-builder");
    };
    reader.onerror = () => {
      setLoadError(`Could not read ${file.name}.`);
      setLoadOpen(false);
    };
    reader.readAsText(file);
    if (xmlInputRef.current) xmlInputRef.current.value = "";
  }

  return (
    <section
      id="overview"
      className="marketing-dashboard-panel"
      data-panel="overview"
      tabIndex={-1}
    >
      <input
        id="tc-marketing-xml"
        ref={xmlInputRef}
        type="file"
        accept=".xml,application/xml,text/xml,application/json,.json"
        className="tc-file-input"
        tabIndex={-1}
        onChange={(event) => handleXmlSelected(event.target.files)}
      />

      <div className="marketing-dashboard-deck">
        <div className="marketing-dashboard-deck-grid" aria-hidden />
        <div className="marketing-dashboard-deck-glow" aria-hidden />
        <div className="marketing-dashboard-deck-corners" aria-hidden>
          <span />
          <span />
          <span />
          <span />
        </div>

        <header className="marketing-dashboard-head">
          <div className="marketing-dashboard-kicker-row">
            <p className="marketing-eyebrow">
              <span className="marketing-dashboard-live-dot" aria-hidden />
              Dashboard
            </p>
            <p className="marketing-dashboard-meta font-mono">
              <span>05 windows</span>
              <span aria-hidden>·</span>
              <span>Bot desk</span>
            </p>
          </div>

          <h1 className="marketing-dashboard-title">
            Your bot desk
            <span className="marketing-dashboard-title-accent"> windows</span>
          </h1>
          <p className="marketing-dashboard-lead">
            Load XML, speed-build a strategy, open premium or free bots, or study
            signals before you trade — the same five entry points as the live
            terminal.
          </p>
        </header>

        {loadError ? (
          <p role="alert" className="marketing-dashboard-load-error">
            {loadError}
          </p>
        ) : null}

        <div
          className="terminal-home-windows marketing-dashboard-windows"
          aria-label="Dashboard windows"
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
                    <span className="terminal-home-window-summary">
                      {deskWindow.summary}
                    </span>
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

        <div className="marketing-dashboard-foot">
          <div className="marketing-dashboard-foot-copy">
            <p className="marketing-dashboard-foot-title">Open the live Dashboard</p>
            <p className="marketing-dashboard-foot-body">
              Sign in with Deriv, then use Load Bot, Speed Bot, Premium Bots, Free
              bots, and Analysis tool on your desk.
            </p>
          </div>
          <MarketingAuthButtons
            size="lg"
            className="marketing-dashboard-foot-auth"
          />
        </div>
      </div>

      {loadOpen ? (
        <div
          className="tc-modal-scrim tc-load-scrim"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tc-marketing-load-title"
          onClick={() => setLoadOpen(false)}
        >
          <div className="tc-modal" onClick={(event) => event.stopPropagation()}>
            <p className="tc-modal-title" id="tc-marketing-load-title">
              Load Bot
            </p>
            <p className="tc-modal-body">
              Choose a TradeCity strategy XML from your computer.
            </p>
            <label htmlFor="tc-marketing-xml" className="tc-load-source">
              <HardDrive style={{ width: 20, height: 20, color: "#0f766e" }} strokeWidth={1.75} />
              My computer
            </label>
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
    </section>
  );
}
