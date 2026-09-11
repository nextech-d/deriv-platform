import { FREE_BOT_STRATEGIES } from '@/constants/free-bots';
import { freeBotToSeed } from '@/utils/free-bot-seed';

/**
 * The Trading Bots menu must display every bot with an "ai" suffix, but the
 * rename is display-only: `name` still feeds `file_name` in loadFreeBotInBuilder
 * (the save-modal bot name and the recent-strategies label) and the substring
 * heuristics in free-bot-seed.ts. Only `displayName` may carry the suffix.
 */

/** Mirrors sentenceCase in free-bots-desk.tsx — first char up, the rest down. */
const sentenceCase = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return value;
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

const label = (bot: (typeof FREE_BOT_STRATEGIES)[number]) => sentenceCase(bot.displayName ?? bot.name);

/** Deliberately unsuffixed, each for its own reason. */
const UNSUFFIXED: Record<string, string> = {
    // "poverty x ai" would render identically to the separate poverty-x-ai entry.
    'poverty-x': 'would collide with poverty-x-ai',
    // Already carry "ai" mid-name; suffixing stutters ("...ai bot ai").
    'snipper-havoc': 'already contains ai',
    'premium-matrix': 'already contains ai',
};

describe('Trading Bots menu labels', () => {
    it('displays every bot with an ai suffix, bar the documented exceptions', () => {
        const missing = FREE_BOT_STRATEGIES.filter(bot => !(bot.id in UNSUFFIXED) && !label(bot).endsWith('ai')).map(
            bot => bot.id
        );

        expect(missing).toEqual([]);
    });

    it('has no stale exceptions, so a new unsuffixed bot fails rather than hides', () => {
        const stillUnsuffixed = FREE_BOT_STRATEGIES.filter(bot => !label(bot).endsWith('ai')).map(bot => bot.id);

        expect(stillUnsuffixed.sort()).toEqual(Object.keys(UNSUFFIXED).sort());
    });

    it('keeps ai visible in the two names that carry it mid-label', () => {
        ['snipper-havoc', 'premium-matrix'].forEach(id => {
            const bot = FREE_BOT_STRATEGIES.find(entry => entry.id === id)!;
            expect(bot.displayName).toBeUndefined();
            expect(label(bot)).toContain('ai');
            expect(label(bot)).not.toContain('ai bot ai');
        });
    });

    it('keeps poverty-x unsuffixed so it stays distinct from poverty-x-ai', () => {
        const plain = FREE_BOT_STRATEGIES.find(bot => bot.id === 'poverty-x');
        const suffixed = FREE_BOT_STRATEGIES.find(bot => bot.id === 'poverty-x-ai');

        expect(plain).toBeDefined();
        expect(suffixed).toBeDefined();
        expect(label(plain!)).not.toBe(label(suffixed!));
    });

    it('has unique ids', () => {
        const ids = FREE_BOT_STRATEGIES.map(bot => bot.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});

/** Display names that are not `name + ' ai'`, each for its own reason. */
const REWRITTEN: Record<string, string> = {
    // Menu shows the shorter "Tradecity ai"; name stays so file_name and the seed heuristics do not move.
    'tradecity-speed-bot': 'shortened menu label',
};

describe('the rename is display-only', () => {
    it('only ever appends to name, never rewrites it, bar the documented exceptions', () => {
        FREE_BOT_STRATEGIES.forEach(bot => {
            if (!bot.displayName || bot.id in REWRITTEN) return;
            expect(bot.displayName).toBe(`${bot.name} ai`);
        });
    });

    it('has no stale rewrite exceptions, so a new rewritten label fails rather than hides', () => {
        const rewritten = FREE_BOT_STRATEGIES.filter(
            bot => bot.displayName && bot.displayName !== `${bot.name} ai`
        ).map(bot => bot.id);

        expect(rewritten.sort()).toEqual(Object.keys(REWRITTEN).sort());
    });

    it('leaves no runtime name ending in ai that did not already', () => {
        // The three that legitimately do predate this change.
        const already = ['poverty-sanitizer-ai', 'money-maker-ai', 'poverty-x-ai'];
        const runtimeEndsAi = FREE_BOT_STRATEGIES.filter(bot => bot.name.trim().toLowerCase().endsWith('ai')).map(
            bot => bot.id
        );

        expect(runtimeEndsAi.sort()).toEqual(already.sort());
    });

    it('produces the same seed with the display name stripped', () => {
        FREE_BOT_STRATEGIES.forEach(bot => {
            const { displayName: _ignored, ...withoutDisplay } = bot;
            expect(freeBotToSeed(bot)).toEqual(freeBotToSeed(withoutDisplay));
        });
    });

    it('keeps sourceLabel on the runtime name', () => {
        const bot = FREE_BOT_STRATEGIES.find(entry => entry.id === 'tradecity-speed-bot')!;

        expect(bot.displayName).toBe('tradecity ai');
        expect(freeBotToSeed(bot).sourceLabel).toBe('Free bots · tradecity speed bot');
    });
});
