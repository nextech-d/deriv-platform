const FREE_BOTS_TIER_KEY = 'tc-desk-free-bots-tier';

export const TRADING_BOTS_TIER_EVENT = 'tc-trading-bots-tier';

/** Stored as `free` so existing catalogs keep working. The desk label is Standard. */
export type FreeBotsTier = 'free' | 'premium';

export function normalizeBotsTier(value: unknown): FreeBotsTier | null {
    if (value === 'free' || value === 'standard') return 'free';
    if (value === 'premium') return 'premium';
    return null;
}

export function tradingBotsTierLabel(tier: FreeBotsTier): 'Standard' | 'Premium' {
    return tier === 'premium' ? 'Premium' : 'Standard';
}

export function writeFreeBotsTier(tier: FreeBotsTier) {
    try {
        localStorage.setItem(FREE_BOTS_TIER_KEY, JSON.stringify(tier));
    } catch {
        // ignore quota / private mode
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(TRADING_BOTS_TIER_EVENT, { detail: tier }));
    }
}

export function readFreeBotsTier(): FreeBotsTier | null {
    try {
        const raw = localStorage.getItem(FREE_BOTS_TIER_KEY);
        if (!raw) return null;
        const stripped = raw.replace(/^"|"$/g, '');
        return normalizeBotsTier(stripped) ?? normalizeBotsTier(JSON.parse(raw));
    } catch {
        return null;
    }
}
