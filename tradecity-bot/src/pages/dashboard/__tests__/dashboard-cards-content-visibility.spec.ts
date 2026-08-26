import fs from 'fs';
import path from 'path';

const dashboardScss = fs.readFileSync(path.join(__dirname, '../dashboard.scss'), 'utf8');
const cardsSource = fs.readFileSync(path.join(__dirname, '../cards.tsx'), 'utf8');

describe('dashboard card content-visibility', () => {
    it('skips paint for off-screen hero windows without unmounting them', () => {
        expect(dashboardScss).toMatch(/&__window\s*\{[\s\S]*content-visibility:\s*auto/);
        expect(dashboardScss).toMatch(/contain-intrinsic-size:\s*auto 16\.4rem/);
        expect(cardsSource).toMatch(/windows\.map\(/);
        expect(cardsSource).not.toMatch(/unmount|virtualiz/i);
    });
});
