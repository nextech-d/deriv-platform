const { requireSession, publicView, startBlocker, handleFailure } = require('../_lib/session');

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

        if (req.method !== 'POST') {
            res.setHeader('Allow', 'GET, POST');
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

        if (body.action === 'stop') {
            record.session = null;
            await save();
            res.status(200).json(publicView(record, ownAccounts));
            return;
        }

        if (body.action === 'start') {
            const reason = startBlocker(record, ownAccounts);
            if (reason) {
                res.status(409).json({ error: reason });
                return;
            }
            record.session = { running: true, mode: record.mode, startedAt: new Date().toISOString() };
            await save();
            res.status(200).json(publicView(record, ownAccounts));
            return;
        }

        res.status(400).json({ error: 'Unknown action.' });
    } catch (error) {
        handleFailure(res, error);
    }
};
