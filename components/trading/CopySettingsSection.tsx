"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { AUTH_LOGIN_PATH } from "@/lib/auth/auth-links";
import type { CopyFollowState, CopySignal } from "@/lib/copy/types";
import type { CopyRiskSettings } from "@/lib/copy/risk-settings";
import { clampProviderStakes } from "@/lib/copy/settings";
import { cn } from "@/lib/utils/cn";

interface CopySettingsSectionProps {
  follow: CopyFollowState;
  onFollowChange: (follow: CopyFollowState) => void;
  liveCopyAllowed: boolean;
  followingCount: number;
  riskMaxStake: number;
  copyRisk?: CopyRiskSettings;
  onCopyRiskChange?: (settings: CopyRiskSettings) => void;
  onResetCopySession?: () => void;
  onOpenCopy?: () => void;
}

export function CopySettingsSection({
  follow,
  onFollowChange,
  liveCopyAllowed,
  followingCount,
  riskMaxStake,
  copyRisk,
  onCopyRiskChange,
  onResetCopySession,
  onOpenCopy,
}: CopySettingsSectionProps) {
  const effectiveMax = Math.min(follow.maxStake, riskMaxStake);

  return (
    <section className="settings-section settings-section-divider">
      <div className="settings-section-head">
        <div>
          <p className="settings-section-title">Copy trading</p>
          <p className="settings-section-copy">
            Auto-copy and stake limits for signal providers
            {followingCount > 0
              ? ` · ${followingCount} provider${followingCount === 1 ? "" : "s"} followed`
              : ""}
          </p>
        </div>
        {onOpenCopy ? (
          <Button
            variant="secondary"
            size="sm"
            className="interactive shrink-0"
            onClick={onOpenCopy}
          >
            Open Copy
          </Button>
        ) : null}
      </div>

      <div className="copy-settings-bar desk-tile mt-3">
        <label className="copy-toggle">
          <input
            type="checkbox"
            checked={follow.autoCopy}
            disabled={!liveCopyAllowed}
            onChange={(e) =>
              onFollowChange({ ...follow, autoCopy: e.target.checked })
            }
            className="rounded border-border accent-accent"
          />
          <span>Auto-copy new signals</span>
        </label>
        <div className="copy-stake-field">
          <label className="trade-field-label" htmlFor="settings-copy-max-stake">
            Global max stake (USD)
          </label>
          <Input
            id="settings-copy-max-stake"
            type="number"
            min={0.35}
            max={riskMaxStake}
            step={0.01}
            value={follow.maxStake}
            mono
            className="copy-stake-input h-9"
            onChange={(e) => {
              const maxStake = Math.min(Number(e.target.value), riskMaxStake);
              onFollowChange({
                ...follow,
                maxStake,
                providerStakes: clampProviderStakes(follow, maxStake),
              });
            }}
          />
        </div>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-muted">
        Effective copy stake is capped at{" "}
        <span className="font-mono text-foreground">${effectiveMax.toFixed(2)}</span>
        {" "}(min of copy limit and global max stake). Set per-provider caps in the
        Copy workspace when following desks.
      </p>

      {!liveCopyAllowed ? (
        <p className="workspace-inline-alert workspace-inline-alert-warn mt-2 text-[10px]">
          <Link href={AUTH_LOGIN_PATH} className="font-semibold underline">
            Log in
          </Link>{" "}
          with Deriv for live copy execution. Demo mode simulates copied trades.
        </p>
      ) : null}

      {copyRisk && onCopyRiskChange ? (
        <div className="copy-risk-fields mt-4 space-y-3">
          <div className="settings-section-head">
            <div>
              <p className="settings-section-title">Copy risk gates</p>
              <p className="settings-section-copy">
                Separate from manual and bot trading limits
              </p>
            </div>
            <label className="copy-toggle shrink-0">
              <input
                type="checkbox"
                checked={copyRisk.enabled}
                onChange={(e) =>
                  onCopyRiskChange({ ...copyRisk, enabled: e.target.checked })
                }
                className="rounded border-border accent-accent"
              />
              <span>{copyRisk.enabled ? "Enabled" : "Disabled"}</span>
            </label>
          </div>
          <div className="settings-risk-fields grid gap-3 sm:grid-cols-2">
            <CopyRiskField
              label="Copy session stop-loss (USD)"
              value={copyRisk.sessionStopLoss}
              onChange={(v) =>
                onCopyRiskChange({ ...copyRisk, sessionStopLoss: v })
              }
            />
            <CopyRiskField
              label="Copy daily drawdown (USD)"
              value={copyRisk.dailyMaxDrawdown}
              onChange={(v) =>
                onCopyRiskChange({ ...copyRisk, dailyMaxDrawdown: v })
              }
            />
            <CopyRiskField
              label="Max copies per session (0 = unlimited)"
              value={copyRisk.maxCopiesPerSession}
              min={0}
              onChange={(v) =>
                onCopyRiskChange({ ...copyRisk, maxCopiesPerSession: v })
              }
            />
          </div>
          {onResetCopySession ? (
            <Button
              variant="secondary"
              size="sm"
              className="interactive"
              onClick={onResetCopySession}
            >
              Reset copy session counters
            </Button>
          ) : null}
        </div>
      ) : null}

      {followingCount > 0 ? (
        <Button
          variant="secondary"
          size="sm"
          className="interactive mt-3"
          onClick={() =>
            onFollowChange({ ...follow, followedIds: [], providerStakes: {} })
          }
        >
          Unfollow all providers
        </Button>
      ) : null}
    </section>
  );
}

function CopyRiskField({
  label,
  value,
  min = 1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="trade-field-group">
      <label className="trade-field-label">{label}</label>
      <Input
        type="number"
        min={min}
        value={value}
        mono
        className="h-9"
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

interface CopyMobileSignalRailProps {
  signals: CopySignal[];
  onSelectSignal?: (signalId: string) => void;
}

export function CopyMobileSignalRail({
  signals,
  onSelectSignal,
}: CopyMobileSignalRailProps) {
  if (signals.length === 0) return null;

  return (
    <div className="copy-mobile-rail-wrap md:hidden">
      <p className="copy-mobile-rail-label">Live signals</p>
      <div className="copy-mobile-rail">
        {signals.map((signal) => {
          const Tag = onSelectSignal ? "button" : "span";
          return (
            <Tag
              key={signal.id}
              type={onSelectSignal ? "button" : undefined}
              className={cn(
                "copy-mobile-pill font-mono",
                onSelectSignal && "interactive copy-mobile-pill-btn",
                signal.direction === "CALL"
                  ? "copy-mobile-pill-rise"
                  : "copy-mobile-pill-fall",
              )}
              onClick={
                onSelectSignal ? () => onSelectSignal(signal.id) : undefined
              }
            >
              {signal.symbol}
              <span className="copy-mobile-pill-dir">
                {signal.direction === "CALL" ? "Rise" : "Fall"}
              </span>
              <span className="copy-mobile-pill-provider truncate">
                {signal.providerName}
              </span>
            </Tag>
          );
        })}
      </div>
    </div>
  );
}
