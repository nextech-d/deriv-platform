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

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/**
 * Deriv's `account: 'all'` snapshot includes `accounts`. Later ticks usually
 * only carry `{ loginid, balance }` for the account that changed. Merge those
 * ticks so the header never keeps the first snapshot.
 */
export function mergeLiveBalance(state: LiveBalanceState, payload?: LiveBalancePayload | null): LiveBalanceState {
    if (!payload) return state;

    const accounts: Record<string, LiveAccountBalance> = { ...(state.all_accounts_balance?.accounts ?? {}) };

    if (payload.accounts) {
        for (const [loginid, account] of Object.entries(payload.accounts)) {
            accounts[loginid] = { ...accounts[loginid], ...account };
        }
    }

    if (payload.loginid && isFiniteNumber(payload.balance)) {
        accounts[payload.loginid] = {
            ...accounts[payload.loginid],
            loginid: payload.loginid,
            balance: payload.balance,
            converted_amount: payload.balance,
            currency: payload.currency ?? accounts[payload.loginid]?.currency,
        };
    }

    const from_active_row = state.loginid ? accounts[state.loginid]?.balance : undefined;
    const is_active = !state.loginid || !payload.loginid || payload.loginid === state.loginid;
    const next_amount = is_active && isFiniteNumber(payload.balance) ? payload.balance : from_active_row;
    const next_balance = isFiniteNumber(next_amount) ? String(next_amount) : state.balance;
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
            balance: isFiniteNumber(next_amount) ? next_amount : state.all_accounts_balance?.balance,
            currency: next_currency,
            loginid: is_active && payload.loginid ? payload.loginid : state.all_accounts_balance?.loginid,
            id: payload.id ?? state.all_accounts_balance?.id,
        },
    };
}

export function resolveAccountBalance(liveAmount: number | undefined, directBalance: string | undefined): number {
    if (isFiniteNumber(liveAmount)) return liveAmount;
    const parsed = Number.parseFloat(directBalance ?? '');
    return Number.isFinite(parsed) ? parsed : 0;
}
