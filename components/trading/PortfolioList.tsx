"use client";

import { useEffect, useMemo, useState } from "react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  deskContentPane,
} from "@/components/layout/TerminalViewLayout";
import type { OpenContractRecord } from "@/lib/state/types";
import { TRADE_SOURCE_LABELS, type TradeSource } from "@/lib/trading/source";
import { cn } from "@/lib/utils/cn";

interface PortfolioListProps {
  contracts: OpenContractRecord[];
  isHydrated: boolean;
  formatLocal: (usd: number) => string;
  onClose?: (contractId: number) => void;
  closingId?: number | null;
  embedded?: boolean;
  bare?: boolean;
}

type SourceFilter = "all" | TradeSource;

const PORTFOLIO_SOURCE_FILTER_KEY = "deriv_platform_portfolio_source_filter";

function loadSourceFilter(): SourceFilter {
  if (typeof window === "undefined") return "all";
  try {
    const value = localStorage.getItem(PORTFOLIO_SOURCE_FILTER_KEY);
    if (value === "all" || value === "manual" || value === "copy" || value === "bot") {
      return value;
    }
  } catch {
    // ignore
  }
  return "all";
}

function contractDirection(status: string): "rise" | "fall" | null {
  const normalized = status.toLowerCase();
  if (normalized.includes("call") || normalized.includes("rise")) return "rise";
  if (normalized.includes("put") || normalized.includes("fall")) return "fall";
  return null;
}

function sourceBadgeClass(source: TradeSource): string {
  switch (source) {
    case "copy":
      return "portfolio-source-copy";
    case "bot":
      return "portfolio-source-bot";
    default:
      return "portfolio-source-manual";
  }
}

function contractSource(contract: OpenContractRecord): TradeSource {
  return contract.source ?? "manual";
}

export function PortfolioList({
  contracts,
  isHydrated,
  formatLocal,
  onClose,
  closingId,
  embedded = false,
  bare = false,
}: PortfolioListProps) {
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  useEffect(() => {
    setSourceFilter(loadSourceFilter());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PORTFOLIO_SOURCE_FILTER_KEY, sourceFilter);
    } catch {
      // ignore quota / private mode
    }
  }, [sourceFilter]);

  const openContracts = useMemo(
    () => contracts.filter((c) => !c.isSold),
    [contracts],
  );

  const sourceCounts = useMemo(
    () =>
      openContracts.reduce<Partial<Record<TradeSource, number>>>((acc, contract) => {
        const key = contractSource(contract);
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
    [openContracts],
  );

  const filteredContracts = useMemo(() => {
    if (sourceFilter === "all") return openContracts;
    return openContracts.filter(
      (contract) => contractSource(contract) === sourceFilter,
    );
  }, [openContracts, sourceFilter]);

  const totalPnl = openContracts.reduce((sum, c) => sum + (c.profit ?? 0), 0);
  const filteredPnl = filteredContracts.reduce(
    (sum, c) => sum + (c.profit ?? 0),
    0,
  );

  const filterOptions: Array<{ id: SourceFilter; label: string; count: number }> =
    [
      { id: "all", label: "All", count: openContracts.length },
      ...(["manual", "copy", "bot"] as TradeSource[])
        .filter((source) => (sourceCounts[source] ?? 0) > 0)
        .map((source) => ({
          id: source,
          label: TRADE_SOURCE_LABELS[source],
          count: sourceCounts[source] ?? 0,
        })),
    ];

  const body = (
    <div className={cn("portfolio-desk", bare && "portfolio-desk--bare")}>
      {!embedded ? (
        <CardHeader
          title="Open positions"
          subtitle={
            openContracts.length > 0
              ? `${openContracts.length} active · synced to IndexedDB`
              : "Persisted locally — survives refresh"
          }
        />
      ) : openContracts.length > 0 && !bare ? (
        <div className="portfolio-desk-head">
          <span className="portfolio-count-chip">
            {filteredContracts.length === openContracts.length
              ? `${openContracts.length} open`
              : `${filteredContracts.length} of ${openContracts.length} open`}
          </span>
          <div className="portfolio-source-filters">
            {filterOptions.map((option) => {
              const active = sourceFilter === option.id;
              const sourceClass =
                option.id === "all"
                  ? "portfolio-source-all"
                  : sourceBadgeClass(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  className={cn(
                    "portfolio-source-chip portfolio-source-filter interactive",
                    sourceClass,
                    active && "portfolio-source-filter-active",
                  )}
                  onClick={() => setSourceFilter(option.id)}
                >
                  {option.count} {option.label}
                </button>
              );
            })}
          </div>
          {(sourceFilter === "all" ? totalPnl : filteredPnl) !== 0 ? (
            <span
              className={cn(
                "portfolio-pnl-chip font-mono tabular-nums",
                (sourceFilter === "all" ? totalPnl : filteredPnl) >= 0
                  ? "text-positive"
                  : "text-negative",
              )}
            >
              {(sourceFilter === "all" ? totalPnl : filteredPnl) >= 0 ? "+" : ""}
              {(sourceFilter === "all" ? totalPnl : filteredPnl).toFixed(2)} USD
            </span>
          ) : null}
        </div>
      ) : null}

      {!isHydrated ? (
        <div
          className={cn(
            "portfolio-skeleton space-y-2",
            bare && deskContentPane,
          )}
        >
          {[1, 2].map((i) => (
            <div
              key={i}
              className="portfolio-skeleton-row animate-pulse rounded-md bg-surface-elevated"
            />
          ))}
        </div>
      ) : openContracts.length === 0 ? (
        <div className={bare ? deskContentPane : undefined}>
          <EmptyState
            icon={Inbox}
            title="No open positions"
            description="Active Rise/Fall contracts will appear here with live P/L."
            compact={embedded}
          />
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className={bare ? deskContentPane : undefined}>
          <EmptyState
            icon={Inbox}
            title={`No ${TRADE_SOURCE_LABELS[sourceFilter as TradeSource]} positions`}
            description="Try another source filter or open a new trade."
            compact={embedded}
            action={
              <Button
                variant="secondary"
                size="sm"
                className="interactive"
                onClick={() => setSourceFilter("all")}
              >
                Show all
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <ul className="portfolio-list">
            {filteredContracts.map((contract) => {
              const pnl = contract.profit ?? 0;
              const isPositive = pnl >= 0;
              const isClosing = closingId === contract.contractId;
              const direction = contractDirection(contract.status);
              const source = contractSource(contract);

              return (
                <li
                  key={contract.contractId}
                  className="portfolio-row workspace-position-row"
                >
                  <div className="portfolio-row-main min-w-0">
                    <div className="portfolio-row-title">
                      {direction ? (
                        <span
                          className={cn(
                            "portfolio-direction",
                            direction === "rise"
                              ? "portfolio-direction-rise"
                              : "portfolio-direction-fall",
                          )}
                        >
                          {direction === "rise" ? "Rise" : "Fall"}
                        </span>
                      ) : null}
                      <span className="font-mono text-sm font-medium">
                        {contract.symbol}
                      </span>
                      <span className="portfolio-contract-id">
                        #{contract.contractId}
                      </span>
                      <span
                        className={cn(
                          "portfolio-source-badge",
                          sourceBadgeClass(source),
                        )}
                      >
                        {TRADE_SOURCE_LABELS[source]}
                      </span>
                    </div>
                    <p className="portfolio-row-meta">
                      Stake {contract.buyPrice.toFixed(2)} {contract.currency}
                      <span className="mx-1.5 text-border">·</span>
                      {contract.status}
                    </p>
                  </div>
                  <div className="portfolio-row-side shrink-0">
                    {contract.profit !== undefined ? (
                      <div className="portfolio-pnl text-right">
                        <p
                          className={cn(
                            "font-mono text-sm font-semibold tabular-nums tracking-tight",
                            isPositive ? "text-positive" : "text-negative",
                          )}
                        >
                          {isPositive ? "+" : ""}
                          {pnl.toFixed(2)} USD
                        </p>
                        <p className="text-[10px] text-muted">{formatLocal(pnl)}</p>
                      </div>
                    ) : null}
                    {onClose ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="interactive portfolio-close h-8 px-2.5 text-xs"
                        disabled={isClosing}
                        onClick={() => onClose(contract.contractId)}
                      >
                        {isClosing ? "…" : "Close"}
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          {bare && filteredContracts.length > 1 ? (
            <div className="portfolio-summary-bar">
              <p className="portfolio-summary-label">
                {sourceFilter === "all"
                  ? "Unrealized P/L"
                  : `${TRADE_SOURCE_LABELS[sourceFilter as TradeSource]} P/L`}
              </p>
              <p
                className={cn(
                  "portfolio-summary-value",
                  filteredPnl >= 0 ? "text-positive" : "text-negative",
                )}
              >
                {filteredPnl >= 0 ? "+" : ""}
                {filteredPnl.toFixed(2)} USD
                <span className="ml-2 text-[10px] font-normal text-muted">
                  {formatLocal(filteredPnl)}
                </span>
              </p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );

  if (embedded) {
    if (bare) return body;
    return <div className={deskContentPane}>{body}</div>;
  }

  return <Card studio>{body}</Card>;
}
