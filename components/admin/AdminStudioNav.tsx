"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface AdminStudioNavProps {
  active: "partners" | "copy";
  variant?: "pills" | "segmented" | "rail";
  className?: string;
}

export function AdminStudioNav({
  active,
  variant = "segmented",
  className,
}: AdminStudioNavProps) {
  if (variant === "pills") {
    return (
      <nav className={cn("admin-studio-nav", className)} aria-label="Admin studios">
        <Link
          href="/admin"
          className={cn(
            "admin-studio-nav-link interactive",
            active === "partners" && "admin-studio-nav-link-active",
          )}
          aria-current={active === "partners" ? "page" : undefined}
        >
          Payment agents
        </Link>
        <Link
          href="/admin/copy"
          className={cn(
            "admin-studio-nav-link interactive",
            active === "copy" && "admin-studio-nav-link-active",
          )}
          aria-current={active === "copy" ? "page" : undefined}
        >
          Copy providers
        </Link>
      </nav>
    );
  }

  return (
    <nav
      className={cn(
        "admin-segment",
        variant === "rail" && "admin-segment-rail",
        className,
      )}
      aria-label="Admin studios"
    >
      <Link
        href="/admin"
        className={cn(
          "admin-segment-item interactive",
          active === "partners" && "admin-segment-item-active",
        )}
        aria-current={active === "partners" ? "page" : undefined}
      >
        Partners
      </Link>
      <Link
        href="/admin/copy"
        className={cn(
          "admin-segment-item interactive",
          active === "copy" && "admin-segment-item-active",
        )}
        aria-current={active === "copy" ? "page" : undefined}
      >
        Copy
      </Link>
    </nav>
  );
}
