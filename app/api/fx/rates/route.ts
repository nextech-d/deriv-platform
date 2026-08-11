import { NextResponse } from "next/server";
import { fetchFxRates } from "@/lib/fx/rates";

export async function GET() {
  const data = await fetchFxRates();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
