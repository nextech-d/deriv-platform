import { OAuthTokenExchangeService } from '@/services/oauth-token-exchange.service';

export interface CopyAccount {
    accountId: string;
    loginid: string;
    currency: string;
    isDemo: boolean;
    tokenId: string;
    enabled: boolean;
}

export interface CopyToken {
    id: string;
    maskedToken: string;
    addedAt: string;
    accountIds: string[];
}

export interface CopySession {
    running: boolean;
    mode: CopyMode;
    startedAt: string;
}

export type CopyMode = 'demo' | 'real';

export interface CopyState {
    tokens: CopyToken[];
    accounts: CopyAccount[];
    mode: CopyMode;
    session: CopySession | null;
    ownLoginids: string[];
    blocker?: string | null;
}

export const EMPTY_COPY_STATE: CopyState = {
    tokens: [],
    accounts: [],
    mode: 'demo',
    session: null,
    ownLoginids: [],
    blocker: null,
};

/**
 * The Deriv session token the SPA already holds; proves identity to our API.
 * OAuth keeps it in sessionStorage under `auth_info`; `authToken` is only set
 * by the legacy account-switch URL flow, so both are checked.
 */
function sessionToken(): string {
    const oauthToken = OAuthTokenExchangeService.getAccessToken();
    if (oauthToken) return oauthToken;
    try {
        return localStorage.getItem('authToken') || '';
    } catch {
        return '';
    }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = sessionToken();
    if (!token) throw new Error('Sign in to manage copy trading accounts.');

    let response: Response;
    try {
        response = await fetch(`/api/copy/${path}`, {
            ...init,
            headers: {
                ...(init.headers || {}),
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });
    } catch {
        throw new Error('Could not reach the copy trading service.');
    }

    // The SPA fallback returns HTML when the functions are not deployed.
    const body = await response.text();
    let json: Record<string, unknown> = {};
    try {
        json = body ? JSON.parse(body) : {};
    } catch {
        throw new Error('Copy trading service is unavailable on this deployment.');
    }

    if (!response.ok) {
        throw new Error(typeof json.error === 'string' ? json.error : `Request failed (${response.status})`);
    }
    return json as T;
}

export const copyApi = {
    load: () => call<CopyState>('session'),
    addToken: (token: string) => call<CopyState>('tokens', { method: 'POST', body: JSON.stringify({ token }) }),
    removeToken: (id: string) => call<CopyState>(`tokens?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
    setMode: (mode: CopyMode) => call<CopyState>('accounts', { method: 'PATCH', body: JSON.stringify({ mode }) }),
    setEnabled: (accountId: string, enabled: boolean) =>
        call<CopyState>('accounts', { method: 'PATCH', body: JSON.stringify({ accountId, enabled }) }),
    start: () => call<CopyState>('session', { method: 'POST', body: JSON.stringify({ action: 'start' }) }),
    stop: () => call<CopyState>('session', { method: 'POST', body: JSON.stringify({ action: 'stop' }) }),
    replay: (parameters: Record<string, unknown>, maxPrice?: number) =>
        call<{ copied: number; total: number }>('replay', {
            method: 'POST',
            body: JSON.stringify({ parameters, maxPrice }),
        }),
};

export function accountsForMode(accounts: CopyAccount[], mode: CopyMode): CopyAccount[] {
    return accounts.filter(account => account.isDemo === (mode === 'demo'));
}

/** "0 enabled · 0 total" style counters used on the account cards. */
export function accountTally(accounts: CopyAccount[], mode: CopyMode): { enabled: number; total: number } {
    const scoped = accountsForMode(accounts, mode);
    return { enabled: scoped.filter(account => account.enabled).length, total: scoped.length };
}
