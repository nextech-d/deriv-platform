import { NextRequest } from "next/server";
import { handleInboundAuth } from "@/lib/auth/inbound-auth";

/** Public Verification URL: https://tradecity.trade/verify */
export async function GET(request: NextRequest) {
  return handleInboundAuth(request);
}
