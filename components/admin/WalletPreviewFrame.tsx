"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Battery, Signal, Wifi } from "lucide-react";
import { AgentCard } from "@/components/payments/AgentCard";
import { chipClassName } from "@/components/ui/input";
import { ADMIN_COUNTRIES } from "@/components/admin/constants";
import {
  mergePreviewListing,
  previewListingIndex,
} from "@/lib/payments/preview-listing";
import {
  PAYMENT_AGENTS_FALLBACK,
  type PaymentAgent,
} from "@/lib/payments/config";
import { WALLET_COUNTRIES, walletCountryName } from "@/lib/payments/wallet-countries";
import { cn } from "@/lib/utils/cn";

interface WalletPreviewFrameProps {
  agent: PaymentAgent;
  active: boolean;
  highlightId: string;
}

const PHONE_H = 494;
const AGENT_LIST_MAX_H = 218;
const PREVIEW_W = 336;

export function WalletPreviewFrame({
  agent,
  active,
  highlightId,
}: WalletPreviewFrameProps) {
  const [previewCountry, setPreviewCountry] = useState(agent.country);
  const [agents, setAgents] = useState<PaymentAgent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPreviewCountry(agent.country);
  }, [agent.country]);

  const loadAgents = useCallback(async (code: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/payments/agents?country=${code}&currency=USD`,
      );
      if (!response.ok) throw new Error("fetch failed");
      const json = (await response.json()) as { agents: PaymentAgent[] };
      setAgents(json.agents);
    } catch {
      setAgents(PAYMENT_AGENTS_FALLBACK.filter((a) => a.country === code));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAgents(previewCountry);
  }, [loadAgents, previewCountry]);

  const includePreview = active && previewCountry === agent.country;
  const displayList = useMemo(() => {
    const list = mergePreviewListing(agents, agent, includePreview);
    if (!includePreview) return list;
    return list.map((item) =>
      item.id === highlightId ? { ...item, source: "partner" as const } : item,
    );
  }, [agents, agent, includePreview, highlightId]);

  const listingIndex = previewListingIndex(displayList, highlightId);
  const flag = ADMIN_COUNTRIES.find((c) => c.code === previewCountry)?.flag;

  const statusLine = includePreview && listingIndex >= 0
    ? `#${listingIndex + 1} of ${displayList.length}`
    : !active
      ? "Draft"
      : previewCountry !== agent.country
        ? `Listed in ${agent.country}`
        : null;

  const time = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col items-center">
      <div
        className="mb-3 flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs"
        style={{ maxWidth: PREVIEW_W }}
      >
        <span className="font-semibold">
          {flag} {walletCountryName(previewCountry)}
        </span>
        {statusLine ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              includePreview
                ? "bg-accent/12 text-accent"
                : "bg-warning/10 text-warning",
            )}
          >
            {statusLine}
          </span>
        ) : null}
      </div>

      <div
        className="admin-device mx-auto flex w-full flex-col p-1.5"
        style={{ height: PHONE_H, maxWidth: PREVIEW_W }}
      >
        <div className="flex items-center justify-between px-4 pb-0.5 pt-1.5 text-[9px] font-medium text-muted">
          <span>{time}</span>
          <div className="flex items-center gap-0.5">
            <Signal className="h-2.5 w-2.5" strokeWidth={2} />
            <Wifi className="h-2.5 w-2.5" strokeWidth={2} />
            <Battery className="h-2.5 w-2.5" strokeWidth={2} />
          </div>
        </div>

        <div className="admin-device-screen mx-0.5 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {/* Compact deposit strip */}
            <div className="m-2 rounded border border-border-subtle bg-surface px-2.5 py-2">
              <p className="text-[10px] font-semibold">Deposit · Deriv Cashier</p>
              <div className="mt-1.5 grid grid-cols-2 gap-1">
                <span className="rounded bg-accent/90 py-1 text-center text-[9px] font-medium text-white opacity-80">
                  Cashier
                </span>
                <span className="rounded border border-border-subtle py-1 text-center text-[9px] text-muted">
                  Withdraw
                </span>
              </div>
            </div>

            {/* Agents block */}
            <div className="mx-2 mb-2 overflow-hidden rounded border border-border-subtle bg-surface">
              <div className="border-b border-border-subtle px-2 py-1.5">
                <p className="text-[10px] font-semibold">Payment agents</p>
              </div>

              <div className="flex gap-1 overflow-x-auto border-b border-border-subtle px-2 py-1.5 admin-mobile-rail">
                {WALLET_COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setPreviewCountry(c.code)}
                    className={chipClassName(
                      previewCountry === c.code,
                      "interactive shrink-0 px-2 py-0.5 text-[9px] font-semibold",
                    )}
                  >
                    {c.code}
                  </button>
                ))}
              </div>

              <div
                className="overflow-y-auto p-1.5 scrollbar-thin"
                style={{ maxHeight: AGENT_LIST_MAX_H }}
              >
                {!active && previewCountry === agent.country ? (
                  <p className="mb-1.5 rounded border border-dashed border-warning/40 bg-warning/5 px-2 py-1 text-center text-[9px] text-muted">
                    Publish to appear here
                  </p>
                ) : null}

                {loading ? (
                  <div className="space-y-1 py-0.5">
                    <div className="h-10 animate-pulse rounded-md bg-surface-elevated" />
                    <div className="h-10 animate-pulse rounded-md bg-surface-elevated" />
                  </div>
                ) : displayList.length === 0 ? (
                  <p className="py-4 text-center text-[9px] text-muted">No agents</p>
                ) : (
                  <ul className="space-y-1">
                    {displayList.map((item) => {
                      const isYours = item.id === highlightId;
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            isYours &&
                              "rounded-md ring-1 ring-accent ring-offset-1 ring-offset-background",
                          )}
                        >
                          <AgentCard
                            agent={item}
                            compact
                            allowVisit={false}
                          />
                        </div>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="flex border-t border-border-subtle bg-surface py-1">
            {["Trade", "Wallet", "More"].map((label) => (
              <span
                key={label}
                className={cn(
                  "flex-1 text-center text-[8px]",
                  label === "Wallet" ? "font-semibold text-accent" : "text-muted",
                )}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="mx-auto mb-0.5 mt-0.5 h-0.5 w-20 rounded-full bg-border" />
      </div>
    </div>
  );
}
