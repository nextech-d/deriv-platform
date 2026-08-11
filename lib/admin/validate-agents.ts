import type { PartnerAgent } from "@/lib/payments/agent-registry";
import {
  hasBlockingIssues,
  validateAgent,
  type AgentValidationIssue,
} from "@/lib/admin/validate-agent";

export interface AgentBatchValidationResult {
  ok: boolean;
  issues: Array<{ index: number; id: string; issues: AgentValidationIssue[] }>;
  duplicateIds: string[];
}

function isPartnerAgentShape(value: unknown): value is PartnerAgent {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.name === "string" &&
    typeof row.country === "string" &&
    Array.isArray(row.methods) &&
    row.methods.every((m) => typeof m === "string") &&
    typeof row.active === "boolean"
  );
}

/** Server-side validation before persisting partner agents. */
export function validateAgentsForSave(
  agents: unknown,
): AgentBatchValidationResult {
  if (!Array.isArray(agents)) {
    return {
      ok: false,
      issues: [
        {
          index: -1,
          id: "",
          issues: [
            {
              field: "agents",
              message: "Expected an array of partner agents",
              severity: "error",
            },
          ],
        },
      ],
      duplicateIds: [],
    };
  }

  const issues: AgentBatchValidationResult["issues"] = [];
  const seen = new Map<string, number>();
  const duplicateIds = new Set<string>();

  agents.forEach((agent, index) => {
    if (!isPartnerAgentShape(agent)) {
      issues.push({
        index,
        id:
          typeof agent === "object" && agent && "id" in agent
            ? String((agent as { id: unknown }).id)
            : "",
        issues: [
          {
            field: "agent",
            message:
              "Invalid agent shape (id, name, country, methods, active required)",
            severity: "error",
          },
        ],
      });
      return;
    }

    if (!agent.id.trim()) {
      issues.push({
        index,
        id: agent.id,
        issues: [
          {
            field: "id",
            message: "Agent id is required",
            severity: "error",
          },
        ],
      });
    } else if (seen.has(agent.id)) {
      duplicateIds.add(agent.id);
      issues.push({
        index,
        id: agent.id,
        issues: [
          {
            field: "id",
            message: `Duplicate id (also at index ${seen.get(agent.id)})`,
            severity: "error",
          },
        ],
      });
    } else {
      seen.set(agent.id, index);
    }

    const fieldIssues = validateAgent(agent);
    if (hasBlockingIssues(fieldIssues)) {
      issues.push({ index, id: agent.id, issues: fieldIssues });
    }
  });

  return {
    ok: issues.length === 0,
    issues,
    duplicateIds: [...duplicateIds],
  };
}
