import { NextRequest } from "next/server";
import { handleInboundAuth } from "@/lib/auth/inbound-auth";

/** Deriv Application Manager Verification URL. Same completion as OAuth callback. */
export async function GET(request: NextRequest) {
  return handleInboundAuth(request);
}
