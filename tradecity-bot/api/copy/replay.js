const { decryptToken } = require('../_lib/crypto');
const { buyContract } = require('../_lib/deriv');
const { requireSession, handleFailure } = require('../_lib/session');

const ALLOWED_CONTRACTS = new Set([
    'CALL',
    'PUT',
    'DIGITEVEN',
    'DIGITODD',
    'DIGITMATCH',
    'DIGITDIFF',
    'DIGITOVER',
    'DIGITUNDER',
]);

/** Rebuilds the buy payload from scratch so a caller cannot smuggle fields through. */
function sanitize(input) {
    const contractType = String(input.contract_type || '');
    if (!ALLOWED_CONTRACTS.has(contractType)) return null;

    const amount = Number(input.amount);
    const duration = Number(input.duration);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    if (!Number.isFinite(duration) || duration <= 0) return null;

    const parameters = {
        amount: Math.round(amount * 100) / 100,
        basis: 'stake',
        contract_type: contractType,
        currency: String(input.currency || 'USD'),
        duration: Math.round(duration),
        duration_unit: String(input.duration_unit || 't'),
        symbol: String(input.symbol || ''),
    };
    if (!parameters.symbol) return null;

    if (input.barrier !== undefined && input.barrier !== null && String(input.barrier) !== '') {
        parameters.barrier = String(input.barrier);
    }
    return parameters;
}

/**
 * Mirrors one contract onto every enabled account for the running session.
 * Tokens are decrypted here and never leave the function.
 */
module.exports = async function handler(req, res) {
    let session;
    try {
        session = await requireSession(req, res);
    } catch (error) {
        handleFailure(res, error);
        return;
    }
    if (!session) return;

    const { record } = session;

    try {
        if (req.method !== 'POST') {
            res.setHeader('Allow', 'POST');
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

        if (!record.session || !record.session.running) {
            res.status(409).json({ error: 'Copy trading is not running.' });
            return;
        }

        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
        const parameters = sanitize(body.parameters || {});
        if (!parameters) {
            res.status(400).json({ error: 'Unsupported contract parameters.' });
            return;
        }

        const wantDemo = record.session.mode === 'demo';
        const targets = record.accounts.filter(account => account.enabled && account.isDemo === wantDemo);
        if (!targets.length) {
            res.status(409).json({ error: 'No enabled accounts for this session.' });
            return;
        }

        const maxPrice = Number(body.maxPrice) > 0 ? Number(body.maxPrice) : parameters.amount;

        const results = await Promise.all(
            targets.map(async account => {
                const holder = record.tokens.find(token => token.id === account.tokenId);
                if (!holder) {
                    return { loginid: account.loginid, ok: false, error: 'Saved token missing.' };
                }
                try {
                    const receipt = await buyContract(
                        decryptToken(holder.cipher),
                        account.accountId,
                        { ...parameters, currency: account.currency || parameters.currency },
                        maxPrice
                    );
                    return { loginid: account.loginid, ok: true, ...receipt };
                } catch (error) {
                    return { loginid: account.loginid, ok: false, error: error.message || 'Buy failed' };
                }
            })
        );

        res.status(200).json({ results, copied: results.filter(item => item.ok).length, total: results.length });
    } catch (error) {
        handleFailure(res, error);
    }
};
