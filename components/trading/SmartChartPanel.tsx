"use client";

import { useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import "@deriv-com/smartcharts-champion/dist/smartcharts.css";
import { useSmartChartFeed, type SmartChartFeedSource } from "@/hooks/useSmartChartFeed";
import { smartchartsActiveSymbols } from "@/lib/chart/smartcharts-symbols";

let publicPathReady = false;

/** SmartCharts chart type ids (Flutter enum) — not the same as our ChartDesk names. */
function normalizeSmartChartType(type: string): string {
  switch (type.toLowerCase()) {
    case "candle":
    case "candles":
      return "candles";
    case "mountain":
    case "area":
    case "line":
      return "line";
    case "ohlc":
    case "colored_bar":
      return "ohlc";
    case "hollow":
    case "hollow_candle":
      return "hollow";
    default:
      return type;
  }
}

const SmartChart = dynamic(
  () =>
    import("@deriv-com/smartcharts-champion").then((module) => {
      if (!publicPathReady && typeof window !== "undefined") {
        module.setSmartChartsPublicPath("/smartcharts/");
        publicPathReady = true;
      }
      return module.SmartChart;
    }),
  {
    ssr: false,
    loading: () => <div className="smartchart-panel__loading">Loading chart…</div>,
  },
);

interface SmartChartPanelProps extends SmartChartFeedSource {
  symbol: string;
  isConnected?: boolean;
  initialChartType?: string;
  onSymbolChange?: (symbol: string) => void;
}

export function SmartChartPanel({
  symbol,
  isConnected = false,
  initialChartType = "line",
  onSymbolChange,
  fetchChartQuotes,
  subscribeChartStream,
  demoTicks,
}: SmartChartPanelProps) {
  const onSymbolChangeRef = useRef(onSymbolChange);
  onSymbolChangeRef.current = onSymbolChange;

  const feed = useSmartChartFeed({
    fetchChartQuotes,
    subscribeChartStream,
    demoTicks,
  });

  const chartData = useMemo(
    () => ({
      activeSymbols: smartchartsActiveSymbols(),
      tradingTimes: {},
    }),
    [],
  );

  useEffect(() => {
    if (!publicPathReady && typeof window !== "undefined") {
      void import("@deriv-com/smartcharts-champion").then((module) => {
        module.setSmartChartsPublicPath("/smartcharts/");
        publicPathReady = true;
      });
    }
  }, []);

  return (
    <div className="smartchart-panel">
      <div id="smartcharts_modal" className="ciq-modal" />
      <SmartChart
        id="bot-builder-smartchart"
        symbol={symbol}
        chartType={normalizeSmartChartType(initialChartType)}
        getQuotes={feed.getQuotes}
        subscribeQuotes={feed.subscribeQuotes}
        unsubscribeQuotes={feed.unsubscribeQuotes}
        chartData={chartData}
        feedCall={{ activeSymbols: false, tradingTimes: false }}
        isConnectionOpened={isConnected}
        settings={{ theme: "light", language: "en" }}
        stateChangeListener={(state, option) => {
          if (state !== "SYMBOL_CHANGE" || !option || typeof option !== "object") return;
          const next = (option as { symbol?: string }).symbol;
          if (next) onSymbolChangeRef.current?.(next);
        }}
      />
    </div>
  );
}
