"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { HOME_LIVE_FEED } from "@/lib/marketing/home-content";
import { cn } from "@/lib/utils/cn";

const LIVE_FEED_SPARK_BARS = [28, 42, 35, 58, 44, 72, 48, 65, 52, 78, 61, 55, 68, 74];
const QUOTE_BASE = 5432.184;
const QUOTE_MIN = 5431.92;
const QUOTE_MAX = 5432.48;

type TickDirection = "up" | "down" | "flat";

function nextQuote(current: number): { value: number; direction: TickDirection } {
  const drift = (Math.random() - 0.48) * 0.028;
  const next = Math.min(QUOTE_MAX, Math.max(QUOTE_MIN, current + drift));
  const direction: TickDirection =
    next > current + 0.00005 ? "up" : next < current - 0.00005 ? "down" : "flat";
  return { value: next, direction };
}

function formatDelta(value: number, direction: TickDirection): string {
  const magnitude = Math.abs(value - QUOTE_BASE);
  const sign = direction === "down" ? "-" : "+";
  return `${sign}${magnitude.toFixed(3)}`;
}

function sparkHeightsFromQuote(quote: number, tickDirection: TickDirection): number[] {
  const energy = (quote - QUOTE_MIN) / (QUOTE_MAX - QUOTE_MIN);
  const bump = tickDirection === "up" ? 8 : tickDirection === "down" ? -6 : 0;
  return LIVE_FEED_SPARK_BARS.map((height, index) => {
    const mod = Math.sin(index * 0.55 + quote * 3) * 6;
    return Math.min(92, Math.max(18, height + bump + mod + energy * 10));
  });
}

export function MarketingLiveFeedPanel() {
  const quoteRef = useRef(QUOTE_BASE);
  const [quote, setQuote] = useState(QUOTE_BASE);
  const [tickDirection, setTickDirection] = useState<TickDirection>("flat");
  const [tickFlash, setTickFlash] = useState(false);
  const [sparkHeights, setSparkHeights] = useState<number[]>(() =>
    sparkHeightsFromQuote(QUOTE_BASE, "flat"),
  );

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    let flashTimer: ReturnType<typeof setTimeout> | undefined;

    const tickTimer = window.setInterval(() => {
      const { value, direction } = nextQuote(quoteRef.current);
      quoteRef.current = value;
      setQuote(value);
      setTickDirection(direction);
      setTickFlash(true);
      setSparkHeights(sparkHeightsFromQuote(value, direction));
      flashTimer = window.setTimeout(() => setTickFlash(false), 420);
    }, 1400 + Math.random() * 900);

    return () => {
      window.clearInterval(tickTimer);
      if (flashTimer) window.clearTimeout(flashTimer);
    };
  }, []);

  const quoteLabel = quote.toFixed(4);
  const deltaLabel = formatDelta(quote, tickDirection);

  return (
    <aside className="marketing-live-feed marketing-live-feed--compact" aria-label="Live feed preview">
      <div className="marketing-live-feed-shell">
        <header className="marketing-live-feed-head">
          <div className="marketing-live-feed-status">
            <span className="marketing-live-feed-beacon" />
            <span className="marketing-live-feed-status-label">Live</span>
          </div>
          <span className="marketing-live-feed-rail font-mono">
            {HOME_LIVE_FEED.connection}
          </span>
        </header>

        <div className="marketing-live-feed-ticker">
          <div className="marketing-live-feed-ticker-meta">
            <span className="marketing-live-feed-symbol font-mono">{HOME_LIVE_FEED.symbol}</span>
            <span className="marketing-live-feed-mode">Rise / Fall</span>
          </div>
          <p
            className={cn(
              "marketing-live-feed-quote font-mono tabular-nums",
              tickFlash && tickDirection === "up" && "marketing-live-feed-quote-tick-up",
              tickFlash && tickDirection === "down" && "marketing-live-feed-quote-tick-down",
            )}
          >
            {quoteLabel}
          </p>
          <div className="marketing-live-feed-sparkline" aria-hidden>
            {sparkHeights.map((height, index) => (
              <span
                key={index}
                className={cn(
                  "marketing-live-feed-spark-bar",
                  tickFlash && "marketing-live-feed-spark-bar-flash",
                )}
                style={
                  {
                    "--spark-h": `${height.toFixed(1)}%`,
                    "--spark-i": index,
                  } as CSSProperties
                }
              />
            ))}
          </div>
          <p
            className={cn(
              "marketing-live-feed-delta font-mono tabular-nums",
              tickDirection === "up" && "marketing-home-signal-value-positive",
              tickDirection === "down" && "marketing-live-feed-delta-down",
            )}
          >
            {deltaLabel}
          </p>
        </div>
      </div>
    </aside>
  );
}
