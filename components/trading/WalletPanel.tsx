"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  TerminalSplitPanel,
  deskActionPane,
  deskContentPane,
} from "@/components/layout/TerminalViewLayout";
import { WithdrawalWizard } from "@/components/trading/WithdrawalWizard";
import { WorkspaceModal } from "@/components/ui/workspace-modal";
import { MomoGuide } from "@/components/trading/MomoGuide";
import { AgentCard } from "@/components/payments/AgentCard";
import { cn } from "@/lib/utils/cn";
import { openDerivCashier } from "@/lib/payments/open-cashier";
import { type PaymentAgent } from "@/lib/payments/config";
import {
  directoryHasPartnerListings,
  formatAgentDirectorySource,
} from "@/lib/payments/format-agent-source";
import { WALLET_COUNTRIES } from "@/lib/payments/wallet-countries";

interface WalletPanelProps {
  demoMode?: boolean;
}

export function WalletPanel({ demoMode = false }: WalletPanelProps) {
  const [country, setCountry] = useState<string>("KE");
  const [agents, setAgents] = useState<PaymentAgent[]>([]);
  const [agentSource, setAgentSource] = useState<string>("fallback");
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [showWithdrawWizard, setShowWithdrawWizard] = useState(false);
  const [cashierNotice, setCashierNotice] = useState<string | null>(null);
  const [cashierOpening, setCashierOpening] = useState(false);

  const loadAgents = useCallback((code: string) => {
    void (async () => {
      setLoadingAgents(true);
      try {
        const response = await fetch(
          `/api/payments/agents?country=${code}&currency=USD`,
        );
        if (!response.ok) throw new Error("Failed to load agents");
        const json = (await response.json()) as {
          agents: PaymentAgent[];
          source: string;
        };
        setAgents(json.agents);
        setAgentSource(json.source);
      } catch {
        setAgents([]);
        setAgentSource("fallback");
      } finally {
        setLoadingAgents(false);
      }
    })();
  }, []);

  function selectCountry(code: string) {
    setCountry(code);
    loadAgents(code);
  }

  useEffect(() => {
    loadAgents(country);
  }, [country, loadAgents]);

  async function openCashier() {
    setCashierOpening(true);
    setCashierNotice(null);
    try {
      const link = await openDerivCashier();
      if (link.notice) {
        setCashierNotice(link.notice);
      }
    } catch {
      setCashierNotice(
        "Could not open Cashier. Try Deriv.com → Cashier, or switch network if you see a security block.",
      );
    } finally {
      setCashierOpening(false);
    }
  }

  const activeCountry = WALLET_COUNTRIES.find((c) => c.code === country);

  return (
    <div className="space-y-3">
      <TerminalSplitPanel
        primaryLabel="Cashier"
        primaryHint="Deposit and withdraw via Deriv"
        secondaryLabel="Agents"
        secondaryHint="Local payment partners"
        primary={
          <div className={cn(deskContentPane, "wallet-desk")}>
            <div className="wallet-deposit-card">
              <p className="trade-field-label">Official cashier</p>
              <p className="wallet-deposit-title">Deposit funds</p>
              <p className="wallet-deposit-copy">
                Deriv Cashier — Fast Pesa and mobile money where available
              </p>
              <div className="wallet-action-row">
                <Button
                  className="interactive gap-2"
                  size="sm"
                  disabled={cashierOpening}
                  onClick={() => void openCashier()}
                >
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
                  {cashierOpening ? "Opening…" : "Open Deriv Cashier"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="interactive"
                  onClick={() => setShowWithdrawWizard(true)}
                >
                  Withdraw guidance
                </Button>
              </div>
            </div>
            <p className="workspace-inline-alert text-[10px] text-muted">
              Verify agent credentials on Deriv.com before sending funds.
            </p>
            {cashierNotice ? (
              <p className="workspace-inline-alert workspace-inline-alert-warn text-[10px] leading-relaxed">
                {cashierNotice}
              </p>
            ) : null}
            {demoMode ? (
              <p className="workspace-inline-alert workspace-inline-alert-demo text-[10px]">
                Demo session — opens Deriv.com Cashier (sign in there to deposit).
                Localhost return URLs are blocked by Deriv security.
              </p>
            ) : null}
          </div>
        }
        secondary={
          <div className={cn(deskActionPane, "wallet-desk")}>
            <div className="wallet-agents-head">
              <span className="copy-count-chip">
                {activeCountry?.code ?? country}
              </span>
              <span className="copy-count-chip">
                {loadingAgents ? "…" : `${agents.length} agents`}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="interactive ml-auto h-8 gap-1.5 px-2 text-xs"
                disabled={loadingAgents}
                onClick={() => void loadAgents(country)}
              >
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
                Refresh
              </Button>
            </div>

            <p className="wallet-source-line">
              {agentSource
                ? formatAgentDirectorySource(agentSource)
                : "Mobile money by country"}
            </p>

            <div className="wallet-country-rail">
              {WALLET_COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => selectCountry(c.code)}
                  className={cn(
                    "market-symbol-chip interactive",
                    country === c.code && "market-symbol-chip-active",
                  )}
                  aria-pressed={country === c.code}
                >
                  <span className="market-symbol-id">{c.code}</span>
                  <span className="market-symbol-label">{c.name}</span>
                </button>
              ))}
            </div>

            {directoryHasPartnerListings(agents) ? (
              <p className="workspace-inline-alert workspace-inline-alert-warn text-[10px] leading-relaxed">
                <span className="font-medium text-warning">Partner listings</span>{" "}
                are curated locally — verify on Deriv.com before sending funds.
              </p>
            ) : null}

            {loadingAgents ? (
              <div className="wallet-agent-skeleton space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="copy-skeleton-row copy-skeleton-row-lg animate-pulse bg-surface-elevated"
                  />
                ))}
              </div>
            ) : agents.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No agents for this country"
                description="Use Deriv Cashier for deposits and withdrawals instead."
                compact
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    className="interactive"
                    onClick={openCashier}
                  >
                    Open Cashier
                  </Button>
                }
              />
            ) : (
              <ul className="wallet-agent-list max-h-[28rem] overflow-y-auto scrollbar-thin">
                {agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </ul>
            )}
          </div>
        }
      />

      <WorkspaceModal
        open={showWithdrawWizard}
        onClose={() => setShowWithdrawWizard(false)}
        label="Withdraw funds"
        size="sm"
      >
        <WithdrawalWizard onClose={() => setShowWithdrawWizard(false)} />
      </WorkspaceModal>

      {country === "UG" || country === "TZ" ? (
        <MomoGuide country={country} />
      ) : null}
    </div>
  );
}
