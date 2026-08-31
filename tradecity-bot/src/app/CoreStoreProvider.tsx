import { useCallback, useEffect, useMemo, useRef } from 'react';
import Cookies from 'js-cookie';
import { observer } from 'mobx-react-lite';
import { toMoment } from '@/components/shared';
import { FORM_ERROR_MESSAGES } from '@/components/shared/constants/form-error-messages';
import { initFormErrorMessages } from '@/components/shared/utils/validation/declarative-validation-rules';
import { api_base } from '@/external/bot-skeleton';
import { CONNECTION_STATUS } from '@/external/bot-skeleton/services/api/observables/connection-status-stream';
import { useApiBase } from '@/hooks/useApiBase';
import { useLogout } from '@/hooks/useLogout';
import { useStore } from '@/hooks/useStore';
import { TSocketResponseData } from '@/types/api-types';
import { getAccountId } from '@/utils/account-helpers';
import { installActiveLoginidSync } from '@/utils/active-loginid-sync';
import { clearInvalidTokenParams } from '@/utils/url-utils';
import { socketMessageToBalancePayload, unwrapSocketPayload } from '@/utils/live-balance';
import { useTranslations } from '@deriv-com/translations';

type TClientInformation = {
    loginid?: string;
    email?: string;
    currency?: string;
    residence?: string | null;
    first_name?: string;
    last_name?: string;
    preferred_language?: string | null;
    user_id?: number | string;
};
const CoreStoreProvider: React.FC<{ children: React.ReactNode }> = observer(({ children }) => {
    const currentDomain = useMemo(() => '.' + window.location.hostname.split('.').slice(-2).join('.'), []);
    const { isAuthorizing, isAuthorized, connectionStatus, accountList, activeLoginid } = useApiBase();

    const appInitialization = useRef(false);
    const accountInitialization = useRef(false);
    const timeInterval = useRef<NodeJS.Timeout | null>(null);
    const msg_listener = useRef<{ unsubscribe: () => void } | null>(null);
    const { client, common } = useStore() ?? {};

    const { currentLang } = useTranslations();

    const handleLogout = useLogout();

    const activeAccount = useMemo(
        () => accountList?.find(account => account.loginid === activeLoginid),
        [activeLoginid, accountList]
    );

    useEffect(() => {
        if (client && activeAccount && isAuthorized) {
            client?.setLoginId(activeLoginid);
            client?.setAccountList(accountList);
            client?.setIsLoggedIn(true);
        } else if (client && !isAuthorized) {
            // Ensure client shows as not logged in until authorization is complete
            client?.setIsLoggedIn(false);
        }
    }, [accountList, activeAccount, activeLoginid, client, isAuthorized]);

    useEffect(() => {
        if (!client) return;
        installActiveLoginidSync(loginid => client.setLoginId(loginid));
    }, [client]);

    useEffect(() => {
        initFormErrorMessages(FORM_ERROR_MESSAGES());

        return () => {
            if (timeInterval.current) {
                clearInterval(timeInterval.current);
            }
        };
    }, []);

    useEffect(() => {
        if (common && currentLang) {
            common.setCurrentLanguage(currentLang);
        }
    }, [currentLang, common]);

    // Type-safe interface for API with time() method
    interface ApiWithTime {
        time(): Promise<TSocketResponseData<'time'>>;
    }

    useEffect(() => {
        const updateServerTime = () => {
            // Fixed type safety: replaced 'as any' with proper interface and runtime check
            // Ensures time() method exists before calling it
            if (!api_base.api || !('time' in api_base.api)) return;
            (api_base.api as ApiWithTime)
                .time()
                .then((res: TSocketResponseData<'time'>) => {
                    common.setServerTime(toMoment(res.time), false);
                })
                .catch(() => {
                    common.setServerTime(toMoment(Date.now()), true);
                });
        };

        // Clear any existing interval before setting up a new one
        if (timeInterval.current) {
            clearInterval(timeInterval.current);
            timeInterval.current = null;
        }

        if (client && !appInitialization.current) {
            if (!api_base?.api) return;
            appInitialization.current = true;

            // Initial time update
            updateServerTime();

            // Schedule updates every 10 seconds
            timeInterval.current = setInterval(updateServerTime, 10000);
        }

        // Cleanup on unmount or dependency change
        return () => {
            if (timeInterval.current) {
                clearInterval(timeInterval.current);
                timeInterval.current = null;
            }
        };
    }, [client, common]);

    const handleMessages = useCallback(
        async (res: unknown) => {
            if (!res) return;
            const data = unwrapSocketPayload(res);
            if (!data) return;
            const error = data.error as { code?: string } | undefined;

            if (
                error?.code === 'AuthorizationRequired' ||
                error?.code === 'DisabledClient' ||
                error?.code === 'InvalidToken'
            ) {
                clearInvalidTokenParams();
                await client?.logout();
                return;
            }

            const active_loginid = getAccountId() || client?.loginid || '';
            const payload = socketMessageToBalancePayload(res, active_loginid);
            if (payload) {
                client?.applyBalanceUpdate(payload);
            }
        },
        [client]
    );

    // The Deriv balance stream is delivered over the shared api_base.api socket.
    // That socket is regenerated on reconnect/account-switch (api_base.init swaps
    // api_base.api for a NEW instance) and isAuthorized briefly flips false while
    // it re-authorizes. The listener must therefore survive both: we re-attach
    // whenever the underlying socket INSTANCE changes and never tear the listener
    // down just because isAuthorized momentarily dropped — otherwise mid-run
    // ticks are silently lost until the next Stop and the header freezes.
    const attached_socket = useRef<unknown>(null);

    useEffect(() => {
        if (!client) return undefined;

        let subscription: { unsubscribe: () => void } | null = null;
        let retryTimer: ReturnType<typeof setInterval> | null = null;

        const attach = () => {
            const api = api_base?.api;
            if (!api?.onMessage) return false;
            // Same socket instance already wired up — nothing to do.
            if (attached_socket.current === api && msg_listener.current) return true;
            subscription?.unsubscribe();
            msg_listener.current?.unsubscribe();
            subscription = api.onMessage().subscribe(handleMessages);
            attached_socket.current = api;
            msg_listener.current = { unsubscribe: subscription.unsubscribe.bind(subscription) };
            return true;
        };

        if (!attach()) {
            retryTimer = setInterval(() => {
                if (attach() && retryTimer) {
                    clearInterval(retryTimer);
                    retryTimer = null;
                }
            }, 250);
        }

        return () => {
            if (retryTimer) clearInterval(retryTimer);
            subscription?.unsubscribe();
            attached_socket.current = null;
            msg_listener.current = null;
        };
    }, [connectionStatus, handleMessages, client]);

    // Safety net: when the socket (re)opens, the freshly-subscribed balance
    // stream may not replay the current amount, so resync once from the API.
    // One-shot only — the periodic bot.running poll that caused the Run-freeze
    // regression (d3f23e4) is intentionally NOT reintroduced here.
    useEffect(() => {
        if (!client || connectionStatus !== CONNECTION_STATUS.OPENED) return;
        void client.refreshBalanceFromApi?.();
    }, [connectionStatus, client]);

    useEffect(() => {
        if (!isAuthorizing && isAuthorized && !accountInitialization.current && client) {
            accountInitialization.current = true;
            const client_information: TClientInformation = {
                loginid: activeAccount?.loginid,
                email: '',
                currency: client?.currency,
                residence: '',
                first_name: '',
                last_name: '',
                preferred_language: '',
                user_id:
                    (api_base.account_info &&
                    typeof api_base.account_info === 'object' &&
                    'user_id' in api_base.account_info
                        ? (api_base.account_info as { user_id: number }).user_id
                        : null) || activeLoginid,
            };

            Cookies.set('client_information', JSON.stringify(client_information), {
                domain: currentDomain,
            });
        }
    }, [isAuthorizing, isAuthorized, client, activeAccount?.loginid, activeLoginid, currentDomain]);

    return <>{children}</>;
});

export default CoreStoreProvider;
