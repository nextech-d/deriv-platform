"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import "@deriv-com/smartcharts-champion/dist/smartcharts.css";
import type { ActiveSymbol, TradingTimesMap } from "@deriv-com/smartcharts-champion";
import { useSmartChartFeed, type SmartChartFeedSource } from "@/hooks/useSmartChartFeed";
import { mergeChartReferenceData } from "@/lib/chart/active-symbols";
import { loadSmartCharts } from "@/lib/chart/smartcharts-loader";
import { cn } from "@/lib/utils/cn";

const SmartChartRuntime = dynamic(
  () =>
    loadSmartCharts().then(() => import("@/components/trading/SmartChartRuntime")).then((module) => {
      return module.SmartChartRuntime;
    }),
  {
    ssr: false,
    loading: () => <div className="smartchart-panel__loading">Loading chart…</div>,
  },
);

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return isMobile;
}

function useDocumentTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  useEffect(() => {
    const root = document.documentElement;
    const update = () => {
      setTheme(root.getAttribute("data-theme") === "light" ? "light" : "dark");
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

export interface SmartChartPanelProps extends SmartChartFeedSource {
  symbol: string;
  granularity: number;
  chartType: string;
  isConnected?: boolean;
  isModal?: boolean;
  showLastDigitStats?: boolean;
  activeSymbols?: ActiveSymbol[];
  tradingTimes?: TradingTimesMap;
  onSymbolChange?: (symbol: string) => void;
  onGranularityChange?: (granularity: number) => void;
  onChartTypeChange?: (chartType: string) => void;
}

export function SmartChartPanel({
  symbol,
  granularity,
  chartType,
  isModal = false,
  showLastDigitStats = false,
  activeSymbols,
  tradingTimes,
  onSymbolChange,
  onGranularityChange,
  onChartTypeChange,
  fetchChartQuotes,
  subscribeChartStream,
  liveTicks,
  demoTicks,
}: SmartChartPanelProps) {
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;
  const theme = useDocumentTheme();

  const feed = useSmartChartFeed({
    symbol,
    fetchChartQuotes,
    subscribeChartStream,
    liveTicks,
    demoTicks,
  });

  const chartData = useMemo(
    () => mergeChartReferenceData(activeSymbols, tradingTimes),
    [activeSymbols, tradingTimes],
  );

  useEffect(() => {
    void loadSmartCharts();
  }, []);

  if (!symbol) return null;

  return (
    <div
      className={cn(
        "dashboard__chart-wrapper smartchart-panel",
        isModal && isDesktop && "dashboard__chart-wrapper--modal",
        isMobile && "dashboard__chart-wrapper--mobile",
      )}
      dir="ltr"
    >
      <SmartChartRuntime
        symbol={symbol}
        granularity={granularity}
        chartType={chartType}
        isMobile={isMobile}
        isDesktop={isDesktop}
        theme={theme}
        showLastDigitStats={showLastDigitStats}
        chartData={chartData}
        getQuotes={feed.getQuotes}
        subscribeQuotes={feed.subscribeQuotes}
        unsubscribeQuotes={feed.unsubscribeQuotes}
        onSymbolChange={onSymbolChange}
        onGranularityChange={onGranularityChange}
        onChartTypeChange={onChartTypeChange}
      />
    </div>
  );
}
