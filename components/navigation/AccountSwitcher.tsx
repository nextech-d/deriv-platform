"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DerivAccount } from "@/lib/session/types";
import { formatWalletBalance } from "@/lib/utils/format-wallet";
import { cn } from "@/lib/utils/cn";

const US_FLAG = "🇺🇸";
const TRADERS_HUB_URL = "https://hub.deriv.com/";

type AccountTab = "real" | "demo";

export interface AccountSwitcherProps {
  accounts: DerivAccount[];
  activeAccountId?: string;
  onAccountChange: (id: string) => void;
  balance?: { amount: number; currency: string } | null;
  onLogout?: () => void;
  botRunning?: boolean;
}

export function AccountSwitcher({
  accounts,
  activeAccountId,
  onAccountChange,
  balance,
  onLogout,
  botRunning = false,
}: AccountSwitcherProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<AccountTab>("demo");

  const active = accounts.find((item) => item.accountId === activeAccountId) ?? accounts[0];

  const demoAccounts = useMemo(() => accounts.filter((item) => item.isDemo), [accounts]);
  const realAccounts = useMemo(() => accounts.filter((item) => !item.isDemo), [accounts]);
  const visible = tab === "demo" ? demoAccounts : realAccounts;

  const walletLabel = balance
    ? formatWalletBalance(balance.amount, balance.currency)
    : "0.00 USD";

  useEffect(() => {
    if (!open) return;
    setTab(active?.isDemo ? "demo" : "real");
  }, [active?.isDemo, open]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selectAccount = useCallback(
    (accountId: string) => {
      if (botRunning) return;
      onAccountChange(accountId);
      setOpen(false);
    },
    [botRunning, onAccountChange],
  );

  if (!active) return null;

  return (
    <div className="tc-acc-switcher" ref={wrapperRef}>
      <button
        type="button"
        className="tc-acc-trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        data-testid="tc-account-switch"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="tc-acc-flag" aria-hidden>
          {US_FLAG}
        </span>
        <span className="tc-acc-balance" data-testid="tc-account-balance">
          {walletLabel}
        </span>
        <svg
          className={cn("tc-acc-chevron", open && "is-open")}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden
        >
          <path
            d="M2 4L6 8L10 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </button>

      {open ? (
        <div className="tc-acc-dropdown" role="dialog" aria-label="Account switcher">
          <div className="tc-acc-dropdown-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "real"}
              className={cn("tc-acc-tab", tab === "real" && "is-on")}
              onClick={() => setTab("real")}
            >
              Real
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "demo"}
              className={cn("tc-acc-tab", tab === "demo" && "is-on")}
              onClick={() => setTab("demo")}
            >
              Demo
            </button>
          </div>

          <div className="tc-acc-group">
            <div className="tc-acc-group-head">
              <span>Deriv account</span>
            </div>
            <ul className="tc-acc-list">
              {visible.length ? (
                visible.map((account) => {
                  const selected = account.accountId === active.accountId;
                  return (
                    <li key={account.accountId}>
                      <button
                        type="button"
                        className={cn("tc-acc-row", selected && "is-selected")}
                        disabled={botRunning}
                        onClick={() => selectAccount(account.accountId)}
                      >
                        <span className="tc-acc-mark" data-mode={account.isDemo ? "demo" : "real"}>
                          {account.isDemo ? "D" : "R"}
                        </span>
                        <span className="tc-acc-row-body">
                          <span className="tc-acc-row-title">
                            {account.isDemo ? "Demo" : account.currency}
                          </span>
                          <span className="tc-acc-row-id">{account.loginid}</span>
                        </span>
                        {selected ? (
                          <span className="tc-acc-row-balance">{walletLabel}</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })
              ) : (
                <li className="tc-acc-empty">No {tab} accounts on this login.</li>
              )}
            </ul>
          </div>

          <a
            className="tc-acc-hub"
            href={TRADERS_HUB_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Looking for CFD accounts? Go to Trader&apos;s Hub
          </a>

          {onLogout ? (
            <div className="tc-acc-footer">
              <button type="button" className="tc-acc-logout" onClick={onLogout}>
                Logout
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
