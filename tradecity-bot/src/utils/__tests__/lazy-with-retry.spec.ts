import { isChunkLoadError, retryImport } from '../lazy-with-retry';

describe('isChunkLoadError', () => {
    it('detects webpack ChunkLoadError', () => {
        const error = new Error('Loading chunk 5 failed.');
        error.name = 'ChunkLoadError';
        expect(isChunkLoadError(error)).toBe(true);
    });

    it('detects CSS chunk failures', () => {
        expect(isChunkLoadError(new Error('Loading CSS chunk 12 failed.'))).toBe(true);
    });

    it('detects dynamic import fetch failures', () => {
        expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module: https://x/a.js'))).toBe(true);
    });

    it('ignores unrelated errors', () => {
        expect(isChunkLoadError(new Error('Active symbols fetch timeout'))).toBe(false);
        expect(isChunkLoadError(null)).toBe(false);
    });
});

describe('retryImport', () => {
    it('returns the module on first success', async () => {
        const loader = jest.fn().mockResolvedValue({ default: 'ok' });
        await expect(retryImport(loader, 2, 1)).resolves.toEqual({ default: 'ok' });
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('retries chunk failures then succeeds', async () => {
        const chunk = new Error('Loading chunk 3 failed.');
        chunk.name = 'ChunkLoadError';
        const loader = jest.fn().mockRejectedValueOnce(chunk).mockResolvedValue({ default: 'ok' });
        await expect(retryImport(loader, 2, 1)).resolves.toEqual({ default: 'ok' });
        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('does not retry non-chunk errors', async () => {
        const loader = jest.fn().mockRejectedValue(new Error('boom'));
        await expect(retryImport(loader, 2, 1)).rejects.toThrow('boom');
        expect(loader).toHaveBeenCalledTimes(1);
    });
});
