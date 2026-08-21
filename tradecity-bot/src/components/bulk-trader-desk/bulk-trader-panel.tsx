import { useCallback, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useAnalysisTicks } from '@/hooks/useAnalysisTicks';
import { useBulkTrading } from '@/hooks/useBulkTrading';
import { useStore } from '@/hooks/useStore';
import { BULK_DEFAULT_SYMBOL, BULK_SCAN_SYMBOLS, ticksForMarket } from '@/utils/bulk-trader';
import BulkTraderDesk, { type BulkTick } from './bulk-trader-desk';

/**
 * Owns symbol selection, tick feeds and order routing for the bulk desk.
 * The five scanner markets stream alongside the active one so the digit
 * scanner has history the moment it is armed.
 */
const BulkTraderPanel = observer(() => {
    const { client } = useStore();
    const [symbol, setSymbol] = useState(BULK_DEFAULT_SYMBOL);

    const subscribed = useMemo(() => [...new Set([symbol, ...BULK_SCAN_SYMBOLS])], [symbol]);
    const { quotes } = useAnalysisTicks(subscribed);

    const currency = client?.currency || 'USD';
    const isLoggedIn = Boolean(client?.is_logged_in);
    const { contracts, buy, closeContract, closingId, busy, notice } = useBulkTrading(currency);

    const tickHistory = quotes as BulkTick[];
    const lastTick = useMemo(() => ticksForMarket(tickHistory, symbol).at(-1) ?? null, [tickHistory, symbol]);

    const formatLocal = useCallback((value: number) => `${value.toFixed(2)} ${currency}`, [currency]);

    const handleTrade = useCallback(
        (payload: {
            symbol?: string;
            contractType: string;
            lastDigitPrediction?: number;
            duration?: number;
            durationUnit?: string;
            amount?: number;
            count?: number;
        }) => {
            buy({
                symbol: payload.symbol ?? symbol,
                contractType: payload.contractType,
                lastDigitPrediction: payload.lastDigitPrediction,
                duration: payload.duration ?? 1,
                durationUnit: payload.durationUnit ?? 't',
                amount: payload.amount ?? 0,
                count: payload.count ?? 1,
            });
        },
        [buy, symbol]
    );

    return (
        <BulkTraderDesk
            symbol={symbol}
            onSymbolChange={setSymbol}
            lastTick={lastTick}
            tickHistory={tickHistory}
            isConnected={tickHistory.length > 0}
            tradingLocked={!isLoggedIn}
            busy={busy}
            historyLoading={tickHistory.length === 0}
            onTrade={handleTrade}
            contracts={contracts}
            formatLocal={formatLocal}
            onCloseContract={closeContract}
            closingId={closingId}
            notice={notice}
        />
    );
});

export default BulkTraderPanel;
