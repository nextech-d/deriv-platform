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
    it('asks for a PAT covering the demo login when none is stored', () => {
        expect(startBlocker(record(), OWN)).toBe('Add a PAT containing DOT93804017 before starting.');
    });

    it('names the real login when real mode is selected', () => {
        expect(startBlocker(record({ mode: 'real' }), OWN)).toBe('Add a PAT containing CR55501 before starting.');
    });

    it('asks for an enabled account once the PAT is stored', () => {
        const state = record({
            accounts: [{ accountId: 'A1', loginid: 'DOT93804017', isDemo: true, enabled: false, tokenId: 't1' }],
        });
        expect(startBlocker(state, OWN)).toBe('Enable at least one demo account before starting.');
    });

    it('clears once a matching account is enabled', () => {
        const state = record({
            accounts: [{ accountId: 'A1', loginid: 'DOT93804017', isDemo: true, enabled: true, tokenId: 't1' }],
        });
        expect(startBlocker(state, OWN)).toBeNull();
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
