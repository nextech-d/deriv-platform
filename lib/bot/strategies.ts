import { maCrossSignal, rsi, sma } from "@/lib/bot/indicators";
import type { BotConfig, BotEvaluation, BotSignal } from "@/lib/bot/types";

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
        label: `MA cross ↑ (${config.fastPeriod}/${config.slowPeriod})`,
        fastMa,
        slowMa,
      };
    }
    if (cross === "bearish") {
      return {
        signal: "PUT",
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

  return { signal, label, rsi: rsiValue };
}
