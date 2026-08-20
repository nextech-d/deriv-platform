"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  BUILDER_TRADE_TYPES,
  aiGeneratorToSnapshot,
  builderMarketOptions,
  type BuilderTradeType,
} from "@/lib/terminal/strategy-seed";
import type { BotBuilderSnapshot } from "@/lib/terminal/strategy-seed";

interface AiBotDeskProps {
  onSendToBuilder: (brief: string, snapshot: BotBuilderSnapshot) => void;
}

const TRADE_TYPES: BuilderTradeType[] = [
  "Even/Odd",
  "Over/Under",
  "Matches",
  "Rise/Fall",
];

const PRESETS = [
  {
    id: "eo-mart",
    label: "Even/Odd · Martingale",
    tradeType: "Even/Odd" as BuilderTradeType,
    purchase: "Even",
    martingale: true,
  },
  {
    id: "ou-2",
    label: "Over 2",
    tradeType: "Over/Under" as BuilderTradeType,
    purchase: "Over",
    barrier: 2,
    martingale: false,
  },
  {
    id: "match-5",
    label: "Matches 5",
    tradeType: "Matches" as BuilderTradeType,
    purchase: "Matches",
    digitTarget: 5,
    martingale: false,
  },
];

const field: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--dg-border)",
  borderRadius: 6,
  fontSize: 14,
  background: "var(--dg-input-bg)",
  color: "var(--dg-text)",
};

const label: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--dg-muted)",
  marginBottom: 6,
};

export function AiBotDesk({ onSendToBuilder }: AiBotDeskProps) {
  const markets = useMemo(() => builderMarketOptions(), []);
  const [symbol, setSymbol] = useState("1HZ100V");
  const [tradeType, setTradeType] = useState<BuilderTradeType>("Even/Odd");
  const [purchase, setPurchase] = useState("Even");
  const [duration, setDuration] = useState("1");
  const [stake, setStake] = useState("0.60");
  const [barrier, setBarrier] = useState(4);
  const [digitTarget, setDigitTarget] = useState(5);
  const [martingale, setMartingale] = useState(true);
  const [brief, setBrief] = useState("");

  const meta = BUILDER_TRADE_TYPES[tradeType];
  const purchaseOptions = [meta.primaryLabel, meta.secondaryLabel];

  function applyPreset(id: string) {
    const preset = PRESETS.find((item) => item.id === id);
    if (!preset) return;
    setTradeType(preset.tradeType);
    setPurchase(preset.purchase);
    setMartingale(preset.martingale);
    if (preset.barrier != null) setBarrier(preset.barrier);
    if (preset.digitTarget != null) setDigitTarget(preset.digitTarget);
  }

  function generate() {
    const snapshot = aiGeneratorToSnapshot({
      symbol,
      tradeType,
      purchase,
      duration,
      stake,
      barrier,
      digitTarget,
      martingale,
      brief,
    });
    const summary =
      brief.trim() ||
      `${tradeType} ${purchase} on ${snapshot.market}, ${duration} tick, stake ${stake}${martingale ? ", martingale" : ""}.`;
    onSendToBuilder(summary, snapshot);
  }

  return (
    <div style={{ padding: "28px 32px 40px", maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Sparkles style={{ width: 18, height: 18, color: "#dc3545" }} />
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "var(--dg-text)" }}>AI Bot Generator</h1>
      </div>
      <p style={{ margin: "0 0 18px", fontSize: 14, color: "var(--dg-muted)", lineHeight: 1.55 }}>
        Pick market, contract, and stake. tradecity.trade fills Bot Builder trade parameters so you
        can drop blocks and hit Run.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => applyPreset(preset.id)}
            style={{
              padding: "6px 12px",
              border: "1px solid var(--dg-border)",
              borderRadius: 999,
              background: "var(--dg-surface)",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              color: "var(--dg-text)",
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={label}>Market</label>
          <select value={symbol} onChange={(event) => setSymbol(event.target.value)} style={field}>
            {markets.map((market) => (
              <option key={market.symbol} value={market.symbol}>
                {market.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={label}>Trade type</label>
          <select
            value={tradeType}
            onChange={(event) => {
              const next = event.target.value as BuilderTradeType;
              setTradeType(next);
              setPurchase(BUILDER_TRADE_TYPES[next].primaryLabel);
            }}
            style={field}
          >
            {TRADE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={label}>Purchase</label>
          <select value={purchase} onChange={(event) => setPurchase(event.target.value)} style={field}>
            {purchaseOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={label}>Duration (ticks)</label>
          <input
            type="number"
            min={1}
            max={10}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            style={field}
          />
        </div>
        <div>
          <label style={label}>Stake</label>
          <input
            type="number"
            min={0.35}
            step={0.01}
            value={stake}
            onChange={(event) => setStake(event.target.value)}
            style={field}
          />
        </div>
        {meta.needsDigit ? (
          <div>
            <label style={label}>{tradeType === "Over/Under" ? "Barrier digit" : "Digit prediction"}</label>
            <input
              type="number"
              min={0}
              max={9}
              value={tradeType === "Over/Under" ? barrier : digitTarget}
              onChange={(event) => {
                const value = Math.min(9, Math.max(0, Number(event.target.value) || 0));
                if (tradeType === "Over/Under") setBarrier(value);
                else setDigitTarget(value);
              }}
              style={field}
            />
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#333" }}>
              <input
                type="checkbox"
                checked={martingale}
                onChange={(event) => setMartingale(event.target.checked)}
              />
              Martingale after losses
            </label>
          </div>
        )}
      </div>

      {meta.needsDigit ? (
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#333", marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={martingale}
            onChange={(event) => setMartingale(event.target.checked)}
          />
          Martingale after losses
        </label>
      ) : null}

      <label style={label}>Optional brief</label>
      <textarea
        value={brief}
        onChange={(event) => setBrief(event.target.value)}
        rows={3}
        placeholder="Even/Odd on Volatility 100 (1s), 1 tick, stake 0.60, martingale after 3 losses."
        style={{ ...field, resize: "vertical", marginBottom: 16 }}
      />
      <button
        type="button"
        onClick={generate}
        style={{
          padding: "10px 20px",
          border: "none",
          borderRadius: 4,
          background: "#dc3545",
          color: "#fff",
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        Generate bot
      </button>
    </div>
  );
}
