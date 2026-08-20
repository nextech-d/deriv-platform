"use client";

import { useState } from "react";

type SidebarTab = "summary" | "transactions" | "journal";

interface RunSidebarProps {
  totalStake?: number;
  totalPayout?: number;
  runs?: number;
  contractsLost?: number;
  contractsWon?: number;
  totalPnl?: number;
  currency?: string;
  onRun?: () => void;
  onReset?: () => void;
  isRunning?: boolean;
}

export function RunSidebar({
  totalStake = 0,
  totalPayout = 0,
  runs = 0,
  contractsLost = 0,
  contractsWon = 0,
  totalPnl = 0,
  currency = "AUD",
  onRun,
  onReset,
  isRunning = false,
}: RunSidebarProps) {
  const [tab, setTab] = useState<SidebarTab>("summary");
  const [fast, setFast] = useState(true);

  const tabs: SidebarTab[] = ["summary", "transactions", "journal"];

  return (
    <aside style={{ width: 260, flexShrink: 0, borderLeft: "1px solid var(--dg-border)", background: "var(--dg-surface)", color: "var(--dg-text)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Run bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: "1px solid var(--dg-border)" }}>
        <button
          type="button"
          onClick={onRun}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", background: "#dc3545", color: "#fff", border: "none", borderRadius: 4, fontWeight: 600, fontSize: 14, cursor: "pointer" }}
        >
          ▶ Run
        </button>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
          <span style={{ color: "var(--dg-muted)" }}>Execution</span>
          <span style={{ fontWeight: 700, color: "var(--dg-text)" }}>FAST</span>
          <button
            type="button"
            onClick={() => setFast(!fast)}
            style={{ position: "relative", width: 36, height: 18, borderRadius: 12, border: "none", background: fast ? "#22c55e" : "#d1d5db", cursor: "pointer" }}
          >
            <span style={{ position: "absolute", top: 2, left: fast ? 18 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--dg-border)" }}>
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "10px 0", textAlign: "center", fontSize: 13, cursor: "pointer",
              color: tab === t ? "var(--dg-text)" : "var(--dg-muted)",
              background: "transparent", border: "none",
              borderBottom: tab === t ? "2px solid var(--dg-text)" : "2px solid transparent",
              fontWeight: tab === t ? 600 : 400,
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {tab === "summary" && (
          <>
            {runs === 0 && (
              <div style={{ textAlign: "center", color: "#6b7280", padding: "40px 16px", fontSize: 14, lineHeight: 1.7 }}>
                <p>When you&apos;re ready to trade, hit <strong style={{ color: "#333" }}>Run</strong>.</p>
                <p>You&apos;ll be able to track your bot&apos;s performance here.</p>
              </div>
            )}
            <div style={{ textAlign: "right", fontSize: 12, color: "#0e7c6b", marginBottom: 8, cursor: "pointer" }}>What&apos;s this?</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, fontSize: 13 }}>
              {[
                ["Total stake", `${totalStake.toFixed(2)} ${currency}`],
                ["Total payout", `${totalPayout.toFixed(2)} ${currency}`],
                ["No. of runs", String(runs)],
                ["Contracts lost", String(contractsLost)],
                ["Contracts won", String(contractsWon)],
                ["Total profit/loss", `${totalPnl.toFixed(2)} ${currency}`],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 11, color: "var(--dg-muted)", fontWeight: 600 }}>{label}</span>
                  <span style={{ color: "var(--dg-text)" }}>{value}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={onReset}
              disabled={runs === 0}
              style={{ width: "100%", marginTop: 16, padding: 8, border: "1px solid var(--dg-border)", borderRadius: 4, background: "var(--dg-surface)", color: "var(--dg-muted)", fontSize: 13, cursor: "pointer", opacity: runs === 0 ? 0.4 : 1 }}
            >
              Reset
            </button>
          </>
        )}
        {tab === "transactions" && (
          <div style={{ textAlign: "center", color: "var(--dg-muted)", padding: "40px 16px", fontSize: 14 }}>
            No transactions yet.
          </div>
        )}
        {tab === "journal" && (
          <div style={{ textAlign: "center", color: "var(--dg-muted)", padding: "40px 16px", fontSize: 14 }}>
            Journal entries will appear here.
          </div>
        )}
      </div>
    </aside>
  );
}
