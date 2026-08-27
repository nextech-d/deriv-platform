export type LiveAccountBalance = {
    balance?: number;
    converted_amount?: number;
    currency?: string;
    demo_account?: number;
    loginid?: string;
    status?: number;
};

export type LiveBalancePayload = {
    accounts?: Record<string, LiveAccountBalance>;
    balance?: number;
    currency?: string;
    id?: string;
    loginid?: string;
};

export type LiveBalanceState = {
    balance: string;
    currency: string;
    loginid: string;
    all_accounts_balance: LiveBalancePayload | null;
};

export function toBalanceNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value.replace(/,/g, '').trim());
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
}

export function unwrapSocketPayload(res: unknown): Record<string, unknown> | null {
    if (!res || typeof res !== 'object') return null;
    const envelope = res as { data?: unknown; msg_type?: unknown };
    if (envelope.data && typeof envelope.data === 'object') {
        return envelope.data as Record<string, unknown>;
    }
    if (typeof envelope.msg_type === 'string') {
        return envelope as Record<string, unknown>;
    }
    return null;
}

export function normalizeBalancePayload(payload: unknown, fallback_loginid = ''): LiveBalancePayload | null {
    const as_number = toBalanceNumber(payload);
    if (as_number !== undefined) {
        return { balance: as_number, loginid: fallback_loginid || undefined };
    }
    if (!payload || typeof payload !== 'object') return null;

    const row = payload as Record<string, unknown>;
    let accounts: Record<string, LiveAccountBalance> | undefined;
    if (row.accounts && typeof row.accounts === 'object') {
        accounts = {};
        for (const [loginid, account] of Object.entries(row.accounts as Record<string, unknown>)) {
            if (!account || typeof account !== 'object') continue;
            const next = account as Record<string, unknown>;
            accounts[loginid] = {
                ...(next as LiveAccountBalance),
                loginid,
                balance: toBalanceNumber(next.balance),
                currency: typeof next.currency === 'string' ? next.currency : undefined,
            };
        }
    }

    const loginid = typeof row.loginid === 'string' && row.loginid ? row.loginid : fallback_loginid || undefined;
    const balance = toBalanceNumber(row.balance);
    const currency = typeof row.currency === 'string' ? row.currency : undefined;
    if (!accounts && balance === undefined && !loginid) return null;

    return {
        accounts,
        balance,
        currency,
        loginid,
        id: typeof row.id === 'string' ? row.id : undefined,
    };
}

/**
 * Deriv's `account: 'all'` snapshot includes `accounts`. Later ticks usually
 * only carry `{ loginid, balance }` for the account that changed — and sometimes
 * omit loginid. Merge those ticks so the header never keeps the first snapshot.
 */
export function mergeLiveBalance(state: LiveBalanceState, payload?: LiveBalancePayload | null): LiveBalanceState {
    if (!payload) return state;

    const accounts: Record<string, LiveAccountBalance> = { ...(state.all_accounts_balance?.accounts ?? {}) };

    if (payload.accounts) {
        for (const [loginid, account] of Object.entries(payload.accounts)) {
            accounts[loginid] = { ...accounts[loginid], ...account };
        }
    }

    const tick_amount = toBalanceNumber(payload.balance);
    const tick_loginid = payload.loginid || state.loginid;
    if (tick_loginid && tick_amount !== undefined) {
        accounts[tick_loginid] = {
            ...accounts[tick_loginid],
            loginid: tick_loginid,
            balance: tick_amount,
            converted_amount: tick_amount,
            currency: payload.currency ?? accounts[tick_loginid]?.currency,
        };
    }

    const from_active_row = state.loginid ? toBalanceNumber(accounts[state.loginid]?.balance) : undefined;
    const is_active = !state.loginid || !payload.loginid || payload.loginid === state.loginid;
    const next_amount = is_active && tick_amount !== undefined ? tick_amount : from_active_row;
    const next_balance = next_amount !== undefined ? String(next_amount) : state.balance;
    const next_currency =
        (is_active && payload.currency) ||
        (state.loginid ? accounts[state.loginid]?.currency : undefined) ||
        state.currency;

    return {
        balance: next_balance,
        currency: next_currency,
        loginid: state.loginid,
        all_accounts_balance: {
            ...state.all_accounts_balance,
            accounts,
            balance: next_amount ?? state.all_accounts_balance?.balance,
            currency: next_currency,
            loginid: is_active && tick_loginid ? tick_loginid : state.all_accounts_balance?.loginid,
            id: payload.id ?? state.all_accounts_balance?.id,
        },
    };
}

export function resolveAccountBalance(liveAmount: number | undefined, directBalance: string | undefined): number {
    const from_direct = toBalanceNumber(directBalance);
    const from_map = toBalanceNumber(liveAmount);
    if (from_direct !== undefined && directBalance !== '0') return from_direct;
    if (from_map !== undefined) return from_map;
    if (from_direct !== undefined) return from_direct;
    return 0;
}

export function socketMessageToBalancePayload(
    res: unknown,
    active_loginid = ''
): LiveBalancePayload | null {
    const msg = unwrapSocketPayload(res);
    if (!msg || msg.error) return null;

    if (msg.msg_type === 'topup_virtual') {
        const topup = msg.topup_virtual as { amount?: unknown; currency?: unknown } | undefined;
        return normalizeBalancePayload(
            {
                balance: topup?.amount,
                currency: topup?.currency,
                loginid: active_loginid,
            },
            active_loginid
        );
    }

    if (msg.msg_type !== 'balance') return null;
    return normalizeBalancePayload(msg.balance, active_loginid);
}
