const { encryptToken, maskToken, fingerprint } = require('../_lib/crypto');
const { fetchOptionsAccounts } = require('../_lib/deriv');
const { requireSession, publicView, handleFailure } = require('../_lib/session');

module.exports = async function handler(req, res) {
    let session;
    try {
        session = await requireSession(req, res);
    } catch (error) {
        handleFailure(res, error);
        return;
    }
    if (!session) return;

    const { record, ownAccounts, save } = session;

    try {
        if (req.method === 'GET') {
            res.status(200).json(publicView(record, ownAccounts));
            return;
        }

        if (req.method === 'POST') {
            const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
            const plaintext = String(body.token || '').trim();

            if (plaintext.length < 8) {
                res.status(400).json({ error: 'That does not look like a Personal Access Token.' });
                return;
            }

            const id = fingerprint(plaintext);
            if (record.tokens.some(token => token.id === id)) {
                res.status(409).json({ error: 'That token has already been added.' });
                return;
            }

            // Proves the token works and tells us which accounts it reaches.
            let discovered;
            try {
                discovered = await fetchOptionsAccounts(plaintext);
            } catch (error) {
                res.status(400).json({ error: 'Deriv rejected that token. Check it has the Trade scope.' });
                return;
            }
            if (!discovered.length) {
                res.status(400).json({ error: 'That token has no options accounts attached.' });
                return;
            }

            record.tokens.push({
                id,
                cipher: encryptToken(plaintext),
                maskedToken: maskToken(plaintext),
                addedAt: new Date().toISOString(),
                accountIds: discovered.map(account => account.accountId),
            });

            for (const account of discovered) {
                const existing = record.accounts.find(item => item.accountId === account.accountId);
                if (existing) {
                    existing.tokenId = id;
                    existing.currency = account.currency;
                    existing.isDemo = account.isDemo;
                    existing.loginid = account.loginid;
                } else {
                    record.accounts.push({ ...account, tokenId: id, enabled: false });
                }
            }

            await save();
            res.status(201).json(publicView(record, ownAccounts));
            return;
        }

        if (req.method === 'DELETE') {
            const id = String((req.query && req.query.id) || '');
            const before = record.tokens.length;
            record.tokens = record.tokens.filter(token => token.id !== id);
            if (record.tokens.length === before) {
                res.status(404).json({ error: 'Token not found.' });
                return;
            }
            record.accounts = record.accounts.filter(account => account.tokenId !== id);
            await save();
            res.status(200).json(publicView(record, ownAccounts));
            return;
        }

        res.setHeader('Allow', 'GET, POST, DELETE');
        res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        handleFailure(res, error);
    }
};
