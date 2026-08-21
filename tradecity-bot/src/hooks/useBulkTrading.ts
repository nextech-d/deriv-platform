import { useCallback, useEffect, useRef, useState } from 'react';
import { api_base } from '@/external/bot-skeleton';

export interface OpenContractRecord {
    contractId: number;
    symbol: string;
    buyPrice: number;
    profit: number | null;
    isSold: boolean;
    status: string | null;
    currency: string;
}

export interface BulkTradeRequest {
    symbol: string;
    contractType: string;
    lastDigitPrediction?: number;
    duration: number;
    durationUnit: string;
    amount: number;
    count: number;
}

type TApi = {
    send: (request: Record<string, unknown>) => Promise<Record<string, any>>;
    forget: (id: string) => Promise<unknown>;
    onMessage: () => { subscribe: (cb: (msg: { data: Record<string, any> }) => void) => { unsubscribe: () => void } };
};

const NEEDS_BARRIER = ['DIGITOVER', 'DIGITUNDER', 'DIGITMATCH', 'DIGITDIFF'];

/**
 * Buys bulk digit contracts and tracks each one through proposal_open_contract.
 * Subscriptions are forgotten individually so the bot's own streams are untouched.
 */
export function useBulkTrading(currency: string) {
    const [contracts, setContracts] = useState<OpenContractRecord[]>([]);
    const [busy, setBusy] = useState(false);
    const [closingId, setClosingId] = useState<number | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const subscriptionIds = useRef<string[]>([]);

    useEffect(() => {
        const api = api_base?.api as TApi | null;
        if (!api) return;

        const subscription = api.onMessage().subscribe(({ data }) => {
            if (data?.msg_type !== 'proposal_open_contract' || !data.proposal_open_contract) return;
            const poc = data.proposal_open_contract;
            const contractId = Number(poc.contract_id);
            if (!contractId) return;

            setContracts(prev =>
                prev.map(item =>
                    item.contractId === contractId
                        ? {
                              ...item,
                              profit: poc.profit == null ? item.profit : Number(poc.profit),
                              isSold: Boolean(poc.is_sold),
                              status: poc.status ?? item.status,
                          }
                        : item
                )
            );
        });

        return () => {
            subscription.unsubscribe();
            const ids = subscriptionIds.current;
            subscriptionIds.current = [];
            ids.forEach(id => api.forget(id));
        };
    }, []);

    const trackContract = useCallback((contractId: number) => {
        const api = api_base?.api as TApi | null;
        if (!api) return;
        api.send({ proposal_open_contract: 1, contract_id: contractId, subscribe: 1 })
            .then(response => {
                const id = response?.subscription?.id;
                if (id) subscriptionIds.current.push(id);
            })
            .catch(() => {
                /* contract still shows from the buy response */
            });
    }, []);

    const buy = useCallback(
        async (request: BulkTradeRequest) => {
            const api = api_base?.api as TApi | null;
            if (!api) {
                setNotice('Waiting for the feed.');
                return;
            }

            const parameters: Record<string, unknown> = {
                amount: request.amount,
                basis: 'stake',
                contract_type: request.contractType,
                currency,
                duration: request.duration,
                duration_unit: request.durationUnit,
                symbol: request.symbol,
            };
            if (NEEDS_BARRIER.includes(request.contractType) && request.lastDigitPrediction != null) {
                parameters.barrier = String(request.lastDigitPrediction);
            }

            setBusy(true);
            try {
                for (let i = 0; i < request.count; i += 1) {
                    // Sequential so a rejected contract stops the batch instead of firing all of them.
                    // eslint-disable-next-line no-await-in-loop
                    const response = await api.send({ buy: '1', price: request.amount, parameters });
                    const bought = response?.buy;
                    if (!bought?.contract_id) continue;

                    const record: OpenContractRecord = {
                        contractId: Number(bought.contract_id),
                        symbol: request.symbol,
                        buyPrice: Number(bought.buy_price ?? request.amount),
                        profit: null,
                        isSold: false,
                        status: 'open',
                        currency,
                    };
                    setContracts(prev => [record, ...prev]);
                    trackContract(record.contractId);
                }
            } catch (error: any) {
                setNotice(error?.error?.message ?? 'Could not place the trade.');
            } finally {
                setBusy(false);
            }
        },
        [currency, trackContract]
    );

    const closeContract = useCallback((contractId: number) => {
        const api = api_base?.api as TApi | null;
        if (!api) return;
        setClosingId(contractId);
        api.send({ sell: contractId, price: 0 })
            .catch((error: any) => setNotice(error?.error?.message ?? 'Could not close the contract.'))
            .finally(() => setClosingId(null));
    }, []);

    return { contracts, buy, closeContract, closingId, busy, notice, setNotice };
}
