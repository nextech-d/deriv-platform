"use client";

import { TerminalPanel } from "@/components/layout/TerminalViewLayout";
import {
  getMomoProviders,
  type MomoProvider,
} from "@/lib/payments/momo-providers";
import { cn } from "@/lib/utils/cn";

interface MomoGuideProps {
  country: "UG" | "TZ";
}

export function MomoGuide({ country }: MomoGuideProps) {
  const providers = getMomoProviders(country);
  const countryName = country === "UG" ? "Uganda" : "Tanzania";

  return (
    <TerminalPanel
      label={`${countryName} mobile money`}
      hint="Local network deposit & withdrawal steps" bodyClassName="p-0">
      <div className="momo-desk">
        <p className="momo-desk-copy">
          Step-by-step deposit and withdrawal guides for local networks
        </p>
        <ul className="momo-provider-list">
          {providers.map((provider, index) => (
            <li
              key={provider.id}
              className={cn(
                "momo-provider-row",
                index > 0 && "border-t border-border-subtle",
              )}
            >
              <MomoProviderRow provider={provider} />
            </li>
          ))}
        </ul>
      </div>
    </TerminalPanel>
  );
}

function MomoProviderRow({ provider }: { provider: MomoProvider }) {
  return (
    <div className="momo-provider-inner">
      <div className="momo-provider-head">
        <div className="momo-provider-title">
          <p className="text-sm font-semibold tracking-tight">{provider.name}</p>
          <span className="copy-badge copy-badge-medium">{provider.network}</span>
        </div>
        {provider.ussd ? (
          <span className="momo-ussd-chip font-mono">{provider.ussd}</span>
        ) : null}
      </div>
      {provider.note ? (
        <p className="momo-provider-note">{provider.note}</p>
      ) : null}
      <div className="momo-steps-grid">
        <StepList title="Deposit" steps={provider.depositSteps} />
        <StepList title="Withdraw" steps={provider.withdrawSteps} />
      </div>
    </div>
  );
}

function StepList({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="momo-step-card">
      <p className="trade-field-label">{title}</p>
      <ol className="momo-step-list">
        {steps.map((step, index) => (
          <li key={step}>
            <span className="momo-step-index">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
