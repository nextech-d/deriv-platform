import { sma } from "@/lib/bot/indicators";
import type { SignalProvider, CopySignal, SignalDirection } from "@/lib/copy/types";
import type { TickEvent } from "@/lib/ws/protocol";

const SIGNAL_TTL_MS = 60_000;
/** Backup prune cadence — matches signal card TTL UI tick. */
const COPY_SIGNAL_PRUNE_MS = 250;

export { SIGNAL_TTL_MS, COPY_SIGNAL_PRUNE_MS };

function signalId(providerId: string, epoch: number): string {
  return `${providerId}-${epoch}`;
}

function evaluateProvider(
  provider: SignalProvider,
  symbol: string,
  quotes: number[],
): { direction: SignalDirection; rationale: string; confidence: number } | null {
  if (quotes.length < 20) return null;

  const fast = sma(quotes, 5);
  const slow = sma(quotes, 20);
  if (fast === null || slow === null) return null;

  const last = quotes.at(-1)!;
  const prev = quotes.at(-2)!;
  const momentum = last - prev;

  switch (provider.style) {
    case "momentum": {
      if (fast > slow && momentum > 0) {
        return {
          direction: "CALL",
          rationale: `Fast MA above slow · upward momentum on ${symbol}`,
          confidence: 72,
        };
      }
      if (fast < slow && momentum < 0) {
        return {
          direction: "PUT",
          rationale: `Fast MA below slow · downward momentum on ${symbol}`,
          confidence: 72,
        };
      }
      return null;
    }
    case "mean_reversion": {
      const mean = sma(quotes, 20)!;
      const dev = (last - mean) / mean;
      if (dev > 0.002) {
        return {
          direction: "PUT",
          rationale: `Price extended above 20-tick mean — reversion setup`,
          confidence: 65,
        };
      }
      if (dev < -0.002) {
        return {
          direction: "CALL",
          rationale: `Price extended below 20-tick mean — reversion setup`,
          confidence: 65,
        };
      }
      return null;
    }
    case "breakout": {
      const recent = quotes.slice(-10);
      const high = Math.max(...recent);
      const low = Math.min(...recent);
      if (last >= high && momentum > 0) {
        return {
          direction: "CALL",
          rationale: `10-tick high breakout on ${symbol}`,
          confidence: 68,
        };
      }
      if (last <= low && momentum < 0) {
        return {
          direction: "PUT",
          rationale: `10-tick low breakdown on ${symbol}`,
          confidence: 68,
        };
      }
      return null;
    }
  }
}

export function generateSignalsFromTicks(
  providers: SignalProvider[],
  followedIds: string[],
  tick: TickEvent,
  tickHistory: TickEvent[],
  cooldownUntil: Map<string, number>,
  cooldownTicks = 15,
): CopySignal[] {
  const now = Date.now();
  const signals: CopySignal[] = [];

  for (const provider of providers) {
    if (!followedIds.includes(provider.id)) continue;
    if (!provider.symbols.includes(tick.symbol)) continue;

    const key = `${provider.id}:${tick.symbol}`;
    const until = cooldownUntil.get(key) ?? 0;
    if (tick.epoch < until) continue;

    const quotes = tickHistory
      .filter((t) => t.symbol === tick.symbol)
      .map((t) => t.quote);

    const evalResult = evaluateProvider(provider, tick.symbol, quotes);
    if (!evalResult) continue;

    cooldownUntil.set(key, tick.epoch + cooldownTicks);

    signals.push({
      id: signalId(provider.id, tick.epoch),
      providerId: provider.id,
      providerName: provider.name,
      symbol: tick.symbol,
      direction: evalResult.direction,
      stakeSuggestion: provider.riskLabel === "high" ? 1 : 0.5,
      durationTicks: provider.riskLabel === "low" ? 10 : 5,
      confidence: evalResult.confidence,
      rationale: evalResult.rationale,
      createdAt: now,
      expiresAt: now + SIGNAL_TTL_MS,
    });
  }

  return signals;
}

export function pruneExpiredSignals(signals: CopySignal[]): CopySignal[] {
  const now = Date.now();
  return signals.filter((s) => s.expiresAt > now);
}
