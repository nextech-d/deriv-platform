import { NextRequest, NextResponse } from "next/server";
import { derivConfig } from "@/lib/config/deriv";
import { isDemoMode } from "@/lib/config/demo";
import { type PaymentAgent } from "@/lib/payments/config";
import {
  fallbackAgentsForCountry,
  loadPartnerAgents,
  mergeAgents,
  tagAgentSource,
} from "@/lib/payments/agent-registry";
import { getSessionOrDefault } from "@/lib/session";

interface DerivAgentResponse {
  data?: Array<{
    id?: string;
    attributes?: {
      name?: string;
      country?: string;
      website?: string;
      phone?: string;
      payment_methods?: string[];
    };
  }>;
}

export async function GET(request: NextRequest) {
  const country = request.nextUrl.searchParams.get("country")?.toUpperCase() ?? "KE";
  const currency = request.nextUrl.searchParams.get("currency") ?? "USD";
  const partners = await loadPartnerAgents();

  if (isDemoMode) {
    return NextResponse.json({
      agents: mergeAgents(
        fallbackAgentsForCountry(country),
        partners,
        country,
        "fallback",
      ),
      source: "fallback+partners",
    });
  }

  const session = await getSessionOrDefault();
  if (!session.isLoggedIn || !session.accessToken) {
    return NextResponse.json({
      agents: mergeAgents(
        fallbackAgentsForCountry(country),
        partners,
        country,
        "fallback",
      ),
      source: "fallback+partners",
    });
  }

  try {
    const params = new URLSearchParams({ currency, country });
    const response = await fetch(
      `${derivConfig.restBaseUrl}/payment-agents/v1/agents?${params}`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Deriv-App-ID": derivConfig.appId,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Agents API ${response.status}`);
    }

    const json = (await response.json()) as DerivAgentResponse;
    const agents: PaymentAgent[] = (json.data ?? []).map((row) =>
      tagAgentSource(
        {
          id: row.id ?? "",
          name: row.attributes?.name ?? "Payment Agent",
          country: row.attributes?.country ?? country,
          methods: row.attributes?.payment_methods ?? ["Local transfer"],
          website: row.attributes?.website,
          phone: row.attributes?.phone,
        },
        "deriv",
      ),
    );

    return NextResponse.json({
      agents: mergeAgents(agents, partners, country, "deriv"),
      source: "deriv+partners",
    });
  } catch {
    return NextResponse.json({
      agents: mergeAgents(
        fallbackAgentsForCountry(country),
        partners,
        country,
        "fallback",
      ),
      source: "fallback+partners",
    });
  }
}
