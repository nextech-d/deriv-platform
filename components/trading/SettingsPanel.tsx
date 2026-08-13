"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import type { DisplayCurrency } from "@/lib/fx/display-currency";
import type { RiskSettings } from "@/lib/risk/settings";
import type { WsMetricsSnapshot } from "@/lib/metrics/ws-metrics";
import { useThemeContext } from "@/components/ThemeProvider";
import {
  TerminalPanel,
  TerminalSplitPanel,
  TerminalViewLayout,
  deskActionPane,
  deskContentPane,
} from "@/components/layout/TerminalViewLayout";
import { ThemePicker } from "@/components/trading/ThemeToggle";
import { CopySettingsSection } from "@/components/trading/CopySettingsSection";
import { WsMetricsPanel } from "@/components/trading/WsMetricsPanel";
import type { CopyFollowState } from "@/lib/copy/types";
import type { CopyRiskSettings } from "@/lib/copy/risk-settings";

interface SettingsPanelProps {
  currency: DisplayCurrency;
  onCurrencyChange: (c: DisplayCurrency) => void;
  labels: Record<DisplayCurrency, string>;
  fxSource?: "live" | "fallback" | null;
  fxUpdatedAt?: string | null;
  risk: RiskSettings;
  onRiskChange: (settings: RiskSettings) => void;
  onResetSession: () => void;
  wsMetrics?: WsMetricsSnapshot;
  connectionState?: string;
  onResetWsMetrics?: () => void;
  copyFollow?: CopyFollowState;
  onCopyFollowChange?: (follow: CopyFollowState) => void;
  liveCopyAllowed?: boolean;
  copyRisk?: CopyRiskSettings;
  onCopyRiskChange?: (settings: CopyRiskSettings) => void;
  onResetCopySession?: () => void;
  onOpenCopy?: () => void;
}

const CURRENCIES: DisplayCurrency[] = ["KES", "UGX", "TZS", "RWF", "USD"];

export function SettingsPanel({
  currency,
  onCurrencyChange,
  labels,
  fxSource,
  fxUpdatedAt,
  risk,
  onRiskChange,
  onResetSession,
  wsMetrics,
  connectionState,
  onResetWsMetrics,
  copyFollow,
  onCopyFollowChange,
  liveCopyAllowed = false,
  copyRisk,
  onCopyRiskChange,
  onResetCopySession,
  onOpenCopy,
}: SettingsPanelProps) {
  const { preference, setPreference, labels: themeLabels, descriptions } =
    useThemeContext();

  function updateRisk(patch: Partial<RiskSettings>) {
    onRiskChange({ ...risk, ...patch });
  }

  const fxSubtitle = fxSource
    ? `FX rates: ${fxSource === "live" ? "live" : "fallback"}${fxUpdatedAt ? ` · ${new Date(fxUpdatedAt).toLocaleString()}` : ""}`
    : "Local PnL preview";

  return (
    <TerminalViewLayout>
      <TerminalSplitPanel
        secondaryLabel="Risk & studios"
        secondaryHint="Gates, copy limits, partner links"
        primarySections={[
          {
            label: "Appearance",
            description: "Theme for this desk",
            content: (
              <div className={cn(deskContentPane, "prefs-section")}>
                <ThemePicker
                  preference={preference}
                  onChange={setPreference}
                  labels={themeLabels}
                  descriptions={descriptions}
                />
              </div>
            ),
          },
          {
            label: "Display currency",
            description: fxSubtitle,
            content: (
              <div className={cn(deskContentPane, "prefs-section")}>
                <div className="prefs-currency-grid">
                  {CURRENCIES.map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => onCurrencyChange(code)}
                      className={cn(
                        "market-symbol-chip interactive",
                        currency === code && "market-symbol-chip-active",
                      )}
                      aria-pressed={currency === code}
                    >
                      <span className="market-symbol-id">{code}</span>
                      <span className="market-symbol-label">{labels[code]}</span>
                    </button>
                  ))}
                </div>
              </div>
            ),
          },
        ]}
        secondary={
          <div className={cn(deskActionPane, "settings-desk")}>
            <section className="settings-section">
              <div className="settings-section-head">
                <div>
                  <p className="settings-section-title">Trading gates</p>
                  <p className="settings-section-copy">
                    Enforced before every manual order
                  </p>
                </div>
                <label className="copy-toggle shrink-0">
                  <input
                    type="checkbox"
                    checked={risk.enabled}
                    onChange={(e) => updateRisk({ enabled: e.target.checked })}
                    className="rounded border-border accent-accent"
                  />
                  <span>{risk.enabled ? "Enabled" : "Disabled"}</span>
                </label>
              </div>
              <div className="settings-risk-fields space-y-3">
                <RiskField
                  label="Max stake (USD)"
                  value={risk.maxStake}
                  onChange={(v) => updateRisk({ maxStake: v })}
                />
                <RiskField
                  label="Session stop-loss (USD)"
                  value={risk.sessionStopLoss}
                  onChange={(v) => updateRisk({ sessionStopLoss: v })}
                />
                <RiskField
                  label="Daily max drawdown (USD)"
                  value={risk.dailyMaxDrawdown}
                  onChange={(v) => updateRisk({ dailyMaxDrawdown: v })}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="interactive"
                  onClick={onResetSession}
                >
                  Reset session loss counter
                </Button>
              </div>
            </section>

            {copyFollow && onCopyFollowChange ? (
              <CopySettingsSection
                follow={copyFollow}
                onFollowChange={onCopyFollowChange}
                liveCopyAllowed={liveCopyAllowed}
                followingCount={copyFollow.followedIds.length}
                riskMaxStake={risk.maxStake}
                onOpenCopy={onOpenCopy}
                copyRisk={copyRisk}
                onCopyRiskChange={onCopyRiskChange}
                onResetCopySession={onResetCopySession}
              />
            ) : null}

            <section className="settings-section settings-section-divider">
              <p className="settings-section-title">Studios</p>
              <p className="settings-section-copy">
                Curate partner and copy listings · requires{" "}
                <code className="font-mono text-[10px]">ADMIN_SECRET</code>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/admin">
                  <Button variant="secondary" size="sm" className="interactive">
                    Partner studio
                  </Button>
                </Link>
                <Link href="/admin/copy">
                  <Button variant="secondary" size="sm" className="interactive">
                    Copy provider studio
                  </Button>
                </Link>
              </div>
            </section>
          </div>
        }
      />

      {wsMetrics && connectionState && onResetWsMetrics ? (
        <WsMetricsPanel
          metrics={wsMetrics}
          connectionState={connectionState}
          onReset={onResetWsMetrics}
        />
      ) : null}

      <TerminalPanel label="Resilience QA" hint="Manual chaos checklist">
        <p className="workspace-inline-alert text-[11px] leading-relaxed text-muted">
          Manual chaos tests — see{" "}
          <code className="font-mono text-[10px] text-foreground">docs/CHAOS.md</code>.
          Use Chrome DevTools → Network → Offline / Slow 3G while watching WS
          metrics above. Target ≥99% reconnect success with zero duplicate buys.
        </p>
      </TerminalPanel>
    </TerminalViewLayout>
  );
}

function RiskField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="trade-field-group">
      <label className="trade-field-label">{label}</label>
      <Input
        type="number"
        min={1}
        value={value}
        mono
        className="h-9"
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
