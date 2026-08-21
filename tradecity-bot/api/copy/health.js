const { encryptToken, decryptToken } = require('../_lib/crypto');
const { ping } = require('../_lib/store');

/**
 * Reports whether this deployment is configured for copy trading. Returns only
 * booleans and short reasons — never a value, and never anything derived from
 * one — so it is safe to leave unauthenticated.
 */
module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const checks = {};

    const probe = 'health-probe';
    try {
        checks.encryption = decryptToken(encryptToken(probe)) === probe ? 'ok' : 'failed';
    } catch (error) {
        checks.encryption = /not configured/i.test(error.message) ? 'missing' : 'invalid';
    }

    try {
        await ping();
        checks.storage = 'ok';
    } catch (error) {
        checks.storage = /not configured/i.test(error.message) ? 'missing' : 'unreachable';
    }

    checks.appId = process.env.APP_ID ? 'ok' : 'missing';

    const ready = checks.encryption === 'ok' && checks.storage === 'ok';
    res.status(ready ? 200 : 503).json({ ready, checks });
};
