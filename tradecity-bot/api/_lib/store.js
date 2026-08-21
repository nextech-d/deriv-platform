/**
 * Minimal Upstash/Vercel KV client over the REST API. Written with fetch so the
 * functions stay dependency-free.
 */

/**
 * Vercel's marketplace flow prefixes the injected variables, and the prefix is
 * chosen at install time (KV, STORAGE, UPSTASH_REDIS, ...). Rather than pin one
 * spelling, take the known pairs first and then fall back to any matching
 * `<PREFIX>_REST_API_URL` / `<PREFIX>_REST_API_TOKEN` pair.
 */
function credentials() {
    const known = [
        ['KV_REST_API_URL', 'KV_REST_API_TOKEN'],
        ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
        ['STORAGE_REST_API_URL', 'STORAGE_REST_API_TOKEN'],
        ['REDIS_REST_API_URL', 'REDIS_REST_API_TOKEN'],
    ];
    for (const [urlKey, tokenKey] of known) {
        if (process.env[urlKey] && process.env[tokenKey]) {
            return { url: process.env[urlKey], token: process.env[tokenKey] };
        }
    }

    const urlKey = Object.keys(process.env)
        .filter(key => key.endsWith('_REST_API_URL') && process.env[key])
        .sort()
        .find(key => process.env[key.replace(/_URL$/, '_TOKEN')]);

    if (urlKey) {
        return { url: process.env[urlKey], token: process.env[urlKey.replace(/_URL$/, '_TOKEN')] };
    }
    return null;
}

function config() {
    const found = credentials();
    if (!found) {
        throw new Error('KV_REST_API_URL and KV_REST_API_TOKEN are not configured');
    }
    return { url: found.url.replace(/\/$/, ''), token: found.token };
}

async function command(parts) {
    const { url, token } = config();
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(parts),
    });
    if (!response.ok) {
        throw new Error(`KV request failed (${response.status})`);
    }
    const json = await response.json();
    if (json && json.error) throw new Error(`KV error: ${json.error}`);
    return json ? json.result : null;
}

/** Liveness check that writes nothing. */
async function ping() {
    return command(['PING']);
}

async function readRecord(key) {
    const raw = await command(['GET', key]);
    if (!raw) return null;
    try {
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
        return null;
    }
}

async function writeRecord(key, value) {
    await command(['SET', key, JSON.stringify(value)]);
}

module.exports = { readRecord, writeRecord, ping };
