"use client";

import { Copy, Globe, Phone, Trash2, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PartnerAgent } from "@/lib/payments/agent-registry";
import type { AgentValidationIssue } from "@/lib/admin/validate-agent";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/input";
import { ADMIN_COUNTRIES, METHOD_PRESETS } from "@/components/admin/constants";

interface AgentEditorProps {
  agent: PartnerAgent;
  issues: AgentValidationIssue[];
  onChange: (patch: Partial<PartnerAgent>) => void;
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

export function AgentEditor({
  agent,
  issues,
  onChange,
  onDuplicate,
  onDelete,
}: AgentEditorProps) {
  const issueFor = (field: string) => issues.find((i) => i.field === field);

  function toggleMethod(method: string) {
    const has = agent.methods.includes(method);
    onChange({
      methods: has
        ? agent.methods.filter((m) => m !== method)
        : [...agent.methods, method],
    });
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="admin-editor-section flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={agent.active}
          data-published={agent.active}
          onClick={() => onChange({ active: !agent.active })}
          className="admin-publish-toggle interactive"
        >
          <span className="admin-publish-switch" data-on={agent.active}>
            <span className="admin-publish-switch-thumb" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {agent.active ? "Published to Wallet" : "Draft"}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted">
              {agent.active
                ? `Live for ${agent.country} traders`
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
            variant="danger"
            size="sm"
            className="interactive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>
      </div>

      {issues.length > 0 ? (
        <ul className="space-y-1.5">
          {issues.map((issue) => (
            <li
              key={`${issue.field}-${issue.message}`}
              className={cn(
                "workspace-inline-alert text-[10px]",
                issue.severity === "error"
                  ? "workspace-inline-alert-danger"
                  : "workspace-inline-alert-warn",
              )}
            >
              {issue.message}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-thin">
        <EditorSection label="Identity">
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[10px] text-muted">
                <Type className="h-3 w-3" strokeWidth={1.75} />
                Display name
              </label>
              <Input
                value={agent.name}
                onChange={(e) => onChange({ name: e.target.value })}
                placeholder="Nairobi Alpha Exchange"
                className={cn(
                  "h-10",
                  issueFor("name")?.severity === "error" && "border-negative/50",
                )}
              />
            </div>
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-[10px] text-muted">
                <Globe className="h-3 w-3" strokeWidth={1.75} />
                Market
              </label>
              <div className="wallet-country-rail">
                {ADMIN_COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => onChange({ country: c.code })}
                    className={cn(
                      "market-symbol-chip interactive items-center",
                      agent.country === c.code && "market-symbol-chip-active",
                    )}
                    aria-pressed={agent.country === c.code}
                  >
                    <span className="text-base leading-none">{c.flag}</span>
                    <span className="market-symbol-id">{c.code}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </EditorSection>

        <EditorSection label="Contact">
          <label className="mb-1.5 flex items-center gap-1.5 text-[10px] text-muted">
            <Phone className="h-3 w-3" strokeWidth={1.75} />
            Phone number
          </label>
          <Input
            value={agent.phone ?? ""}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="+254 700 000 000"
            className="h-10 font-mono"
          />
          <label className="mb-1.5 mt-3 flex items-center gap-1.5 text-[10px] text-muted">
            <Globe className="h-3 w-3" strokeWidth={1.75} />
            Website
          </label>
          <Input
            value={agent.website ?? ""}
            onChange={(e) =>
              onChange({ website: e.target.value.trim() || undefined })
            }
            placeholder="https://deriv.com/payment-agent"
            className={cn(
              "h-10 font-mono text-sm",
              issueFor("website")?.severity === "error" && "border-negative/50",
            )}
            type="url"
          />
        </EditorSection>

        <EditorSection label="Payment methods">
          <div className="trade-preset-row">
            {METHOD_PRESETS.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => toggleMethod(method)}
                className={cn(
                  "trade-preset-chip interactive",
                  agent.methods.includes(method) && "trade-preset-chip-active",
                )}
              >
                {method}
              </button>
            ))}
          </div>
          <Input
            value={agent.methods.join(", ")}
            onChange={(e) =>
              onChange({
                methods: e.target.value
                  .split(",")
                  .map((m) => m.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Custom methods, comma-separated"
            className={cn(
              "mt-2 h-9 text-xs",
              issueFor("methods")?.severity === "error" && "border-negative/50",
            )}
          />
        </EditorSection>

        <EditorSection label="Public note">
          <textarea
            value={agent.note ?? ""}
            onChange={(e) => onChange({ note: e.target.value })}
            placeholder="Short description traders see in Wallet…"
            rows={4}
            className="w-full resize-none rounded border border-border bg-background/50 px-3 py-2.5 text-sm leading-relaxed outline-none transition-all focus:border-accent/40 focus:ring-[3px] focus:ring-accent/10"
          />
        </EditorSection>
      </div>
    </div>
  );
}
