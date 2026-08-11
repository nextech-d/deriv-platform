import { NextResponse } from "next/server";
import { CURATED_PROVIDERS } from "@/lib/copy/providers";
import { loadActiveCopyProviders } from "@/lib/copy/provider-registry";

export async function GET() {
  const registryProviders = await loadActiveCopyProviders();
  const providers =
    registryProviders.length > 0 ? registryProviders : CURATED_PROVIDERS;

  return NextResponse.json({
    providers,
    source: registryProviders.length > 0 ? "registry" : "curated-fallback",
    disclaimer:
      "Signals are from manually vetted providers. Past demo stats are not guarantees. Trade at your own risk.",
  });
}
