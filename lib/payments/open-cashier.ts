import type { CashierLink } from "@/lib/payments/cashier-url";

export async function fetchCashierLink(
  returnUrl?: string,
): Promise<CashierLink> {
  const params = new URLSearchParams();
  if (returnUrl) {
    params.set("returnUrl", returnUrl);
  }

  const query = params.toString();
  const response = await fetch(
    `/api/payments/cashier-url${query ? `?${query}` : ""}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error("Could not prepare Cashier link");
  }

  return response.json() as Promise<CashierLink>;
}

export async function openDerivCashier(returnUrl?: string): Promise<CashierLink> {
  const resolvedReturnUrl =
    returnUrl ??
    (typeof window !== "undefined"
      ? `${window.location.origin}/dashboard`
      : undefined);

  const link = await fetchCashierLink(resolvedReturnUrl);
  window.open(link.url, "_blank", "noopener,noreferrer");
  return link;
}
