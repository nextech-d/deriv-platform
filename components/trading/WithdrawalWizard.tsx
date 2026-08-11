"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { chipClassName } from "@/components/ui/input";
import { StepIndicator } from "@/components/ui/step-indicator";
import { WorkspaceModalFrame } from "@/components/ui/workspace-modal";
import { openDerivCashier } from "@/lib/payments/open-cashier";
import { cn } from "@/lib/utils/cn";

const COUNTRIES = [
  { code: "KE", name: "Kenya", methods: ["M-Pesa", "Bank", "Card"] },
  { code: "UG", name: "Uganda", methods: ["MTN MoMo", "Airtel", "Card"] },
  { code: "TZ", name: "Tanzania", methods: ["M-Pesa", "Tigo Pesa", "Card"] },
  { code: "RW", name: "Rwanda", methods: ["MTN MoMo", "Card"] },
] as const;

const STEPS = ["Country", "Method", "Confirm"] as const;

type Step = "country" | "method" | "confirm";

interface WithdrawalWizardProps {
  onClose: () => void;
}

export function WithdrawalWizard({ onClose }: WithdrawalWizardProps) {
  const [step, setStep] = useState<Step>("country");
  const [country, setCountry] = useState<(typeof COUNTRIES)[number] | null>(
    null,
  );
  const [method, setMethod] = useState<"cashier" | "agent" | null>(null);

  const stepIndex = step === "country" ? 0 : step === "method" ? 1 : 2;

  function handleConfirm() {
    if (method === "cashier") {
      void openDerivCashier();
    }
    onClose();
  }

  const footer =
    step === "confirm" && country && method ? (
      <>
        <Button
          variant="secondary"
          size="sm"
          className="interactive flex-1"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button size="sm" className="interactive flex-1" onClick={handleConfirm}>
          {method === "cashier" ? "Open Cashier" : "Got it"}
        </Button>
      </>
    ) : (
      <>
        {step !== "country" ? (
          <Button
            variant="secondary"
            size="sm"
            className="interactive flex-1"
            onClick={() => setStep(step === "confirm" ? "method" : "country")}
          >
            Back
          </Button>
        ) : null}
        <Button
          variant="secondary"
          size="sm"
          className="interactive flex-1"
          onClick={onClose}
        >
          Cancel
        </Button>
      </>
    );

  return (
    <WorkspaceModalFrame title="Withdraw funds" footer={footer}>
      <p className="text-sm font-semibold">Guided withdrawal</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        Withdrawals go through Deriv Cashier or verified payment agents.
      </p>

      <StepIndicator steps={[...STEPS]} current={stepIndex} className="mb-4 mt-4" />

      {step === "country" ? (
        <div className="animate-view-in space-y-2">
          <p className="workspace-eyebrow">Select country</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {COUNTRIES.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  setCountry(c);
                  setStep("method");
                }}
                className={cn(
                  chipClassName(false, "interactive w-full px-3 py-2.5 text-left"),
                )}
              >
                <p className="text-xs font-semibold">{c.name}</p>
                <p className="text-[10px] opacity-70">{c.methods.join(" · ")}</p>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {step === "method" && country ? (
        <div className="animate-view-in space-y-2">
          <p className="workspace-eyebrow">Path for {country.name}</p>
          <button
            type="button"
            onClick={() => {
              setMethod("cashier");
              setStep("confirm");
            }}
            className={cn(
              chipClassName(false, "interactive w-full px-3 py-2.5 text-left"),
            )}
          >
            <p className="text-xs font-semibold">Deriv Cashier (recommended)</p>
            <p className="text-[10px] opacity-70">
              Official path — M-Pesa / mobile money where supported
            </p>
          </button>
          <button
            type="button"
            onClick={() => {
              setMethod("agent");
              setStep("confirm");
            }}
            className={cn(
              chipClassName(false, "interactive w-full px-3 py-2.5 text-left"),
            )}
          >
            <p className="text-xs font-semibold">Payment agent</p>
            <p className="text-[10px] opacity-70">
              Use the agent directory — verify credentials on Deriv.com
            </p>
          </button>
        </div>
      ) : null}

      {step === "confirm" && country && method ? (
        <div className="animate-view-in space-y-3">
          <p className="workspace-eyebrow">Review</p>
          <dl className="divide-y divide-border-subtle border border-border-subtle text-xs">
            <div className="flex justify-between gap-4 px-3 py-2">
              <dt className="text-muted">Country</dt>
              <dd className="font-medium">{country.name}</dd>
            </div>
            <div className="flex justify-between gap-4 px-3 py-2">
              <dt className="text-muted">Method</dt>
              <dd className="font-medium">
                {method === "cashier" ? "Deriv Cashier" : "Payment agent"}
              </dd>
            </div>
          </dl>
          {method === "agent" ? (
            <p className="workspace-inline-alert workspace-inline-alert-warn text-[10px]">
              Only use agents listed on Deriv.com. This platform does not route
              withdrawals directly.
            </p>
          ) : null}
        </div>
      ) : null}
    </WorkspaceModalFrame>
  );
}
