/** Approximate USD base rates for East African display currencies (Phase B fallback) */
export const FX_FALLBACK: Record<string, number> = {
  USD: 1,
  KES: 129.5,
  UGX: 3750,
  TZS: 2650,
  RWF: 1350,
};

export type FxRatesResponse = {
  base: "USD";
  rates: Record<string, number>;
  updatedAt: string;
  source: "live" | "fallback";
};

export async function fetchFxRates(): Promise<FxRatesResponse> {
  try {
    const response = await fetch(
      "https://open.er-api.com/v6/latest/USD",
      { next: { revalidate: 3600 } },
    );
    if (!response.ok) throw new Error("FX fetch failed");
    const json = (await response.json()) as {
      rates?: Record<string, number>;
      time_last_update_utc?: string;
    };

    const picked: Record<string, number> = { USD: 1 };
    for (const code of ["KES", "UGX", "TZS", "RWF"] as const) {
      if (json.rates?.[code]) picked[code] = json.rates[code];
    }

    if (Object.keys(picked).length >= 4) {
      return {
        base: "USD",
        rates: picked,
        updatedAt: json.time_last_update_utc ?? new Date().toISOString(),
        source: "live",
      };
    }
  } catch {
    // fall through
  }

  return {
    base: "USD",
    rates: FX_FALLBACK,
    updatedAt: new Date().toISOString(),
    source: "fallback",
  };
}
