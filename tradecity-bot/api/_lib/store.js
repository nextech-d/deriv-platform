/**
 * Minimal Upstash/Vercel KV client over the REST API. Written with fetch so the
 * functions stay dependency-free.
 */

function config() {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
        throw new Error('KV_REST_API_URL and KV_REST_API_TOKEN are not configured');
    }
    return { url: url.replace(/\/$/, ''), token };
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

module.exports = { readRecord, writeRecord };
