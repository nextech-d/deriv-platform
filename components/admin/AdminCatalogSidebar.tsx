"use client";

import Link from "next/link";
import { ArrowLeft, Lock, Plus, Search } from "lucide-react";
import { AdminStudioNav } from "@/components/admin/AdminStudioNav";
import { ADMIN_COUNTRIES } from "@/components/admin/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminStudioKind } from "@/components/admin/AdminStudioChrome";
import { cn } from "@/lib/utils/cn";

export interface AdminCatalogSidebarItem {
  id: string;
  name: string;
  flag: string;
  countryCode: string;
  active: boolean;
  hasErrors?: boolean;
  index: number;
}

interface AdminCatalogSidebarProps {
  studio: AdminStudioKind;
  studioLabel: string;
  catalogLabel: string;
  count: number;
  search: string;
  onSearchChange: (value: string) => void;
  countryFilter: string | null;
  onCountryFilterChange: (code: string | null) => void;
  items: AdminCatalogSidebarItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onLock: () => void;
  addLabel: string;
}

export function AdminCatalogSidebar({
  studio,
  studioLabel,
  catalogLabel,
  count,
  search,
  onSearchChange,
  countryFilter,
  onCountryFilterChange,
  items,
  selectedIndex,
  onSelect,
  onAdd,
  onLock,
  addLabel,
}: AdminCatalogSidebarProps) {
  const filteredEmpty = items.length === 0 && (search.trim() || countryFilter);

  return (
    <aside className="admin-sidebar hidden min-h-0 w-[16.5rem] shrink-0 flex-col border-r border-border-subtle bg-surface/30 lg:flex">
      <div className="admin-sidebar-panel">
        <div className="admin-sidebar-head">
          <Link
            href="/dashboard"
            className="admin-sidebar-back interactive"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
            Terminal
          </Link>
          <AdminStudioNav active={studio} variant="rail" className="mt-3" />
          <div className="mt-4 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="admin-sidebar-kicker">{studioLabel}</p>
              <p className="admin-sidebar-title truncate">{catalogLabel}</p>
            </div>
            <span className="admin-sidebar-count font-mono tabular-nums">
              {count}
            </span>
          </div>
        </div>

        <div className="admin-sidebar-tools">
          <div className="admin-sidebar-search">
            <Search className="admin-sidebar-search-icon" strokeWidth={2} />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search…"
              className="admin-sidebar-search-input h-9 pl-9 text-xs"
            />
          </div>
          <div className="admin-filter-row">
            {["All", ...ADMIN_COUNTRIES.map((c) => c.code)].map((code) => {
              const active =
                code === "All" ? !countryFilter : countryFilter === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() =>
                    onCountryFilterChange(code === "All" ? null : code)
                  }
                  className={cn(
                    "admin-filter-chip interactive font-mono",
                    active && "admin-filter-chip-active",
                  )}
                >
                  {code}
                </button>
              );
            })}
          </div>
        </div>

        <ul className="admin-sidebar-list scrollbar-thin">
          {filteredEmpty ? (
            <li className="admin-sidebar-empty">
              <p className="admin-sidebar-empty-title">No matches</p>
              <p className="admin-sidebar-empty-copy">
                Try another search or clear filters.
              </p>
            </li>
          ) : (
            items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  data-active={selectedIndex === item.index}
                  onClick={() => onSelect(item.index)}
                  className="admin-catalog-row interactive w-full text-left"
                >
                  <span className="admin-catalog-row-flag" aria-hidden>
                    {item.flag}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="admin-catalog-row-name">{item.name}</span>
                    <span className="admin-catalog-row-meta">
                      <span className="font-mono">{item.countryCode}</span>
                      <span
                        className={cn(
                          "admin-catalog-row-badge",
                          item.active
                            ? "admin-catalog-row-badge-live"
                            : "admin-catalog-row-badge-draft",
                        )}
                      >
                        {item.active ? "Live" : "Draft"}
                      </span>
                    </span>
                  </span>
                  {item.hasErrors ? (
                    <span
                      className="admin-catalog-row-warn"
                      aria-label="Validation issues"
                    />
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="admin-sidebar-foot">
          <Button className="interactive w-full" size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4" strokeWidth={2} />
            {addLabel}
          </Button>
          <button
            type="button"
            onClick={onLock}
            className="admin-sidebar-lock interactive"
          >
            <Lock className="h-3.5 w-3.5" strokeWidth={1.75} />
            Lock studio
          </button>
        </div>
      </div>
    </aside>
  );
}
