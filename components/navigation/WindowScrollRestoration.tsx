"use client";

import { usePathname } from "next/navigation";
import { usePageScrollRestoration } from "@/lib/navigation/scroll-restoration";

/** Routes that manage their own scroll containers or keys. */
const MANAGED_SCROLL_PREFIXES = ["/dashboard"];

function managesOwnScroll(pathname: string): boolean {
  if (pathname === "/") return true;
  return MANAGED_SCROLL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Restores window scroll for static routes (login, admin, etc.) keyed by pathname. */
export function WindowScrollRestoration() {
  const pathname = usePathname();
  const enabled = !managesOwnScroll(pathname);
  usePageScrollRestoration(`window:${pathname}`, { enabled });
  return null;
}
