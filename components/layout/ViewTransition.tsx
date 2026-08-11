"use client";

import type { ReactNode } from "react";

export function ViewTransition({
  viewKey,
  children,
}: {
  viewKey: string;
  children: ReactNode;
}) {
  return (
    <div key={viewKey} className="animate-view-in">
      {children}
    </div>
  );
}
