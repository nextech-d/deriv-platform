import { useEffect, useState } from 'react';
import {
    account_list$,
    activeLoginid$,
    authData$,
    CONNECTION_STATUS,
    connectionStatus$,
    isAuthorized$,
    isAuthorizing$,
    notifyActiveLoginidChange,
} from '@/external/bot-skeleton/services/api/observables/connection-status-stream';
import { TAuthData } from '@/types/api-types';

export const useApiBase = () => {
    const [connectionStatus, setConnectionStatus] = useState<CONNECTION_STATUS>(CONNECTION_STATUS.UNKNOWN);
    const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
    const [isAuthorizing, setIsAuthorizing] = useState<boolean>(true); // Will be overridden by observable stream which now starts with true
    const [accountList, setAccountList] = useState<TAuthData['account_list']>([]);
    const [authData, setAuthData] = useState<TAuthData | null>(null);
    const [activeLoginid, setActiveLoginid] = useState<string>('');

    useEffect(() => {
        const connectionStatusSubscription = connectionStatus$.subscribe(status => {
            setConnectionStatus(status as CONNECTION_STATUS);
        });

        const isAuthorizedSubscription = isAuthorized$.subscribe(isAuthorized => {
            setIsAuthorized(isAuthorized);
        });

        const isAuthorizingSubscription = isAuthorizing$.subscribe(isAuthorizing => {
            setIsAuthorizing(isAuthorizing);
        });
        const accountListSubscription = account_list$.subscribe(accountList => {
            setAccountList(accountList);
        });
        const authDataSubscription = authData$.subscribe(authData => {
            setAuthData(authData);
            // An explicit clear means the session is gone: regenerateWebSocket calls
            // setAuthData(null) on every account switch, and it leaves active_loginid
            // in localStorage on purpose. Without clearing here, activeLoginid stays
            // truthy from the moment of the click while accountList is [], so the
            // header matches neither its signed-in branch nor its signed-out one and
            // the spinner becomes terminal when the re-authorize does not land.
            if (!authData) {
                setActiveLoginid('');
                // activeLoginid$ is a BehaviorSubject with exactly one subscriber
                // (below). Reset its retained value too, or a remount during the
                // switch re-reads the stale id and undoes the clear.
                notifyActiveLoginidChange('');
                return;
            }
            // Live session: localStorage still wins, so balance ticks follow the
            // account the switcher selected before the socket has caught up.
            const stored = localStorage.getItem('active_loginid');
            const loginid = stored || authData.loginid || '';
            setActiveLoginid(loginid);
            if (loginid) notifyActiveLoginidChange(loginid);
        });
        const activeLoginidSubscription = activeLoginid$.subscribe(loginid => {
            if (loginid) setActiveLoginid(loginid);
        });

        return () => {
            connectionStatusSubscription.unsubscribe();
            isAuthorizedSubscription.unsubscribe();
            isAuthorizingSubscription.unsubscribe();
            accountListSubscription.unsubscribe();
            authDataSubscription.unsubscribe();
            activeLoginidSubscription.unsubscribe();
        };
    }, []);

    return { connectionStatus, isAuthorized, isAuthorizing, accountList, authData, activeLoginid, setIsAuthorizing };
};
