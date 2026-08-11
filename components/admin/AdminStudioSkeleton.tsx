"use client";

import { Loader2 } from "lucide-react";

export function AdminStudioSkeleton() {
  return (
    <div className="admin-shell flex h-dvh flex-col overflow-hidden bg-background">
      <header className="admin-topbar shrink-0">
        <div className="admin-topbar-inner mx-auto w-full max-w-[1240px] px-4 md:px-6">
          <div className="h-9 w-44 animate-pulse rounded-md bg-surface-elevated/40 lg:h-10 lg:w-56" />
          <div className="h-8 w-28 animate-pulse rounded-md bg-surface-elevated/40" />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="admin-sidebar hidden w-[16.5rem] shrink-0 border-r border-border-subtle lg:block">
          <div className="p-4 space-y-3">
            <div className="h-8 w-full animate-pulse rounded-md bg-surface-elevated/30" />
            <div className="h-9 w-full animate-pulse rounded-md bg-surface-elevated/30" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-11 animate-pulse rounded-md bg-surface-elevated/25"
                />
              ))}
            </div>
          </div>
        </aside>
        <div className="admin-workspace min-h-0 flex-1">
          <div className="admin-workspace-inner">
            <div className="admin-desk min-h-[24rem] animate-pulse bg-surface-elevated/20" />
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-center gap-2 py-4 text-xs text-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
        Loading studio…
      </div>
    </div>
  );
}
