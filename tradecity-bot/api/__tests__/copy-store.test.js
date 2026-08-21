/**
 * The Vercel marketplace flow lets the installer choose the env var prefix, so
 * the store has to recognise whichever pair ends up injected.
 */
const PAIRS = [
    ['KV_REST_API_URL', 'KV_REST_API_TOKEN'],
    ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
    ['STORAGE_REST_API_URL', 'STORAGE_REST_API_TOKEN'],
    ['REDIS_REST_API_URL', 'REDIS_REST_API_TOKEN'],
];

describe('copy trading KV credentials', () => {
    let store;

    beforeEach(() => {
        jest.resetModules();
        // Clear every candidate so one case cannot leak into the next.
        for (const key of Object.keys(process.env)) {
            if (/_REST(_API)?_(URL|TOKEN)$/.test(key)) delete process.env[key];
        }
        global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ result: null }) }));
        store = require('../_lib/store');
    });

    it.each(PAIRS)('accepts %s', async (urlKey, tokenKey) => {
        process.env[urlKey] = 'https://store.example.com';
        process.env[tokenKey] = 'token';
        await store.readRecord('copy:CR1');
        expect(global.fetch).toHaveBeenCalledWith('https://store.example.com', expect.any(Object));
    });

    it('falls back to an unrecognised prefix rather than failing', async () => {
        process.env.CUSTOMNAME_REST_API_URL = 'https://custom.example.com';
        process.env.CUSTOMNAME_REST_API_TOKEN = 'token';
        await store.readRecord('copy:CR1');
        expect(global.fetch).toHaveBeenCalledWith('https://custom.example.com', expect.any(Object));
    });

    it('ignores a URL whose matching token is missing', async () => {
        process.env.STORAGE_REST_API_URL = 'https://storage.example.com';
        await expect(store.readRecord('copy:CR1')).rejects.toThrow(/not configured/);
    });

    it('trims a trailing slash so the REST path stays valid', async () => {
        process.env.KV_REST_API_URL = 'https://kv.example.com/';
        process.env.KV_REST_API_TOKEN = 'token';
        await store.readRecord('copy:CR1');
        expect(global.fetch).toHaveBeenCalledWith('https://kv.example.com', expect.any(Object));
    });

    it('explains itself when nothing is configured', async () => {
        await expect(store.readRecord('copy:CR1')).rejects.toThrow(/not configured/);
    });
});
