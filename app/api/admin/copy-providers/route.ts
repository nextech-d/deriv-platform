import { NextRequest, NextResponse } from "next/server";
import { validateCopyProvidersForSave } from "@/lib/admin/validate-copy-providers";
import {
  loadCopyProviderRecords,
  saveCopyProviderRecords,
  type CopyProviderRecord,
} from "@/lib/copy/provider-registry";
import { isAuthorized } from "@/lib/payments/agent-registry";

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const providers = await loadCopyProviderRecords();
  return NextResponse.json({ providers });
}

export async function PUT(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { providers: CopyProviderRecord[] };
  try {
    body = (await request.json()) as { providers: CopyProviderRecord[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = validateCopyProvidersForSave(body.providers);
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

  await saveCopyProviderRecords(body.providers);
  return NextResponse.json({ ok: true, count: body.providers.length });
}
