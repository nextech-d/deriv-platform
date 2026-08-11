"use client";

import type { PartnerAgent } from "@/lib/payments/agent-registry";
import { ADMIN_COUNTRIES } from "@/components/admin/constants";
import { cn } from "@/lib/utils/cn";

interface AdminStatsBarProps {
  agents: PartnerAgent[];
}

export function AdminStatsBar({ agents }: AdminStatsBarProps) {
  const published = agents.filter((a) => a.active).length;
  const drafts = agents.length - published;
  const countries = new Set(agents.map((a) => a.country)).size;

  const cells = [
    { label: "Total", value: String(agents.length) },
    {
      label: "Live",
      value: String(published),
      tone: "positive" as const,
    },
    {
      label: "Drafts",
      value: String(drafts),
      tone: drafts > 0 ? ("warning" as const) : undefined,
    },
    { label: "Markets", value: String(countries) },
  ];

  return (
    <div className="admin-metrics-row">
      {cells.map((cell) => (
        <div key={cell.label} className="admin-metric">
          <p className="admin-metric-label">{cell.label}</p>
          <p
            className={cn(
              "admin-metric-value",
              cell.tone === "positive" && "text-positive",
              cell.tone === "warning" && "text-warning",
            )}
          >
            {cell.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function AdminStatsSection({ agents }: AdminStatsBarProps) {
  const countryBreakdown = ADMIN_COUNTRIES.map((c) => {
    const count = agents.filter((a) => a.country === c.code).length;
    const live = agents.filter((a) => a.country === c.code && a.active).length;
    return count > 0 ? { ...c, count, live } : null;
  }).filter(Boolean) as Array<{
    code: string;
    flag: string;
    count: number;
    live: number;
  }>;

  return (
    <div className="admin-metrics-band">
      <AdminStatsBar agents={agents} />
      {countryBreakdown.length > 0 ? (
        <div className="admin-metrics-markets">
          {countryBreakdown.map((c) => (
            <span key={c.code} className="admin-market-chip">
              <span aria-hidden>{c.flag}</span>
              <span className="font-mono font-semibold">{c.code}</span>
              <span className="text-muted">
                {c.live}/{c.count}
              </span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
