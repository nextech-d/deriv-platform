"use client";

import { useEffect, useState } from "react";
import {
  DISPLAY_CURRENCY_LABELS,
  FX_FALLBACK,
  type DisplayCurrency,
} from "@/lib/fx/display-currency";
import { useFxRates } from "@/hooks/useFxRates";

const STORAGE_KEY = "deriv_platform_display_currency";
const DEFAULT_CURRENCY: DisplayCurrency = "KES";

function readStoredCurrency(): DisplayCurrency {
  if (typeof window === "undefined") return DEFAULT_CURRENCY;
  const stored = localStorage.getItem(STORAGE_KEY) as DisplayCurrency | null;
  if (stored && stored in FX_FALLBACK) return stored;
  return DEFAULT_CURRENCY;
}

export function useDisplayCurrency() {
  const [currency, setCurrencyState] =
    useState<DisplayCurrency>(DEFAULT_CURRENCY);
  const fx = useFxRates();

  useEffect(() => {
    setCurrencyState(readStoredCurrency());
  }, []);

  function setCurrency(next: DisplayCurrency) {
    setCurrencyState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  function formatLocal(usdAmount: number): string {
    if (fx.rates) {
      return fx.formatLocal(usdAmount, currency);
    }
    const local = usdAmount * FX_FALLBACK[currency];
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "USD" ? 2 : 0,
    }).format(local);
  }

  return {
    currency,
    setCurrency,
    formatLocal,
    labels: DISPLAY_CURRENCY_LABELS,
    fxSource: fx.source,
    fxUpdatedAt: fx.updatedAt,
  };
}

export type { DisplayCurrency } from "@/lib/fx/display-currency";
