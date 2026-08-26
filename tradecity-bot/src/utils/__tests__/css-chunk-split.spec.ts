import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '../../..');

describe('unused CSS stays out of the first paint', () => {
    it('keeps Blockly workspace CSS on the Bot Builder chunk, not the barrel', () => {
        const scratch = fs.readFileSync(path.join(root, 'src/external/bot-skeleton/scratch/index.js'), 'utf8');
        const bot_builder = fs.readFileSync(path.join(root, 'src/pages/bot-builder/index.ts'), 'utf8');

        expect(scratch).not.toMatch(/import\s+['\"]\.\/index\.scss['\"]/);
        expect(bot_builder).toMatch(/scratch\/index\.scss/);
    });

    it('minifies CSS in production and does not dump all styles into one chunk', () => {
        const rsbuild = fs.readFileSync(path.join(root, 'rsbuild.config.ts'), 'utf8');
        expect(rsbuild).toMatch(/minify:\s*\{[\s\S]*css:\s*true/);
        expect(rsbuild).not.toMatch(/name:\s*['\"]styles['\"]/);
    });
});
