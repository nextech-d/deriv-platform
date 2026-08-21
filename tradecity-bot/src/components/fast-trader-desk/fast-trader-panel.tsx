import { useCallback, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useAnalysisTicks } from '@/hooks/useAnalysisTicks';
import { useBulkTrading } from '@/hooks/useBulkTrading';
import { useStore } from '@/hooks/useStore';
import { bulkPipSize } from '@/utils/bulk-trader';
import FastTraderDesk, { type FastTick } from './fast-trader-desk';

/**
 * Fast Trader runs one market at a time, so it only streams the selected
 * symbol and buys through the shared bulk-trading hook — stats on the desk
 * come from real settled contracts, not local estimates.
 */
const FastTraderPanel = observer(() => {
    const { client } = useStore();
    const [symbol, setSymbol] = useState('R_100');
    const symbols = useMemo(() => [symbol], [symbol]);
    const { quotes, pipSizes } = useAnalysisTicks(symbols);

    const currency = client?.currency || 'USD';
    const isLoggedIn = Boolean(client?.is_logged_in);
    const { settlements, batchResults, buy, busy, notice } = useBulkTrading(currency);

    const tickHistory = quotes as FastTick[];
    const pipSize = pipSizes[symbol] ?? bulkPipSize(symbol);

    const handleTrade = useCallback(
        (payload: {
            symbol: string;
            contractType: string;
            lastDigitPrediction?: number;
            duration: number;
            durationUnit: string;
            amount: number;
        }) =>
            buy({
                symbol: payload.symbol,
                contractType: payload.contractType,
                lastDigitPrediction: payload.lastDigitPrediction,
                duration: payload.duration,
                durationUnit: payload.durationUnit,
                amount: payload.amount,
                count: 1,
            }),
        [buy]
    );

    return (
        <FastTraderDesk
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

export default FastTraderPanel;
