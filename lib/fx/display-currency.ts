export type DisplayCurrency = "USD" | "KES" | "UGX" | "TZS" | "RWF";

export const FX_FALLBACK: Record<DisplayCurrency, number> = {
  USD: 1,
  KES: 129.5,
  UGX: 3750,
  TZS: 2650,
  RWF: 1350,
};

export const DISPLAY_CURRENCY_LABELS: Record<DisplayCurrency, string> = {
  USD: "US Dollar",
  KES: "Kenyan Shilling",
  UGX: "Ugandan Shilling",
  TZS: "Tanzanian Shilling",
  RWF: "Rwandan Franc",
};
