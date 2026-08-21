"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SmartChartPanel } from "@/components/trading/SmartChartPanel";
import type { SmartChartFeedSource } from "@/hooks/useSmartChartFeed";
import { loadChartProps, saveChartProps } from "@/lib/chart/smartchart-store";
import type { ActiveSymbol, TradingTimesMap } from "@deriv-com/smartcharts-champion";
import type { TickEvent } from "@/lib/ws/protocol";
import { isSyntheticChartSymbol } from "@/lib/chart/synthetic-symbols";

interface SmartChartDeskProps extends SmartChartFeedSource {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
  isConnected?: boolean;
  onSubscribeTicks?: (symbol: string) => void;
  activeSymbols?: ActiveSymbol[];
  tradingTimes?: TradingTimesMap;
  onRequestChartReference?: () => void;
  liveTicks?: TickEvent[];
  showLastDigitStats?: boolean;
}

/** Full-page Charts tab — mirrors bot.deriv.com/#chart. */
export function SmartChartDesk({
  symbol,
  onSymbolChange,
  isConnected = false,
  onSubscribeTicks,
  fetchChartQuotes,
  subscribeChartStream,
  activeSymbols,
  tradingTimes,
  onRequestChartReference,
  liveTicks,
  showLastDigitStats,
  demoTicks,
}: SmartChartDeskProps) {
  const [granularity, setGranularity] = useState(() => loadChartProps().granularity ?? 0);
  const [chartType, setChartType] = useState(() => loadChartProps().chart_type ?? "line");
  const requestedReferenceRef = useRef(false);

  useEffect(() => {
    onSubscribeTicks?.(symbol);
  }, [onSubscribeTicks, symbol]);

  useEffect(() => {
    if (requestedReferenceRef.current) return;
    if (activeSymbols?.length) {
      requestedReferenceRef.current = true;
      return;
    }
    requestedReferenceRef.current = true;
    onRequestChartReference?.();
  }, [activeSymbols, onRequestChartReference]);

  const persist = useCallback(
    (next: { symbol?: string; granularity?: number; chart_type?: string }) => {
      saveChartProps({
        symbol: next.symbol ?? symbol,
        granularity: next.granularity ?? granularity,
        chart_type: next.chart_type ?? chartType,
      });
    },
    [chartType, granularity, symbol],
  );

  const handleSymbolChange = useCallback(
    (next: string) => {
      onSymbolChange(next);
      persist({ symbol: next });
    },
    [onSymbolChange, persist],
  );

  const handleGranularityChange = useCallback(
    (next: number) => {
      setGranularity(next);
      persist({ granularity: next });
    },
    [persist],
  );

  const handleChartTypeChange = useCallback(
    (next: string) => {
      setChartType(next);
      persist({ chart_type: next });
    },
    [persist],
  );

  return (
    <section className="smartchart-desk" data-testid="chart-desk" aria-label="Charts">
      <SmartChartPanel
        symbol={symbol}
        granularity={granularity}
        chartType={chartType}
        isConnected={isConnected}
        showLastDigitStats={showLastDigitStats ?? isSyntheticChartSymbol(symbol)}
        activeSymbols={activeSymbols}
        tradingTimes={tradingTimes}
        onSymbolChange={handleSymbolChange}
        onGranularityChange={handleGranularityChange}
        onChartTypeChange={handleChartTypeChange}
        fetchChartQuotes={fetchChartQuotes}
        subscribeChartStream={subscribeChartStream}
        liveTicks={liveTicks}
        demoTicks={demoTicks}
      />
    </section>
  );
}
