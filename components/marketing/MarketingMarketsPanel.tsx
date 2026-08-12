"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { ArrowRight } from "lucide-react";
import { HOME_MARKET_GROUPS, HOME_MARKETS } from "@/lib/marketing/home-content";
import type { PlatformNavId } from "@/lib/navigation/platform-nav";
import { cn } from "@/lib/utils/cn";

interface MarketingMarketsPanelProps {
  onNavigate?: (sectionId: string, id: PlatformNavId) => void;
  nested?: boolean;
}

type TickDirection = "up" | "down" | "flat";

interface QuoteConfig {
  base: number;
  min: number;
  max: number;
  decimals: number;
}

interface LaneQuoteState {
  quote: number;
  direction: TickDirection;
  flash: boolean;
  spark: number[];
}

const QUOTE_CONFIG: Record<string, QuoteConfig> = {
  R_10: { base: 5432.184, min: 5431.92, max: 5432.48, decimals: 3 },
  R_25: { base: 2184.552, min: 2184.28, max: 2184.84, decimals: 3 },
  R_75: { base: 1456.228, min: 1455.96, max: 1456.52, decimals: 3 },
  R_100: { base: 891.337, min: 891.12, max: 891.58, decimals: 3 },
  BOOM1000: { base: 6124.88, min: 6124.4, max: 6125.36, decimals: 2 },
  CRASH1000: { base: 4891.42, min: 4890.96, max: 4891.88, decimals: 2 },
};

const ROTATE_MS = 2800;
const PAUSE_AFTER_SELECT_MS = 12000;

function initialActiveIndexes() {
  return HOME_MARKET_GROUPS.map(() => 0);
}

function initialLaneQuotes(): LaneQuoteState[] {
  return HOME_MARKET_GROUPS.map((group) => {
    const symbol = group.symbols[0];
    const config = QUOTE_CONFIG[symbol];
    return {
      quote: config?.base ?? 1000,
      direction: "flat" as TickDirection,
      flash: false,
      spark: [...group.spark],
    };
  });
}

function nextQuote(current: number, config: QuoteConfig): { value: number; direction: TickDirection } {
  const span = config.max - config.min;
  const drift = (Math.random() - 0.48) * span * 0.018;
  const next = Math.min(config.max, Math.max(config.min, current + drift));
  const direction: TickDirection =
    next > current + span * 0.00002 ? "up" : next < current - span * 0.00002 ? "down" : "flat";
  return { value: next, direction };
}

function sparkFromTick(
  baseSpark: readonly number[],
  direction: TickDirection,
  energy: number,
): number[] {
  const bump = direction === "up" ? 7 : direction === "down" ? -5 : 0;
  return baseSpark.map((height, index) => {
    const mod = Math.sin(index * 0.62 + energy * 12) * 5;
    return Math.min(92, Math.max(16, height + bump + mod + energy * 8));
  });
}

function formatQuote(value: number, symbol: string): string {
  const decimals = QUOTE_CONFIG[symbol]?.decimals ?? 3;
  return value.toFixed(decimals);
}

function formatDelta(value: number, symbol: string, direction: TickDirection): string {
  const config = QUOTE_CONFIG[symbol];
  if (!config || direction === "flat") return "0.000";
  const magnitude = Math.abs(value - config.base);
  const sign = direction === "down" ? "-" : "+";
  return `${sign}${magnitude.toFixed(config.decimals)}`;
}

function symbolKey(laneIndex: number, symbol: string) {
  return `${laneIndex}:${symbol}`;
}

function scrollSymbolInRail(
  railEl: HTMLElement | undefined,
  symbolEl: HTMLElement | undefined,
) {
  if (!railEl || !symbolEl) return;

  const railRect = railEl.getBoundingClientRect();
  const symbolRect = symbolEl.getBoundingClientRect();
  const padding = 6;

  if (symbolRect.left < railRect.left + padding) {
    railEl.scrollLeft -= railRect.left - symbolRect.left + padding;
  } else if (symbolRect.right > railRect.right - padding) {
    railEl.scrollLeft += symbolRect.right - railRect.right + padding;
  }
}

export function MarketingMarketsPanel({ onNavigate, nested = false }: MarketingMarketsPanelProps) {
  const [activeIndexes, setActiveIndexes] = useState(initialActiveIndexes);
  const [laneQuotes, setLaneQuotes] = useState(initialLaneQuotes);
  const [flashLane, setFlashLane] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const pauseUntilRef = useRef(0);
  const symbolRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const railRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const flashTimersRef = useRef<Map<number, number>>(new Map());
  const activeIndexesRef = useRef(activeIndexes);

  useEffect(() => {
    activeIndexesRef.current = activeIndexes;
  }, [activeIndexes]);

  const syncLaneQuoteToSymbol = useCallback((laneIndex: number, symbol: string) => {
    const config = QUOTE_CONFIG[symbol];
    const group = HOME_MARKET_GROUPS[laneIndex];
    if (!config || !group) return;

    setLaneQuotes((prev) => {
      const next = [...prev];
      next[laneIndex] = {
        quote: config.base,
        direction: "flat",
        flash: false,
        spark: [...group.spark],
      };
      return next;
    });
  }, []);

  const setActiveSymbol = useCallback(
    (laneIndex: number, symbolIndex: number, scrollRail = false) => {
      const symbol = HOME_MARKET_GROUPS[laneIndex]?.symbols[symbolIndex];
      if (!symbol) return;

      setActiveIndexes((prev) => {
        const next = [...prev];
        next[laneIndex] = symbolIndex;
        return next;
      });
      syncLaneQuoteToSymbol(laneIndex, symbol);

      pauseUntilRef.current = Date.now() + PAUSE_AFTER_SELECT_MS;
      setIsPaused(true);
      window.setTimeout(() => {
        if (Date.now() >= pauseUntilRef.current) setIsPaused(false);
      }, PAUSE_AFTER_SELECT_MS);

      setFlashLane(laneIndex);
      window.setTimeout(() => setFlashLane(null), 380);

      if (scrollRail) {
        requestAnimationFrame(() => {
          scrollSymbolInRail(
            railRefs.current.get(laneIndex),
            symbolRefs.current.get(symbolKey(laneIndex, symbol)),
          );
        });
      }
    },
    [syncLaneQuoteToSymbol],
  );

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const timer = window.setInterval(() => {
      if (Date.now() < pauseUntilRef.current) return;

      setActiveIndexes((prev) => {
        const next = prev.map((active, laneIndex) => {
          const count = HOME_MARKET_GROUPS[laneIndex]?.symbols.length ?? 1;
          return (active + 1) % count;
        });

        next.forEach((symbolIndex, laneIndex) => {
          const symbol = HOME_MARKET_GROUPS[laneIndex]?.symbols[symbolIndex];
          if (symbol) syncLaneQuoteToSymbol(laneIndex, symbol);
        });

        requestAnimationFrame(() => {
          next.forEach((symbolIndex, laneIndex) => {
            const symbol = HOME_MARKET_GROUPS[laneIndex]?.symbols[symbolIndex];
            if (!symbol) return;
            scrollSymbolInRail(
              railRefs.current.get(laneIndex),
              symbolRefs.current.get(symbolKey(laneIndex, symbol)),
            );
          });
        });

        return next;
      });
    }, ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [syncLaneQuoteToSymbol]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const timer = window.setInterval(() => {
      setLaneQuotes((prev) =>
        prev.map((lane, laneIndex) => {
          const activeIndex = activeIndexesRef.current[laneIndex] ?? 0;
          const symbol =
            HOME_MARKET_GROUPS[laneIndex]?.symbols[activeIndex] ??
            HOME_MARKET_GROUPS[laneIndex]?.symbols[0];
          if (!symbol) return lane;

          const config = QUOTE_CONFIG[symbol];
          if (!config) return lane;

          const { value, direction } = nextQuote(lane.quote, config);
          const energy = (value - config.min) / (config.max - config.min);
          const group = HOME_MARKET_GROUPS[laneIndex];

          const existingFlashTimer = flashTimersRef.current.get(laneIndex);
          if (existingFlashTimer) window.clearTimeout(existingFlashTimer);
          flashTimersRef.current.set(
            laneIndex,
            window.setTimeout(() => {
              setLaneQuotes((current) => {
                const updated = [...current];
                if (updated[laneIndex]) updated[laneIndex] = { ...updated[laneIndex], flash: false };
                return updated;
              });
            }, 360),
          );

          return {
            quote: value,
            direction,
            flash: direction !== "flat",
            spark: sparkFromTick(group?.spark ?? lane.spark, direction, energy),
          };
        }),
      );
    }, 1400);

    return () => {
      window.clearInterval(timer);
      flashTimersRef.current.forEach((flashTimer) => window.clearTimeout(flashTimer));
      flashTimersRef.current.clear();
    };
  }, []);

  return (
    <div
      className={cn("marketing-markets", isPaused && "marketing-markets-paused", nested && "marketing-markets-nested")}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        if (Date.now() >= pauseUntilRef.current) setIsPaused(false);
      }}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          if (Date.now() >= pauseUntilRef.current) setIsPaused(false);
        }
      }}
    >
      <div className={cn("marketing-markets-shell", nested && "marketing-markets-shell-nested")}>
        <header className="marketing-markets-head">
          <div className="marketing-markets-head-copy">
            <p className="marketing-markets-kicker">
              <span className="marketing-markets-live-dot" aria-hidden />
              {HOME_MARKETS.kicker}
            </p>
            <p className="marketing-markets-lead">{HOME_MARKETS.lead}</p>
          </div>
          <div className="marketing-markets-meta-group font-mono">
            <span className="marketing-markets-meta" aria-label="Market status">
              <span className="marketing-markets-meta-item">{HOME_MARKETS.status}</span>
            </span>
          </div>
        </header>

        <div className="marketing-markets-lanes">
          {HOME_MARKET_GROUPS.map((marketGroup, laneIndex) => {
            const activeIndex = activeIndexes[laneIndex] ?? 0;
            const activeSymbol = marketGroup.symbols[activeIndex] ?? marketGroup.symbols[0];
            const laneQuote = laneQuotes[laneIndex];

            return (
              <article
                key={marketGroup.label}
                className={cn(
                  "marketing-markets-lane",
                  flashLane === laneIndex && "marketing-markets-lane-flash",
                )}
                style={{ "--lane-i": laneIndex } as CSSProperties}
              >
                <div className="marketing-markets-lane-head">
                  <span className="marketing-markets-lane-index font-mono">
                    {String(laneIndex + 1).padStart(2, "0")}
                  </span>
                  <div className="marketing-markets-lane-copy">
                    <span className="marketing-markets-label">{marketGroup.label}</span>
                    <span className="marketing-markets-desc">{marketGroup.description}</span>
                  </div>
                  <span className="marketing-markets-count font-mono">
                    {marketGroup.symbols.length}
                  </span>
                </div>

                <div className="marketing-markets-tape">
                  <div
                    className="marketing-markets-rail"
                    role="list"
                    aria-label={marketGroup.label}
                    ref={(node) => {
                      if (node) railRefs.current.set(laneIndex, node);
                      else railRefs.current.delete(laneIndex);
                    }}
                  >
                    {marketGroup.symbols.map((symbol, symbolIndex) => (
                      <button
                        key={symbol}
                        ref={(node) => {
                          const key = symbolKey(laneIndex, symbol);
                          if (node) symbolRefs.current.set(key, node);
                          else symbolRefs.current.delete(key);
                        }}
                        type="button"
                        role="listitem"
                        className={cn(
                          "marketing-markets-symbol font-mono",
                          symbolIndex === activeIndex && "marketing-markets-symbol-active",
                        )}
                        aria-pressed={symbolIndex === activeIndex}
                        onClick={() => setActiveSymbol(laneIndex, symbolIndex, true)}
                      >
                        {symbol}
                      </button>
                    ))}
                  </div>

                  <div className="marketing-markets-sparkline" aria-hidden>
                    {(laneQuote?.spark ?? marketGroup.spark).map((height, barIndex) => (
                      <span
                        key={barIndex}
                        className="marketing-markets-spark-bar"
                        style={
                          {
                            "--spark-h": `${height}%`,
                            "--spark-i": barIndex,
                          } as CSSProperties
                        }
                      />
                    ))}
                  </div>
                </div>

                <footer className="marketing-markets-lane-foot">
                  <div className="marketing-markets-quote font-mono">
                    <span className="marketing-markets-quote-symbol">{activeSymbol}</span>
                    <span
                      className={cn(
                        "marketing-markets-quote-value tabular-nums",
                        laneQuote?.flash &&
                          laneQuote.direction === "up" &&
                          "marketing-markets-quote-value-tick-up",
                        laneQuote?.flash &&
                          laneQuote.direction === "down" &&
                          "marketing-markets-quote-value-tick-down",
                      )}
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      {formatQuote(laneQuote?.quote ?? QUOTE_CONFIG[activeSymbol]?.base ?? 1000, activeSymbol)}
                    </span>
                    <span
                      className={cn(
                        "marketing-markets-quote-delta tabular-nums",
                        laneQuote?.direction === "up" && "marketing-markets-quote-delta-up",
                        laneQuote?.direction === "down" && "marketing-markets-quote-delta-down",
                      )}
                    >
                      {formatDelta(
                        laneQuote?.quote ?? QUOTE_CONFIG[activeSymbol]?.base ?? 1000,
                        activeSymbol,
                        laneQuote?.direction ?? "flat",
                      )}
                    </span>
                    <span className="marketing-markets-quote-meta">
                      {marketGroup.ticksPerMin} ticks/min
                    </span>
                  </div>
                  {onNavigate ? (
                    <button
                      type="button"
                      className="marketing-markets-trade-link interactive"
                      onClick={() => onNavigate("trade", "trade")}
                    >
                      Trade
                      <ArrowRight className="h-3 w-3" strokeWidth={2} />
                    </button>
                  ) : null}
                </footer>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
