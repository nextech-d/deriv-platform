import { useCallback, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ULTIMATE_BOT_SYMBOLS } from '@/constants/ultimate-markets';
import { useAnalysisTicks } from '@/hooks/useAnalysisTicks';
import { useBulkTrading } from '@/hooks/useBulkTrading';
import { useStore } from '@/hooks/useStore';
import UltimateBotDesk, { type UltimateTick } from './ultimate-bot-desk';

/**
 * Streams all thirteen Active Markets at once — the desk scans every row for a
 * signal, so a single-symbol feed would leave most of the table blank.
 */
const UltimateBotPanel = observer(() => {
    const { client } = useStore();
    const [symbol, setSymbol] = useState('R_100');
    const { quotes } = useAnalysisTicks(ULTIMATE_BOT_SYMBOLS);

    const currency = client?.currency || 'USD';
    const isLoggedIn = Boolean(client?.is_logged_in);
    const { contracts, buy, closeContract, closingId, busy } = useBulkTrading(currency);

    const tickHistory = quotes as UltimateTick[];

    const formatLocal = useCallback((value: number) => `${value.toFixed(2)} ${currency}`, [currency]);

    const handleTrade = useCallback(
        (payload: {
            symbol?: string;
            contractType: string;
            lastDigitPrediction?: number;
            duration?: number;
            durationUnit?: string;
            amount?: number;
        }) => {
            buy({
                symbol: payload.symbol ?? symbol,
                contractType: payload.contractType,
                lastDigitPrediction: payload.lastDigitPrediction,
                duration: payload.duration ?? 1,
                durationUnit: payload.durationUnit ?? 't',
                amount: payload.amount ?? 0,
                count: 1,
            });
        },
        [buy, symbol]
    );

    return (
        <UltimateBotDesk
            symbol={symbol}
            onSymbolChange={setSymbol}
            tickHistory={tickHistory}
            isConnected={tickHistory.length > 0}
            tradingLocked={!isLoggedIn}
            busy={busy}
            formatLocal={formatLocal}
            onTrade={handleTrade}
            contracts={contracts}
            onCloseContract={closeContract}
            closingId={closingId}
        />
    );
});

export default UltimateBotPanel;
