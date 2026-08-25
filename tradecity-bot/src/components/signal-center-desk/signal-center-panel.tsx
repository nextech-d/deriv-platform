import { useCallback, useMemo, useState } from 'react';
import { useAnalysisTicks } from '@/hooks/useAnalysisTicks';
import { useStore } from '@/hooks/useStore';
import { lastDigitFromQuote } from '@/utils/analysis-tool';
import { loadAnalysisBiasInBuilder } from '@/utils/load-analysis-bias';
import type { SignalHandoff } from '@/utils/signal-analysis';
import SignalCenterDesk from './signal-center-desk';

type TSignalCenterPanelProps = {
    /** Called once a signal is seeded into Blockly so the host can switch tabs. */
    onSeededToBuilder: () => void;
};

/**
 * Owns the market choice and the one tick subscription the whole hub shares.
 * Tools read from this buffer rather than subscribing themselves, so switching
 * tool does not refetch a thousand ticks of history.
 */
const SignalCenterPanel = ({ onSeededToBuilder }: TSignalCenterPanelProps) => {
    const { app } = useStore();
    const [market, setMarket] = useState('');

    const subscribed = useMemo(() => (market ? [market] : []), [market]);
    const { quotes, pipSizes } = useAnalysisTicks(subscribed);

    const values = useMemo(
        () => quotes.filter(tick => tick.symbol === market).map(tick => tick.quote),
        [quotes, market]
    );

    const digits = useMemo(() => {
        const pipSize = pipSizes[market] ?? 2;
        return values.map(quote => lastDigitFromQuote(quote, pipSize));
    }, [values, pipSizes, market]);

    const handleSendToBuilder = useCallback(
        async (handoff: SignalHandoff, toolLabel: string) => {
            onSeededToBuilder();
            await app.ensureBlocklyWorkspace();
            await loadAnalysisBiasInBuilder({
                symbol: market,
                mode: handoff.mode,
                side: handoff.side,
                barrier: handoff.barrier,
                digitTarget: handoff.digitTarget,
                label: `${toolLabel} · ${handoff.label}`,
            });
        },
        [app, market, onSeededToBuilder]
    );

    return (
        <SignalCenterDesk
            market={market}
            onMarketChange={setMarket}
            values={values}
            digits={digits}
            onSendToBuilder={handleSendToBuilder}
        />
    );
};

export default SignalCenterPanel;
