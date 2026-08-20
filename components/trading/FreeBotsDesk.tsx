"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  FREE_BOT_STRATEGIES,
  type FreeBotCategory,
  type FreeBotStrategy,
} from "@/lib/terminal/free-bots";
import { readFreeBotsTier, writeFreeBotsTier, type FreeBotsTier } from "@/lib/terminal/desk-handoff";
import { cn } from "@/lib/utils/cn";

interface FreeBotsDeskProps {
  onLoadInBuilder: (strategy: FreeBotStrategy) => void;
  initialTier?: FreeBotsTier;
}

type Tier = "free" | "premium";
type Freshness = "all" | "new" | "normal";

const DIFFICULTY: Record<FreeBotStrategy["difficulty"], string> = {
  starter: "Starter",
  standard: "Standard",
  advanced: "Advanced",
};

export function FreeBotsDesk({
  onLoadInBuilder,
  initialTier = "free",
}: FreeBotsDeskProps) {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<Tier>(() => readFreeBotsTier() || initialTier);
  const [fresh, setFresh] = useState<Freshness>("all");

  const strategies = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FREE_BOT_STRATEGIES.filter((bot) => {
      const isPremium = bot.category === "premium";
      if (tier === "premium" && !isPremium) return false;
      if (tier === "free" && isPremium) return false;
      if (fresh === "new" && !bot.isNew) return false;
      if (fresh === "normal" && bot.isNew) return false;
      if (!q) return true;
      return (
        bot.name.toLowerCase().includes(q) ||
        bot.summary.toLowerCase().includes(q) ||
        bot.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [fresh, query, tier]);

  return (
    <div data-testid="free-bots-desk" data-desk className="free-bots" data-scroll-pane>
      <header className="free-bots-toolbar">
        <div className="free-bots-toolbar-tools">
          <div className="free-bots-segment">
            {(["free", "premium"] as const).map((id) => (
              <button
                key={id}
                type="button"
                className={cn("free-bots-seg", tier === id && "is-on")}
                onClick={() => {
                  setTier(id);
                  writeFreeBotsTier(id);
                }}
              >
                {id === "free" ? "Free" : "Premium"}
              </button>
            ))}
          </div>
          <span className="free-bots-split" aria-hidden />
          <div className="free-bots-segment">
            {(["all", "new", "normal"] as const).map((id) => (
              <button
                key={id}
                type="button"
                className={cn("free-bots-seg", fresh === id && "is-on")}
                onClick={() => setFresh(id)}
              >
                {id === "all" ? "All" : id === "new" ? "New" : "Normal"}
              </button>
            ))}
          </div>
        </div>
        <div className="free-bots-toolbar-status">
          <label className="free-bots-search">
            <Search strokeWidth={1.75} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search bots"
              aria-label="Search bots"
            />
          </label>
          <span className="free-bots-count">{strategies.length}</span>
        </div>
      </header>

      <h1 className="free-bots-heading">
        {tier === "free" ? "Free" : "Premium"} bots: {strategies.length}
      </h1>

      {strategies.length ? (
        <div className="free-bots-grid">
          {strategies.map((bot) => (
            <article key={bot.id} className="free-bots-card">
              <header className="free-bots-card-top">
                <h2>{bot.name}</h2>
                <div className="free-bots-card-marks">
                  {bot.isNew ? <span className="free-bots-new">New</span> : null}
                  <span className="free-bots-diff">{DIFFICULTY[bot.difficulty]}</span>
                </div>
              </header>
              <p className="free-bots-card-summary">{bot.summary}</p>
              <div className="free-bots-card-tags">
                {bot.markets.map((market) => (
                  <span key={market} className="free-bots-tag is-market">
                    {market}
                  </span>
                ))}
                {bot.tags.map((tag) => (
                  <span key={tag} className="free-bots-tag">
                    {tag}
                  </span>
                ))}
              </div>
              <button
                type="button"
                className="free-bots-load"
                onClick={() => onLoadInBuilder(bot)}
              >
                Load Bot
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="free-bots-empty">No bots match this filter.</p>
      )}
    </div>
  );
}

export type { FreeBotCategory };
