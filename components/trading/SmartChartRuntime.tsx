"use client";

import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import {
  ChartMode,
  ChartTitle,
  DrawTools,
  Share,
  SmartChart,
  StudyLegend,
  ToolbarWidget,
  Views,
} from "@deriv-com/smartcharts-champion";
import type { ActiveSymbol, TGranularity, TradingTimesMap } from "@deriv-com/smartcharts-champion";
import type { TGetQuotes, TSubscribeQuotes, TUnsubscribeQuotes } from "@deriv-com/smartcharts-champion";
import { getMarketsOrder } from "@/lib/chart/smartchart-store";
import { normalizeSmartChartType } from "@/lib/chart/normalize-smartchart-type";

export interface SmartChartRuntimeProps {
  symbol: string;
  granularity: number;
  chartType: string;
  isMobile: boolean;
  isDesktop: boolean;
  theme: "light" | "dark";
  showLastDigitStats?: boolean;
  chartData: {
    activeSymbols: ActiveSymbol[];
    tradingTimes: TradingTimesMap;
  };
  getQuotes: TGetQuotes;
  subscribeQuotes: TSubscribeQuotes;
  unsubscribeQuotes: TUnsubscribeQuotes;
  onSymbolChange?: (symbol: string) => void;
  onGranularityChange?: (granularity: number) => void;
  onChartTypeChange?: (chartType: string) => void;
}

const FEED_CALL = { activeSymbols: false, tradingTimes: false } as const;
const EMPTY_BARRIERS: never[] = [];

const marketsOrderCache = new Map<string, string[]>();

function getMarketsOrderCached(
  activeSymbols: Array<{ market: string; display_name: string; symbol?: string }>,
): string[] {
  const key = activeSymbols.map((item) => `${item.market}:${item.symbol ?? item.display_name}`).join("|");
  const cached = marketsOrderCache.get(key);
  if (cached) return cached;
  const order = getMarketsOrder(activeSymbols);
  marketsOrderCache.set(key, order);
  return order;
}

/** Loaded as one dynamic chunk so toolbar widgets share SmartChart context immediately. */
export const SmartChartRuntime = memo(function SmartChartRuntime({
  symbol,
  granularity,
  chartType,
  isMobile,
  isDesktop,
  theme,
  showLastDigitStats = false,
  chartData,
  getQuotes,
  subscribeQuotes,
  unsubscribeQuotes,
  onSymbolChange,
  onGranularityChange,
  onChartTypeChange,
}: SmartChartRuntimeProps) {
  const onSymbolChangeRef = useRef(onSymbolChange);
  const onGranularityChangeRef = useRef(onGranularityChange);
  const onChartTypeChangeRef = useRef(onChartTypeChange);

  useEffect(() => {
    onSymbolChangeRef.current = onSymbolChange;
  }, [onSymbolChange]);
  useEffect(() => {
    onGranularityChangeRef.current = onGranularityChange;
  }, [onGranularityChange]);
  useEffect(() => {
    onChartTypeChangeRef.current = onChartTypeChange;
  }, [onChartTypeChange]);

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

  const normalizedChartType = useMemo(() => normalizeSmartChartType(chartType), [chartType]);

  const topWidgets = useCallback(
    () => <ChartTitle onChange={(next) => onSymbolChangeRef.current?.(next)} />,
    [],
  );

  const toolbarWidget = useCallback(
    () => (
      <ToolbarWidget position={isDesktop ? "top" : "bottom"}>
        <ChartMode
          portalNodeId="modal_root"
          onChartType={(next) => onChartTypeChangeRef.current?.(next)}
          onGranularity={(next) => onGranularityChangeRef.current?.(next)}
        />
        {isDesktop ? (
          <>
            <StudyLegend portalNodeId="modal_root" searchInputClassName="data-hj-whitelist" />
            <Views
              portalNodeId="modal_root"
              onChartType={(next) => onChartTypeChangeRef.current?.(next)}
              onGranularity={(next) => onGranularityChangeRef.current?.(next)}
              searchInputClassName="data-hj-whitelist"
            />
            <DrawTools portalNodeId="modal_root" />
            <Share portalNodeId="modal_root" />
          </>
        ) : null}
      </ToolbarWidget>
    ),
    [isDesktop],
  );

  const stateChangeListener = useCallback((state: string, option: unknown) => {
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
  }, []);

  const getMarketsOrderStable = useCallback(
    (activeSymbols: Array<{ market: string; display_name: string; symbol?: string }>) =>
      getMarketsOrderCached(activeSymbols),
    [],
  );

  return (
    <>
      <div id="smartcharts_modal" className="ciq-modal" />
      <SmartChart
        id="dbot"
        symbol={symbol}
        granularity={granularity as TGranularity}
        chartType={normalizedChartType}
        getQuotes={getQuotes}
        subscribeQuotes={subscribeQuotes}
        unsubscribeQuotes={unsubscribeQuotes}
        chartData={chartData}
        feedCall={FEED_CALL}
        isConnectionOpened
        settings={settings}
        barriers={EMPTY_BARRIERS}
        showLastDigitStats={showLastDigitStats}
        chartControlsWidgets={null}
        enabledChartFooter={false}
        isMobile={isMobile}
        enabledNavigationWidget={isDesktop}
        isLive
        leftMargin={80}
        getMarketsOrder={getMarketsOrderStable}
        topWidgets={topWidgets}
        toolbarWidget={toolbarWidget}
        stateChangeListener={stateChangeListener}
      />
    </>
  );
});
