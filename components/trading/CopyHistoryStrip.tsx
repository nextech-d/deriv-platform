"use client";

import { ShieldAlert, TimerOff, TrendingUp } from "lucide-react";
import type { CopyHistoryEntry, CopyHistoryKind } from "@/lib/copy/types";
import { formatHistoryDirection } from "@/lib/copy/history";
import { cn } from "@/lib/utils/cn";

interface CopyHistoryStripProps {
  history: CopyHistoryEntry[];
  onClear?: () => void;
  compact?: boolean;
}

const KIND_META: Record<
  CopyHistoryKind,
  { label: string; icon: typeof TrendingUp; tone: string }
> = {
  copied: { label: "Copied", icon: TrendingUp, tone: "copy-history-copied" },
  expired: { label: "Expired", icon: TimerOff, tone: "copy-history-expired" },
  blocked: { label: "Blocked", icon: ShieldAlert, tone: "copy-history-blocked" },
  rejected: { label: "Rejected", icon: ShieldAlert, tone: "copy-history-rejected" },
};

export function CopyHistoryStrip({
  history,
  onClear,
  compact = false,
}: CopyHistoryStripProps) {
  if (history.length === 0) return null;

  return (
    <section className={cn("copy-history-section", compact && "copy-history-section-compact")}>
      <div className="copy-history-head">
        <div>
          <p className="desk-section-title">Recent activity</p>
          <p className="desk-section-desc">Copied, expired, and blocked signals this session</p>
        </div>
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="interactive text-[10px] font-medium uppercase tracking-wide text-muted hover:text-foreground"
          >
            Clear
          </button>
        ) : null}
      </div>
      <ul className="copy-history-list">
        {history.map((entry) => {
          const meta = KIND_META[entry.kind];
          const Icon = meta.icon;
          return (
            <li key={entry.id} className={cn("copy-history-row desk-tile", meta.tone)}>
              <span className={cn("copy-history-icon-wrap", meta.tone)} aria-hidden>
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              <div className="copy-history-main min-w-0">
                <p className="copy-history-title">
                  <span className="copy-history-kind">{meta.label}</span>
                  <span className="font-mono">{entry.symbol}</span>
                  <span>{formatHistoryDirection(entry.direction)}</span>
                </p>
                <p className="copy-history-meta">
                  {entry.providerName}
                  {entry.stake !== undefined ? (
                    <>
                      <span className="mx-1.5 text-border">·</span>
                      ${entry.stake.toFixed(2)}
                    </>
                  ) : null}
                  {entry.detail ? (
                    <>
                      <span className="mx-1.5 text-border">·</span>
                      {entry.detail}
                    </>
                  ) : null}
                </p>
              </div>
              <time
                className="copy-history-time font-mono tabular-nums"
                dateTime={new Date(entry.at).toISOString()}
              >
                {new Date(entry.at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </time>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
