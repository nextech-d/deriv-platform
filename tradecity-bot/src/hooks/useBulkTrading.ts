import { useCallback, useEffect, useRef, useState } from 'react';
import { api_base } from '@/external/bot-skeleton';
import { tradeOptionToBuy } from '@/external/bot-skeleton/services/tradeEngine/utils/helpers';
import { mirrorContract } from '@/utils/copy-mirror';

export interface OpenContractRecord {
    contractId: number;
    symbol: string;
    contractType: string;
    buyPrice: number;
    profit: number | null;
    isSold: boolean;
    status: string | null;
    currency: string;
    batchId: number;
}

/** One settled contract, in the order Deriv reported it. */
export interface SettlementEvent {
    batchId: number;
    contractId: number;
    symbol: string;
    contractType: string;
    profit: number;
    won: boolean;
}

/** Emitted once every contract bought under a batch id has settled. */
export interface BatchResult {
    batchId: number;
    symbol: string;
    contractType: string;
    profit: number;
    closed: number;
    total: number;
    won: boolean;
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

interface BatchState {
    symbol: string;
    contractType: string;
    total: number;
    totalKnown: boolean;
    settled: number;
    profit: number;
    emitted: boolean;
}

const NEEDS_BARRIER = ['DIGITOVER', 'DIGITUNDER', 'DIGITMATCH', 'DIGITDIFF'];

/**
 * Buys digit contracts and tracks each one through proposal_open_contract.
 * Win/loss and profit come from the settled contract rather than a local
 * estimate, so desk statistics agree with the account. Subscriptions are
 * forgotten individually so the bot's own streams are untouched.
 */
export function useBulkTrading(currency: string) {
    const [contracts, setContracts] = useState<OpenContractRecord[]>([]);
    const [settlements, setSettlements] = useState<SettlementEvent[]>([]);
    const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
    const [busy, setBusy] = useState(false);
    const [closingId, setClosingId] = useState<number | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const subscriptionIds = useRef<string[]>([]);
    const contractsRef = useRef<OpenContractRecord[]>([]);
    const batchesRef = useRef<Map<number, BatchState>>(new Map());
    const batchSeq = useRef(0);

    const finalizeBatch = useCallback((batchId: number) => {
        const batch = batchesRef.current.get(batchId);
        if (!batch || batch.emitted || !batch.totalKnown) return;
        if (batch.settled < batch.total) return;
        batch.emitted = true;
        setBatchResults(prev => [
            ...prev,
            {
                batchId,
                symbol: batch.symbol,
                contractType: batch.contractType,
                profit: Number(batch.profit.toFixed(2)),
                closed: batch.settled,
                total: batch.total,
                won: batch.profit >= 0,
            },
        ]);
    }, []);

    useEffect(() => {
        const api = api_base?.api as TApi | null;
        if (!api) return;

        const subscription = api.onMessage().subscribe(({ data }) => {
            if (data?.msg_type !== 'proposal_open_contract' || !data.proposal_open_contract) return;
            const poc = data.proposal_open_contract;
            const contractId = Number(poc.contract_id);
            if (!contractId) return;

            const existing = contractsRef.current.find(item => item.contractId === contractId);
            if (!existing) return;

            const profit = poc.profit == null ? existing.profit : Number(poc.profit);
            const isSold = Boolean(poc.is_sold);
            const justSettled = isSold && !existing.isSold;
            const updated: OpenContractRecord = {
                ...existing,
                profit,
                isSold,
                status: poc.status ?? existing.status,
            };

            contractsRef.current = contractsRef.current.map(item =>
                item.contractId === contractId ? updated : item
            );
            setContracts(contractsRef.current);

            if (!justSettled) return;

            const settledProfit = profit ?? 0;
            const won = poc.status ? poc.status === 'won' : settledProfit > 0;
            setSettlements(prev => [
                ...prev,
                {
                    batchId: updated.batchId,
                    contractId,
                    symbol: updated.symbol,
                    contractType: updated.contractType,
                    profit: settledProfit,
                    won,
                },
            ]);

            const batch = batchesRef.current.get(updated.batchId);
            if (batch) {
                batch.settled += 1;
                batch.profit += settledProfit;
                finalizeBatch(updated.batchId);
            }
        });

        return () => {
            subscription.unsubscribe();
            const ids = subscriptionIds.current;
            subscriptionIds.current = [];
            ids.forEach(id => api.forget(id));
        };
    }, [finalizeBatch]);

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

    /** Allocates a batch id synchronously and purchases in the background. */
    const buy = useCallback(
        (request: BulkTradeRequest): number => {
            const batchId = (batchSeq.current += 1);
            batchesRef.current.set(batchId, {
                symbol: request.symbol,
                contractType: request.contractType,
                total: 0,
                totalKnown: false,
                settled: 0,
                profit: 0,
                emitted: false,
            });

            const api = api_base?.api as TApi | null;
            if (!api) {
                setNotice('Waiting for the feed.');
                const batch = batchesRef.current.get(batchId)!;
                batch.totalKnown = true;
                finalizeBatch(batchId);
                return batchId;
            }

            // Built by the bot's own helper so these desks send exactly the payload
            // the trade engine sends — this API expects `underlying_symbol`, not `symbol`.
            const buyRequest = tradeOptionToBuy(request.contractType, {
                amount: request.amount,
                basis: 'stake',
                currency,
                duration: request.duration,
                duration_unit: request.durationUnit,
                symbol: request.symbol,
                prediction:
                    NEEDS_BARRIER.includes(request.contractType) && request.lastDigitPrediction != null
                        ? request.lastDigitPrediction
                        : undefined,
            });
            const parameters = buyRequest.parameters as Record<string, unknown>;

            void (async () => {
                setBusy(true);
                let bought = 0;
                try {
                    for (let i = 0; i < request.count; i += 1) {
                        // Sequential so a rejected contract stops the batch instead of firing all of them.
                        // eslint-disable-next-line no-await-in-loop
                        const response = await api.send(buyRequest);
                        const contract = response?.buy;
                        if (!contract?.contract_id) continue;

                        const record: OpenContractRecord = {
                            contractId: Number(contract.contract_id),
                            symbol: request.symbol,
                            contractType: request.contractType,
                            buyPrice: Number(contract.buy_price ?? request.amount),
                            profit: null,
                            isSold: false,
                            status: 'open',
                            currency,
                            batchId,
                        };
                        bought += 1;
                        mirrorContract(parameters, request.amount);
                        contractsRef.current = [record, ...contractsRef.current];
                        setContracts(contractsRef.current);
                        trackContract(record.contractId);
                    }
                } catch (error: any) {
                    setNotice(error?.error?.message ?? 'Could not place the trade.');
                } finally {
                    setBusy(false);
                    const batch = batchesRef.current.get(batchId);
                    if (batch) {
                        batch.total = bought;
                        batch.totalKnown = true;
                        finalizeBatch(batchId);
                    }
                }
            })();

            return batchId;
        },
        [currency, trackContract, finalizeBatch]
    );

    const closeContract = useCallback((contractId: number) => {
        const api = api_base?.api as TApi | null;
        if (!api) return;
        setClosingId(contractId);
        api.send({ sell: contractId, price: 0 })
            .catch((error: any) => setNotice(error?.error?.message ?? 'Could not close the contract.'))
            .finally(() => setClosingId(null));
    }, []);

    return { contracts, settlements, batchResults, buy, closeContract, closingId, busy, notice, setNotice };
}
