"use client";

import { useRef } from "react";
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

/** Loaded as one dynamic chunk so toolbar widgets share SmartChart context immediately. */
export function SmartChartRuntime({
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
  onSymbolChangeRef.current = onSymbolChange;
  onGranularityChangeRef.current = onGranularityChange;
  onChartTypeChangeRef.current = onChartTypeChange;

  const settings = {
    assetInformation: false,
    countdown: true,
    isHighestLowestMarkerEnabled: false,
    language: "en",
    position: isDesktop ? "bottom" : "left",
    theme,
  };

  return (
    <>
      <div id="smartcharts_modal" className="ciq-modal" />
      <SmartChart
        id="dbot"
        symbol={symbol}
        granularity={granularity as TGranularity}
        chartType={normalizeSmartChartType(chartType)}
        getQuotes={getQuotes}
        subscribeQuotes={subscribeQuotes}
        unsubscribeQuotes={unsubscribeQuotes}
        chartData={chartData}
        feedCall={{ activeSymbols: false, tradingTimes: false }}
        isConnectionOpened
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
          <ChartTitle onChange={(next) => onSymbolChangeRef.current?.(next)} />
        )}
        toolbarWidget={() => (
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
    </>
  );
}
