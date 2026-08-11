"use client";

import { useMemo } from "react";
import type { TickEvent } from "@/lib/ws/protocol";

interface TickChartProps {
  ticks: TickEvent[];
  symbol?: string;
  height?: number;
}

export function TickChart({ ticks, symbol, height = 140 }: TickChartProps) {
  const filtered = symbol
    ? ticks.filter((t) => !t.symbol || t.symbol === symbol)
    : ticks;

  const path = useMemo(() => {
    if (filtered.length < 2) return "";

    const quotes = filtered.map((t) => t.quote);
    const min = Math.min(...quotes);
    const max = Math.max(...quotes);
    const range = max - min || 1;
    const w = 100;
    const h = height;

    return filtered
      .map((tick, i) => {
        const x = (i / (filtered.length - 1)) * w;
        const y = h - ((tick.quote - min) / range) * (h - 8) - 4;
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  }, [filtered, height]);

  const latest = filtered.at(-1)?.quote;
  const first = filtered[0]?.quote;
  const trend =
    latest !== undefined && first !== undefined ? latest - first : 0;

  return (
    <div className="relative overflow-hidden rounded-lg bg-surface-elevated/80">
      {filtered.length < 2 ? (
        <div
          className="flex flex-col items-center justify-center gap-1 text-xs text-muted"
          style={{ height }}
        >
          <span>Waiting for tick data…</span>
          <span className="text-[10px] opacity-60">
            {ticks.length === 1 ? "1 tick received" : "Connect to stream prices"}
          </span>
        </div>
      ) : (
        <>
          <svg
            viewBox={`0 0 100 ${height}`}
            preserveAspectRatio="none"
            className="w-full"
            style={{ height }}
            aria-hidden
          >
            <defs>
              <linearGradient id="tick-fill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={trend >= 0 ? "#22c55e" : "#ef4444"}
                  stopOpacity="0.25"
                />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`${path} L100,${height} L0,${height} Z`}
              fill="url(#tick-fill)"
            />
            <path
              d={path}
              fill="none"
              stroke={trend >= 0 ? "#22c55e" : "#ef4444"}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="absolute bottom-2 right-2 rounded bg-background/80 px-2 py-0.5 font-mono text-[10px] text-muted">
            {filtered.length} ticks
          </div>
        </>
      )}
    </div>
  );
}
