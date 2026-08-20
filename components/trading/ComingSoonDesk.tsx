"use client";

import { Construction } from "lucide-react";
import { TerminalPanel } from "@/components/layout/TerminalViewLayout";

interface ComingSoonDeskProps {
  title: string;
  summary: string;
}

export function ComingSoonDesk({ title, summary }: ComingSoonDeskProps) {
  return (
    <TerminalPanel label={title} hint="Coming next">
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle bg-surface-elevated text-muted">
          <Construction className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <p className="text-sm font-semibold tracking-tight">{title}</p>
        <p className="max-w-sm text-[12px] leading-relaxed text-muted">{summary}</p>
      </div>
    </TerminalPanel>
  );
}
