"use client";

import type { ConnectionState } from "@/lib/ws/protocol";
import { Button } from "@/components/ui/button";
import { ConnectionPill } from "@/components/trading/ConnectionPill";
import { cn } from "@/lib/utils/cn";

interface ConnectionBannerProps {
  state: ConnectionState;
  error?: string | null;
  onReconnect?: () => void;
}

export function ConnectionBanner({
  state,
  error,
  onReconnect,
}: ConnectionBannerProps) {
  if (state === "connected" && !error) return null;

  const message =
    error ??
    (state === "reconnecting"
      ? "Restoring WebSocket subscriptions…"
      : state === "degraded"
        ? "Connection active — replaying market data"
        : "Waiting for market connection");

  return (
    <div
      className={cn(
        "workspace-inline-alert flex flex-wrap items-center justify-between gap-2",
        error ? "workspace-inline-alert-danger" : "workspace-inline-alert-warn",
      )}
      role="status"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <ConnectionPill state={state} />
        <p className="text-[11px] text-muted">{message}</p>
      </div>
      {onReconnect && state !== "connected" ? (
        <Button
          variant="ghost"
          size="sm"
          className="interactive h-7 shrink-0 px-2 text-[11px]"
          onClick={onReconnect}
        >
          Retry
        </Button>
      ) : null}
    </div>
  );
}
