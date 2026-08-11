import { ADMIN_COUNTRIES } from "@/components/admin/constants";
import { COPY_RISK_LABELS, COPY_STYLES, COPY_SYMBOL_PRESETS } from "@/components/admin/copy-constants";
import type { CopyProviderRecord } from "@/lib/copy/provider-registry";

export interface CopyProviderValidationIssue {
  field: string;
  message: string;
  severity: "error" | "warning";
}

const SYMBOL_PATTERN = /^[A-Z0-9_]+$/;

export function validateCopyProvider(
  provider: CopyProviderRecord,
): CopyProviderValidationIssue[] {
  const issues: CopyProviderValidationIssue[] = [];

  if (!provider.id.trim()) {
    issues.push({
      field: "id",
      message: "Provider id is required",
      severity: "error",
    });
  } else if (!/^[a-z0-9-]+$/.test(provider.id)) {
    issues.push({
      field: "id",
      message: "Use lowercase letters, numbers, and hyphens only",
      severity: "error",
    });
  }

  if (!provider.name.trim()) {
    issues.push({
      field: "name",
      message: "Display name is required",
      severity: provider.active ? "error" : "warning",
    });
  }

  if (!ADMIN_COUNTRIES.some((c) => c.code === provider.country)) {
    issues.push({
      field: "country",
      message: "Pick a supported country (KE, UG, TZ, RW)",
      severity: "error",
    });
  }

  if (!provider.bio.trim()) {
    issues.push({
      field: "bio",
      message: "Bio is required for published providers",
      severity: provider.active ? "error" : "warning",
    });
  }

  if (!COPY_STYLES.includes(provider.style)) {
    issues.push({
      field: "style",
      message: "Pick a signal style",
      severity: "error",
    });
  }

  if (!COPY_RISK_LABELS.includes(provider.riskLabel)) {
    issues.push({
      field: "riskLabel",
      message: "Pick a risk label",
      severity: "error",
    });
  }

  if (provider.symbols.length === 0) {
    issues.push({
      field: "symbols",
      message: "Add at least one symbol",
      severity: provider.active ? "error" : "warning",
    });
  }

  for (const symbol of provider.symbols) {
    if (!SYMBOL_PATTERN.test(symbol)) {
      issues.push({
        field: "symbols",
        message: `Invalid symbol "${symbol}" — use Deriv symbol codes`,
        severity: "error",
      });
    }
  }

  if (provider.demoWinRate < 0 || provider.demoWinRate > 100) {
    issues.push({
      field: "demoWinRate",
      message: "Win rate must be 0–100",
      severity: "error",
    });
  }

  if (provider.demoSignals30d < 0) {
    issues.push({
      field: "demoSignals30d",
      message: "30d signal count cannot be negative",
      severity: "error",
    });
  }

  if (provider.active && !provider.verified) {
    issues.push({
      field: "verified",
      message: "Unverified providers should stay in draft",
      severity: "warning",
    });
  }

  if (
    provider.active &&
    provider.symbols.every((s) => !COPY_SYMBOL_PRESETS.includes(s as (typeof COPY_SYMBOL_PRESETS)[number]))
  ) {
    issues.push({
      field: "symbols",
      message: "Published providers should use known volatility symbols",
      severity: "warning",
    });
  }

  return issues;
}

export function hasBlockingCopyIssues(
  issues: CopyProviderValidationIssue[],
): boolean {
  return issues.some((issue) => issue.severity === "error");
}
