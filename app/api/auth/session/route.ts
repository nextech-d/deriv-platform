import { getSessionOrDefault, getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSessionOrDefault();

  if (!session.isLoggedIn) {
    return NextResponse.json({ isLoggedIn: false });
  }

  return NextResponse.json({
    isLoggedIn: true,
    accounts: session.accounts ?? [],
    activeAccountId: session.activeAccountId,
    expiresAt: session.expiresAt,
  });
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
