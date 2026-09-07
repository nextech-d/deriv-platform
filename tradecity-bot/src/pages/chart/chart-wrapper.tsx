// Removed unused React import - React 17+ JSX transform doesn't require it
import { useEffect, useState } from 'react';
import classNames from 'classnames';
import { observable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { v4 as uuidv4 } from 'uuid';
import { DBOT_TABS } from '@/constants/bot-contents';
import { useStore } from '@/hooks/useStore';
import { useDevice } from '@deriv-com/ui';
import Chart from './chart';
import './chart.scss';

/**
 * The three places a SmartChart can be mounted. Exactly one may be live at a time.
 *
 * SmartCharts keeps its MobX root store behind a MODULE-LEVEL context
 * (`src/store/index.ts`: `let stores_context`), and every <SmartChart> replaces it
 * during render via initContext(). A second chart therefore swaps the context out
 * from under the first: the first chart's subtree still has its own Provider, but its
 * descendants read the new module-level context, resolve to the NEW store, and from
 * then on push their props into it (Chart.tsx runs `updateProps(props)` on every
 * render with no dep array). The older chart is left orphaned — it keeps painting
 * ticks while its own loader never hides, and a teardown in the newer chart frees the
 * older chart's stream. Keeping one chart alive avoids all of it.
 */
export type ChartOwner = 'chart' | 'd-trader' | 'modal';

/**
 * The site that most recently held ownership. Kept so that leaving every chart site
 * (Dashboard, Bot builder, an analysis desk...) does NOT tear the chart down — only a
 * genuine chart-to-chart switch does. An observable box rather than a plain module
 * variable because all three wrappers are observers and must re-render when it moves.
 */
const incumbent = observable.box<ChartOwner | null>(null);

type TVisibility = {
    is_chart_modal_visible: boolean;
    active_tab: number;
};

/**
 * The site that is actually on screen, or null when the user is somewhere with no
 * chart. Modal wins over the Charts tab: main.tsx already disables the Charts tab
 * (`id-charts--disabled`) while the modal is open.
 */
export const resolveVisibleOwner = ({ is_chart_modal_visible, active_tab }: TVisibility): ChartOwner | null => {
    if (is_chart_modal_visible) return 'modal';
    if (active_tab === DBOT_TABS.CHART) return 'chart';
    if (active_tab === DBOT_TABS.D_TRADER) return 'd-trader';
    return null;
};

/** Visible site if there is one, otherwise the incumbent keeps its mount. */
export const resolveChartOwner = (visibility: TVisibility, incumbent_owner: ChartOwner | null): ChartOwner | null =>
    resolveVisibleOwner(visibility) ?? incumbent_owner;

/** Test seam: module state outlives a render, so specs must be able to reset it. */
export const __setChartIncumbent = (owner: ChartOwner | null) => incumbent.set(owner);
export const __getChartIncumbent = () => incumbent.get();

interface ChartWrapperProps {
    /**
     * Required, and required deliberately: it is this mount site's identity for
     * ownership. It used to default to 'chart', which made the Charts tab and the
     * chart modal indistinguishable — same identity, same React key. A default would
     * let a fourth mount site silently inherit someone else's identity.
     */
    prefix: ChartOwner;
    show_digits_stats: boolean;
}

const ChartWrapper = observer(({ prefix, show_digits_stats }: ChartWrapperProps) => {
    const { client, dashboard, run_panel } = useStore();
    const { isDesktop } = useDevice();
    const [uuid] = useState(uuidv4());

    const visibility = {
        is_chart_modal_visible: dashboard.is_chart_modal_visible,
        active_tab: dashboard.active_tab,
    };
    const visible_owner = resolveVisibleOwner(visibility);
    const owner = visible_owner ?? incumbent.get();

    // Written in an effect, never during render, so a render stays pure.
    useEffect(() => {
        if (visible_owner) incumbent.set(visible_owner);
    }, [visible_owner]);

    if (owner !== prefix) {
        // Structural, not a UX surface: a non-owner is either on an inactive tab
        // (display:none) or behind the modal, so this is not normally on screen. It
        // carries the same modifiers chart.tsx applies so the panel does not jump.
        return (
            <div
                className={classNames('dashboard__chart-wrapper', 'dashboard__chart-wrapper--pending', {
                    'dashboard__chart-wrapper--expanded': run_panel.is_drawer_open && isDesktop,
                    'dashboard__chart-wrapper--modal': dashboard.is_chart_modal_visible && isDesktop,
                })}
                dir='ltr'
            >
                <p>Chart is open in another view</p>
            </div>
        );
    }

    const uniqueKey = client.loginid ? `${prefix}-${client.loginid}` : `${prefix}-${uuid}`;

    return <Chart key={uniqueKey} show_digits_stats={show_digits_stats} />;
});

export default ChartWrapper;
