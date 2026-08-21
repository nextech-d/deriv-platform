const { fetchOptionsAccounts } = require('./deriv');
const { readRecord, writeRecord } = require('./store');

const EMPTY_RECORD = { tokens: [], accounts: [], mode: 'demo', session: null };

/**
 * Keys storage to the caller's lowest real loginid — stable for a Deriv user
 * across devices and account switches. Demo-only users fall back to their
 * lowest demo loginid.
 */
function deriveUserKey(accounts) {
    const valid = accounts.filter(account => account.loginid);
    const lowest = list => list.map(account => account.loginid).sort()[0];
    const chosen = lowest(valid.filter(account => !account.isDemo)) || lowest(valid);
    return chosen ? `copy:${chosen}` : null;
}

function bearerFrom(req) {
    const header = req.headers.authorization || req.headers.Authorization || '';
    const match = /^Bearer\s+(.+)$/i.exec(String(header).trim());
    return match ? match[1].trim() : '';
}

/**
 * Verifies the caller against Deriv before any stored token is touched. The
 * session token is only used to prove identity and is never persisted.
 */
async function requireSession(req, res) {
    const token = bearerFrom(req);
    if (!token) {
        res.status(401).json({ error: 'Sign in to manage copy trading accounts.' });
        return null;
    }

    let accounts;
    try {
        accounts = await fetchOptionsAccounts(token);
    } catch (error) {
        res.status(401).json({ error: 'Your Deriv session could not be verified.' });
        return null;
    }

    const key = deriveUserKey(accounts);
    if (!key) {
        res.status(401).json({ error: 'No Deriv options accounts found for this login.' });
        return null;
    }

    const record = (await readRecord(key)) || { ...EMPTY_RECORD };
    record.tokens = record.tokens || [];
    record.accounts = record.accounts || [];
    record.mode = record.mode === 'real' ? 'real' : 'demo';

    return {
        key,
        record,
        ownAccounts: accounts,
        save: () => writeRecord(key, record),
    };
}

/**
 * Reports why a copy session cannot start, or null when it can. Part of every
 * response so the UI gate can never go stale after an unrelated change.
 */
function startBlocker(record, ownAccounts) {
    const wantDemo = record.mode === 'demo';

    const own = (ownAccounts || []).find(account => account.isDemo === wantDemo);
    if (own && !record.accounts.some(account => account.loginid === own.loginid)) {
        return `Add a PAT containing ${own.loginid} before starting.`;
    }

    if (!record.accounts.some(account => account.isDemo === wantDemo && account.enabled)) {
        return `Enable at least one ${record.mode} account before starting.`;
    }

    return null;
}

/** Strips ciphertext so a plaintext token can never leave the server. */
function publicView(record, ownAccounts) {
    return {
        blocker: startBlocker(record, ownAccounts),
        tokens: record.tokens.map(token => ({
            id: token.id,
            maskedToken: token.maskedToken,
            addedAt: token.addedAt,
            accountIds: token.accountIds,
        })),
        accounts: record.accounts.map(account => ({
            accountId: account.accountId,
            loginid: account.loginid,
            currency: account.currency,
            isDemo: account.isDemo,
            tokenId: account.tokenId,
            enabled: Boolean(account.enabled),
        })),
        mode: record.mode,
        session: record.session || null,
        ownLoginids: (ownAccounts || []).map(account => account.loginid),
    };
}

function handleFailure(res, error) {
    const message = error && error.message ? error.message : 'Unexpected error';
    const isConfig = /not configured/i.test(message);
    res.status(isConfig ? 503 : 500).json({
        error: isConfig ? 'Copy trading storage is not configured on this deployment.' : message,
    });
}

module.exports = { requireSession, publicView, startBlocker, handleFailure };
