export type FastTraderFamily =
  | "even_odd"
  | "matches_differs"
  | "over_under"
  | "rise_fall";

export type FastTradeType =
  | "even"
  | "odd"
  | "matches"
  | "differs"
  | "over"
  | "under"
  | "rise"
  | "fall";

export interface FastTradeKind {
  id: FastTradeType;
  label: string;
  contract: string;
  needsDigit: boolean;
}

export const FAST_MIN_STAKE = 0.35;
export const FAST_PAYOUT = 0.95;

export const FAST_TRADE_TYPES: FastTradeKind[] = [
  { id: "even", label: "Even", contract: "DIGITEVEN", needsDigit: false },
  { id: "odd", label: "Odd", contract: "DIGITODD", needsDigit: false },
  { id: "matches", label: "Matches", contract: "DIGITMATCH", needsDigit: true },
  { id: "differs", label: "Differs", contract: "DIGITDIFF", needsDigit: true },
  { id: "over", label: "Over", contract: "DIGITOVER", needsDigit: true },
  { id: "under", label: "Under", contract: "DIGITUNDER", needsDigit: true },
  { id: "rise", label: "Rise", contract: "CALL", needsDigit: false },
  { id: "fall", label: "Fall", contract: "PUT", needsDigit: false },
];

export function fastTradeKind(type: FastTradeType): FastTradeKind {
  return FAST_TRADE_TYPES.find((item) => item.id === type) ?? FAST_TRADE_TYPES[0]!;
}

export function clampFastStake(value: number): number {
  if (!Number.isFinite(value)) return FAST_MIN_STAKE;
  return Math.max(FAST_MIN_STAKE, Math.round(value * 100) / 100);
}

export function fastMartingaleStake(base: number, consecutiveLosses: number): number {
  const sized = clampFastStake(base) * 2 ** Math.min(Math.max(0, consecutiveLosses), 4);
  return Math.round(sized * 100) / 100;
}

export function fastWins(input: {
  type: FastTradeType;
  exitDigit: number;
  exitQuote: number;
  entryQuote: number;
  digit: number;
}): boolean {
  const { type, exitDigit, exitQuote, entryQuote, digit } = input;
  switch (type) {
    case "even":
      return exitDigit % 2 === 0;
    case "odd":
      return exitDigit % 2 === 1;
    case "matches":
      return exitDigit === digit;
    case "differs":
      return exitDigit !== digit;
    case "over":
      return exitDigit > digit;
    case "under":
      return exitDigit < digit;
    case "rise":
      return exitQuote > entryQuote;
    case "fall":
      return exitQuote < entryQuote;
  }
}

export function fastPnl(win: boolean, stake: number, payout = FAST_PAYOUT): number {
  return Number((win ? stake * payout : -stake).toFixed(2));
}

export function fastTraderFamily(type: FastTradeType): FastTraderFamily {
  if (type === "even" || type === "odd") return "even_odd";
  if (type === "matches" || type === "differs") return "matches_differs";
  if (type === "over" || type === "under") return "over_under";
  return "rise_fall";
}
