import { useCallback, useMemo, useState } from 'react';
import { ANALYSIS_DCIRCLE_SYMBOLS } from '@/constants/analysis-markets';
import { useAnalysisTicks } from '@/hooks/useAnalysisTicks';
import { loadAnalysisBiasInBuilder } from '@/utils/load-analysis-bias';
import AnalysisToolDesk, { type AnalysisBias } from './analysis-tool-desk';

const DCIRCLE_SYMBOLS = [...ANALYSIS_DCIRCLE_SYMBOLS];
const DEFAULT_SYMBOL = 'R_100';

type TAnalysisToolPanelProps = {
    /** Called after a bias is seeded into Blockly so the host can switch tabs. */
    onSeededToBuilder: () => void;
    onOpenDTrader: () => void;
};

/**
 * Owns the symbol selection and tick subscriptions for the analysis desk.
 * Only scanned symbols stream, so the default load is a single feed.
 */
const AnalysisToolPanel = ({ onSeededToBuilder, onOpenDTrader }: TAnalysisToolPanelProps) => {
    const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
    const [scanning, setScanning] = useState<Set<string>>(() => new Set([DEFAULT_SYMBOL]));

    const subscribed = useMemo(() => [...new Set([symbol, ...scanning])], [symbol, scanning]);
    const { quotes, pipSizes } = useAnalysisTicks(subscribed);

    const handleToggleScan = useCallback((id: string) => {
        setScanning(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
        setSymbol(id);
    }, []);

    const handleToggleScanAll = useCallback(() => {
        setScanning(prev => (prev.size === DCIRCLE_SYMBOLS.length ? new Set() : new Set(DCIRCLE_SYMBOLS)));
    }, []);

    const handleSendToBuilder = useCallback(
        async (bias: AnalysisBias) => {
            const loaded = await loadAnalysisBiasInBuilder({
                symbol,
                mode: bias.mode,
                side: bias.side,
                barrier: bias.barrier,
                digitTarget: bias.digitTarget,
                label: bias.label,
            });
            if (loaded) onSeededToBuilder();
        },
        [symbol, onSeededToBuilder]
    );

    return (
        <AnalysisToolDesk
            symbol={symbol}
            quotes={quotes}
            pipSizes={pipSizes}
            scanning={scanning}
            onToggleScan={handleToggleScan}
            onToggleScanAll={handleToggleScanAll}
            onSymbolChange={setSymbol}
            onTradeBias={onOpenDTrader}
            onSendToBuilder={handleSendToBuilder}
        />
    );
};

export default AnalysisToolPanel;
