import type { CopyProviderRecord } from "@/lib/copy/provider-registry";
import {
  hasBlockingCopyIssues,
  validateCopyProvider,
  type CopyProviderValidationIssue,
} from "@/lib/admin/validate-copy-provider";

export interface CopyProviderBatchValidationResult {
  ok: boolean;
  issues: Array<{ index: number; id: string; issues: CopyProviderValidationIssue[] }>;
  duplicateIds: string[];
}

function isCopyProviderShape(value: unknown): value is CopyProviderRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.name === "string" &&
    typeof row.country === "string" &&
    typeof row.bio === "string" &&
    typeof row.style === "string" &&
    Array.isArray(row.symbols) &&
    row.symbols.every((s) => typeof s === "string") &&
    typeof row.demoWinRate === "number" &&
    typeof row.demoSignals30d === "number" &&
    typeof row.verified === "boolean" &&
    typeof row.riskLabel === "string" &&
    typeof row.active === "boolean"
  );
}

export function validateCopyProvidersForSave(
  providers: unknown,
): CopyProviderBatchValidationResult {
  if (!Array.isArray(providers)) {
    return {
      ok: false,
      issues: [
        {
          index: -1,
          id: "",
          issues: [
            {
              field: "providers",
              message: "Expected an array of copy providers",
              severity: "error",
            },
          ],
        },
      ],
      duplicateIds: [],
    };
  }

  const issues: CopyProviderBatchValidationResult["issues"] = [];
  const seen = new Map<string, number>();
  const duplicateIds = new Set<string>();

  providers.forEach((provider, index) => {
    if (!isCopyProviderShape(provider)) {
      issues.push({
        index,
        id:
          typeof provider === "object" && provider && "id" in provider
            ? String((provider as { id: unknown }).id)
            : "",
        issues: [
          {
            field: "provider",
            message:
              "Invalid provider shape (id, name, country, bio, style, symbols, stats, active required)",
            severity: "error",
          },
        ],
      });
      return;
    }

    if (!provider.id.trim()) {
      issues.push({
        index,
        id: provider.id,
        issues: [
          {
            field: "id",
            message: "Provider id is required",
            severity: "error",
          },
        ],
      });
    } else if (seen.has(provider.id)) {
      duplicateIds.add(provider.id);
      issues.push({
        index,
        id: provider.id,
        issues: [
          {
            field: "id",
            message: `Duplicate id (also at index ${seen.get(provider.id)})`,
            severity: "error",
          },
        ],
      });
    } else {
      seen.set(provider.id, index);
    }

    const fieldIssues = validateCopyProvider(provider);
    if (hasBlockingCopyIssues(fieldIssues)) {
      issues.push({ index, id: provider.id, issues: fieldIssues });
    }
  });

  return {
    ok: issues.length === 0,
    issues,
    duplicateIds: [...duplicateIds],
  };
}
