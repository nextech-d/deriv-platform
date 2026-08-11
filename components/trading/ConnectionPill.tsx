import type { ConnectionState } from "@/lib/ws/protocol";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

const STATE_CONFIG: Record<
  ConnectionState,
  { label: string; variant: "success" | "warning" | "danger" | "default" }
> = {
  connected: { label: "Live", variant: "success" },
  connecting: { label: "Connecting", variant: "warning" },
  reconnecting: { label: "Reconnecting", variant: "warning" },
  degraded: { label: "Recovering", variant: "warning" },
  disconnected: { label: "Offline", variant: "danger" },
};

export function ConnectionPill({
  state,
  className,
}: {
  state: ConnectionState;
  className?: string;
}) {
  const config = STATE_CONFIG[state];
  return (
    <Badge
      variant={config.variant}
      dot
      className={cn(
        "px-2 py-0 text-[10px]",
        state === "connected" && "ring-1 ring-positive/15",
        className,
      )}
    >
      {config.label}
    </Badge>
  );
}
