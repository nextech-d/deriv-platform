/** Human-readable label for `/api/payments/agents` source field. */
export function formatAgentDirectorySource(source: string): string {
  switch (source) {
    case "deriv+partners":
      return "Deriv API + partner listings";
    case "fallback+partners":
      return "Curated fallback + partner listings";
    case "deriv":
      return "Deriv API";
    case "fallback":
      return "Curated fallback";
    default:
      return source;
  }
}

export function directoryHasPartnerListings(
  agents: Array<{ source?: string }>,
): boolean {
  return agents.some((a) => a.source === "partner");
}
