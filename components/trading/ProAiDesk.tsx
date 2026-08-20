"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Brain, Lock, Play, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  analyzeBarrier,
  analyzeParity,
  digitsFromQuotes,
} from "@/lib/terminal/analysis-tool";
import {
  PRO_AI_PACKS,
  proAiPackToSnapshot,
  type ProAiPack,
} from "@/lib/terminal/pro-ai";
import type { BotBuilderSnapshot } from "@/lib/terminal/strategy-seed";
import type { AppView } from "@/lib/navigation/platform-nav";
import { cn } from "@/lib/utils/cn";

interface ProAiDeskProps {
  onNavigate: (view: AppView) => void;
  quotes?: Array<{ quote: number }>;
  symbol?: string;
  onApplyAssist?: (snapshot: BotBuilderSnapshot) => void;
  onRunPack?: (snapshot: BotBuilderSnapshot) => void;
}

export function ProAiDesk({
  onNavigate,
  quotes = [],
  symbol = "R_100",
  onApplyAssist,
  onRunPack,
}: ProAiDeskProps) {
  const [selectedId, setSelectedId] = useState(PRO_AI_PACKS[0]?.id ?? "");
  const selected = PRO_AI_PACKS.find((p) => p.id === selectedId) ?? PRO_AI_PACKS[0];

  const scan = useMemo(() => {
    const digits = digitsFromQuotes(quotes, 20);
    if (digits.length < 8) {
      return {
        ready: false,
        title: "Waiting for ticks",
        body: "Connect the feed — Pro AI scans Even/Odd and Over/Under bias from the live window.",
        side: null as "CALL" | "PUT" | null,
        lane: "—",
        strength: 0,
        snapshot: null as BotBuilderSnapshot | null,
      };
    }
    const parity = analyzeParity(digits);
    const barrier = analyzeBarrier(digits, 4);
    const parityEdge = Math.abs(parity.evenPct - 50);
    const barrierEdge = Math.abs(barrier.overPct - 50);

    if (parityEdge >= barrierEdge) {
      const even = parity.evenPct >= parity.oddPct;
      const pack = PRO_AI_PACKS.find((p) => p.id === "matrix-ai") ?? PRO_AI_PACKS[0]!;
      const snapshot = proAiPackToSnapshot({
        ...pack,
        botStrategy: "parity_bias",
      });
      snapshot.purchase = even ? "Even" : "Odd";
      snapshot.symbol = symbol;
      snapshot.sourceLabel = `Pro AI scan · ${even ? "Even" : "Odd"}`;
      return {
        ready: true,
        title: even ? "Scan · Even bias" : "Scan · Odd bias",
        body: `Last ${parity.window} · Even ${parity.evenPct.toFixed(1)}% / Odd ${parity.oddPct.toFixed(1)}% on ${symbol}.`,
        side: (even ? "CALL" : "PUT") as "CALL" | "PUT",
        lane: even ? "Even" : "Odd",
        strength: Math.min(99, Math.round(50 + parityEdge)),
        snapshot,
      };
    }

    const over = barrier.overPct >= barrier.underPct;
    const pack = PRO_AI_PACKS.find((p) => p.id === "barrier-edge-ai") ?? PRO_AI_PACKS[0]!;
    const snapshot = proAiPackToSnapshot({
      ...pack,
      botStrategy: "barrier_edge",
      barrier: 4,
    });
    snapshot.purchase = over ? "Over" : "Under";
    snapshot.symbol = symbol;
    snapshot.sourceLabel = `Pro AI scan · ${over ? "Over" : "Under"} 4`;
    return {
      ready: true,
      title: over ? "Scan · Over 4" : "Scan · Under 4",
      body: `Over ${barrier.overPct.toFixed(1)}% · Under ${barrier.underPct.toFixed(1)}% on ${symbol}.`,
      side: (over ? "CALL" : "PUT") as "CALL" | "PUT",
      lane: over ? "Over 4" : "Under 4",
      strength: Math.min(99, Math.round(50 + barrierEdge)),
      snapshot,
    };
  }, [quotes, symbol]);

  function loadPack(pack: ProAiPack) {
    onApplyAssist?.(proAiPackToSnapshot(pack));
  }

  function runPack(pack: ProAiPack) {
    const snapshot = proAiPackToSnapshot(pack);
    if (onRunPack) onRunPack(snapshot);
    else onApplyAssist?.(snapshot);
  }

  return (
    <div className="pro-ai-desk view-in" data-testid="pro-ai-desk">
      <header className="pro-ai-head">
        <div>
          <p className="pro-ai-kicker">
            <Brain className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            Pro AI
          </p>
          <h2 className="pro-ai-title">Premium AI packs + live scan</h2>
          <p className="pro-ai-lead">
            Same job as Binarytool’s Pro AI desk — locked AI lanes, a live digit scan, and
            handoff into Bot builder or Trading bot.
          </p>
        </div>
      </header>

      <section className="pro-ai-signal" aria-label="Live AI scan">
        <div className="pro-ai-signal-top">
          <Radar className="h-4 w-4 text-accent" strokeWidth={2} aria-hidden />
          <div>
            <p className="pro-ai-signal-title">{scan.title}</p>
            <p className="pro-ai-signal-body">{scan.body}</p>
          </div>
          {scan.ready ? (
            <div className="pro-ai-signal-strength font-mono">
              <span>Strength</span>
              <strong>{scan.strength}%</strong>
            </div>
          ) : null}
        </div>
        {scan.ready ? (
          <div className="pro-ai-signal-meta font-mono">
            <span>Lane · {scan.lane}</span>
            <span>Market · {symbol}</span>
            <span>Valid · live window</span>
          </div>
        ) : null}
        <div className="pro-ai-signal-actions">
          {scan.snapshot && onApplyAssist ? (
            <Button
              size="sm"
              className="interactive gap-1.5"
              onClick={() => onApplyAssist(scan.snapshot!)}
            >
              Apply scan to Bot builder
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Button>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            className="interactive"
            onClick={() => onNavigate("analysis-tool")}
          >
            Open Analysis tool
          </Button>
        </div>
      </section>

      <div className="pro-ai-layout">
        <aside className="pro-ai-pack-list" aria-label="Pro AI packs">
          {PRO_AI_PACKS.map((pack) => (
            <button
              key={pack.id}
              type="button"
              className={cn(
                "pro-ai-pack-item interactive",
                selectedId === pack.id && "pro-ai-pack-item--active",
              )}
              onClick={() => setSelectedId(pack.id)}
            >
              <span className="pro-ai-pack-name">{pack.name}</span>
              {pack.locked ? (
                <Lock className="h-3.5 w-3.5 text-muted" strokeWidth={2} aria-hidden />
              ) : null}
            </button>
          ))}
        </aside>

        {selected ? (
          <article className="pro-ai-pack-detail">
            <div className="pro-ai-pack-detail-top">
              <h3>{selected.name}</h3>
              {selected.locked ? (
                <span className="pro-ai-lock-chip">
                  <Lock className="h-3 w-3" strokeWidth={2} aria-hidden />
                  Config locked
                </span>
              ) : null}
            </div>
            <p>{selected.tagline}</p>
            <dl className="pro-ai-pack-stats">
              <div>
                <dt>Lanes</dt>
                <dd>{selected.lanes.join(" · ")}</dd>
              </div>
              <div>
                <dt>Markets</dt>
                <dd className="font-mono">{selected.markets.join(" · ")}</dd>
              </div>
              <div>
                <dt>Stake / ticks</dt>
                <dd className="font-mono">
                  {selected.stake} / {selected.duration}
                </dd>
              </div>
            </dl>
            <p className="pro-ai-lock-note">
              Premium packs protect trade configuration — load to run on your feed; XML
              export stays disabled for locked packs.
            </p>
            <div className="pro-ai-pack-actions">
              <Button
                size="sm"
                className="interactive gap-1.5"
                onClick={() => loadPack(selected)}
                disabled={!onApplyAssist}
              >
                Load in Bot builder
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="interactive gap-1.5"
                onClick={() => runPack(selected)}
              >
                <Play className="h-3.5 w-3.5" strokeWidth={2} />
                Run on Trading bot
              </Button>
            </div>
          </article>
        ) : null}
      </div>
    </div>
  );
}
