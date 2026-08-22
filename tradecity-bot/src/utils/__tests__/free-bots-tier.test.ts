import {
    normalizeBotsTier,
    readFreeBotsTier,
    tradingBotsTierLabel,
    TRADING_BOTS_TIER_EVENT,
    writeFreeBotsTier,
} from '../free-bots-tier';

describe('normalizeBotsTier', () => {
    it('maps Standard onto the free catalog', () => {
        expect(normalizeBotsTier('standard')).toBe('free');
        expect(normalizeBotsTier('free')).toBe('free');
        expect(normalizeBotsTier('premium')).toBe('premium');
        expect(normalizeBotsTier('other')).toBeNull();
    });
});

describe('tradingBotsTierLabel', () => {
    it('shows Standard instead of Free', () => {
        expect(tradingBotsTierLabel('free')).toBe('Standard');
        expect(tradingBotsTierLabel('premium')).toBe('Premium');
    });
});

describe('writeFreeBotsTier', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it('persists the catalog key and notifies the desk', () => {
        const seen: string[] = [];
        const onTier = (event: Event) => {
            seen.push((event as CustomEvent).detail);
        };
        window.addEventListener(TRADING_BOTS_TIER_EVENT, onTier);
        writeFreeBotsTier('free');
        expect(readFreeBotsTier()).toBe('free');
        expect(seen).toEqual(['free']);
        window.removeEventListener(TRADING_BOTS_TIER_EVENT, onTier);
    });

    it('reads a stored Standard alias as the free catalog', () => {
        window.localStorage.setItem('tc-desk-free-bots-tier', '"standard"');
        expect(readFreeBotsTier()).toBe('free');
    });
});
