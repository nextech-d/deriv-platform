import type { AppView } from "@/components/layout/AppShell";
import {
  DEFAULT_RISK,
  type RiskSettings,
} from "@/lib/risk/settings";

export interface HomeOnboardingStep {
  id: string;
  label: string;
  done: boolean;
  view: AppView;
}

function riskIsCustomized(settings: RiskSettings): boolean {
  return (
    settings.maxStake !== DEFAULT_RISK.maxStake ||
    settings.sessionStopLoss !== DEFAULT_RISK.sessionStopLoss ||
    settings.dailyMaxDrawdown !== DEFAULT_RISK.dailyMaxDrawdown ||
    settings.enabled !== DEFAULT_RISK.enabled
  );
}

export function buildHomeOnboardingSteps(input: {
  demoMode: boolean;
  hasTraded: boolean;
  hasFunded: boolean;
  settings: RiskSettings;
  followedProviders: number;
}): HomeOnboardingStep[] {
  const { demoMode, hasTraded, hasFunded, settings, followedProviders } = input;
  const riskDone = riskIsCustomized(settings);

  if (demoMode) {
    return [
      {
        id: "trade",
        label: "Place a demo Rise/Fall trade",
        done: hasTraded,
        view: "manual-trading",
      },
      {
        id: "risk",
        label: "Review session risk limits",
        done: riskDone,
        view: "settings",
      },
      {
        id: "explore",
        label: "Try Auto trader or Copy trading",
        done: followedProviders > 0,
        view: "copy-trading",
      },
    ];
  }

  return [
    {
      id: "trade",
      label: "Place your first trade",
      done: hasTraded,
      view: "manual-trading",
    },
    {
      id: "risk",
      label: "Set session stop-loss and stake cap",
      done: riskDone,
      view: "settings",
    },
    {
      id: "fund",
      label: "Fund wallet via Cashier or agents",
      done: hasFunded,
      view: "wallet",
    },
  ];
}

export function onboardingIncomplete(steps: HomeOnboardingStep[]): boolean {
  return steps.some((step) => !step.done);
}
