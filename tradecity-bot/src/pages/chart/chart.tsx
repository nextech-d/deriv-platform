import { useEffect, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
/* [AI] - Analytics removed - rudderstack event tracking removed */
/* [/AI] */
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
} from '@deriv-com/smartcharts-champion';
import { useDevice } from '@deriv-com/ui';
import ToolbarWidgets from './toolbar-widgets';
import '@deriv-com/smartcharts-champion/dist/smartcharts.css';

setSmartChartsPublicPath(getUrlBase('/js/smartcharts/'));

const FEED_CALL = { activeSymbols: false, tradingTimes: false } as const;

const Chart = observer(({ show_digits_stats }: { show_digits_stats: boolean }) => {
    const barriers: [] = [];
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

    const settings = {
        assetInformation: false, // ui.is_chart_asset_info_visible,
        countdown: true,
        isHighestLowestMarkerEnabled: false, // TODO: Pending UI
        language: common.current_language.toLowerCase(),
        position: ui.is_chart_layout_default ? 'bottom' : 'left',
        theme: ui.is_dark_mode_on ? 'dark' : 'light',
    };

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
    const normalizedChartType = normalizeSmartChartType(chart_type);

    const handleStateChange: TStateChangeListener = (state, options) => {
        /* [AI] - Analytics removed - rudderstack event call removed */
        // Handle state changes: INITIAL, READY, SCROLL_TO_LEFT
        /* [/AI] */
        if (state === 'READY') {
            window.dispatchEvent(new Event('resize'));
        }
    };

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
                id={`dbot-${resolvedSymbol}`}
                key={`chart-${resolvedSymbol}`}
                barriers={barriers}
                showLastDigitStats={show_digits_stats}
                chartControlsWidgets={null}
                enabledChartFooter={false}
                chartStatusListener={(v: boolean) => setChartStatus(!v)}
                stateChangeListener={handleStateChange}
                toolbarWidget={() => (
                    <ToolbarWidgets
                        updateChartType={updateChartType}
                        updateGranularity={updateGranularity}
                        position={!isDesktop ? 'bottom' : 'top'}
                        isDesktop={isDesktop}
                    />
                )}
                chartType={normalizedChartType}
                isMobile={isMobile}
                enabledNavigationWidget={isDesktop}
                granularity={granularity as TGranularity}
                getQuotes={getQuotes}
                subscribeQuotes={subscribeQuotes}
                unsubscribeQuotes={unsubscribeQuotes}
                chartData={{ activeSymbols, tradingTimes }}
                feedCall={FEED_CALL}
                settings={settings}
                symbol={resolvedSymbol}
                topWidgets={() => <ChartTitle onChange={onSymbolChange} />}
                isConnectionOpened={is_connection_opened}
                getMarketsOrder={getMarketsOrder}
                isLive
                leftMargin={80}
            />
            </div>
        </>
    );
});

export default Chart;
