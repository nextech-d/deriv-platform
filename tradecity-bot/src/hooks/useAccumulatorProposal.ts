import { useEffect, useRef, useState } from 'react';
import { requestProposalForQS } from '@/external/bot-skeleton/scratch/accumulators-proposal-handler';
import { api_base } from '@/external/bot-skeleton';

export interface AccumulatorQuote {
    maxPayout: number | null;
    maxTicks: number | null;
    minStake: number | null;
    maxStake: number | null;
    error: string | null;
    loading: boolean;
}

const EMPTY: AccumulatorQuote = {
    maxPayout: null,
    maxTicks: null,
    minStake: null,
    maxStake: null,
    error: null,
    loading: false,
};

interface Params {
    symbol: string;
    currency: string;
    amount: number;
    growthRate: number;
    takeProfit?: number;
    enabled: boolean;
}

/** Requests are debounced by this long so dragging the stake does not spam the socket. */
const DEBOUNCE_MS = 400;

/**
 * Quotes an accumulator contract so the ticket can show what the trade would
 * cap out at. One-shot rather than subscribed: the ceilings only move when a
 * parameter changes, and a live stream here would fight the chart's feed.
 */
export function useAccumulatorProposal({ symbol, currency, amount, growthRate, takeProfit, enabled }: Params) {
    const [quote, setQuote] = useState<AccumulatorQuote>(EMPTY);
    const requestSeq = useRef(0);

    useEffect(() => {
        if (!enabled || !symbol || !currency || !(amount > 0)) {
            setQuote(EMPTY);
            return undefined;
        }

        const seq = requestSeq.current + 1;
        requestSeq.current = seq;
        setQuote(previous => ({ ...previous, loading: true }));

        const timer = setTimeout(() => {
            void requestProposalForQS(
                { amount, currency, symbol, growth_rate: growthRate, limit_order: { take_profit: takeProfit } },
                api_base?.api
            )
                .then((response: any) => {
                    // A newer request has already gone out, so this answer is stale.
                    if (requestSeq.current !== seq) return;
                    const proposal = response?.proposal ?? {};
                    const validation = proposal.validation_params ?? {};
                    const details = proposal.contract_details ?? {};
                    setQuote({
                        maxPayout: Number(validation.max_payout) || null,
                        maxTicks: Number(validation.max_ticks) || null,
                        minStake: Number(details.minimum_stake) || null,
                        maxStake: Number(details.maximum_stake) || null,
                        error: null,
                        loading: false,
                    });
                })
                .catch((error: any) => {
                    if (requestSeq.current !== seq) return;
                    setQuote({ ...EMPTY, error: error?.message ?? 'Could not price this contract.' });
                });
        }, DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [symbol, currency, amount, growthRate, takeProfit, enabled]);

    return quote;
}
