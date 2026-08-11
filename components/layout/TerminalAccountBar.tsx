"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { DerivAccount } from "@/lib/session/types";
import type { DisplayCurrency } from "@/hooks/useDisplayCurrency";

interface TerminalAccountBarProps {
  accounts: DerivAccount[];
  activeAccountId?: string;
  onAccountChange: (id: string) => void;
  displayCurrency: DisplayCurrency;
  className?: string;
}

export function TerminalAccountBar({
  accounts,
  activeAccountId,
  onAccountChange,
  displayCurrency,
  className,
}: TerminalAccountBarProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const activeAccount =
    accounts.find((a) => a.accountId === activeAccountId) ?? accounts[0];

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!activeAccount) return null;

  const canSwitch = accounts.length > 1;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup={canSwitch ? "listbox" : undefined}
        aria-expanded={canSwitch ? open : undefined}
        disabled={!canSwitch}
        onClick={() => canSwitch && setOpen((v) => !v)}
        className={cn(
          "strip-account interactive flex items-center gap-2 rounded-md px-2 py-1.5 text-left",
          canSwitch && "hover:bg-surface-elevated/60",
          !canSwitch && "cursor-default",
        )}
      >
        <AccountModeDot isDemo={activeAccount.isDemo} />
        <div className="min-w-0">
          <p className="truncate font-mono text-xs font-medium text-foreground">
            {activeAccount.loginid}
          </p>
          <p className="truncate text-[10px] text-muted">
            {activeAccount.currency} · {displayCurrency}
          </p>
        </div>
        {canSwitch ? (
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted transition-transform",
              open && "rotate-180",
            )}
            strokeWidth={2}
            aria-hidden
          />
        ) : null}
      </button>

      {open && canSwitch ? (
        <ul
          role="listbox"
          aria-label="Switch account"
          className="strip-account-menu absolute right-0 top-[calc(100%+4px)] z-50 min-w-[12rem] rounded-lg border border-border-subtle bg-surface py-1 shadow-header"
        >
          {accounts.map((account) => {
            const selected = account.accountId === activeAccount.accountId;
            return (
              <li key={account.accountId} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onAccountChange(account.accountId);
                    setOpen(false);
                  }}
                  className={cn(
                    "interactive flex w-full items-center gap-2 px-3 py-2 text-left",
                    selected ? "bg-surface-elevated/80" : "hover:bg-surface-elevated/50",
                  )}
                >
                  <AccountModeDot isDemo={account.isDemo} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs">{account.loginid}</p>
                    <p className="text-[10px] text-muted">{account.currency}</p>
                  </div>
                  {selected ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-foreground" strokeWidth={2} />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function AccountModeDot({
  isDemo,
  className,
}: {
  isDemo: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "mt-0.5 h-2 w-2 shrink-0 rounded-full",
        isDemo ? "bg-warning" : "bg-positive",
        className,
      )}
      title={isDemo ? "Demo account" : "Real account"}
      aria-hidden
    />
  );
}

/** @deprecated use AccountModeDot */
export function AccountModeBadge({
  isDemo,
  className,
}: {
  isDemo: boolean;
  compact?: boolean;
  iconOnly?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted",
        className,
      )}
    >
      <AccountModeDot isDemo={isDemo} className="mt-0 h-1.5 w-1.5" />
      {isDemo ? "Demo" : "Live"}
    </span>
  );
}
