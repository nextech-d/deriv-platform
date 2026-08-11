"use client";

import { Copy, Trash2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  COPY_RISK_LABELS,
  COPY_STYLE_LABELS,
  COPY_STYLES,
  COPY_SYMBOL_PRESETS,
} from "@/components/admin/copy-constants";
import { ADMIN_COUNTRIES } from "@/components/admin/constants";
import type { CopyProviderValidationIssue } from "@/lib/admin/validate-copy-provider";
import type { CopyProviderRecord } from "@/lib/copy/provider-registry";
import type { ProviderStyle } from "@/lib/copy/types";
import { cn } from "@/lib/utils/cn";

interface CopyProviderEditorProps {
  provider: CopyProviderRecord;
  issues: CopyProviderValidationIssue[];
  onChange: (patch: Partial<CopyProviderRecord>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function EditorSection({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("admin-editor-section", className)}>
      <p className="trade-field-label mb-2">{label}</p>
      {children}
    </section>
  );
}

function FieldHint({
  issue,
}: {
  issue?: CopyProviderValidationIssue;
}) {
  if (!issue) return null;
  return (
    <p
      className={cn(
        "mt-1 text-[10px]",
        issue.severity === "error" ? "text-negative" : "text-warning",
      )}
    >
      {issue.message}
    </p>
  );
}

export function CopyProviderEditor({
  provider,
  issues,
  onChange,
  onDuplicate,
  onDelete,
}: CopyProviderEditorProps) {
  const issueFor = (field: string) => issues.find((i) => i.field === field);

  function toggleSymbol(symbol: string) {
    const has = provider.symbols.includes(symbol);
    onChange({
      symbols: has
        ? provider.symbols.filter((s) => s !== symbol)
        : [...provider.symbols, symbol],
    });
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="admin-editor-section flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={provider.active}
          data-published={provider.active}
          onClick={() => onChange({ active: !provider.active })}
          className="admin-publish-toggle interactive"
        >
          <span className="admin-publish-switch" data-on={provider.active}>
            <span className="admin-publish-switch-thumb" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {provider.active ? "Published to Copy desk" : "Draft"}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted">
              {provider.active
                ? "Visible in Copy workspace provider list"
                : "Hidden until published"}
            </p>
          </div>
        </button>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="interactive"
            onClick={onDuplicate}
          >
            <Copy className="h-4 w-4" strokeWidth={1.75} />
            Duplicate
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="interactive text-negative hover:text-negative"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
            Delete
          </Button>
        </div>
      </div>

      <EditorSection label="Identity">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="trade-field-label" htmlFor="copy-provider-id">
              Slug id
            </label>
            <Input
              id="copy-provider-id"
              value={provider.id}
              mono
              className="mt-1 h-9"
              onChange={(e) => onChange({ id: e.target.value.trim() })}
            />
            <FieldHint issue={issueFor("id")} />
          </div>
          <div>
            <label className="trade-field-label" htmlFor="copy-provider-name">
              Display name
            </label>
            <Input
              id="copy-provider-name"
              value={provider.name}
              className="mt-1 h-9"
              onChange={(e) => onChange({ name: e.target.value })}
            />
            <FieldHint issue={issueFor("name")} />
          </div>
        </div>
      </EditorSection>

      <EditorSection label="Market profile">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="trade-field-label mb-2">Country</p>
            <div className="trade-preset-row">
              {ADMIN_COUNTRIES.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => onChange({ country: country.code })}
                  className={cn(
                    "trade-preset-chip interactive",
                    provider.country === country.code && "trade-preset-chip-active",
                  )}
                >
                  {country.flag} {country.code}
                </button>
              ))}
            </div>
            <FieldHint issue={issueFor("country")} />
          </div>
          <div>
            <p className="trade-field-label mb-2">Style</p>
            <div className="trade-preset-row">
              {COPY_STYLES.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => onChange({ style })}
                  className={cn(
                    "trade-preset-chip interactive",
                    provider.style === style && "trade-preset-chip-active",
                  )}
                >
                  {COPY_STYLE_LABELS[style]}
                </button>
              ))}
            </div>
            <FieldHint issue={issueFor("style")} />
          </div>
        </div>

        <div className="mt-3">
          <p className="trade-field-label mb-2">Symbols</p>
          <div className="trade-preset-row">
            {COPY_SYMBOL_PRESETS.map((symbol) => (
              <button
                key={symbol}
                type="button"
                onClick={() => toggleSymbol(symbol)}
                className={cn(
                  "trade-preset-chip interactive font-mono",
                  provider.symbols.includes(symbol) && "trade-preset-chip-active",
                )}
              >
                {symbol}
              </button>
            ))}
          </div>
          <FieldHint issue={issueFor("symbols")} />
        </div>
      </EditorSection>

      <EditorSection label="Copy profile">
        <label className="trade-field-label" htmlFor="copy-provider-bio">
          Bio
        </label>
        <textarea
          id="copy-provider-bio"
          value={provider.bio}
          rows={3}
          className="mt-1 w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm"
          onChange={(e) => onChange({ bio: e.target.value })}
        />
        <FieldHint issue={issueFor("bio")} />

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div>
            <label className="trade-field-label" htmlFor="copy-provider-win">
              Demo win rate (%)
            </label>
            <Input
              id="copy-provider-win"
              type="number"
              min={0}
              max={100}
              value={provider.demoWinRate}
              mono
              className="mt-1 h-9"
              onChange={(e) => onChange({ demoWinRate: Number(e.target.value) })}
            />
            <FieldHint issue={issueFor("demoWinRate")} />
          </div>
          <div>
            <label className="trade-field-label" htmlFor="copy-provider-30d">
              30d signals
            </label>
            <Input
              id="copy-provider-30d"
              type="number"
              min={0}
              value={provider.demoSignals30d}
              mono
              className="mt-1 h-9"
              onChange={(e) =>
                onChange({ demoSignals30d: Number(e.target.value) })
              }
            />
            <FieldHint issue={issueFor("demoSignals30d")} />
          </div>
          <div>
            <p className="trade-field-label mb-2">Risk label</p>
            <div className="trade-preset-row">
              {COPY_RISK_LABELS.map((risk) => (
                <button
                  key={risk}
                  type="button"
                  onClick={() => onChange({ riskLabel: risk })}
                  className={cn(
                    "trade-preset-chip interactive capitalize",
                    provider.riskLabel === risk && "trade-preset-chip-active",
                  )}
                >
                  {risk}
                </button>
              ))}
            </div>
            <FieldHint issue={issueFor("riskLabel")} />
          </div>
        </div>

        <label className="copy-toggle mt-3">
          <input
            type="checkbox"
            checked={provider.verified}
            onChange={(e) => onChange({ verified: e.target.checked })}
            className="rounded border-border accent-accent"
          />
          <span>Verified desk (manual review complete)</span>
        </label>
        <FieldHint issue={issueFor("verified")} />
      </EditorSection>

      <div className="admin-editor-section mt-auto flex items-center gap-2 text-[10px] text-muted">
        <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.75} />
        Demo stats are illustrative only — not verified performance claims.
      </div>
    </div>
  );
}
