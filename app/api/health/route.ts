import { NextResponse } from "next/server";
import packageJson from "../../../package.json";

/** Lightweight ALB/ECS health probe — no auth or upstream calls. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    ts: Date.now(),
    version: packageJson.version,
    demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== "false",
  });
}
