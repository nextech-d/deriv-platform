import fs from 'fs';
import path from 'path';

type HeaderRule = {
    source: string;
    headers: { key: string; value: string }[];
};

const vercel = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../vercel.json'), 'utf8')) as {
    headers: HeaderRule[];
};

const cacheControlFor = (source: string) =>
    vercel.headers.find(rule => rule.source === source)?.headers.find(h => h.key === 'Cache-Control')?.value;

describe('long-cache hashed assets', () => {
    it('caches hashed /static files for a year as immutable', () => {
        expect(cacheControlFor('/static/:path*')).toBe('public, max-age=31536000, immutable');
    });

    it('revalidates HTML so deploys pick up new hashes', () => {
        expect(cacheControlFor('/')).toBe('public, max-age=0, must-revalidate');
        expect(cacheControlFor('/index.html')).toBe('public, max-age=0, must-revalidate');
    });

    it('does not immutable-cache unhashed smartcharts copies', () => {
        const immutable_sources = vercel.headers
            .filter(rule => rule.headers.some(h => h.key === 'Cache-Control' && h.value.includes('immutable')))
            .map(rule => rule.source);
        expect(immutable_sources).toEqual(['/static/:path*']);
    });

    it('keeps production filename hashing on', () => {
        const rsbuild = fs.readFileSync(path.join(__dirname, '../../../rsbuild.config.ts'), 'utf8');
        expect(rsbuild).toMatch(/filenameHash:\s*true/);
    });
});

describe('gzip and brotli compression', () => {
    it('keeps gzip compression on for the local server', () => {
        const rsbuild = fs.readFileSync(path.join(__dirname, '../../../rsbuild.config.ts'), 'utf8');
        expect(rsbuild).toMatch(/compress:\s*true/);
        expect(rsbuild).not.toMatch(/compress:\s*false/);
    });

    it('does not set Content-Encoding in vercel.json (Vercel CDN compresses)', () => {
        const encodings = vercel.headers
            .flatMap(rule => rule.headers)
            .filter(header => header.key.toLowerCase() === 'content-encoding');
        expect(encodings).toEqual([]);
    });
});
