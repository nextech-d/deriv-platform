export type PaymentAgentSource = "deriv" | "partner" | "fallback";

export interface PaymentAgent {
  id: string;
  name: string;
  country: string;
  methods: string[];
  website?: string;
  phone?: string;
  note?: string;
  /** Provenance for Wallet disclosure (set at merge time). */
  source?: PaymentAgentSource;
}

/** Curated fallback when OAuth payment scope unavailable (demo mode) */
export const PAYMENT_AGENTS_FALLBACK: PaymentAgent[] = [
  {
    id: "deriv-cashier",
    name: "Deriv Cashier (Official)",
    country: "KE",
    methods: ["M-Pesa Fast Pesa", "Card", "Crypto"],
    website: "https://cashier.deriv.com",
    note: "Official deposit path — use when available in your region",
  },
  {
    id: "deriv-p2p",
    name: "Deriv P2P",
    country: "KE",
    methods: ["M-Pesa", "Bank", "Skrill"],
    website: "https://deriv.com/p2p",
    note: "Escrow-protected peer transfers",
  },
  {
    id: "deriv-cashier-ug",
    name: "Deriv Cashier (Official)",
    country: "UG",
    methods: ["MTN MoMo", "Card", "Crypto"],
    website: "https://cashier.deriv.com",
  },
  {
    id: "deriv-cashier-tz",
    name: "Deriv Cashier (Official)",
    country: "TZ",
    methods: ["M-Pesa Vodacom", "Card"],
    website: "https://cashier.deriv.com",
  },
  {
    id: "deriv-cashier-rw",
    name: "Deriv Cashier (Official)",
    country: "RW",
    methods: ["MTN MoMo", "Card"],
    website: "https://cashier.deriv.com",
  },
];

export function buildCashierUrl(returnUrl: string): string {
  const params = new URLSearchParams({
    redirect_url: returnUrl,
  });
  return `https://cashier.deriv.com/?${params.toString()}`;
}
