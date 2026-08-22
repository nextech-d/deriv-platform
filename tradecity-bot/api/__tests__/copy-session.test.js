jest.mock('../_lib/deriv', () => ({ fetchOptionsAccounts: async () => [] }));
jest.mock('../_lib/store', () => ({ readRecord: async () => null, writeRecord: async () => {} }));

const { publicView, startBlocker } = require('../_lib/session');

const OWN = [
    { accountId: 'A1', loginid: 'DOT93804017', currency: 'USD', isDemo: true },
    { accountId: 'A2', loginid: 'CR55501', currency: 'USD', isDemo: false },
];

function record(overrides = {}) {
    return { tokens: [], accounts: [], mode: 'demo', session: null, ...overrides };
}

describe('copy session start gate', () => {
    it('asks for an extra-account PAT when none is stored', () => {
        expect(startBlocker(record(), OWN)).toBe('Add a PAT for another demo account.');
    });

    it('names the real mode when real is selected', () => {
        expect(startBlocker(record({ mode: 'real' }), OWN)).toBe('Add a PAT for another real account.');
    });

    it('asks for an enabled account once a PAT is stored', () => {
        const state = record({
            accounts: [{ accountId: 'A1', loginid: 'DOT93804017', isDemo: true, enabled: false, tokenId: 't1' }],
        });
        expect(startBlocker(state, OWN)).toBe('Enable at least one demo account before starting.');
    });

    it('stays blocked when the only enabled account is the caller own login', () => {
        const state = record({
            accounts: [{ accountId: 'A1', loginid: 'DOT93804017', isDemo: true, enabled: true, tokenId: 't1' }],
        });
        expect(startBlocker(state, OWN)).toBe(
            'Enable another demo account. Copy will not run on the account that places the trade.'
        );
    });

    it('clears once an extra account is enabled', () => {
        const state = record({
            accounts: [
                { accountId: 'A1', loginid: 'DOT93804017', isDemo: true, enabled: false, tokenId: 't1' },
                { accountId: 'A3', loginid: 'DOT77777', isDemo: true, enabled: true, tokenId: 't2' },
            ],
        });
        expect(startBlocker(state, OWN)).toBeNull();
    });

    it('clears when two own accounts of the same mode are enabled', () => {
        const twoOwn = [
            ...OWN,
            { accountId: 'A3', loginid: 'DOT77777', currency: 'USD', isDemo: true },
        ];
        const state = record({
            accounts: [
                { accountId: 'A1', loginid: 'DOT93804017', isDemo: true, enabled: true, tokenId: 't1' },
                { accountId: 'A3', loginid: 'DOT77777', isDemo: true, enabled: true, tokenId: 't1' },
            ],
        });
        expect(startBlocker(state, twoOwn)).toBeNull();
    });

    it('does not let an enabled real account unblock a demo session', () => {
        const state = record({
            accounts: [
                { accountId: 'A1', loginid: 'DOT93804017', isDemo: true, enabled: false, tokenId: 't1' },
                { accountId: 'A2', loginid: 'CR55501', isDemo: false, enabled: true, tokenId: 't1' },
            ],
        });
        expect(startBlocker(state, OWN)).toBe('Enable at least one demo account before starting.');
    });
});

describe('copy state serialisation', () => {
    it('never includes the stored ciphertext', () => {
        const state = record({
            tokens: [{ id: 't1', cipher: 'v1.super.secret.value', maskedToken: '••••1234', addedAt: 'now', accountIds: ['A1'] }],
            accounts: [{ accountId: 'A1', loginid: 'DOT93804017', currency: 'USD', isDemo: true, tokenId: 't1', enabled: true }],
        });
        const serialised = JSON.stringify(publicView(state, OWN));
        expect(serialised).not.toContain('cipher');
        expect(serialised).not.toContain('super.secret.value');
        expect(serialised).toContain('••••1234');
    });

    it('always carries the start gate so the UI cannot go stale', () => {
        expect(publicView(record(), OWN)).toHaveProperty('blocker');
    });
});
