import { useCallback, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useAnalysisTicks } from '@/hooks/useAnalysisTicks';
import { useBulkTrading } from '@/hooks/useBulkTrading';
import { useStore } from '@/hooks/useStore';
import { bulkPipSize } from '@/utils/bulk-trader';
import Edging2Desk, { type Edging2Tick } from './edging-2-desk';

/**
 * Single-market digit analysis: Matches / Differs go through the shared
 * bulk-trading hook so statistics come from real settled contracts.
 */
const Edging2Panel = observer(() => {
    const { client } = useStore();
    const [symbol, setSymbol] = useState('R_100');
    const symbols = useMemo(() => [symbol], [symbol]);
    const { quotes, pipSizes } = useAnalysisTicks(symbols);

    const currency = client?.currency || 'USD';
    const isLoggedIn = Boolean(client?.is_logged_in);
    const { settlements, batchResults, buy, busy, notice } = useBulkTrading(currency);

    const tickHistory = quotes as Edging2Tick[];
    const pipSize = pipSizes[symbol] ?? bulkPipSize(symbol);

    const handleTrade = useCallback(
        (payload: {
            symbol: string;
            contractType: string;
            lastDigitPrediction: number;
            duration: number;
            durationUnit: string;
            amount: number;
        }) => {
            buy({ ...payload, count: 1 });
        },
        [buy]
    );

    return (
        <Edging2Desk
            symbol={symbol}
            onSymbolChange={setSymbol}
            tickHistory={tickHistory}
            pipSize={pipSize}
            isConnected={tickHistory.length > 0}
            tradingLocked={!isLoggedIn}
            busy={busy}
            currency={currency}
            settlements={settlements}
            batchResults={batchResults}
            onTrade={handleTrade}
            notice={notice}
        />
    );
});

export default Edging2Panel;
