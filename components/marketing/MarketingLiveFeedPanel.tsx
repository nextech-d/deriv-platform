"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { HOME_DESK_SNAPSHOT, HOME_LIVE_FEED, type HomeSignalTone } from "@/lib/marketing/home-content";
import { cn } from "@/lib/utils/cn";

const LIVE_FEED_WAVE_BARS = 14;
const LIVE_FEED_SPARK_BARS = [28, 42, 35, 58, 44, 72, 48, 65, 52, 78, 61, 55, 68, 74, 50, 82, 58, 70];
const QUOTE_BASE = 5432.184;
const QUOTE_MIN = 5431.92;
const QUOTE_MAX = 5432.48;

type TickDirection = "up" | "down" | "flat";

function signalToneClass(tone: HomeSignalTone): string {
  if (tone === "positive") return "marketing-home-signal-value-positive";
  if (tone === "warn") return "marketing-home-signal-value-warn";
  return "";
}

function deskMetricsForFeed() {
  return HOME_DESK_SNAPSHOT.filter((signal) => signal.label !== "Market pulse");
}

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

function waveHeightsFromScroll(scrollEnergy: number, scrollY: number): number[] {
  return Array.from({ length: LIVE_FEED_WAVE_BARS }, (_, index) => {
    const base = 22 + scrollEnergy * 58;
    const wobble = Math.sin(index * 0.82 + scrollY * 0.006) * (10 + scrollEnergy * 26);
    return Math.min(100, Math.max(16, base + wobble));
  });
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
  const panelRef = useRef<HTMLElement>(null);
  const quoteRef = useRef(QUOTE_BASE);
  const [quote, setQuote] = useState(QUOTE_BASE);
  const [tickDirection, setTickDirection] = useState<TickDirection>("flat");
  const [tickFlash, setTickFlash] = useState(false);
  const [secondsSinceTick, setSecondsSinceTick] = useState(0);
  const [waveHeights, setWaveHeights] = useState<number[]>(() =>
    waveHeightsFromScroll(0.45, 0),
  );
  const [sparkHeights, setSparkHeights] = useState<number[]>(() =>
    sparkHeightsFromQuote(QUOTE_BASE, "flat"),
  );

  const syncScrollMotion = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const rect = panel.getBoundingClientRect();
    const viewHeight = window.innerHeight;
    const centerOffset = rect.top + rect.height * 0.42 - viewHeight * 0.5;
    const scrollEnergy = 1 - Math.min(1, Math.max(0, Math.abs(centerOffset) / (viewHeight * 0.55)));
    const scrollY = window.scrollY;

    panel.style.setProperty("--feed-scroll", scrollEnergy.toFixed(3));
    setWaveHeights(waveHeightsFromScroll(scrollEnergy, scrollY));
  }, []);

  useEffect(() => {
    syncScrollMotion();
    window.addEventListener("scroll", syncScrollMotion, { passive: true });
    window.addEventListener("resize", syncScrollMotion);
    return () => {
      window.removeEventListener("scroll", syncScrollMotion);
      window.removeEventListener("resize", syncScrollMotion);
    };
  }, [syncScrollMotion]);

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
      setSecondsSinceTick(0);
      setSparkHeights(sparkHeightsFromQuote(value, direction));

      flashTimer = window.setTimeout(() => setTickFlash(false), 420);
    }, 1400 + Math.random() * 900);

    return () => {
      window.clearInterval(tickTimer);
      if (flashTimer) window.clearTimeout(flashTimer);
    };
  }, []);

  useEffect(() => {
    const ageTimer = window.setInterval(() => {
      setSecondsSinceTick((seconds) => Math.min(seconds + 1, 59));
    }, 1000);
    return () => window.clearInterval(ageTimer);
  }, []);

  const quoteLabel = quote.toFixed(4);
  const deltaLabel = formatDelta(quote, tickDirection);
  const tickAgeLabel = secondsSinceTick === 0 ? "Just now" : `${secondsSinceTick}s ago`;

  return (
    <aside ref={panelRef} className="marketing-live-feed" aria-label="Live feed preview">
      <div className="marketing-live-feed-aura" aria-hidden />
      <div className="marketing-live-feed-border" aria-hidden />
      <div className="marketing-live-feed-shell">
        <div className="marketing-live-feed-grid-bg" aria-hidden />
        <div className="marketing-live-feed-corners" aria-hidden>
          <span />
          <span />
          <span />
          <span />
        </div>

        <header className="marketing-live-feed-head">
          <div className="marketing-live-feed-status">
            <span className="marketing-live-feed-beacon" />
            <span className="marketing-live-feed-status-label">Live feed</span>
          </div>
          <div className="marketing-live-feed-wave marketing-live-feed-wave-scroll" aria-hidden>
            {waveHeights.map((height, index) => (
              <span
                key={index}
                className="marketing-live-feed-wave-bar marketing-live-feed-wave-bar-scroll"
                style={
                  {
                    "--wave-i": index,
                    "--wave-h": `${height.toFixed(1)}%`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
          <span className="marketing-live-feed-latency font-mono tabular-nums">
            {HOME_LIVE_FEED.latencyMs}ms
          </span>
        </header>

        <div className="marketing-live-feed-rail font-mono">
          <span>{HOME_LIVE_FEED.channel}</span>
          <span className="marketing-live-feed-rail-sep">·</span>
          <span className="marketing-live-feed-rail-live">{HOME_LIVE_FEED.connection}</span>
          <span className="marketing-live-feed-rail-sep">·</span>
          <span>{HOME_LIVE_FEED.mode}</span>
        </div>

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
          <div className="marketing-live-feed-sparkline-wrap">
            <div className="marketing-live-feed-sparkline-glow" aria-hidden />
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
          </div>
          <div className="marketing-live-feed-ticker-foot">
            <p className="marketing-live-feed-delta font-mono tabular-nums">
              <span
                className={cn(
                  "marketing-live-feed-delta-value",
                  tickDirection === "up" && "marketing-home-signal-value-positive",
                  tickDirection === "down" && "marketing-live-feed-delta-down",
                )}
              >
                {deltaLabel}
              </span>
              <span className="marketing-live-feed-delta-sep">·</span>
              {HOME_LIVE_FEED.ticksPerMin} ticks/min
            </p>
            <span className="marketing-live-feed-tick-time font-mono">{tickAgeLabel}</span>
          </div>
        </div>

        <div className="marketing-live-feed-metrics">
          {deskMetricsForFeed().map((signal) => (
            <article
              key={signal.label}
              className={cn(
                "marketing-live-feed-metric",
                signal.tone === "positive" && "marketing-live-feed-metric-positive",
              )}
            >
              <p className="session-metric-label">{signal.label}</p>
              <p
                className={cn(
                  "marketing-live-feed-metric-value font-mono tabular-nums",
                  signalToneClass(signal.tone),
                )}
              >
                {signal.value}
              </p>
              {signal.hint ? (
                <p className="marketing-live-feed-metric-hint font-mono tabular-nums">
                  {signal.hint}
                </p>
              ) : null}
            </article>
          ))}
        </div>

        <footer className="marketing-live-feed-foot">
          <div className="marketing-live-feed-foot-main">
            <span className="marketing-live-feed-foot-label">Home · Demo desk</span>
            <span className="marketing-live-feed-foot-id font-mono">{HOME_LIVE_FEED.account}</span>
          </div>
          <span className="marketing-live-feed-risk font-mono">{HOME_LIVE_FEED.risk}</span>
        </footer>

        <div className="marketing-live-feed-scan" aria-hidden />
      </div>
    </aside>
  );
}
