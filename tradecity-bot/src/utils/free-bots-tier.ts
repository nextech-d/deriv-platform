const FREE_BOTS_TIER_KEY = 'tc-desk-free-bots-tier';

export type FreeBotsTier = 'free' | 'premium';

export function writeFreeBotsTier(tier: FreeBotsTier) {
    try {
        localStorage.setItem(FREE_BOTS_TIER_KEY, JSON.stringify(tier));
    } catch {
        // ignore quota / private mode
    }
}

export function readFreeBotsTier(): FreeBotsTier | null {
    try {
        const raw = localStorage.getItem(FREE_BOTS_TIER_KEY);
        if (raw === '"free"' || raw === 'free') return 'free';
        if (raw === '"premium"' || raw === 'premium') return 'premium';
        const parsed = JSON.parse(raw ?? '') as FreeBotsTier;
        if (parsed === 'free' || parsed === 'premium') return parsed;
    } catch {
        // ignore
    }
    return null;
}
