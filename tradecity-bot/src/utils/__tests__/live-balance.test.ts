import { mergeLiveBalance, resolveAccountBalance, type LiveBalanceState } from '../live-balance';

const empty = (loginid = 'CR123'): LiveBalanceState => ({
    balance: '0',
    currency: 'USD',
    loginid,
    all_accounts_balance: null,
});

describe('mergeLiveBalance', () => {
    it('keeps the all-accounts snapshot and writes later ticks into that map', () => {
        const snapshot = mergeLiveBalance(empty(), {
            balance: 10000.3,
            currency: 'USD',
            loginid: 'CR123',
            accounts: {
                CR123: { balance: 10000.3, currency: 'USD', demo_account: 0 },
                VRTC9: { balance: 5000, currency: 'USD', demo_account: 1 },
            },
        });

        const traded = mergeLiveBalance(snapshot, {
            balance: 9990.3,
            currency: 'USD',
            loginid: 'CR123',
        });

        expect(traded.balance).toBe('9990.3');
        expect(traded.all_accounts_balance?.accounts?.CR123?.balance).toBe(9990.3);
        expect(traded.all_accounts_balance?.accounts?.VRTC9?.balance).toBe(5000);
    });

    it('does not overwrite the active balance when another account ticks', () => {
        const snapshot = mergeLiveBalance(empty('CR123'), {
            balance: 100,
            currency: 'USD',
            loginid: 'CR123',
            accounts: {
                CR123: { balance: 100, currency: 'USD' },
                VRTC9: { balance: 50, currency: 'USD' },
            },
        });

        const other = mergeLiveBalance(snapshot, {
            balance: 40,
            currency: 'USD',
            loginid: 'VRTC9',
        });

        expect(other.balance).toBe('100');
        expect(other.all_accounts_balance?.accounts?.CR123?.balance).toBe(100);
        expect(other.all_accounts_balance?.accounts?.VRTC9?.balance).toBe(40);
    });

    it('merges a partial accounts map instead of dropping the rest', () => {
        const snapshot = mergeLiveBalance(empty(), {
            accounts: {
                CR123: { balance: 100, currency: 'USD' },
                VRTC9: { balance: 50, currency: 'USD' },
            },
            loginid: 'CR123',
            balance: 100,
            currency: 'USD',
        });

        const partial = mergeLiveBalance(snapshot, {
            accounts: {
                CR123: { balance: 88, currency: 'USD' },
            },
        });

        expect(partial.all_accounts_balance?.accounts?.CR123?.balance).toBe(88);
        expect(partial.all_accounts_balance?.accounts?.VRTC9?.balance).toBe(50);
        expect(partial.balance).toBe('88');
    });

    it('applies the first tick before the active loginid is known', () => {
        const first = mergeLiveBalance(empty(''), {
            balance: 10000.3,
            currency: 'USD',
            loginid: 'CR123',
        });

        expect(first.balance).toBe('10000.3');
        expect(first.all_accounts_balance?.accounts?.CR123?.balance).toBe(10000.3);
    });
});

describe('resolveAccountBalance', () => {
    it('uses a live map amount of zero instead of falling back', () => {
        expect(resolveAccountBalance(0, '12.00')).toBe(0);
    });

    it('falls back to the direct balance when the map has no row', () => {
        expect(resolveAccountBalance(undefined, '10.5')).toBe(10.5);
    });
});
