import type {
  BotConfig,
  BotEvaluation,
  BotSignal,
  QuickStrategyParams,
  QuickStrategyType,
} from "@/lib/bot/types";
import { maCrossSignal, rsi, sma } from "@/lib/bot/indicators";

function lastDigit(quote: number): number {
  const text = quote.toFixed(2);
  const digit = Number(text.replace(/\D/g, "").slice(-1));
  return Number.isFinite(digit) ? digit : 0;
}

function digitsFromQuotes(quotes: number[], window = 20): number[] {
  return quotes.slice(-window).map(lastDigit);
}

export function evaluateStrategy(
  quotes: number[],
  config: BotConfig,
): BotEvaluation {
  if (config.strategy === "ma_cross") {
    const cross = maCrossSignal(quotes, config.fastPeriod, config.slowPeriod);
    const fastMa = sma(quotes, config.fastPeriod) ?? undefined;
    const slowMa = sma(quotes, config.slowPeriod) ?? undefined;

    if (cross === "bullish") {
      return {
        signal: "CALL",
        contractType: "CALL",
        label: `MA cross ↑ (${config.fastPeriod}/${config.slowPeriod})`,
        fastMa,
        slowMa,
      };
    }
    if (cross === "bearish") {
      return {
        signal: "PUT",
        contractType: "PUT",
        label: `MA cross ↓ (${config.fastPeriod}/${config.slowPeriod})`,
        fastMa,
        slowMa,
      };
    }
    return {
      signal: null,
      label: "MA — no cross",
      fastMa,
      slowMa,
    };
  }

  if (config.strategy === "rsi_threshold") {
    const rsiValue = rsi(quotes, config.rsiPeriod);
    if (rsiValue === null) {
      return { signal: null, label: "RSI — warming up", rsi: undefined };
    }

    let signal: BotSignal | null = null;
    let label = `RSI ${rsiValue.toFixed(1)}`;

    if (rsiValue <= config.rsiOversold) {
      signal = "CALL";
      label = `RSI oversold ${rsiValue.toFixed(1)} ≤ ${config.rsiOversold}`;
    } else if (rsiValue >= config.rsiOverbought) {
      signal = "PUT";
      label = `RSI overbought ${rsiValue.toFixed(1)} ≥ ${config.rsiOverbought}`;
    }

    return {
      signal,
      contractType: signal ?? undefined,
      label,
      rsi: rsiValue,
    };
  }

  if (config.strategy === "parity_bias") {
    const digits = digitsFromQuotes(quotes, 20);
    if (digits.length < 5) {
      return { signal: null, label: "Parity — warming up" };
    }
    const even = digits.filter((d) => d % 2 === 0).length;
    const odd = digits.length - even;
    const evenPct = (even / digits.length) * 100;
    const prefer =
      config.parityPrefer === "auto"
        ? evenPct >= 50
          ? "even"
          : "odd"
        : config.parityPrefer;

    const purchase = (config.purchase ?? "").toLowerCase();
    const locked = purchase.includes("odd")
      ? "odd"
      : purchase.includes("even")
        ? "even"
        : prefer;

    const lockedPct = locked === "even" ? evenPct : 100 - evenPct;
    if (lockedPct < 50) {
      return {
        signal: null,
        label: `Parity waiting ${locked === "even" ? "Even" : "Odd"} (${evenPct.toFixed(0)}% even)`,
      };
    }

    const takeEven = locked === "even";
    return {
      signal: takeEven ? "CALL" : "PUT",
      contractType: takeEven ? "DIGITEVEN" : "DIGITODD",
      label: `Parity ${takeEven ? "Even" : "Odd"} (${evenPct.toFixed(0)}% even)`,
    };
  }

  if (config.strategy === "barrier_edge") {
    const digits = digitsFromQuotes(quotes, 20);
    if (digits.length < 5) {
      return { signal: null, label: "Barrier — warming up" };
    }
    const barrier = config.barrierDigit ?? 4;
    const over = digits.filter((d) => d > barrier).length;
    const overPct = (over / digits.length) * 100;
    const purchase = (config.purchase ?? "").toLowerCase();
    const wantOver = !purchase.includes("under");
    const aligned = wantOver ? overPct >= 50 : overPct < 50;
    if (!aligned) {
      return {
        signal: null,
        label: `Barrier waiting ${wantOver ? "Over" : "Under"} ${barrier} (${overPct.toFixed(0)}% over)`,
      };
    }
    return {
      signal: wantOver ? "CALL" : "PUT",
      contractType: wantOver ? "DIGITOVER" : "DIGITUNDER",
      barrier,
      label: `Barrier ${wantOver ? "Over" : "Under"} ${barrier} (${overPct.toFixed(0)}% over)`,
    };
  }

  if (config.strategy === "digit_match") {
    const digits = digitsFromQuotes(quotes, 20);
    if (digits.length < 5) {
      return { signal: null, label: "Match — warming up" };
    }
    const target = config.digitTarget ?? 5;
    const hits = digits.filter((d) => d === target).length;
    const hitPct = (hits / digits.length) * 100;
    const purchase = (config.purchase ?? "").toLowerCase();
    const wantMatch = !purchase.includes("differ");
    const aligned = wantMatch ? hitPct >= 12 : hitPct < 12;
    if (!aligned) {
      return {
        signal: null,
        label: `Digit waiting ${wantMatch ? "Match" : "Differ"} ${target} (${hitPct.toFixed(0)}%)`,
      };
    }
    return {
      signal: wantMatch ? "CALL" : "PUT",
      contractType: wantMatch ? "DIGITMATCH" : "DIGITDIFF",
      barrier: target,
      label: `Digit ${wantMatch ? "Match" : "Differ"} ${target} (${hitPct.toFixed(0)}%)`,
    };
  }

  return { signal: null, label: "Unknown strategy" };
}

// ── Quick-strategy stake progression ──────────────────────────

const SEQUENCE_1326 = [1, 3, 2, 6] as const;

export interface StakeProgressionState {
  initialStake: number;
  currentStake: number;
  totalProfit: number;
  totalLoss: number;
  roundIndex: number;
  lastOutcome: "win" | "loss" | null;
}

export function initProgressionState(initialStake: number): StakeProgressionState {
  return {
    initialStake,
    currentStake: initialStake,
    totalProfit: 0,
    totalLoss: 0,
    roundIndex: 0,
    lastOutcome: null,
  };
}

/**
 * Compute the next stake after a round outcome.
 * Returns the updated state with `currentStake` set for the next round,
 * or `null` if a threshold has been reached and the bot should stop.
 */
export function progressStake(
  state: StakeProgressionState,
  params: QuickStrategyParams,
  outcome: "win" | "loss",
  payout: number,
): StakeProgressionState | null {
  const pnl = outcome === "win" ? payout - state.currentStake : -state.currentStake;
  const profit = state.totalProfit + (pnl > 0 ? pnl : 0);
  const loss = state.totalLoss + (pnl < 0 ? Math.abs(pnl) : 0);

  if (profit >= params.profitThreshold || loss >= params.lossThreshold) {
    return null;
  }

  let nextStake = state.currentStake;
  const roundIndex = state.roundIndex + 1;

  switch (params.type) {
    case "martingale":
      nextStake = outcome === "loss"
        ? state.currentStake * (params.size ?? 2)
        : state.initialStake;
      break;

    case "reverse_martingale":
      nextStake = outcome === "win"
        ? state.currentStake * (params.size ?? 2)
        : state.initialStake;
      break;

    case "dalembert":
      nextStake = outcome === "loss"
        ? state.currentStake + (params.unit ?? 1) * state.initialStake
        : Math.max(state.initialStake, state.currentStake - (params.unit ?? 1) * state.initialStake);
      break;

    case "reverse_dalembert":
      nextStake = outcome === "win"
        ? state.currentStake + (params.unit ?? 1) * state.initialStake
        : Math.max(state.initialStake, state.currentStake - (params.unit ?? 1) * state.initialStake);
      break;

    case "oscars_grind":
      if (outcome === "win" && state.lastOutcome === "loss") {
        nextStake = state.currentStake + state.initialStake;
      } else if (outcome === "loss") {
        nextStake = state.currentStake;
      }
      break;

    case "one_three_two_six": {
      if (outcome === "loss") {
        nextStake = state.initialStake * SEQUENCE_1326[0];
      } else {
        const seqIdx = roundIndex % SEQUENCE_1326.length;
        nextStake = state.initialStake * SEQUENCE_1326[seqIdx];
      }
      break;
    }
  }

  if (params.maxStake && nextStake > params.maxStake) {
    nextStake = params.maxStake;
  }

  nextStake = Math.max(0.35, nextStake);

  return {
    initialStake: state.initialStake,
    currentStake: nextStake,
    totalProfit: profit,
    totalLoss: loss,
    roundIndex,
    lastOutcome: outcome,
  };
}
