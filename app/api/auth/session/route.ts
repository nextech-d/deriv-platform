import { applyCsrfCookie, createCsrfToken } from "@/lib/auth/csrf";
import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getSession();

    if (!session.isLoggedIn) {
      return NextResponse.json({ isLoggedIn: false });
    }

    if (!session.csrfToken) {
      session.csrfToken = createCsrfToken();
      await session.save();
    }

    const response = NextResponse.json({
      isLoggedIn: true,
      accounts: session.accounts ?? [],
      activeAccountId: session.activeAccountId,
      expiresAt: session.expiresAt,
    });
    applyCsrfCookie(response, session.csrfToken);
    return response;
  } catch {
    return NextResponse.json({ isLoggedIn: false });
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { activeAccountId?: string };
  const nextId = body.activeAccountId;

  if (!nextId) {
    return NextResponse.json({ error: "activeAccountId required" }, { status: 400 });
  }

  const allowed = session.accounts?.some((a) => a.accountId === nextId);
  if (!allowed) {
    return NextResponse.json({ error: "Unknown account" }, { status: 400 });
  }

  session.activeAccountId = nextId;
  await session.save();

  return NextResponse.json({ ok: true, activeAccountId: nextId });
}
