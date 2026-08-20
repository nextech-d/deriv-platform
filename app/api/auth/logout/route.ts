import { NextResponse } from "next/server";
import { clearCsrfCookie } from "@/lib/auth/csrf";
import { getSession } from "@/lib/session";

export async function POST() {
  const session = await getSession();
  session.destroy();
  const response = NextResponse.json({ ok: true });
  clearCsrfCookie(response);
  return response;
}
