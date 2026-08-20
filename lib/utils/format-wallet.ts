/** Wallet amount in the account’s own currency (not a local FX conversion). */
export function formatWalletBalance(amount: number, currency: string): string {
  const crypto = /BTC|ETH|LTC|XRP|SOL|USDT|USDC/i.test(currency);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: crypto ? 8 : 2,
  }).format(amount);
  return `${formatted} ${currency}`;
}
