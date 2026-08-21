import { useCallback, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useAnalysisTicks } from '@/hooks/useAnalysisTicks';
import { useBulkTrading } from '@/hooks/useBulkTrading';
import { useStore } from '@/hooks/useStore';
import { bulkPipSize } from '@/utils/bulk-trader';
import { EDGING_OVER_BARRIER, EDGING_UNDER_BARRIER } from '@/utils/edging';
import EdgingDesk, { type EdgingTick } from './edging-desk';

/**
 * The Over and Under legs are bought as two separate contracts, so each pair
 * produces two batches. The desk pairs them back up to score a cover or a kill.
 */
const EdgingPanel = observer(() => {
    const { client } = useStore();
    const [symbol, setSymbol] = useState('R_100');
    const symbols = useMemo(() => [symbol], [symbol]);
    const { quotes, pipSizes } = useAnalysisTicks(symbols);

    const currency = client?.currency || 'USD';
    const isLoggedIn = Boolean(client?.is_logged_in);
    const { batchResults, buy, busy, notice } = useBulkTrading(currency);

    const tickHistory = quotes as EdgingTick[];
    const pipSize = pipSizes[symbol] ?? bulkPipSize(symbol);

    const handleTrade = useCallback(
        ({ symbol: market, perLeg, duration }: { symbol: string; perLeg: number; duration: number }) => {
            buy({
                symbol: market,
                contractType: 'DIGITOVER',
                lastDigitPrediction: EDGING_OVER_BARRIER,
                duration,
                durationUnit: 't',
                amount: perLeg,
                count: 1,
            });
            buy({
                symbol: market,
                contractType: 'DIGITUNDER',
                lastDigitPrediction: EDGING_UNDER_BARRIER,
                duration,
                durationUnit: 't',
                amount: perLeg,
                count: 1,
            });
        },
        [buy]
    );

    return (
        <EdgingDesk
            symbol={symbol}
            onSymbolChange={setSymbol}
            tickHistory={tickHistory}
            pipSize={pipSize}
            isConnected={tickHistory.length > 0}
            tradingLocked={!isLoggedIn}
            busy={busy}
            currency={currency}
            batchResults={batchResults}
            onTrade={handleTrade}
            notice={notice}
        />
    );
});

export default EdgingPanel;
