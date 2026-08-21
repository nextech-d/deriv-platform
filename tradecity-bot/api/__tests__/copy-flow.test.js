/**
 * Walks the whole copy-trading sequence through the real handlers: read the
 * empty state, add a PAT, discover accounts, enable one, start the session and
 * mirror a trade. Only Deriv and the KV store are faked, so the crypto, session
 * keying, gate and payload rebuilding are all the production code paths.
 */

process.env.COPY_TOKEN_SECRET = 'a'.repeat(64);
process.env.APP_ID = '99999';

const PAT = 'aBcDeF1234567890xyz';
const SESSION_TOKEN = 'session-token';

const mockKv = new Map();
const mockBuys = [];
const mockOwnAccounts = [
    { accountId: 'acc-demo', loginid: 'DOT93804017', currency: 'USD', isDemo: true },
    { accountId: 'acc-real', loginid: 'CR55501', currency: 'USD', isDemo: false },
];

jest.mock('../_lib/store', () => ({
    readRecord: async key => (mockKv.has(key) ? JSON.parse(mockKv.get(key)) : null),
    writeRecord: async (key, value) => {
        mockKv.set(key, JSON.stringify(value));
    },
    ping: async () => true,
}));

jest.mock('../_lib/deriv', () => ({
    fetchOptionsAccounts: async token => {
        if (token !== 'session-token' && token !== 'aBcDeF1234567890xyz') {
            throw new Error('Token rejected by Deriv');
        }
        return mockOwnAccounts.map(account => ({ ...account }));
    },
    buyContract: async (token, accountId, parameters, maxPrice) => {
        mockBuys.push({ token, accountId, parameters, maxPrice });
        return { contractId: 4242, buyPrice: parameters.amount, longcode: 'Win payout if...' };
    },
}));

const tokensHandler = require('../copy/tokens');
const accountsHandler = require('../copy/accounts');
const sessionHandler = require('../copy/session');
const replayHandler = require('../copy/replay');

const TRADE = {
    amount: 1,
    basis: 'stake',
    contract_type: 'DIGITOVER',
    currency: 'USD',
    duration: 1,
    duration_unit: 't',
    underlying_symbol: 'R_100',
    barrier: 5,
    selected_tick: 5,
};

function makeRes() {
    const captured = { code: 0, body: null };
    return {
        captured,
        setHeader: () => {},
        status(code) {
            captured.code = code;
            return this;
        },
        json(body) {
            captured.body = body;
            return this;
        },
    };
}

async function callApi(handler, { method = 'GET', body, query } = {}) {
    const res = makeRes();
    await handler(
        { method, body, query: query || {}, headers: { authorization: `Bearer ${SESSION_TOKEN}` } },
        res
    );
    return res.captured;
}

const storedRecord = () => JSON.parse(mockKv.get('copy:CR55501'));

describe('copy trading end to end', () => {
    beforeAll(() => {
        mockKv.clear();
        mockBuys.length = 0;
    });

    it('needs a signed-in caller', async () => {
        const res = makeRes();
        await sessionHandler({ method: 'GET', headers: {}, query: {} }, res);
        expect(res.captured.code).toBe(401);
    });

    it('opens blocked, naming the caller own demo login', async () => {
        const out = await callApi(sessionHandler);
        expect(out.code).toBe(200);
        expect(out.body.blocker).toBe('Add a PAT containing DOT93804017 before starting.');
        expect(out.body.accounts).toHaveLength(0);
        expect(out.body.mode).toBe('demo');
    });

    it('refuses a PAT Deriv will not accept', async () => {
        const out = await callApi(tokensHandler, { method: 'POST', body: { token: 'bogus-token-value' } });
        expect(out.code).toBe(400);
        expect(mockKv.size).toBe(0);
    });

    it('accepts a valid PAT and discovers both accounts', async () => {
        const out = await callApi(tokensHandler, { method: 'POST', body: { token: PAT } });
        expect(out.code).toBe(201);
        expect(out.body.accounts.map(account => account.loginid).sort()).toEqual(['CR55501', 'DOT93804017']);
        expect(out.body.accounts.every(account => account.enabled === false)).toBe(true);
        expect(out.body.blocker).toBe('Enable at least one demo account before starting.');
    });

    it('keeps the PAT out of storage and out of every response', async () => {
        expect(JSON.stringify(storedRecord())).not.toContain(PAT);
        expect(storedRecord().tokens[0].cipher).toMatch(/^v1\./);

        const out = await callApi(sessionHandler);
        const serialised = JSON.stringify(out.body);
        expect(serialised).not.toContain(PAT);
        expect(serialised).not.toContain('cipher');
        expect(out.body.tokens[0].maskedToken).toBe('••••••••0xyz');
    });

    it('rejects the same PAT twice', async () => {
        const out = await callApi(tokensHandler, { method: 'POST', body: { token: PAT } });
        expect(out.code).toBe(409);
    });

    it('clears the gate once a demo account is enabled', async () => {
        const out = await callApi(accountsHandler, {
            method: 'PATCH',
            body: { accountId: 'acc-demo', enabled: true },
        });
        expect(out.code).toBe(200);
        expect(out.body.blocker).toBeNull();
    });

    it('will not mirror before the session is started', async () => {
        const out = await callApi(replayHandler, { method: 'POST', body: { parameters: TRADE } });
        expect(out.code).toBe(409);
        expect(mockBuys).toHaveLength(0);
    });

    it('starts the session in demo mode', async () => {
        const out = await callApi(sessionHandler, { method: 'POST', body: { action: 'start' } });
        expect(out.code).toBe(200);
        expect(out.body.session).toMatchObject({ running: true, mode: 'demo' });
    });

    it('refuses to switch mode while running', async () => {
        const out = await callApi(accountsHandler, { method: 'PATCH', body: { mode: 'real' } });
        expect(out.code).toBe(409);
        expect(storedRecord().mode).toBe('demo');
    });

    it('does not mirror a trade back onto the account that placed it', async () => {
        const out = await callApi(replayHandler, {
            method: 'POST',
            body: { parameters: TRADE, maxPrice: 1, sourceLoginid: 'DOT93804017' },
        });
        expect(out.code).toBe(200);
        expect(out.body.copied).toBe(0);
        expect(out.body.skipped).toBe(1);
        expect(mockBuys).toHaveLength(0);
    });

    it('mirrors onto a second demo account, still skipping the source', async () => {
        const record = storedRecord();
        record.accounts.push({
            accountId: 'acc-demo-2',
            loginid: 'DOT77777',
            currency: 'USD',
            isDemo: true,
            tokenId: record.tokens[0].id,
            enabled: true,
        });
        mockKv.set('copy:CR55501', JSON.stringify(record));

        const out = await callApi(replayHandler, {
            method: 'POST',
            body: { parameters: TRADE, maxPrice: 1, sourceLoginid: 'DOT93804017' },
        });

        expect(out.code).toBe(200);
        expect(out.body.copied).toBe(1);
        expect(mockBuys.map(buy => buy.accountId)).toEqual(['acc-demo-2']);
        expect(mockBuys[0].token).toBe(PAT);
        expect(mockBuys[0].parameters).toMatchObject({
            underlying_symbol: 'R_100',
            contract_type: 'DIGITOVER',
            basis: 'stake',
            barrier: 5,
            selected_tick: 5,
        });
    });

    it('stops the session and refuses further mirroring', async () => {
        mockBuys.length = 0;
        const stopped = await callApi(sessionHandler, { method: 'POST', body: { action: 'stop' } });
        expect(stopped.body.session).toBeNull();

        const out = await callApi(replayHandler, { method: 'POST', body: { parameters: TRADE } });
        expect(out.code).toBe(409);
        expect(mockBuys).toHaveLength(0);
    });

    it('removes the PAT and its accounts together', async () => {
        const id = storedRecord().tokens[0].id;
        const out = await callApi(tokensHandler, { method: 'DELETE', query: { id } });
        expect(out.code).toBe(200);
        expect(out.body.tokens).toHaveLength(0);
        expect(out.body.accounts.filter(account => account.tokenId === id)).toHaveLength(0);
    });
});
