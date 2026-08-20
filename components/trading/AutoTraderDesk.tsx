"use client";

import { useState } from "react";
import { Play, Sparkles } from "lucide-react";
import {
  AUTO_TRADER_CARDS,
  type AutoTraderCard,
} from "@/lib/terminal/auto-trader-cards";
import { cn } from "@/lib/utils/cn";

interface AutoTraderDeskProps {
  onLaunch: (card: AutoTraderCard) => void;
  embedded?: boolean;
}

export function AutoTraderDesk({ onLaunch, embedded = false }: AutoTraderDeskProps) {
  const [drafts, setDrafts] = useState<Record<string, AutoTraderCard["defaults"]>>(
    () =>
      Object.fromEntries(
        AUTO_TRADER_CARDS.map((card) => [card.id, { ...card.defaults }]),
      ),
  );

  function patch(cardId: string, key: string, value: number) {
    setDrafts((prev) => ({
      ...prev,
      [cardId]: { ...prev[cardId]!, [key]: value },
    }));
  }

  return (
    <div
      className={cn("auto-trader-desk", embedded && "auto-trader-desk--embedded")}
      data-testid="auto-trader-desk"
    >
      <header className="auto-trader-head">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Auto trader
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            Strategy cards
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Three ready packs — Parity Pulse, Over/Under Edge, Trend Match Fusion. Edit
            stake and duration, then launch into the Trading bot runner.
          </p>
        </div>
        <Sparkles className="h-5 w-5 text-accent" aria-hidden />
      </header>

      <div className="auto-trader-grid">
        {AUTO_TRADER_CARDS.map((card) => {
          const draft = drafts[card.id] ?? card.defaults;
          return (
            <article key={card.id} className="auto-trader-card">
              <div className="auto-trader-card-top">
                <span className="auto-trader-style">{card.style}</span>
                <span className="auto-trader-market">{card.marketHint}</span>
              </div>
              <h3>{card.name}</h3>
              <p>{card.tagline}</p>
              <dl className="auto-trader-stats">
                {card.stats.map((stat) => (
                  <div key={stat.label}>
                    <dt>{stat.label}</dt>
                    <dd>{stat.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="auto-trader-fields">
                {card.fields.map((field) => (
                  <label key={field.key} className="auto-trader-field">
                    <span>{field.label}</span>
                    <input
                      type="number"
                      min={field.min}
                      max={field.max}
                      step={field.step ?? 1}
                      value={draft[field.key] ?? field.min}
                      onChange={(event) =>
                        patch(card.id, field.key, Number(event.target.value) || 0)
                      }
                    />
                  </label>
                ))}
              </div>

              <button
                type="button"
                className="auto-trader-launch"
                onClick={() =>
                  onLaunch({
                    ...card,
                    defaults: { ...card.defaults, ...draft },
                  })
                }
              >
                <Play className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                Launch runner
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
