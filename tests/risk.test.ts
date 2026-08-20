import { describe, expect, it } from "vitest";
import {
  DEFAULT_COPY_RISK,
  checkCopyRiskGate,
  isCopyLockedOut,
} from "@/lib/copy/risk-settings";
import {
  DEFAULT_RISK,
  checkRiskGate,
  checkStakeCap,
  isRiskLockedOut,
} from "@/lib/risk/settings";

const idleStats = {
  sessionLoss: 0,
  dailyLoss: 0,
  dayKey: "2026-08-20",
};

const idleCopyStats = {
  ...idleStats,
  copiesThisSession: 0,
  copyWins: 0,
  copyLosses: 0,
  copySettledPnl: 0,
};

describe("manual risk gate", () => {
  it("blocks a stake above the cap", () => {
    expect(checkStakeCap(DEFAULT_RISK, 25.01)).toBe("Stake exceeds max cap ($25)");
    expect(checkRiskGate(DEFAULT_RISK, idleStats, 26)).toMatch(/max cap/);
  });

  it("allows a stake at the cap", () => {
    expect(checkStakeCap(DEFAULT_RISK, 25)).toBeNull();
    expect(checkRiskGate(DEFAULT_RISK, idleStats, 25)).toBeNull();
  });

  it("locks after session stop-loss or daily drawdown", () => {
    expect(isRiskLockedOut(DEFAULT_RISK, { ...idleStats, sessionLoss: 50 })).toBe(true);
    expect(isRiskLockedOut(DEFAULT_RISK, { ...idleStats, dailyLoss: 100 })).toBe(true);
    expect(checkRiskGate(DEFAULT_RISK, { ...idleStats, sessionLoss: 50 }, 1)).toMatch(
      /Session stop-loss/,
    );
  });

  it("ignores caps when risk controls are off", () => {
    const off = { ...DEFAULT_RISK, enabled: false };
    expect(checkRiskGate(off, { ...idleStats, sessionLoss: 500 }, 999)).toBeNull();
    expect(isRiskLockedOut(off, { ...idleStats, dailyLoss: 500 })).toBe(false);
  });
});

describe("copy risk gate", () => {
  it("blocks when the copy session or daily loss is spent", () => {
    expect(
      checkCopyRiskGate(DEFAULT_COPY_RISK, { ...idleCopyStats, sessionLoss: 25 }),
    ).toMatch(/Copy session stop-loss/);
    expect(
      checkCopyRiskGate(DEFAULT_COPY_RISK, { ...idleCopyStats, dailyLoss: 50 }),
    ).toMatch(/Copy daily drawdown/);
  });

  it("blocks when the session copy count is used up", () => {
    const limited = { ...DEFAULT_COPY_RISK, maxCopiesPerSession: 3 };
    expect(
      checkCopyRiskGate(limited, { ...idleCopyStats, copiesThisSession: 3 }),
    ).toMatch(/Copy session limit/);
    expect(isCopyLockedOut(limited, { ...idleCopyStats, copiesThisSession: 3 })).toBe(true);
  });

  it("treats maxCopiesPerSession 0 as unlimited", () => {
    expect(checkCopyRiskGate(DEFAULT_COPY_RISK, { ...idleCopyStats, copiesThisSession: 99 })).toBeNull();
  });
});
