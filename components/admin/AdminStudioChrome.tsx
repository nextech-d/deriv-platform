"use client";

import { Loader2 } from "lucide-react";
import { AdminEntityPicker } from "@/components/admin/AdminEntityPicker";
import { ThemeToggle } from "@/components/trading/ThemeToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export type AdminStudioKind = "partners" | "copy";

export interface AdminCatalogTab {
  id: string;
  name: string;
  active: boolean;
  hasErrors?: boolean;
}

const STUDIO_HEADING: Record<AdminStudioKind, string> = {
  partners: "Payment agents",
  copy: "Signal providers",
};

interface AdminStudioChromeProps {
  studio: AdminStudioKind;
  title: string;
  recordId?: string;
  region?: string;
  live?: boolean;
  dirty: boolean;
  savedAt: number | null;
  saving: boolean;
  onSave: () => void;
  catalog?: AdminCatalogTab[];
  selectedId?: string | null;
  onCatalogSelect?: (id: string) => void;
}

export function AdminStudioChrome({
  studio,
  title,
  recordId,
  region,
  live,
  dirty,
  savedAt,
  saving,
  onSave,
  catalog = [],
  selectedId = null,
  onCatalogSelect,
}: AdminStudioChromeProps) {
  const saveDisabled = (!dirty && savedAt !== null) || saving;
  const canPick =
    catalog.length > 0 && onCatalogSelect !== undefined;

  return (
    <header className="admin-topbar shrink-0">
      <div className="admin-topbar-inner mx-auto w-full max-w-[1240px] px-4 md:px-6">
        <div className="admin-topbar-context">
          <div className="admin-topbar-context-mobile lg:hidden">
            {canPick ? (
              <AdminEntityPicker
                studio={studio}
                title={title}
                live={live}
                items={catalog}
                selectedId={selectedId}
                onSelect={onCatalogSelect}
              />
            ) : (
              <p className="admin-topbar-picker-label truncate">{title}</p>
            )}
          </div>

          <div className="admin-topbar-context-desktop hidden min-w-0 lg:block">
            <p className="admin-topbar-kicker">{STUDIO_HEADING[studio]}</p>
            <div className="admin-topbar-title-row">
              <h1 className="admin-topbar-title truncate">{title}</h1>
              {live !== undefined ? (
                <span
                  className={cn(
                    "admin-topbar-state",
                    live ? "admin-topbar-state-live" : "admin-topbar-state-draft",
                  )}
                >
                  <span className="admin-topbar-state-dot" aria-hidden />
                  {live ? "Live" : "Draft"}
                </span>
              ) : null}
            </div>
            {recordId || region ? (
              <p className="admin-topbar-meta truncate">
                {[recordId, region].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
        </div>

        <div className="admin-topbar-actions">
          {saving || dirty || savedAt ? (
            <p
              className={cn(
                "admin-topbar-sync hidden sm:block",
                dirty && "admin-topbar-sync-dirty",
                savedAt && !dirty && "admin-topbar-sync-saved",
              )}
              aria-live="polite"
            >
              {saving
                ? "Saving…"
                : dirty
                  ? "Unsaved changes"
                  : "All changes saved"}
            </p>
          ) : null}

          <ThemeToggle variant="icon" className="admin-topbar-icon-btn" />

          <Button
            size="sm"
            variant={dirty ? "primary" : "secondary"}
            className="interactive admin-topbar-save"
            disabled={saveDisabled}
            onClick={onSave}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            ) : dirty ? (
              <>
                <span className="hidden sm:inline">Save changes</span>
                <span className="sm:hidden">Save</span>
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
