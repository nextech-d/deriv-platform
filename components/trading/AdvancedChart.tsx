"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useThemeContext } from "@/components/ThemeProvider";
import { segmentClassName } from "@/components/ui/input";
import { sma } from "@/lib/bot/indicators";
import {
  ticksToCandles,
  TIMEFRAME_LABELS,
  type ChartTimeframe,
} from "@/lib/chart/candles";
import { CHART_THEMES } from "@/lib/theme/chart-colors";
import { cn } from "@/lib/utils/cn";
import type { TickEvent } from "@/lib/ws/protocol";

type ChartMode = "line" | "candle";

interface AdvancedChartProps {
  ticks: TickEvent[];
  symbol?: string;
  height?: number;
  /** Lighter chrome when nested in workspace panels */
  embedded?: boolean;
}

const GRID_LINES = 4;
const PLOT_PAD_RIGHT = 40;

interface ChartHover {
  xPct: number;
  price: number;
}

export function AdvancedChart({
  ticks,
  symbol,
  height = 180,
  embedded = false,
}: AdvancedChartProps) {
  const { resolvedTheme } = useThemeContext();
  const theme = CHART_THEMES[resolvedTheme];

  const [mode, setMode] = useState<ChartMode>("candle");
  const [timeframe, setTimeframe] = useState<ChartTimeframe>(5);
  const [showMa, setShowMa] = useState(true);
  const [hover, setHover] = useState<ChartHover | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () =>
      symbol ? ticks.filter((t) => !t.symbol || t.symbol === symbol) : ticks,
    [ticks, symbol],
  );

  const candles = useMemo(
    () => ticksToCandles(filtered, timeframe),
    [filtered, timeframe],
  );

  const closes = useMemo(() => filtered.map((t) => t.quote), [filtered]);

  const linePath = useMemo(
    () => buildLinePath(filtered, height),
    [filtered, height],
  );

  const maPath = useMemo(() => {
    if (!showMa || closes.length < 20) return "";
    const maPoints: Array<{ x: number; y: number }> = [];
    for (let i = 19; i < closes.length; i++) {
      const slice = closes.slice(0, i + 1);
      const ma = sma(slice, 20);
      if (ma === null) continue;
      maPoints.push({
        x: (i / (closes.length - 1)) * 100,
        y: height - normalizeY(ma, closes, height),
      });
    }
    return maPoints
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
      .join(" ");
  }, [closes, showMa, height]);

  const trend =
    filtered.length >= 2
      ? filtered.at(-1)!.quote - filtered[0]!.quote
      : 0;

  const gridLines = useMemo(() => {
    const lines: number[] = [];
    for (let i = 1; i <= GRID_LINES; i++) {
      lines.push((height / (GRID_LINES + 1)) * i);
    }
    return lines;
  }, [height]);

  const lastPrice = filtered.at(-1)?.quote;
  const priceScale = useMemo(() => {
    if (filtered.length < 2) return null;
    const quotes =
      mode === "candle" && candles.length > 0
        ? candles.flatMap((c) => [c.high, c.low])
        : filtered.map((t) => t.quote);
    const min = Math.min(...quotes);
    const max = Math.max(...quotes);
    const mid = (min + max) / 2;
    return { min, mid, max };
  }, [filtered, candles, mode]);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const el = plotRef.current;
    if (!el || filtered.length < 2) return;

    const rect = el.getBoundingClientRect();
    const plotWidth = rect.width - PLOT_PAD_RIGHT;
    const x = event.clientX - rect.left;

    if (x < 0 || x > plotWidth) {
      setHover(null);
      return;
    }

    const ratio = x / plotWidth;
    let price: number;

    if (mode === "candle" && candles.length > 0) {
      const index = Math.min(
        candles.length - 1,
        Math.floor(ratio * candles.length),
      );
      price = candles[index]?.close ?? filtered.at(-1)!.quote;
    } else {
      const index = Math.round(ratio * (filtered.length - 1));
      price = filtered[index]?.quote ?? filtered.at(-1)!.quote;
    }

    setHover({ xPct: (x / rect.width) * 100, price });
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border-subtle bg-surface",
        !embedded && "shadow-control",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border-subtle px-2 py-1.5">
        {(["line", "candle"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(segmentClassName(mode === m), "interactive capitalize")}
          >
            {m}
          </button>
        ))}
        <span className="mx-0.5 h-3 w-px bg-border-subtle" aria-hidden />
        {(Object.keys(TIMEFRAME_LABELS) as unknown as ChartTimeframe[]).map(
          (tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              disabled={mode === "line"}
              className={cn(
                segmentClassName(mode === "candle" && timeframe === tf),
                "interactive font-mono disabled:opacity-35",
              )}
            >
              {TIMEFRAME_LABELS[tf]}
            </button>
          ),
        )}
        <label className="interactive ml-auto flex cursor-pointer items-center gap-1.5 text-[10px] text-muted">
          <input
            type="checkbox"
            checked={showMa}
            onChange={(e) => setShowMa(e.target.checked)}
            className="rounded border-border accent-accent"
          />
          MA
        </label>
      </div>

      {filtered.length < 2 ? (
        <div
          className="flex items-center justify-center text-xs text-muted"
          style={{ height }}
        >
          Waiting for tick data…
        </div>
      ) : (
        <div
          ref={plotRef}
          className="relative cursor-crosshair"
          style={{ height }}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHover(null)}
        >
          {mode === "line" ? (
            <svg
              viewBox={`0 0 100 ${height}`}
              preserveAspectRatio="none"
              className="w-full pr-10"
              style={{ height }}
            >
              {gridLines.map((y) => (
                <line
                  key={y}
                  x1={0}
                  x2={100}
                  y1={y}
                  y2={y}
                  stroke={theme.grid}
                  strokeWidth="0.5"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <path
                d={`${linePath} L100,${height} L0,${height} Z`}
                fill={trend >= 0 ? theme.upFill : theme.downFill}
              />
              {maPath ? (
                <path
                  d={maPath}
                  fill="none"
                  stroke={theme.ma}
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                  opacity={0.85}
                />
              ) : null}
              <path
                d={linePath}
                fill="none"
                stroke={trend >= 0 ? theme.up : theme.down}
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
              {lastPrice !== undefined && priceScale ? (
                <ChartPriceTag
                  y={height - normalizeY(lastPrice, closes, height)}
                  theme={theme}
                />
              ) : null}
            </svg>
          ) : (
            <CandleSvg
              candles={candles}
              height={height}
              showMa={showMa}
              theme={theme}
              gridLines={gridLines}
              className="pr-10"
            />
          )}
          {priceScale ? (
            <PriceScale labels={priceScale} theme={theme} />
          ) : null}
          {hover ? (
            <ChartHoverOverlay hover={hover} theme={theme} />
          ) : null}
        </div>
      )}

      <div className="absolute bottom-2 right-2 rounded-md border border-border-subtle bg-background/90 px-2 py-0.5 font-mono text-[10px] text-muted shadow-control backdrop-blur-sm">
        {mode === "candle"
          ? `${candles.length} candles · ${TIMEFRAME_LABELS[timeframe]}`
          : `${filtered.length} ticks`}
      </div>
    </div>
  );
}

function ChartHoverOverlay({
  hover,
  theme,
}: {
  hover: ChartHover;
  theme: (typeof CHART_THEMES)["dark"];
}) {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-y-0 w-px"
        style={{
          left: `${hover.xPct}%`,
          backgroundColor: theme.crosshair,
        }}
      />
      <div
        className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-md border border-border-subtle bg-background/95 px-1.5 py-0.5 font-mono text-[10px] tabular-nums shadow-control backdrop-blur-sm"
        style={{
          left: `${hover.xPct}%`,
          color: theme.label,
        }}
      >
        {hover.price.toFixed(4)}
      </div>
    </>
  );
}

function PriceScale({
  labels,
  theme,
}: {
  labels: { min: number; mid: number; max: number };
  theme: (typeof CHART_THEMES)["dark"];
}) {
  const fmt = (n: number) => n.toFixed(2);
  return (
    <div
      className="pointer-events-none absolute inset-y-0 right-0 flex w-10 flex-col justify-between py-2 pr-1.5 text-right font-mono text-[9px] tabular-nums"
      style={{ color: theme.label }}
    >
      <span>{fmt(labels.max)}</span>
      <span className="opacity-70">{fmt(labels.mid)}</span>
      <span>{fmt(labels.min)}</span>
    </div>
  );
}

function ChartPriceTag({
  y,
  theme,
}: {
  y: number;
  theme: (typeof CHART_THEMES)["dark"];
}) {
  return (
    <>
      <line
        x1={0}
        x2={100}
        y1={y}
        y2={y}
        stroke={theme.crosshair}
        strokeWidth="0.5"
        strokeDasharray="2 2"
        vectorEffect="non-scaling-stroke"
      />
    </>
  );
}

function CandleSvg({
  candles,
  height,
  showMa,
  theme,
  gridLines,
  className,
}: {
  candles: ReturnType<typeof ticksToCandles>;
  height: number;
  showMa: boolean;
  theme: (typeof CHART_THEMES)["dark"];
  gridLines: number[];
  className?: string;
}) {
  if (candles.length === 0) return null;

  const allQuotes = candles.flatMap((c) => [c.high, c.low]);
  const w = 100;
  const slot = w / candles.length;

  const maCloses = candles.map((c) => c.close);
  const maPath = showMa
    ? maCloses
        .map((_, i) => {
          if (i < 4) return null;
          const ma = sma(maCloses.slice(0, i + 1), 5);
          if (ma === null) return null;
          const x = i * slot + slot / 2;
          const y = height - normalizeY(ma, allQuotes, height);
          return { x, y };
        })
        .filter(Boolean)
        .map((p, i) => `${i === 0 ? "M" : "L"}${p!.x},${p!.y}`)
        .join(" ")
    : "";

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className={cn("w-full", className)}
      style={{ height }}
    >
      {gridLines.map((y) => (
        <line
          key={y}
          x1={0}
          x2={100}
          y1={y}
          y2={y}
          stroke={theme.grid}
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {maPath ? (
        <path
          d={maPath}
          fill="none"
          stroke={theme.ma}
          strokeWidth="0.8"
          vectorEffect="non-scaling-stroke"
          opacity={0.9}
        />
      ) : null}
      {candles.map((c, i) => {
        const x = i * slot + slot * 0.2;
        const bodyW = slot * 0.6;
        const bullish = c.close >= c.open;
        const color = bullish ? theme.up : theme.down;
        const yHigh = height - normalizeY(c.high, allQuotes, height);
        const yLow = height - normalizeY(c.low, allQuotes, height);
        const yOpen = height - normalizeY(c.open, allQuotes, height);
        const yClose = height - normalizeY(c.close, allQuotes, height);
        const bodyTop = Math.min(yOpen, yClose);
        const bodyH = Math.max(1, Math.abs(yClose - yOpen));

        return (
          <g key={c.startEpoch}>
            <line
              x1={x + bodyW / 2}
              x2={x + bodyW / 2}
              y1={yHigh}
              y2={yLow}
              stroke={color}
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
            />
            <rect
              x={x}
              y={bodyTop}
              width={bodyW}
              height={bodyH}
              fill={color}
              opacity={bullish ? 0.9 : 0.85}
              rx={0.2}
            />
          </g>
        );
      })}
    </svg>
  );
}

function normalizeY(value: number, quotes: number[], height: number): number {
  const min = Math.min(...quotes);
  const max = Math.max(...quotes);
  const range = max - min || 1;
  return ((value - min) / range) * (height - 8) + 4;
}

function buildLinePath(ticks: TickEvent[], height: number): string {
  if (ticks.length < 2) return "";
  const quotes = ticks.map((t) => t.quote);
  return ticks
    .map((tick, i) => {
      const x = (i / (ticks.length - 1)) * 100;
      const y = height - normalizeY(tick.quote, quotes, height);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

/** Hook for live price flash on tick updates */
export function useTickFlash(quote: number | null) {
  const prevRef = useRef<number | null>(null);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (quote === null) return;
    const prev = prevRef.current;
    if (prev !== null && quote !== prev) {
      setFlash(quote > prev ? "up" : "down");
      const timer = window.setTimeout(() => setFlash(null), 400);
      prevRef.current = quote;
      return () => window.clearTimeout(timer);
    }
    prevRef.current = quote;
  }, [quote]);

  return flash;
}
