const crypto = require('node:crypto');

const VERSION = 'v1';
const IV_BYTES = 12;

/**
 * Reads the 32-byte encryption key from COPY_TOKEN_SECRET. Accepts a 64-char
 * hex string or base64. Throws rather than falling back to a weak default so a
 * misconfigured deployment cannot silently store tokens with a guessable key.
 *
 * Generate with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Rotating this makes every previously saved PAT unreadable.
 */
function getKey() {
    const raw = process.env.COPY_TOKEN_SECRET;
    if (!raw) throw new Error('COPY_TOKEN_SECRET is not configured');

    let key;
    if (/^[0-9a-f]{64}$/i.test(raw)) {
        key = Buffer.from(raw, 'hex');
    } else {
        key = Buffer.from(raw, 'base64');
    }
    if (key.length !== 32) {
        throw new Error('COPY_TOKEN_SECRET must decode to 32 bytes (64 hex chars or base64)');
    }
    return key;
}

/** AES-256-GCM. Returns "v1.<iv>.<tag>.<ciphertext>", all base64. */
function encryptToken(plaintext) {
    if (typeof plaintext !== 'string' || !plaintext) {
        throw new Error('Nothing to encrypt');
    }
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [VERSION, iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join('.');
}

function decryptToken(payload) {
    if (typeof payload !== 'string') throw new Error('Nothing to decrypt');
    const parts = payload.split('.');
    if (parts.length !== 4 || parts[0] !== VERSION) {
        throw new Error('Unrecognised ciphertext format');
    }
    const [, iv, tag, ciphertext] = parts;
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
}

/** Shows only the tail so a saved token stays recognisable without leaking it. */
function maskToken(plaintext) {
    const tail = plaintext.slice(-4);
    return `${'•'.repeat(8)}${tail}`;
}

/** Stable, non-reversible id for a token so duplicates can be detected. */
function fingerprint(plaintext) {
    return crypto.createHash('sha256').update(plaintext).digest('hex').slice(0, 16);
}

module.exports = { encryptToken, decryptToken, maskToken, fingerprint };
