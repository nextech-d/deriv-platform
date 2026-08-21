declare module "@deriv-com/smartcharts-champion" {
  import type { ComponentType, ReactNode } from "react";

  export type TGranularity =
    | 0
    | 60
    | 120
    | 180
    | 300
    | 600
    | 900
    | 1800
    | 3600
    | 7200
    | 14400
    | 28800
    | 86400;

  export interface TQuote {
    Date: string;
    Open?: number;
    High?: number;
    Low?: number;
    Close: number;
    tick?: unknown;
    ohlc?: unknown;
    DT?: Date;
    prevClose?: number;
    Volume?: number;
  }

  export interface TGetQuotesResult {
    candles?: Array<{
      open: number;
      high: number;
      low: number;
      close: number;
      epoch: number;
    }>;
    history?: {
      prices: number[];
      times: number[];
    };
  }

  export type TGetQuotes = (params: {
    symbol: string;
    granularity: number;
    count: number;
    start?: number;
    end?: number;
    style?: string;
  }) => Promise<TGetQuotesResult>;

  export type TSubscribeQuotes = (
    params: { symbol: string; granularity: TGranularity },
    callback: (quote: TQuote) => void,
  ) => () => void;

  export type TUnsubscribeQuotes = (request?: { symbol?: string; granularity?: number }) => void;

  export interface ActiveSymbol {
    display_name: string;
    market: string;
    market_display_name: string;
    subgroup?: string;
    subgroup_display_name?: string;
    submarket: string;
    submarket_display_name: string;
    symbol: string;
    symbol_type: string;
    pip: number;
    exchange_is_open: 0 | 1;
    is_trading_suspended: 0 | 1;
    delay_amount?: number;
  }

  export type ActiveSymbols = ActiveSymbol[];
  export type TradingTimesMap = Record<
    string,
    { isOpen: boolean; openTime: string; closeTime: string }
  >;

  export interface SmartChartProps {
    id?: string;
    symbol?: string;
    granularity?: TGranularity;
    chartType?: string;
    getQuotes: TGetQuotes;
    subscribeQuotes: TSubscribeQuotes;
    unsubscribeQuotes: TUnsubscribeQuotes;
    chartData?: {
      activeSymbols?: ActiveSymbols;
      tradingTimes?: TradingTimesMap;
    };
    feedCall?: {
      activeSymbols?: boolean;
      tradingTimes?: boolean;
    };
    isConnectionOpened?: boolean;
    settings?: Record<string, unknown>;
    stateChangeListener?: (state: string, option?: unknown) => void;
    topWidgets?: () => ReactNode;
    toolbarWidget?: () => ReactNode;
    chartControlsWidgets?: null | (() => ReactNode);
    getMarketsOrder?: (activeSymbols: ActiveSymbol[]) => string[];
    barriers?: unknown[];
    showLastDigitStats?: boolean;
    enabledChartFooter?: boolean;
    isMobile?: boolean;
    enabledNavigationWidget?: boolean;
    isLive?: boolean;
    leftMargin?: number;
    chartStatusListener?: (loading: boolean) => void;
    children?: ReactNode;
  }

  export interface ChartModeProps {
    portalNodeId?: string;
    onChartType: (chartType: string) => void;
    onGranularity: (granularity: number) => void;
  }

  export interface ChartTitleProps {
    onChange: (symbol: string) => void;
  }

  export interface ToolbarWidgetProps {
    position?: string;
    children?: ReactNode;
  }

  export interface PortalWidgetProps {
    portalNodeId?: string;
    searchInputClassName?: string;
    onChartType?: (chartType: string) => void;
    onGranularity?: (granularity: number) => void;
  }

  export const SmartChart: ComponentType<SmartChartProps>;
  export const ChartMode: ComponentType<ChartModeProps>;
  export const ChartTitle: ComponentType<ChartTitleProps>;
  export const ToolbarWidget: ComponentType<ToolbarWidgetProps>;
  export const StudyLegend: ComponentType<PortalWidgetProps>;
  export const Views: ComponentType<PortalWidgetProps>;
  export const DrawTools: ComponentType<PortalWidgetProps>;
  export const Share: ComponentType<PortalWidgetProps>;
  export function setSmartChartsPublicPath(path: string): void;
}

declare module "@deriv-com/smartcharts-champion/dist/smartcharts.css";
