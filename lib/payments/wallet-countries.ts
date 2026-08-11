/** Shared country list for Wallet tab and admin preview */
export const WALLET_COUNTRIES = [
  { code: "KE", name: "Kenya", hint: "M-Pesa · Bank" },
  { code: "UG", name: "Uganda", hint: "MTN MoMo · Airtel" },
  { code: "TZ", name: "Tanzania", hint: "M-Pesa · Tigo Pesa" },
  { code: "RW", name: "Rwanda", hint: "MTN MoMo" },
] as const;

export type WalletCountryCode = (typeof WALLET_COUNTRIES)[number]["code"];

export function walletCountryName(code: string): string {
  return WALLET_COUNTRIES.find((c) => c.code === code)?.name ?? code;
}
