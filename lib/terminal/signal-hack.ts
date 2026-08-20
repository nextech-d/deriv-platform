import { maCrossSignal, sma } from "@/lib/bot/indicators";
import {
  analyzeParity,
  digitsFromQuotes,
  lastDigitFromQuote,
} from "@/lib/terminal/analysis-tool";

export type SignalHackFamily = "rise_fall" | "even_odd";

export interface SignalHackBias {
  family: SignalHackFamily;
  side: "CALL" | "PUT";
  label: string;
  confidence: number;
}

export interface SignalHackReading {
  quote: number | null;
  lastDigit: number | null;
  digits: number[];
  values: number[];
  window: number;
  evenPct: number;
  oddPct: number;
  streakSide: "even" | "odd" | null;
  streakLength: number;
  fastMa: number | null;
  slowMa: number | null;
  cross: "bullish" | "bearish" | null;
  riseFall: SignalHackBias | null;
  evenOdd: SignalHackBias | null;
  bias: SignalHackBias | null;
}

function riseFallBias(
  last: number,
  fastMa: number,
  slowMa: number,
  cross: SignalHackReading["cross"],
): SignalHackBias {
  const spread = Math.abs(fastMa - slowMa) / Math.max(Math.abs(slowMa), 1);
  const rise = fastMa >= slowMa;
  return {
    family: "rise_fall",
    side: rise ? "CALL" : "PUT",
    label: rise ? "Rise · MA stack" : "Fall · MA stack",
    confidence: Math.min(92, Math.round(52 + spread * 1800 + (cross ? 10 : 0))),
  };
}

function evenOddBias(
  evenPct: number,
  oddPct: number,
): SignalHackBias {
  const evenLeads = evenPct >= oddPct;
  const edge = Math.abs(evenPct - oddPct);
  return {
    family: "even_odd",
    side: evenLeads ? "CALL" : "PUT",
    label: evenLeads ? `Even ${evenPct.toFixed(1)}%` : `Odd ${oddPct.toFixed(1)}%`,
    confidence: Math.min(90, Math.round(50 + edge * 1.4)),
  };
}

export function readSignalHack(
  quotes: Array<{ quote: number; epoch?: number }>,
): SignalHackReading {
  const values = quotes.map((tick) => tick.quote);
  const last = values.at(-1) ?? null;
  const samples = digitsFromQuotes(quotes, 40);
  const parity = analyzeParity(samples);
  const fastMa = sma(values, 5);
  const slowMa = sma(values, 20);
  const cross = maCrossSignal(values, 5, 20);

  const riseFall =
    fastMa != null && slowMa != null && last != null
      ? riseFallBias(last, fastMa, slowMa, cross)
      : null;

  const evenOdd = parity.window >= 8 ? evenOddBias(parity.evenPct, parity.oddPct) : null;
  const evenEdge = Math.abs(parity.evenPct - parity.oddPct);

  const candidates: SignalHackBias[] = [];
  if (riseFall) candidates.push(riseFall);
  if (evenOdd && evenEdge >= 6) candidates.push(evenOdd);

  const bias =
    candidates.sort((a, b) => b.confidence - a.confidence)[0] ?? null;

  return {
    quote: last,
    lastDigit: last == null ? null : lastDigitFromQuote(last),
    digits: samples.map((sample) => sample.digit),
    values,
    window: parity.window,
    evenPct: parity.evenPct,
    oddPct: parity.oddPct,
    streakSide: parity.streakSide,
    streakLength: parity.streakLength,
    fastMa,
    slowMa,
    cross,
    riseFall,
    evenOdd,
    bias,
  };
}
