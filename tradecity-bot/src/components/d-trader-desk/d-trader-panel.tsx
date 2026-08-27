import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import ChunkLoader from '@/components/loader/chunk-loader';
import { retryImport } from '@/utils/lazy-with-retry';
import { useAccumulatorProposal } from '@/hooks/useAccumulatorProposal';
import { useBulkTrading } from '@/hooks/useBulkTrading';
import { useStore } from '@/hooks/useStore';
import { DBOT_TABS } from '@/constants/bot-contents';
import { copyRunningHint } from '@/utils/copy-mirror';
import DTraderDesk from './d-trader-desk';

const ChartWrapper = lazy(() => retryImport(() => import('@/pages/chart/chart-wrapper')));

const DEFAULT_STAKE = 10;
const DEFAULT_GROWTH_RATE = 0.03;
const DEFAULT_TAKE_PROFIT = 50;

/**
 * Manual accumulator trading. The chart owns the symbol through chart_store, so
 * picking a market from the chart title is what the ticket prices and buys.
 */
const DTraderPanel = observer(() => {
    const { client, chart_store, dashboard } = useStore();
    const currency = client?.currency || 'USD';
    const isLoggedIn = Boolean(client?.is_logged_in);
    const symbol = chart_store?.symbol ?? '';

    const is_dtrader = dashboard.active_tab === DBOT_TABS.D_TRADER;
    const [stake, setStake] = useState(DEFAULT_STAKE);
    const [growthRate, setGrowthRate] = useState(DEFAULT_GROWTH_RATE);
    const [takeProfitOn, setTakeProfitOn] = useState(false);
    const [takeProfit, setTakeProfit] = useState(DEFAULT_TAKE_PROFIT);
    const [copyTrading, setCopyTrading] = useState(false);

    // Reflect whatever the Copy Trader tab has running rather than inventing a state.
    useEffect(() => setCopyTrading(copyRunningHint()), []);

    const { buy, busy, notice } = useBulkTrading(currency);

    const quote = useAccumulatorProposal({
        symbol,
        currency,
        amount: stake,
        growthRate,
        takeProfit: takeProfitOn ? takeProfit : undefined,
        enabled: isLoggedIn,
    });

    const handleBuy = useCallback(() => {
        if (!symbol) return;
        buy({
            symbol,
            contractType: 'ACCU',
            // Accumulators run until they breach or hit take profit, so duration is unused.
            duration: 0,
            durationUnit: 't',
            amount: stake,
            count: 1,
            growthRate,
            takeProfit: takeProfitOn ? takeProfit : undefined,
            mirror: copyTrading,
        });
    }, [buy, symbol, stake, growthRate, takeProfitOn, takeProfit, copyTrading]);

    return (
        <DTraderDesk
            currency={currency}
            tradingLocked={!isLoggedIn}
            busy={busy}
            notice={notice}
            quote={quote}
            stake={stake}
            onStakeChange={setStake}
            growthRate={growthRate}
            onGrowthRateChange={setGrowthRate}
            takeProfitOn={takeProfitOn}
            onTakeProfitToggle={setTakeProfitOn}
            takeProfit={takeProfit}
            onTakeProfitChange={setTakeProfit}
            copyTrading={copyTrading}
            onCopyTradingToggle={setCopyTrading}
            onBuy={handleBuy}
            chart={
                is_dtrader ? (
                    <Suspense fallback={<ChunkLoader message='Please wait, loading chart...' />}>
                        <ChartWrapper prefix='d-trader' show_digits_stats={false} />
                    </Suspense>
                ) : null
            }
        />
    );
});

export default DTraderPanel;
