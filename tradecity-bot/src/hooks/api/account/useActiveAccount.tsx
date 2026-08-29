import { useCallback, useEffect, useRef, useState } from 'react';
import { useObserver } from 'mobx-react-lite';
/* [AI] - Analytics removed - utility functions moved to @/utils/account-helpers */
import { getAccountId, isVirtualAccount } from '@/utils/account-helpers';
/* [/AI] */
import { CurrencyIcon } from '@/components/currency/currency-icon';
import { addComma, getDecimalPlaces } from '@/components/shared';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import { resolveAccountBalance, socketMessageToBalancePayload, toBalanceNumber } from '@/utils/live-balance';
import { Balance } from '@deriv/api-types';

export type TAccount = {
    balance: string;
    currency: string;
    currencyLabel?: string;
    icon: React.ReactNode;
    isActive: boolean;
    isVirtual: boolean;
    loginid: string;
    token?: string;
    type?: string;
};

type UseActiveAccountReturn = {
    data: TAccount | undefined;
    refreshBalance: (force?: boolean) => void;
    isLoading?: boolean;
    isConnected?: boolean;
};

const isDerivSocketOpen = () => api_base.api?.connection?.readyState === 1;

/** Live balance for the active account via the existing Deriv WebSocket stream. */
const useActiveAccount = ({
    allBalanceData,
    directBalance,
}: {
    allBalanceData: Balance | null;
    directBalance?: string;
}): UseActiveAccountReturn => {
    const { accountList, activeLoginid, connectionStatus } = useApiBase();
    const { client } = useStore() ?? {};

    const [manualRefresh, setManualRefresh] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);

    const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
    const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastFetchRef = useRef<Date>(new Date());

    const notifyBalanceChange = useCallback(
        (loginid: string, balance?: number) => {
            lastFetchRef.current = new Date();
            setManualRefresh(prev => prev + 1);
            setIsWebSocketConnected(isDerivSocketOpen());

            if (balance !== undefined) {
                localStorage.setItem(`balance_${loginid}`, String(balance));
            }

            window.dispatchEvent(
                new CustomEvent('balanceUpdate', {
                    detail: {
                        loginid,
                        balance,
                        source: 'websocket',
                    },
                })
            );
        },
        []
    );

    const attachBalanceListener = useCallback(() => {
        if (!activeLoginid || !api_base?.api?.onMessage) {
            setIsWebSocketConnected(false);
            return false;
        }

        subscriptionRef.current?.unsubscribe();
        subscriptionRef.current = api_base.api.onMessage().subscribe((res: unknown) => {
            const loginid = getAccountId() || activeLoginid;
            const payload = socketMessageToBalancePayload(res, loginid);
            if (!payload) return;

            client?.applyBalanceUpdate?.(payload);

            const tick_loginid = payload.loginid || loginid;
            const tick_amount =
                toBalanceNumber(payload.balance) ??
                (tick_loginid ? toBalanceNumber(payload.accounts?.[tick_loginid]?.balance) : undefined);

            notifyBalanceChange(tick_loginid, tick_amount);
        });

        setIsWebSocketConnected(isDerivSocketOpen());
        return true;
    }, [activeLoginid, client, notifyBalanceChange]);

    const connectWebSocket = useCallback(() => {
        if (!activeLoginid) return;

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (attachBalanceListener()) {
            if (retryTimerRef.current) {
                clearInterval(retryTimerRef.current);
                retryTimerRef.current = null;
            }
            return;
        }

        retryTimerRef.current = setInterval(() => {
            if (attachBalanceListener() && retryTimerRef.current) {
                clearInterval(retryTimerRef.current);
                retryTimerRef.current = null;
            }
        }, 250);
    }, [activeLoginid, attachBalanceListener]);

    const refreshBalance = useCallback(
        (force: boolean = false) => {
            const now = new Date();
            const timeSinceLastFetch = now.getTime() - lastFetchRef.current.getTime();

            if (!force && timeSinceLastFetch < 1000) {
                return;
            }

            setIsLoading(true);
            lastFetchRef.current = now;

            void client?.refreshBalanceFromApi?.()?.finally(() => {
                setManualRefresh(prev => prev + 1);
                setIsLoading(false);
                setIsWebSocketConnected(isDerivSocketOpen());
            });
        },
        [client]
    );

    useEffect(() => {
        const handleBalanceUpdate = (event: Event) => {
            const detail = (event as CustomEvent<{ loginid?: string; source?: string }>).detail;
            if (detail?.source === 'websocket') return;
            if (detail?.loginid === activeLoginid || !detail?.loginid) {
                lastFetchRef.current = new Date();
                setManualRefresh(prev => prev + 1);
            }
        };

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key?.startsWith('balance_') || e.key === 'accounts') {
                setManualRefresh(prev => prev + 1);
            }
        };

        window.addEventListener('balanceUpdate', handleBalanceUpdate);
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('storageUpdate', handleBalanceUpdate);

        return () => {
            window.removeEventListener('balanceUpdate', handleBalanceUpdate);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('storageUpdate', handleBalanceUpdate);
        };
    }, [activeLoginid]);

    useEffect(() => {
        connectWebSocket();

        return () => {
            subscriptionRef.current?.unsubscribe();
            subscriptionRef.current = null;

            if (retryTimerRef.current) {
                clearInterval(retryTimerRef.current);
                retryTimerRef.current = null;
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }

            setIsWebSocketConnected(false);
        };
    }, [activeLoginid, connectionStatus, connectWebSocket]);

    useEffect(() => {
        if (!isWebSocketConnected && activeLoginid) {
            reconnectTimeoutRef.current = setTimeout(() => {
                connectWebSocket();
            }, 3000);
        }

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };
    }, [activeLoginid, isWebSocketConnected, connectWebSocket]);

    useEffect(() => {
        if (!activeLoginid || isWebSocketConnected) return undefined;

        const pollInterval = window.setInterval(() => {
            const timeSinceFetch = Date.now() - lastFetchRef.current.getTime();
            if (timeSinceFetch > 30000) {
                refreshBalance(false);
            }
        }, 10000);

        return () => {
            clearInterval(pollInterval);
        };
    }, [activeLoginid, isWebSocketConnected, refreshBalance]);

    return useObserver(() => {
        const liveMap = client?.all_accounts_balance ?? allBalanceData;
        const liveDirect = client?.balance ?? directBalance;

        void manualRefresh;
        void client?.balance_version;

        const activeAccount = accountList?.find(account => account.loginid === activeLoginid);

        if (!activeAccount) {
            return {
                data: undefined,
                refreshBalance,
                isLoading: false,
                isConnected: isWebSocketConnected,
            };
        }

        const isVirtual = isVirtualAccount(activeAccount.loginid);
        const currentBalanceData = liveMap?.accounts?.[activeAccount.loginid ?? ''];
        const storedBalance = localStorage.getItem(`balance_${activeAccount.loginid}`);
        const mapAmount = toBalanceNumber(currentBalanceData?.balance);
        const directCandidate = liveDirect ?? storedBalance ?? undefined;
        const amount = resolveAccountBalance(mapAmount, directCandidate);
        const decimals = getDecimalPlaces(currentBalanceData?.currency ?? activeAccount.currency);

        const accountData: TAccount = {
            ...activeAccount,
            balance: addComma(amount.toFixed(decimals)),
            currency: activeAccount.currency,
            currencyLabel: isVirtual ? 'Demo' : activeAccount.currency,
            icon: <CurrencyIcon currency={activeAccount.currency?.toLowerCase()} isVirtual={isVirtual} />,
            isActive: activeAccount.loginid === activeLoginid,
            isVirtual,
            loginid: activeAccount.loginid,
            token: '',
            type: '',
        };

        return {
            data: accountData,
            refreshBalance,
            isLoading,
            isConnected: isWebSocketConnected,
        };
    });
};

export default useActiveAccount;
