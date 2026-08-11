import { NextResponse } from "next/server";

/** Lightweight ALB/ECS health probe — no auth or upstream calls. */
export async function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}
