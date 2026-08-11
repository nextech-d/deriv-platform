import { NextRequest, NextResponse } from "next/server";
import { establishSessionFromToken } from "@/lib/auth/session-from-token";
import { clientIp, rateLimit } from "@/lib/utils/rate-limit";

const PAT_LIMIT = 5;
const PAT_WINDOW_MS = 60_000;

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const limited = rateLimit(`pat:${ip}`, PAT_LIMIT, PAT_WINDOW_MS);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many token attempts. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  let body: { token?: string };
  try {
    body = (await request.json()) as { token?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = body.token?.trim();
  if (!token || token.length < 16) {
    return NextResponse.json({ error: "Valid access token required" }, { status: 400 });
  }

  try {
    const { accounts, activeAccountId } = await establishSessionFromToken({
      accessToken: token,
    });

    return NextResponse.json({
      ok: true,
      accountCount: accounts.length,
      activeAccountId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token validation failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
