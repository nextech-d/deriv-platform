"use client";

import type { ReactNode } from "react";

export function ViewTransition({
  viewKey,
  children,
  animate = true,
}: {
  viewKey: string;
  children: ReactNode;
  animate?: boolean;
}) {
  return (
    <div key={viewKey} className={animate ? "animate-view-in" : undefined}>
      {children}
    </div>
  );
}
