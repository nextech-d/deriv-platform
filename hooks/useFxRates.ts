"use client";

import { useCallback, useEffect, useState } from "react";
import type { DisplayCurrency } from "@/lib/fx/display-currency";

interface FxRatesPayload {
  rates: Record<string, number>;
  updatedAt: string;
  source: "live" | "fallback";
}

export function useFxRates() {
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [source, setSource] = useState<"live" | "fallback" | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/fx/rates");
        if (!response.ok || cancelled) return;
        const json = (await response.json()) as FxRatesPayload;
        if (cancelled) return;
        setRates(json.rates);
        setSource(json.source);
        setUpdatedAt(json.updatedAt);
      } catch {
        // keep prior rates
      }
    }

    void load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  function formatLocal(usdAmount: number, currency: DisplayCurrency): string {
    const rate = rates?.[currency] ?? 1;
    const local = usdAmount * rate;
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "USD" ? 2 : 0,
    }).format(local);
  }

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/fx/rates");
      if (!response.ok) return;
      const json = (await response.json()) as FxRatesPayload;
      setRates(json.rates);
      setSource(json.source);
      setUpdatedAt(json.updatedAt);
    } catch {
      // keep prior rates
    }
  }, []);

  return { rates, source, updatedAt, refresh, formatLocal };
}
