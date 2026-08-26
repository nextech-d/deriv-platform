export type AnalysisTickPayload = {
    symbol?: string;
    underlying_symbol?: string;
    quote?: number | string;
    ask?: number | string;
    bid?: number | string;
    epoch?: number | string;
};

export function analysisTickSymbol(tick: AnalysisTickPayload | null | undefined): string {
    return String(tick?.symbol || tick?.underlying_symbol || '');
}

export function analysisTickQuote(tick: AnalysisTickPayload | null | undefined): number {
    return Number(tick?.quote ?? tick?.ask ?? tick?.bid);
}
