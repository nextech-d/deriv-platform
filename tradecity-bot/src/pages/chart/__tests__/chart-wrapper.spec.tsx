import { render, screen } from '@testing-library/react';
import { DBOT_TABS } from '@/constants/bot-contents';

const mockStore = {
    client: { loginid: 'CR123' },
    dashboard: { active_tab: DBOT_TABS.DASHBOARD as number, is_chart_modal_visible: false },
    run_panel: { is_drawer_open: false },
};

jest.mock('@/hooks/useStore', () => ({
    useStore: jest.fn(() => mockStore),
}));

jest.mock('@deriv-com/ui', () => ({
    useDevice: jest.fn(() => ({ isDesktop: true, isMobile: false })),
}));

// Stub the chart itself: this spec is about which site mounts one, not about
// SmartCharts. Rendering the real chart would pull in the whole vendor bundle.
jest.mock('../chart', () => ({
    __esModule: true,
    default: () => <div data-testid='live-chart' />,
}));

import ChartWrapper, {
    __getChartIncumbent,
    __setChartIncumbent,
    resolveChartOwner,
    resolveVisibleOwner,
    type ChartOwner,
} from '../chart-wrapper';

const setVisibility = (active_tab: number, is_chart_modal_visible = false) => {
    mockStore.dashboard.active_tab = active_tab;
    mockStore.dashboard.is_chart_modal_visible = is_chart_modal_visible;
};

/** Renders all three mount sites together, as the app does. */
const renderAllThreeSites = () =>
    render(
        <>
            <ChartWrapper prefix='chart' show_digits_stats={false} />
            <ChartWrapper prefix='d-trader' show_digits_stats={false} />
            <ChartWrapper prefix='modal' show_digits_stats={false} />
        </>
    );

beforeEach(() => {
    __setChartIncumbent(null);
    setVisibility(DBOT_TABS.DASHBOARD);
});

describe('chart ownership rule', () => {
    describe('resolveVisibleOwner', () => {
        it('gives the modal precedence over the Charts tab', () => {
            expect(
                resolveVisibleOwner({ is_chart_modal_visible: true, active_tab: DBOT_TABS.CHART })
            ).toBe('modal');
        });

        it('gives the modal precedence over the D-trader tab', () => {
            expect(
                resolveVisibleOwner({ is_chart_modal_visible: true, active_tab: DBOT_TABS.D_TRADER })
            ).toBe('modal');
        });

        it('maps each chart tab to its own site', () => {
            expect(resolveVisibleOwner({ is_chart_modal_visible: false, active_tab: DBOT_TABS.CHART })).toBe(
                'chart'
            );
            expect(
                resolveVisibleOwner({ is_chart_modal_visible: false, active_tab: DBOT_TABS.D_TRADER })
            ).toBe('d-trader');
        });

        it('is null on a tab with no chart', () => {
            expect(
                resolveVisibleOwner({ is_chart_modal_visible: false, active_tab: DBOT_TABS.DASHBOARD })
            ).toBeNull();
        });
    });

    describe('resolveChartOwner', () => {
        it('falls back to the incumbent when no chart site is visible', () => {
            const visibility = { is_chart_modal_visible: false, active_tab: DBOT_TABS.DASHBOARD };
            expect(resolveChartOwner(visibility, 'chart')).toBe('chart');
            expect(resolveChartOwner(visibility, 'd-trader')).toBe('d-trader');
        });

        it('prefers the visible site over the incumbent', () => {
            expect(
                resolveChartOwner({ is_chart_modal_visible: false, active_tab: DBOT_TABS.D_TRADER }, 'chart')
            ).toBe('d-trader');
        });

        it('is null when nothing is visible and there is no incumbent', () => {
            expect(
                resolveChartOwner({ is_chart_modal_visible: false, active_tab: DBOT_TABS.DASHBOARD }, null)
            ).toBeNull();
        });
    });
});

describe('ChartWrapper mounting', () => {
    it.each<[string, number, boolean, ChartOwner]>([
        ['Charts tab', DBOT_TABS.CHART, false, 'chart'],
        ['D-trader tab', DBOT_TABS.D_TRADER, false, 'd-trader'],
        ['chart modal', DBOT_TABS.DASHBOARD, true, 'modal'],
    ])('mounts exactly one chart across all three sites: %s', (_label, active_tab, modal_visible) => {
        setVisibility(active_tab, modal_visible);

        renderAllThreeSites();

        // The invariant: never two live SmartCharts, which is what swaps the
        // module-level stores_context and orphans the older chart.
        expect(screen.getAllByTestId('live-chart')).toHaveLength(1);
        expect(screen.getAllByText('Chart is open in another view')).toHaveLength(2);
    });

    it('gives the modal the chart even while the Charts tab is active', () => {
        setVisibility(DBOT_TABS.CHART, true);

        const { container } = renderAllThreeSites();

        expect(screen.getAllByTestId('live-chart')).toHaveLength(1);
        // The live one is the third site rendered (modal), not the first (chart).
        const nodes = Array.from(container.querySelectorAll('[data-testid="live-chart"], p'));
        expect(nodes[nodes.length - 1]).toHaveAttribute('data-testid', 'live-chart');
    });

    it('keeps the incumbent mounted when the user leaves for a tab with no chart', () => {
        setVisibility(DBOT_TABS.D_TRADER);
        const first = renderAllThreeSites();
        expect(__getChartIncumbent()).toBe('d-trader');
        first.unmount();

        // Wander off to Dashboard: nothing is visible, so D-trader keeps its mount
        // rather than paying a cold remount when the user comes back.
        setVisibility(DBOT_TABS.DASHBOARD);
        renderAllThreeSites();

        expect(screen.getAllByTestId('live-chart')).toHaveLength(1);
        expect(__getChartIncumbent()).toBe('d-trader');
    });

    it('hands ownership over on a genuine chart-to-chart switch', () => {
        setVisibility(DBOT_TABS.CHART);
        const first = renderAllThreeSites();
        expect(__getChartIncumbent()).toBe('chart');
        first.unmount();

        setVisibility(DBOT_TABS.D_TRADER);
        renderAllThreeSites();

        expect(__getChartIncumbent()).toBe('d-trader');
        expect(screen.getAllByTestId('live-chart')).toHaveLength(1);
    });
});
