"use client";

import { ExternalLink, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { PaymentAgent } from "@/lib/payments/config";

interface AgentCardProps {
  agent: PaymentAgent;
  /** When false, Visit button is disabled (preview mode). Default true. */
  allowVisit?: boolean;
  compact?: boolean;
}

function confirmPartnerVisit(agent: PaymentAgent): boolean {
  return window.confirm(
    `You are about to visit a curated partner listing:\n\n"${agent.name}"\n\n` +
      "This is NOT a Deriv-verified agent. Verify credentials on Deriv.com before sending funds.\n\nContinue?",
  );
}

function handleVisit(agent: PaymentAgent, allowVisit: boolean) {
  if (!allowVisit || !agent.website) return;
  if (agent.source === "partner" && !confirmPartnerVisit(agent)) return;
  window.open(agent.website, "_blank", "noopener");
}

export function AgentCard({
  agent,
  allowVisit = true,
  compact = true,
}: AgentCardProps) {
  const isPartner = agent.source === "partner";

  return (
    <li
      className={cn(
        "agent-card workspace-position-row",
        isPartner && "agent-card-partner",
      )}
    >
      <div className="agent-card-main min-w-0 flex-1">
        <div className="agent-card-title">
          {isPartner ? (
            <ShieldAlert
              className="h-3.5 w-3.5 shrink-0 text-warning"
              strokeWidth={1.75}
              aria-hidden
            />
          ) : null}
          <span className="truncate text-sm font-semibold tracking-tight">
            {agent.name}
          </span>
          {isPartner ? (
            <span className="copy-badge copy-badge-unverified">Partner</span>
          ) : (
            <span className="copy-badge copy-badge-verified">Deriv</span>
          )}
        </div>
        <p className="agent-card-meta">
          {agent.methods.join(" · ")}
          {agent.phone ? (
            <>
              <span className="mx-1.5 text-border">·</span>
              <span className="font-mono">{agent.phone}</span>
            </>
          ) : null}
        </p>
        {!compact && agent.note ? (
          <p className="agent-card-note">{agent.note}</p>
        ) : null}
        {isPartner && !compact ? (
          <p className="workspace-inline-alert workspace-inline-alert-warn mt-2 text-[10px]">
            Verify on Deriv.com before transferring funds.
          </p>
        ) : null}
      </div>
      {agent.website ? (
        <Button
          variant="ghost"
          size="sm"
          className="interactive agent-card-visit h-8 shrink-0 gap-1.5 px-2.5 text-xs"
          disabled={!allowVisit}
          onClick={() => handleVisit(agent, allowVisit)}
        >
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
          {compact ? "Visit" : "Visit"}
        </Button>
      ) : null}
    </li>
  );
}
