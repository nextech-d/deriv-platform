import { NextRequest, NextResponse } from "next/server";
import { fetchWebSocketUrl } from "@/lib/deriv/api";
import { requireSession } from "@/lib/session";
import { clientIp, rateLimit } from "@/lib/utils/rate-limit";

const OTP_LIMIT = 30;
const OTP_WINDOW_MS = 60_000;

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const ip = clientIp(request);
    const limited = rateLimit(
      `otp:${session.activeAccountId ?? ip}:${ip}`,
      OTP_LIMIT,
      OTP_WINDOW_MS,
    );
    if (!limited.ok) {
      return NextResponse.json(
        { error: "OTP rate limit exceeded. Wait before reconnecting." },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) },
        },
      );
    }
    const body = (await request.json()) as { accountId?: string };
    const accountId = body.accountId ?? session.activeAccountId;

    if (!accountId) {
      return NextResponse.json({ error: "No active account" }, { status: 400 });
    }

    const wsUrl = await fetchWebSocketUrl(session.accessToken!, accountId);

    return NextResponse.json({ wsUrl, accountId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "OTP failed";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
