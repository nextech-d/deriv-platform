"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    onSubscribeTicks?.(symbol);
    onRequestChartReference?.();
  }, [onRequestChartReference, onSubscribeTicks, symbol]);

  function persist(next: { symbol?: string; granularity?: number; chart_type?: string }) {
    saveChartProps({
      symbol: next.symbol ?? symbol,
      granularity: next.granularity ?? granularity,
      chart_type: next.chart_type ?? chartType,
    });
  }

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
        onSymbolChange={(next) => {
          onSymbolChange(next);
          persist({ symbol: next });
        }}
        onGranularityChange={(next) => {
          setGranularity(next);
          persist({ granularity: next });
        }}
        onChartTypeChange={(next) => {
          setChartType(next);
          persist({ chart_type: next });
        }}
        fetchChartQuotes={fetchChartQuotes}
        subscribeChartStream={subscribeChartStream}
        liveTicks={liveTicks}
        demoTicks={demoTicks}
      />
    </section>
  );
}
