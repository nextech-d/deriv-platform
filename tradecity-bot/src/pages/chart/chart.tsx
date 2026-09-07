import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
/* [AI] - Analytics removed - rudderstack event tracking removed */
/* [/AI] */
import { DBOT_TABS } from '@/constants/bot-contents';
import { DEFAULT_CHART_SYMBOL } from '@/constants/chart-symbols';
import { getUrlBase } from '@/components/shared';
import chart_api from '@/external/bot-skeleton/services/api/chart-api';
import { useSmartChartAdaptor } from '@/hooks/useSmartChartAdaptor';
import { useStore } from '@/hooks/useStore';
import { normalizeSmartChartType } from '@/utils/normalize-smartchart-type';
import {
    ChartTitle,
    SmartChart,
    setSmartChartsPublicPath,
    TGranularity,
    TStateChangeListener,
    type ActiveSymbols,
    type TradingTimesMap,
} from '@deriv-com/smartcharts-champion';
import { useDevice } from '@deriv-com/ui';
import ToolbarWidgets from './toolbar-widgets';
import '@deriv-com/smartcharts-champion/dist/smartcharts.css';

setSmartChartsPublicPath(getUrlBase('/js/smartcharts/'));

const FEED_CALL = { activeSymbols: false, tradingTimes: false } as const;

type TChartCanvasProps = {
    show_digits_stats: boolean;
    symbol: string;
    chart_type: string | undefined;
    granularity: number | undefined;
    isDesktop: boolean;
    isMobile: boolean;
    is_drawer_open: boolean;
    is_chart_modal_visible: boolean;
    is_chart_active: boolean;
    isSafari: boolean;
    settings: {
        assetInformation: boolean;
        countdown: boolean;
        isHighestLowestMarkerEnabled: boolean;
        language: string;
        position: string;
        theme: string;
    };
    activeSymbols: ActiveSymbols;
    tradingTimes: TradingTimesMap;
    getQuotes: ReturnType<typeof useSmartChartAdaptor>['getQuotes'];
    subscribeQuotes: ReturnType<typeof useSmartChartAdaptor>['subscribeQuotes'];
    unsubscribeQuotes: ReturnType<typeof useSmartChartAdaptor>['unsubscribeQuotes'];
    is_connection_opened: boolean;
    getMarketsOrder: (active_symbols: unknown[]) => string[];
    onSymbolChange: (symbol: string) => void;
    updateChartType: (chart_type: string) => void;
    updateGranularity: (granularity: number) => void;
    setChartStatus: (status: boolean) => void;
};

/** Isolated from MobX observer so tick-driven parent updates do not reset SmartChart subscriptions. */
const ChartCanvas = memo(
    ({
        show_digits_stats,
        symbol,
        chart_type,
        granularity,
        isDesktop,
        isMobile,
        is_drawer_open,
        is_chart_modal_visible,
        is_chart_active,
        isSafari,
        settings,
        activeSymbols,
        tradingTimes,
        getQuotes,
        subscribeQuotes,
        unsubscribeQuotes,
        is_connection_opened,
        getMarketsOrder,
        onSymbolChange,
        updateChartType,
        updateGranularity,
        setChartStatus,
    }: TChartCanvasProps) => {
        const normalizedChartType = normalizeSmartChartType(chart_type);

        const handleStateChange: TStateChangeListener = useCallback((state, _options) => {
            if (state === 'READY') {
                window.dispatchEvent(new Event('resize'));
            }
        }, []);

        const chartStatusListener = useCallback(
            (v: boolean) => {
                setChartStatus(!v);
            },
            [setChartStatus]
        );

        const toolbarWidget = useCallback(
            () => (
                <ToolbarWidgets
                    updateChartType={updateChartType}
                    updateGranularity={updateGranularity}
                    position={!isDesktop ? 'bottom' : 'top'}
                    isDesktop={isDesktop}
                />
            ),
            [updateChartType, updateGranularity, isDesktop]
        );

        const topWidgets = useCallback(
            () => <ChartTitle onChange={onSymbolChange} />,
            [onSymbolChange]
        );

        const chartDataProp = useMemo(
            () => ({ activeSymbols, tradingTimes }),
            [activeSymbols, tradingTimes]
        );

        useEffect(() => {
            const frame = requestAnimationFrame(() => {
                window.dispatchEvent(new Event('resize'));
            });
            return () => cancelAnimationFrame(frame);
        }, []);

        // The Charts panel is kept mounted but hidden with display:none when the
        // user is on another tab (keep_visited_mounted). A display:none element has
        // zero dimensions, so SmartChart's canvas cannot paint while hidden; on
        // return it needs a resize to re-measure and catch up on the ticks it kept
        // receiving. Fire resize across a few frames once the tab is active again.
        useEffect(() => {
            if (!is_chart_active) return undefined;
            const raf1 = requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
            const t = window.setTimeout(() => window.dispatchEvent(new Event('resize')), 120);
            return () => {
                cancelAnimationFrame(raf1);
                clearTimeout(t);
            };
        }, [is_chart_active]);

        return (
            <>
                <div id='smartcharts_modal' className='ciq-modal' />
                <div
                    className={classNames('dashboard__chart-wrapper', {
                        'dashboard__chart-wrapper--expanded': is_drawer_open && isDesktop,
                        'dashboard__chart-wrapper--modal': is_chart_modal_visible && isDesktop,
                        'dashboard__chart-wrapper--safari': isSafari,
                    })}
                    dir='ltr'
                >
                    <SmartChart
                        id={`dbot-${symbol}`}
                        key={`chart-${symbol}`}
                        barriers={[]}
                        showLastDigitStats={show_digits_stats}
                        chartControlsWidgets={null}
                        enabledChartFooter={false}
                        chartStatusListener={chartStatusListener}
                        stateChangeListener={handleStateChange}
                        toolbarWidget={toolbarWidget}
                        chartType={normalizedChartType}
                        isMobile={isMobile}
                        enabledNavigationWidget={isDesktop}
                        granularity={granularity as TGranularity}
                        getQuotes={getQuotes}
                        subscribeQuotes={subscribeQuotes}
                        unsubscribeQuotes={unsubscribeQuotes}
                        chartData={chartDataProp}
                        feedCall={FEED_CALL}
                        settings={settings}
                        symbol={symbol}
                        topWidgets={topWidgets}
                        isConnectionOpened={is_connection_opened}
                        getMarketsOrder={getMarketsOrder}
                        isLive
                        leftMargin={80}
                    />
                </div>
            </>
        );
    }
);

ChartCanvas.displayName = 'ChartCanvas';

const Chart = observer(({ show_digits_stats }: { show_digits_stats: boolean }) => {
    const { common, ui } = useStore();
    const { chart_store, run_panel, dashboard } = useStore();
    const [isSafari, setIsSafari] = useState(false);

    const {
        chart_type,
        getMarketsOrder,
        granularity,
        onSymbolChange,
        setChartStatus,
        symbol,
        updateChartType,
        updateGranularity,
        updateSymbol,
    } = chart_store;

    // Use the custom hook for SmartChart Adaptor
    const { chartData, getQuotes, subscribeQuotes, unsubscribeQuotes, adapterInitialized } =
        useSmartChartAdaptor();

    const { isDesktop, isMobile } = useDevice();
    const { is_drawer_open } = run_panel;
    const { is_chart_modal_visible } = dashboard;
    // Charts panel stays mounted across tab switches; this drives a repaint on return.
    const is_chart_active = dashboard.active_tab === DBOT_TABS.CHART;

    const settings = useMemo(
        () => ({
            assetInformation: false,
            countdown: true,
            isHighestLowestMarkerEnabled: false,
            language: common.current_language.toLowerCase(),
            position: ui.is_chart_layout_default ? 'bottom' : 'left',
            theme: ui.is_dark_mode_on ? 'dark' : 'light',
        }),
        [common.current_language, ui.is_chart_layout_default, ui.is_dark_mode_on]
    );

    useEffect(() => {
        // Safari browser detection using feature detection
        // More robust than user agent sniffing
        const isSafariBrowser = () => {
            // Check for Safari-specific features
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

            // Additional check: Safari has specific webkit features
            const hasWebkitFeatures = 'webkitAudioContext' in window || 'WebKitMediaSource' in window;

            return isSafari && hasWebkitFeatures;
        };

        setIsSafari(isSafariBrowser());
    }, []);

    useEffect(() => {
        updateSymbol();
        const workspace = window.Blockly?.derivWorkspace;
        if (!workspace?.addChangeListener) return undefined;
        const onWorkspaceChange = (event: { name?: string; type?: string }) => {
            if (event.name === 'SYMBOL_LIST' || event.type === 'create' || event.type === 'ended') {
                updateSymbol();
            }
        };
        workspace.addChangeListener(onWorkspaceChange);
        return () => workspace.removeChangeListener(onWorkspaceChange);
    }, [updateSymbol]);

    useEffect(() => {
        if (!adapterInitialized || !chartData.activeSymbols.length) return;
        const current = symbol || DEFAULT_CHART_SYMBOL;
        if (chartData.activeSymbols.some(item => item.symbol === current)) return;
        const first = chartData.activeSymbols[0];
        if (first) onSymbolChange(first.symbol);
    }, [adapterInitialized, chartData.activeSymbols, symbol, onSymbolChange]);

    const is_connection_opened = adapterInitialized || !!chart_api?.api;
    const resolvedSymbol = symbol || DEFAULT_CHART_SYMBOL;

    const activeSymbols = chartData.activeSymbols;
    const tradingTimes = chartData.tradingTimes;
    const symbolReady = activeSymbols.some(item => item.symbol === resolvedSymbol);

    if (!resolvedSymbol || !adapterInitialized || !symbolReady) {
        return (
            <div
                className={classNames('dashboard__chart-wrapper', 'dashboard__chart-wrapper--pending', {
                    'dashboard__chart-wrapper--expanded': is_drawer_open && isDesktop,
                    'dashboard__chart-wrapper--modal': is_chart_modal_visible && isDesktop,
                })}
                dir='ltr'
            >
                <p>Loading live chart…</p>
            </div>
        );
    }

    return (
        <ChartCanvas
            show_digits_stats={show_digits_stats}
            symbol={resolvedSymbol}
            chart_type={chart_type}
            granularity={granularity}
            isDesktop={isDesktop}
            isMobile={isMobile}
            is_drawer_open={is_drawer_open}
            is_chart_modal_visible={is_chart_modal_visible}
            is_chart_active={is_chart_active}
            isSafari={isSafari}
            settings={settings}
            activeSymbols={activeSymbols}
            tradingTimes={tradingTimes}
            getQuotes={getQuotes}
            subscribeQuotes={subscribeQuotes}
            unsubscribeQuotes={unsubscribeQuotes}
            is_connection_opened={is_connection_opened}
            getMarketsOrder={getMarketsOrder}
            onSymbolChange={onSymbolChange}
            updateChartType={updateChartType}
            updateGranularity={updateGranularity}
            setChartStatus={setChartStatus}
        />
    );
});

export default Chart;
