const mockBuys = [];
let mockRecord;

jest.mock('../_lib/crypto', () => ({
    decryptToken: cipher => `plain:${cipher}`,
    encryptToken: plain => `cipher:${plain}`,
    maskToken: () => '••••1234',
    fingerprint: () => 'fp',
}));

jest.mock('../_lib/deriv', () => ({
    buyContract: async (token, accountId, parameters) => {
        mockBuys.push({ token, accountId, parameters });
        return { contractId: 99, buyPrice: parameters.amount };
    },
    fetchOptionsAccounts: async () => [],
}));

let mockOwnAccounts = [];

jest.mock('../_lib/session', () => ({
    requireSession: async () => ({ record: mockRecord, ownAccounts: mockOwnAccounts, save: async () => {} }),
    publicView: value => value,
    handleFailure: (res, error) => res.status(500).json({ error: error.message }),
}));

const replay = require('../copy/replay');

const VALID = {
    amount: 1,
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

async function post(parameters, mutateRecord, extraBody = {}) {
    mockRecord = {
        tokens: [{ id: 't1', cipher: 'CIPHER' }],
        accounts: [
            { accountId: 'A1', loginid: 'DOT1', currency: 'USD', isDemo: true, tokenId: 't1', enabled: true },
            { accountId: 'A2', loginid: 'CR1', currency: 'USD', isDemo: false, tokenId: 't1', enabled: true },
            { accountId: 'A3', loginid: 'DOT2', currency: 'USD', isDemo: true, tokenId: 't1', enabled: false },
        ],
        mode: 'demo',
        session: { running: true, mode: 'demo' },
    };
    if (mutateRecord) mutateRecord(mockRecord);
    const res = makeRes();
    await replay({ method: 'POST', body: { parameters, maxPrice: 1, ...extraBody } }, res);
    return res.captured;
}

describe('copy trading replay guards', () => {
    beforeEach(() => {
        mockBuys.length = 0;
        mockOwnAccounts = [];
    });

    it('does not copy back onto the account that placed the trade', async () => {
        const out = await post({ ...VALID }, undefined, { sourceLoginid: 'DOT1' });
        expect(out.code).toBe(200);
        expect(out.body.copied).toBe(0);
        expect(out.body.skipped).toBe(1);
        expect(mockBuys).toHaveLength(0);
    });

    it('does not copy onto the caller own demo accounts when source is omitted', async () => {
        mockOwnAccounts = [{ loginid: 'DOT1', isDemo: true }];
        const out = await post({ ...VALID });
        expect(out.code).toBe(200);
        expect(out.body.copied).toBe(0);
        expect(out.body.skipped).toBe(1);
        expect(mockBuys).toHaveLength(0);
    });

    it('buys only on enabled accounts matching the session mode', async () => {
        const out = await post({ ...VALID });
        expect(out.code).toBe(200);
        expect(mockBuys.map(buy => buy.accountId)).toEqual(['A1']);
    });

    it('keeps a real session away from demo accounts', async () => {
        const out = await post({ ...VALID }, record => {
            record.session = { running: true, mode: 'real' };
        });
        expect(out.code).toBe(200);
        expect(mockBuys.map(buy => buy.accountId)).toEqual(['A2']);
    });

    it('does nothing when no session is running', async () => {
        const out = await post({ ...VALID }, record => {
            record.session = null;
        });
        expect(out.code).toBe(409);
        expect(mockBuys).toHaveLength(0);
    });

    it.each([
        ['a contract type outside the allowlist', { contract_type: 'MULTUP' }],
        ['a negative stake', { amount: -50 }],
        ['a zero stake', { amount: 0 }],
        ['a non-numeric stake', { amount: 'lots' }],
        ['a missing market', { underlying_symbol: '' }],
        ['a zero duration', { duration: 0 }],
        ['a non-numeric digit prediction', { barrier: 'seven', selected_tick: undefined }],
    ])('rejects %s without buying anything', async (_label, override) => {
        const out = await post({ ...VALID, ...override });
        expect(out.code).toBe(400);
        expect(mockBuys).toHaveLength(0);
    });

    it('sends the market as underlying_symbol, which is what this API expects', async () => {
        await post({ ...VALID });
        expect(mockBuys[0].parameters.underlying_symbol).toBe('R_100');
        expect(mockBuys[0].parameters.symbol).toBeUndefined();
    });

    it('carries a digit prediction as a number in both barrier and selected_tick', async () => {
        await post({ ...VALID, barrier: 5, selected_tick: 5 });
        expect(mockBuys[0].parameters.barrier).toBe(5);
        expect(mockBuys[0].parameters.selected_tick).toBe(5);
    });

    it('accepts the legacy symbol key so older callers still work', async () => {
        const { underlying_symbol: _omit, ...legacy } = VALID;
        await post({ ...legacy, symbol: 'R_50' });
        expect(mockBuys[0].parameters.underlying_symbol).toBe('R_50');
    });

    it('omits the digit fields entirely for a rise/fall contract', async () => {
        const { barrier: _b, selected_tick: _s, ...noDigit } = VALID;
        await post({ ...noDigit, contract_type: 'CALL' });
        expect(mockBuys[0].parameters.barrier).toBeUndefined();
        expect(mockBuys[0].parameters.selected_tick).toBeUndefined();
    });

    it('drops unexpected fields instead of forwarding them to Deriv', async () => {
        await post({ ...VALID, app_markup_percentage: 99, passthrough: { evil: true } });
        expect(mockBuys[0].parameters.app_markup_percentage).toBeUndefined();
        expect(mockBuys[0].parameters.passthrough).toBeUndefined();
    });

    it('forces basis to stake so amount cannot be reinterpreted as payout', async () => {
        await post({ ...VALID, basis: 'payout' });
        expect(mockBuys[0].parameters.basis).toBe('stake');
    });

    it('decrypts the stored token and never forwards the ciphertext', async () => {
        await post({ ...VALID });
        expect(mockBuys[0].token).toBe('plain:CIPHER');
    });

    it('reports a per-account failure without failing the whole replay', async () => {
        const out = await post({ ...VALID }, record => {
            record.accounts[0].tokenId = 'missing';
        });
        expect(out.code).toBe(200);
        expect(out.body.copied).toBe(0);
        expect(out.body.results[0].ok).toBe(false);
    });
});
