const nodeCrypto = require('node:crypto');

const { encryptToken, decryptToken, maskToken, fingerprint } = require('../_lib/crypto');

const HEX_KEY = nodeCrypto.randomBytes(32).toString('hex');
const PAT = 'a1b2c3d4e5f6g7h8-TRADE-SCOPED-PAT';

describe('copy trading token encryption', () => {
    beforeEach(() => {
        process.env.COPY_TOKEN_SECRET = HEX_KEY;
    });

    it('round-trips a token', () => {
        expect(decryptToken(encryptToken(PAT))).toBe(PAT);
    });

    it('never leaves the plaintext inside the ciphertext', () => {
        expect(encryptToken(PAT)).not.toContain(PAT);
    });

    it('uses a fresh IV so the same token encrypts differently each time', () => {
        expect(encryptToken(PAT)).not.toBe(encryptToken(PAT));
    });

    it('rejects tampered ciphertext rather than returning garbage', () => {
        const [version, iv, tag] = encryptToken(PAT).split('.');
        const forged = [version, iv, tag, Buffer.from('tampered').toString('base64')].join('.');
        expect(() => decryptToken(forged)).toThrow();
    });

    it('rejects an unknown ciphertext version', () => {
        expect(() => decryptToken('v9.a.b.c')).toThrow(/Unrecognised/);
    });

    it('accepts a base64 key as well as hex', () => {
        process.env.COPY_TOKEN_SECRET = nodeCrypto.randomBytes(32).toString('base64');
        expect(decryptToken(encryptToken(PAT))).toBe(PAT);
    });

    it('refuses to run with a short key instead of padding it', () => {
        process.env.COPY_TOKEN_SECRET = 'tooshort';
        expect(() => encryptToken(PAT)).toThrow(/32 bytes/);
    });

    it('refuses to run with no key at all', () => {
        delete process.env.COPY_TOKEN_SECRET;
        expect(() => encryptToken(PAT)).toThrow(/not configured/);
    });

    it('masks all but the last four characters', () => {
        const masked = maskToken(PAT);
        expect(masked.endsWith('-PAT')).toBe(true);
        expect(masked).not.toContain(PAT.slice(0, 10));
    });

    it('fingerprints stably without revealing the token', () => {
        expect(fingerprint(PAT)).toBe(fingerprint(PAT));
        expect(fingerprint(PAT)).not.toContain(PAT);
        expect(fingerprint(PAT)).not.toBe(fingerprint(`${PAT}x`));
    });
});
