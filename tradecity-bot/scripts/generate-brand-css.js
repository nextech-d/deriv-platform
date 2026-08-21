const fs = require('fs');
const path = require('path');

// Import brand configuration from project root
const brandConfig = require('../brand.config.json');

const START_MARKER = '/* brand:start - generated from brand.config.json by scripts/generate-brand-css.js */';
const END_MARKER = '/* brand:end */';

// Comments and declarations emitted by earlier versions of this script. They were written
// without an end marker, so every run inserted a fresh block above the previous one instead
// of replacing it. Matching them lets a single run absorb all the copies that accumulated.
const LEGACY_COMMENT =
    /^\s*\/\*\s*(Brand colors - dynamically generated|Dynamic brand colors|Brand typography - dynamically)/;
const LEGACY_DECL =
    /^\s*--brand-(white|dark-grey|red-coral|orange|primary|secondary|tertiary|success|danger|warning|info|neutral|font-primary|font-secondary|font-monospace)\s*:/;

const buildBrandBlock = ({ colors, typography }) => {
    const lines = [
        `    ${START_MARKER}`,
        `    --brand-white: ${colors.white};`,
        `    --brand-dark-grey: ${colors.black};`,
        `    --brand-red-coral: ${colors.primary}; /* legacy compatibility */`,
        `    --brand-orange: ${colors.tertiary}; /* legacy compatibility */`,
        '',
        `    --brand-primary: ${colors.primary};`,
        `    --brand-secondary: ${colors.secondary};`,
        `    --brand-tertiary: ${colors.tertiary};`,
        `    --brand-success: ${colors.success};`,
        `    --brand-danger: ${colors.danger};`,
        `    --brand-warning: ${colors.warning};`,
        `    --brand-info: ${colors.info};`,
        `    --brand-neutral: ${colors.neutral};`,
    ];

    if (typography && typography.font_family) {
        lines.push('');
        lines.push(`    --brand-font-primary: ${typography.font_family.primary};`);
        lines.push(`    --brand-font-secondary: ${typography.font_family.secondary};`);
        lines.push(`    --brand-font-monospace: ${typography.font_family.monospace};`);
    }

    lines.push(`    ${END_MARKER}`);
    return lines;
};

// Inclusive [start, end] line range this script owns, or null when it has never run here.
const findGeneratedRegion = lines => {
    const start = lines.findIndex(line => line.includes(START_MARKER));
    if (start !== -1) {
        const end = lines.findIndex((line, index) => index >= start && line.includes(END_MARKER));
        if (end !== -1) return [start, end];
    }

    const first = lines.findIndex(line => LEGACY_COMMENT.test(line) || LEGACY_DECL.test(line));
    if (first === -1) return null;

    // Blank lines separate the sub-sections, so walk past them and stop at the first
    // line that belongs to whatever section follows.
    let last = first;
    for (let index = first; index < lines.length; index++) {
        if (LEGACY_COMMENT.test(lines[index]) || LEGACY_DECL.test(lines[index])) last = index;
        else if (lines[index].trim() !== '') break;
    }
    return [first, last];
};

const applyBrandBlock = (content, block) => {
    const lines = content.split('\n');
    const region = findGeneratedRegion(lines);

    let start;
    let removeCount;

    if (region) {
        start = region[0];
        removeCount = region[1] - region[0] + 1;
    } else {
        const anchor = lines.findIndex(line => line.includes('--text-align-center:'));
        if (anchor === -1) return null;
        start = anchor + 1;
        removeCount = 0;
    }

    const before = lines.slice(0, start);
    const after = lines.slice(start + removeCount);

    // Surround the block with exactly one blank line on each side so repeat runs
    // cannot stack up whitespace the way they used to.
    while (before.length && before[before.length - 1].trim() === '') before.pop();
    while (after.length && after[0].trim() === '') after.shift();

    return [...before, '', ...block, '', ...after].join('\n');
};

// Main function to update brand colors in _themes.scss
const updateBrandColorsInThemes = () => {
    const themesPath = path.join(__dirname, '../src/components/shared/styles/_themes.scss');

    if (!fs.existsSync(themesPath)) {
        console.error('❌ _themes.scss file not found');
        process.exit(1);
    }

    const originalContent = fs.readFileSync(themesPath, 'utf8');
    const { colors, typography } = brandConfig;

    const themesContent = applyBrandBlock(originalContent, buildBrandBlock({ colors, typography }));

    if (themesContent === null) {
        console.error('❌ Could not find insertion point in _themes.scss');
        process.exit(1);
    }

    const hasChanges = originalContent !== themesContent;

    if (!hasChanges) {
        console.log('✓ No changes needed - brand styling already up to date');
        return false;
    }

    fs.writeFileSync(themesPath, themesContent, 'utf8');

    console.log('✅ Brand styling updated successfully in _themes.scss!');
    console.log(`📁 Updated: ${themesPath}`);
    console.log('📊 Changes made:');
    console.log('   Colors:');
    console.log(`      • Brand White: ${colors.white}`);
    console.log(`      • Brand Dark Grey: ${colors.black}`);
    console.log(`      • Primary: ${colors.primary}`);
    console.log(`      • Secondary: ${colors.secondary}`);
    console.log(`      • Tertiary: ${colors.tertiary}`);
    console.log(`      • Success: ${colors.success}`);
    console.log(`      • Danger: ${colors.danger}`);
    console.log(`      • Warning: ${colors.warning}`);
    console.log(`      • Info: ${colors.info}`);
    if (typography && typography.font_family) {
        console.log('   Typography:');
        console.log(`      • Primary Font: ${typography.font_family.primary.substring(0, 50)}...`);
        console.log(`      • Secondary Font: ${typography.font_family.secondary}`);
        console.log(`      • Monospace Font: ${typography.font_family.monospace}`);
    }

    return true;
};

// Validation function
const validateBrandConfig = () => {
    const issues = [];

    if (!brandConfig.colors) {
        issues.push('Missing colors configuration in brand.config.json');
    } else {
        const requiredColors = [
            'primary',
            'secondary',
            'tertiary',
            'success',
            'danger',
            'warning',
            'info',
            'neutral',
            'white',
            'black',
        ];
        requiredColors.forEach(color => {
            if (!brandConfig.colors[color]) {
                issues.push(`Missing required color: ${color}`);
            }
        });
    }

    // Optional typography validation (warnings only)
    if (brandConfig.typography) {
        if (!brandConfig.typography.font_family) {
            console.warn('⚠️  Typography configuration found but font_family is missing');
        } else {
            const requiredFonts = ['primary', 'secondary', 'monospace'];
            requiredFonts.forEach(font => {
                if (!brandConfig.typography.font_family[font]) {
                    console.warn(`⚠️  Missing recommended font: ${font}`);
                }
            });
        }
    }

    if (issues.length > 0) {
        console.error('❌ Brand configuration issues:');
        issues.forEach(issue => console.error(`  - ${issue}`));
        process.exit(1);
    }

    console.log('✅ Brand configuration is valid');
    return true;
};

// Add script to package.json if it doesn't exist
const addPackageScript = () => {
    const packageJsonPath = path.join(__dirname, '../package.json');

    if (!fs.existsSync(packageJsonPath)) {
        console.log('⚠️  package.json not found, skipping script addition');
        return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    if (!packageJson.scripts) {
        packageJson.scripts = {};
    }

    if (!packageJson.scripts['generate:brand-css']) {
        packageJson.scripts['generate:brand-css'] = 'node scripts/generate-brand-css.js';
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
        console.log('✅ Added "generate:brand-css" script to package.json');
    }
};

// Main execution
if (require.main === module) {
    console.log('🎨 Updating brand colors in _themes.scss...\n');

    validateBrandConfig();
    const hasChanges = updateBrandColorsInThemes();
    addPackageScript();

    console.log('\n🎯 Next steps:');
    if (hasChanges) {
        console.log('1. The brand block in _themes.scss has been rewritten in place');
        console.log('2. To regenerate: npm run generate:brand-css');
        console.log('3. Restart your dev server to see the changes');
    } else {
        console.log('1. No changes were needed');
        console.log('2. To force regeneration: npm run generate:brand-css');
    }
}

module.exports = {
    updateBrandColorsInThemes,
    validateBrandConfig,
    applyBrandBlock,
    buildBrandBlock,
};
