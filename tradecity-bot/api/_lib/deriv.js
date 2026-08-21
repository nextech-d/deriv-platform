/**
 * Deriv v2 REST + OTP WebSocket helpers for the copy-trading functions.
 * Mirrors the account shape the SPA already uses (see src/utils/account-helpers).
 */

const REST_BASE = 'https://api.derivws.com';
const REQUEST_TIMEOUT_MS = 12_000;
const BUY_TIMEOUT_MS = 20_000;

function headers(token) {
    return {
        Authorization: `Bearer ${token}`,
        'Deriv-App-ID': process.env.APP_ID || '',
        'Content-Type': 'application/json',
        Accept: 'application/json',
    };
}

async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

/** VRTC/VRW/DEM/DOT are Deriv's demo prefixes. */
function isDemoLoginid(loginid) {
    if (!loginid) return false;
    return (
        loginid.startsWith('VRTC') || loginid.startsWith('VRW') || loginid.startsWith('DEM') || loginid.startsWith('DOT')
    );
}

/**
 * Lists the options accounts a token can reach. Doubles as token validation:
 * an unusable or wrongly-scoped token cannot return accounts.
 */
async function fetchOptionsAccounts(token) {
    const response = await fetchWithTimeout(
        `${REST_BASE}/trading/v1/options/accounts`,
        { headers: headers(token), cache: 'no-store' },
        REQUEST_TIMEOUT_MS
    );

    if (!response.ok) {
        const detail = response.status === 401 || response.status === 403 ? 'Token rejected by Deriv' : `Deriv returned ${response.status}`;
        const error = new Error(detail);
        error.status = response.status;
        throw error;
    }

    const json = await response.json();
    const rows = (json && json.data) || [];

    return rows
        .map(row => {
            const attrs = row.attributes || {};
            const accountId = row.account_id || row.id || '';
            const loginid = attrs.loginid || row.loginid || accountId;
            if (!accountId && !loginid) return null;
            const accountType = attrs.account_type || row.account_type;
            const isVirtual = attrs.is_virtual !== undefined ? attrs.is_virtual : row.is_virtual;
            return {
                accountId: accountId || loginid,
                loginid,
                currency: attrs.currency || row.currency || 'USD',
                isDemo: isVirtual === true || accountType === 'demo' || isDemoLoginid(loginid),
            };
        })
        .filter(Boolean);
}

/** Pre-authorised WebSocket URL for one account. */
async function fetchWebSocketUrl(token, accountId) {
    const response = await fetchWithTimeout(
        `${REST_BASE}/trading/v1/options/accounts/${encodeURIComponent(accountId)}/otp`,
        { method: 'POST', headers: headers(token), cache: 'no-store' },
        REQUEST_TIMEOUT_MS
    );

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error((json.errors && json.errors[0] && json.errors[0].message) || `OTP request failed (${response.status})`);
    }

    const data = json.data || {};
    const attributes = data.attributes || {};
    const url = json.websocket_url || data.url || data.websocket_url || attributes.websocket_url || attributes.url;
    if (!url) throw new Error('OTP response did not include a websocket URL');
    return url;
}

/**
 * Buys one contract on the given account. The OTP URL is already authorised,
 * so the socket goes straight to `buy`. Node 22 provides a global WebSocket.
 */
async function buyContract(token, accountId, parameters, maxPrice) {
    const url = await fetchWebSocketUrl(token, accountId);

    return new Promise((resolve, reject) => {
        let socket;
        try {
            socket = new WebSocket(url);
        } catch (error) {
            reject(error);
            return;
        }

        let settled = false;
        const finish = (fn, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            try {
                socket.close();
            } catch {
                /* already closing */
            }
            fn(value);
        };

        const timer = setTimeout(() => finish(reject, new Error('Buy timed out')), BUY_TIMEOUT_MS);

        socket.onopen = () => {
            socket.send(JSON.stringify({ buy: 1, price: maxPrice, parameters }));
        };

        socket.onmessage = event => {
            let data;
            try {
                data = JSON.parse(event.data);
            } catch {
                return;
            }
            if (data.error) {
                finish(reject, new Error(data.error.message || 'Deriv rejected the buy'));
                return;
            }
            if (data.msg_type === 'buy' && data.buy) {
                finish(resolve, {
                    contractId: data.buy.contract_id,
                    buyPrice: data.buy.buy_price,
                    longcode: data.buy.longcode,
                });
            }
        };

        socket.onerror = () => finish(reject, new Error('WebSocket error while buying'));
        socket.onclose = () => finish(reject, new Error('Socket closed before the buy was confirmed'));
    });
}

module.exports = { fetchOptionsAccounts, fetchWebSocketUrl, buyContract, isDemoLoginid };
