import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '../../..');

const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

const walk_scss = (dir: string, files: string[] = []) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules') continue;
            walk_scss(full, files);
        } else if (/\.(scss|css)$/.test(entry.name)) {
            files.push(full);
        }
    }
    return files;
};

describe('self-hosted fonts', () => {
    it('loads IBM Plex, Barlow, and Instrument Serif from fontsource', () => {
        const hosted = read('src/styles/self-hosted-fonts.ts');
        expect(hosted).toContain('@fontsource/ibm-plex-sans/400.css');
        expect(hosted).toContain('@fontsource/ibm-plex-sans-condensed/700.css');
        expect(hosted).toContain('@fontsource/barlow-condensed/800.css');
        expect(hosted).toContain('@fontsource/instrument-serif/400-italic.css');
        expect(hosted).toContain('./font-fallbacks.scss');
    });

    it('uses metric-matched fallbacks so TRADE/City do not jump', () => {
        const fallbacks = read('src/styles/font-fallbacks.scss');
        expect(fallbacks).toContain("font-family: 'Barlow Condensed Fallback'");
        expect(fallbacks).toContain("font-family: 'Instrument Serif Fallback'");
        expect(fallbacks).toContain('size-adjust:');
        expect(fallbacks).toMatch(/font-weight:\s*800/);
        expect(fallbacks).toMatch(/font-style:\s*italic/);

        const wordmark = read('src/components/layout/app-logo/app-logo.scss');
        expect(wordmark).toContain("'Barlow Condensed', 'Barlow Condensed Fallback'");
        expect(wordmark).toContain("'Instrument Serif', 'Instrument Serif Fallback'");
        expect(wordmark).not.toMatch(/font-family:\s*system-ui/);
    });

    it('keeps font-display swap on self-hosted faces', () => {
        const barlow = read('node_modules/@fontsource/barlow-condensed/800.css');
        const serif = read('node_modules/@fontsource/instrument-serif/400-italic.css');
        const plex = read('node_modules/@fontsource/ibm-plex-sans/400.css');
        expect(barlow).toContain('font-display: swap');
        expect(serif).toContain('font-display: swap');
        expect(plex).toContain('font-display: swap');
    });

    it('does not request Google Fonts from unlocked styles', () => {
        const files = walk_scss(path.join(root, 'src'));
        const google = files.filter(file => {
            if (file.endsWith(`${path.sep}layout.scss`)) return false;
            return /fonts\.googleapis|fonts\.gstatic/.test(fs.readFileSync(file, 'utf8'));
        });
        expect(google).toEqual([]);
    });
});

describe('stripGooglePlexImports', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { stripGooglePlexImports } = require('../strip-google-plex-import');

    it('removes IBM Plex Google Font @imports and leaves other families', () => {
        const css = [
            "@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Condensed:wght@700&display=swap');",
            '@import url(https://fonts.googleapis.com/css?family=IBM+Plex+Sans:300,400,500,700&display=swap&subset=cyrillic);',
            '@import"https://fonts.googleapis.com/css?family=IBM+Plex+Sans:300,400,500,700&display=swap&subset=cyrillic,cyrillic-ext,latin-ext,vietnamese";',
            "@import url('https://fonts.googleapis.com/css2?family=Ubuntu:wght@700&display=swap');",
            'body { color: black; }',
        ].join('\n');
        const stripped = stripGooglePlexImports(css);
        expect(stripped).not.toMatch(/IBM\+Plex/);
        expect(stripped).toContain('Ubuntu');
        expect(stripped).toContain('body { color: black; }');
    });
});
