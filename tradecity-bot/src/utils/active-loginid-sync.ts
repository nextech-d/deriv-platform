import { notifyActiveLoginidChange } from '@/external/bot-skeleton/services/api/observables/connection-status-stream';

let installed = false;

/**
 * Account switcher writes active_loginid via localStorage.setItem without updating
 * authData$. Hook setItem once so balance ticks target the selected account immediately.
 */
export function installActiveLoginidSync(onLoginid: (loginid: string) => void) {
    if (installed || typeof window === 'undefined') return;
    installed = true;

    const nativeSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (key: string, value: string) => {
        nativeSetItem(key, value);
        if (key === 'active_loginid' && value) {
            notifyActiveLoginidChange(value);
            onLoginid(value);
        }
    };
}
