import { ADMIN_COUNTRIES } from "@/components/admin/constants";
import type { PartnerAgent } from "@/lib/payments/agent-registry";

export interface AgentValidationIssue {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export function validateAgent(agent: PartnerAgent): AgentValidationIssue[] {
  const issues: AgentValidationIssue[] = [];

  if (!agent.name.trim()) {
    issues.push({
      field: "name",
      message: "Display name is required",
      severity: agent.active ? "error" : "warning",
    });
  }

  if (!ADMIN_COUNTRIES.some((c) => c.code === agent.country)) {
    issues.push({
      field: "country",
      message: "Pick a supported country (KE, UG, TZ, RW)",
      severity: "error",
    });
  }

  if (agent.methods.length === 0) {
    issues.push({
      field: "methods",
      message: "Add at least one payment method",
      severity: agent.active ? "error" : "warning",
    });
  }

  if (agent.website) {
    try {
      const url = new URL(agent.website);
      if (!["http:", "https:"].includes(url.protocol)) {
        issues.push({
          field: "website",
          message: "Website must use http or https",
          severity: "error",
        });
      }
    } catch {
      issues.push({
        field: "website",
        message: "Website URL is invalid",
        severity: "error",
      });
    }
  }

  if (agent.active && !agent.phone?.trim()) {
    issues.push({
      field: "phone",
      message: "Phone recommended for published agents",
      severity: "warning",
    });
  }

  return issues;
}

export function hasBlockingIssues(issues: AgentValidationIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}
