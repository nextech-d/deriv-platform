const { requireSession, publicView, handleFailure } = require('../_lib/session');

/** Enables or disables individual accounts, and picks the demo/real mode. */
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
        if (req.method !== 'PATCH') {
            res.setHeader('Allow', 'PATCH');
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

        if (body.mode === 'demo' || body.mode === 'real') {
            if (record.session && record.session.running && record.session.mode !== body.mode) {
                res.status(409).json({ error: 'Stop the running session before switching account type.' });
                return;
            }
            record.mode = body.mode;
        }

        if (body.accountId !== undefined) {
            const account = record.accounts.find(item => item.accountId === body.accountId);
            if (!account) {
                res.status(404).json({ error: 'Account not found.' });
                return;
            }
            account.enabled = Boolean(body.enabled);
        }

        await save();
        res.status(200).json(publicView(record, ownAccounts));
    } catch (error) {
        handleFailure(res, error);
    }
};
