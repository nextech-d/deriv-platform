"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { AdminCatalogTab, AdminStudioKind } from "@/components/admin/AdminStudioChrome";
import { cn } from "@/lib/utils/cn";

interface AdminEntityPickerProps {
  studio: AdminStudioKind;
  title: string;
  live?: boolean;
  items: AdminCatalogTab[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function AdminEntityPicker({
  studio,
  title,
  live,
  items,
  selectedId,
  onSelect,
}: AdminEntityPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (items.length === 0) {
    return (
      <p className="admin-topbar-picker-label truncate">{title}</p>
    );
  }

  return (
    <div className="admin-entity-picker" ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className="admin-entity-picker-trigger interactive"
      >
        <span className="min-w-0 flex-1 text-left">
          <span className="admin-entity-picker-name truncate">{title}</span>
          {live !== undefined ? (
            <span className="admin-entity-picker-hint">
              {live ? "Published" : "Draft"}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "admin-entity-picker-chevron h-4 w-4 shrink-0 text-muted",
            open && "admin-entity-picker-chevron-open",
          )}
          strokeWidth={2}
        />
      </button>

      {open ? (
        <div className="admin-entity-picker-menu" role="listbox">
          <div className="admin-entity-picker-studio">
            <p className="admin-entity-picker-studio-label">Studio</p>
            <div className="admin-entity-picker-studio-links">
              <Link
                href="/admin"
                className={cn(
                  "admin-entity-picker-studio-link interactive",
                  studio === "partners" && "admin-entity-picker-studio-link-active",
                )}
                onClick={() => setOpen(false)}
              >
                Partners
              </Link>
              <Link
                href="/admin/copy"
                className={cn(
                  "admin-entity-picker-studio-link interactive",
                  studio === "copy" && "admin-entity-picker-studio-link-active",
                )}
                onClick={() => setOpen(false)}
              >
                Copy
              </Link>
            </div>
          </div>

          <ul className="admin-entity-picker-list">
            {items.map((item) => {
              const selected = item.id === selectedId;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onSelect(item.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "admin-entity-picker-option interactive",
                      selected && "admin-entity-picker-option-active",
                    )}
                  >
                    <span className="min-w-0 flex-1 text-left">
                      <span className="admin-entity-picker-option-name truncate">
                        {item.name}
                      </span>
                      <span className="admin-entity-picker-option-meta">
                        {item.active ? "Live" : "Draft"}
                        {item.hasErrors ? " · Needs review" : ""}
                      </span>
                    </span>
                    {selected ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2.5} />
                    ) : (
                      <span
                        className={cn(
                          "admin-entity-picker-option-dot",
                          item.active
                            ? "admin-entity-picker-option-dot-live"
                            : undefined,
                          item.hasErrors && "admin-entity-picker-option-dot-warn",
                        )}
                        aria-hidden
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
