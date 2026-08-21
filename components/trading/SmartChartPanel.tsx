"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import "@deriv-com/smartcharts-champion/dist/smartcharts.css";
import type { ActiveSymbol, TGranularity, TradingTimesMap } from "@deriv-com/smartcharts-champion";
import { useSmartChartFeed, type SmartChartFeedSource } from "@/hooks/useSmartChartFeed";
import { getMarketsOrder } from "@/lib/chart/smartchart-store";
import { smartchartsActiveSymbols } from "@/lib/chart/smartcharts-symbols";
import { SmartChartTitle, SmartChartToolbar } from "@/components/trading/SmartChartToolbar";
import { cn } from "@/lib/utils/cn";

/** SmartCharts chart type ids (Flutter enum) — not the same as our ChartDesk names. */
export function normalizeSmartChartType(type: string): string {
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
  () => import("@deriv-com/smartcharts-champion").then((module) => module.SmartChart),
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
  isConnected = false,
  isModal = false,
  showLastDigitStats = false,
  activeSymbols,
  tradingTimes,
  onSymbolChange,
  onGranularityChange,
  onChartTypeChange,
  fetchChartQuotes,
  subscribeChartStream,
  demoTicks,
}: SmartChartPanelProps) {
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;
  const theme = useDocumentTheme();
  const onSymbolChangeRef = useRef(onSymbolChange);
  const onGranularityChangeRef = useRef(onGranularityChange);
  const onChartTypeChangeRef = useRef(onChartTypeChange);
  onSymbolChangeRef.current = onSymbolChange;
  onGranularityChangeRef.current = onGranularityChange;
  onChartTypeChangeRef.current = onChartTypeChange;

  const feed = useSmartChartFeed({
    fetchChartQuotes,
    subscribeChartStream,
    demoTicks,
  });

  const chartData = useMemo(
    () => ({
      activeSymbols: activeSymbols?.length ? activeSymbols : smartchartsActiveSymbols(),
      tradingTimes: tradingTimes ?? {},
    }),
    [activeSymbols, tradingTimes],
  );

  const settings = useMemo(
    () => ({
      assetInformation: false,
      countdown: true,
      isHighestLowestMarkerEnabled: false,
      language: "en",
      position: isDesktop ? "bottom" : "left",
      theme,
    }),
    [isDesktop, theme],
  );

  useEffect(() => {
    void import("@deriv-com/smartcharts-champion").then((module) => {
      module.setSmartChartsPublicPath("/smartcharts/");
    });
  }, []);

  if (!symbol) return null;

  return (
    <div
      className={cn(
        "dashboard__chart-wrapper smartchart-panel",
        isModal && isDesktop && "dashboard__chart-wrapper--modal",
      )}
      dir="ltr"
    >
      <div id="smartcharts_modal" className="ciq-modal" />
      <SmartChart
        id="dbot"
        symbol={symbol}
        granularity={granularity as TGranularity}
        chartType={normalizeSmartChartType(chartType)}
        getQuotes={feed.getQuotes}
        subscribeQuotes={feed.subscribeQuotes}
        unsubscribeQuotes={feed.unsubscribeQuotes}
        chartData={chartData}
        feedCall={{ activeSymbols: false, tradingTimes: false }}
        isConnectionOpened={isConnected}
        settings={settings}
        barriers={[]}
        showLastDigitStats={showLastDigitStats}
        chartControlsWidgets={null}
        enabledChartFooter={false}
        isMobile={isMobile}
        enabledNavigationWidget={isDesktop}
        isLive
        leftMargin={80}
        getMarketsOrder={getMarketsOrder}
        topWidgets={() => (
          <SmartChartTitle onChange={(next) => onSymbolChangeRef.current?.(next)} />
        )}
        toolbarWidget={() => (
          <SmartChartToolbar
            updateChartType={(next) => onChartTypeChangeRef.current?.(next)}
            updateGranularity={(next) => onGranularityChangeRef.current?.(next)}
            position={!isDesktop ? "bottom" : "top"}
            isDesktop={isDesktop}
          />
        )}
        stateChangeListener={(state, option) => {
          if (!option || typeof option !== "object") return;
          if (state === "SYMBOL_CHANGE" && "symbol" in option) {
            const next = (option as { symbol?: string }).symbol;
            if (next) onSymbolChangeRef.current?.(next);
          }
          if (state === "CHART_INTERVAL_CHANGE" && "granularity" in option) {
            const next = Number((option as { granularity?: number }).granularity);
            if (Number.isFinite(next)) onGranularityChangeRef.current?.(next);
          }
          if (state === "CHART_TYPE_CHANGE" && "chartType" in option) {
            const next = (option as { chartType?: string }).chartType;
            if (next) onChartTypeChangeRef.current?.(next);
          }
        }}
      />
    </div>
  );
}
