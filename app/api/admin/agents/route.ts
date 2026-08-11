import { NextRequest, NextResponse } from "next/server";
import { validateAgentsForSave } from "@/lib/admin/validate-agents";
import {
  isAuthorized,
  loadPartnerAgents,
  savePartnerAgents,
  type PartnerAgent,
} from "@/lib/payments/agent-registry";

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const agents = await loadPartnerAgents();
  return NextResponse.json({ agents });
}

export async function PUT(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { agents: PartnerAgent[] };
  try {
    body = (await request.json()) as { agents: PartnerAgent[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = validateAgentsForSave(body.agents);
  if (!validation.ok) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: validation.issues,
        duplicateIds: validation.duplicateIds,
      },
      { status: 400 },
    );
  }

  await savePartnerAgents(body.agents as PartnerAgent[]);
  return NextResponse.json({ ok: true, count: body.agents.length });
}
