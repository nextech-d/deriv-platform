import type { PaymentAgent } from "@/lib/payments/config";

/** Inject or replace the in-edit listing in a fetched agent directory. */
export function mergePreviewListing(
  directory: PaymentAgent[],
  preview: PaymentAgent,
  includePreview: boolean,
): PaymentAgent[] {
  if (!includePreview) return directory;
  const rest = directory.filter((a) => a.id !== preview.id);
  return [...rest, preview];
}

export function previewListingIndex(
  list: PaymentAgent[],
  highlightId: string,
): number {
  return list.findIndex((a) => a.id === highlightId);
}
