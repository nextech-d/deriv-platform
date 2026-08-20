/** Market tree for the Charts desk — order and labels match dangotetradecity.trade. */

export interface ChartMarket {
  id: string;
  label: string;
}

export interface ChartMarketGroup {
  id: string;
  label: string;
  markets: ChartMarket[];
}

export interface ChartMarketCategory {
  id: string;
  label: string;
  groups: ChartMarketGroup[];
}

export const CHART_MARKET_TREE: ChartMarketCategory[] = [
  {
    id: "baskets",
    label: "baskets",
    groups: [
      {
        id: "commodity-basket",
        label: "Commodity Basket",
        markets: [
          { id: "WLDXAU", label: "Gold Basket" },
        ],
      },
      {
        id: "forex-basket",
        label: "Forex Basket",
        markets: [
          { id: "WLDAUD", label: "AUD Basket" },
          { id: "WLDEUR", label: "EUR Basket" },
          { id: "WLDGBP", label: "GBP Basket" },
          { id: "WLDUSD", label: "USD Basket" },
        ],
      },
    ],
  },
  {
    id: "synthetics",
    label: "synthetics",
    groups: [
      {
        id: "continuous",
        label: "Continuous Indices",
        markets: [
          { id: "1HZ100V", label: "Volatility 100 (1s) Index" },
          { id: "1HZ10V", label: "Volatility 10 (1s) Index" },
          { id: "1HZ15V", label: "Volatility 15 (1s) Index" },
          { id: "1HZ25V", label: "Volatility 25 (1s) Index" },
          { id: "1HZ30V", label: "Volatility 30 (1s) Index" },
          { id: "1HZ50V", label: "Volatility 50 (1s) Index" },
          { id: "1HZ75V", label: "Volatility 75 (1s) Index" },
          { id: "1HZ90V", label: "Volatility 90 (1s) Index" },
          { id: "R_10", label: "Volatility 10 Index" },
          { id: "R_100", label: "Volatility 100 Index" },
          { id: "R_25", label: "Volatility 25 Index" },
          { id: "R_50", label: "Volatility 50 Index" },
          { id: "R_75", label: "Volatility 75 Index" },
        ],
      },
      {
        id: "crash",
        label: "Crash Index",
        markets: [
          { id: "BOOM1000", label: "Boom 1000 Index" },
          { id: "BOOM150", label: "Boom 150 Index" },
          { id: "BOOM300N", label: "Boom 300 Index" },
          { id: "BOOM50", label: "Boom 50 Index" },
          { id: "BOOM500", label: "Boom 500 Index" },
          { id: "BOOM600", label: "Boom 600 Index" },
          { id: "BOOM900", label: "Boom 900 Index" },
          { id: "CRASH1000", label: "Crash 1000 Index" },
          { id: "CRASH150", label: "Crash 150 Index" },
          { id: "CRASH300N", label: "Crash 300 Index" },
          { id: "CRASH50", label: "Crash 50 Index" },
          { id: "CRASH500", label: "Crash 500 Index" },
          { id: "CRASH600", label: "Crash 600 Index" },
          { id: "CRASH900", label: "Crash 900 Index" },
        ],
      },
      {
        id: "daily-reset",
        label: "Daily Reset Indices",
        markets: [
          { id: "RDBEAR", label: "Bear Market Index" },
          { id: "RDBULL", label: "Bull Market Index" },
        ],
      },
      {
        id: "jump",
        label: "Jump Index",
        markets: [
          { id: "JD10", label: "Jump 10 Index" },
          { id: "JD100", label: "Jump 100 Index" },
          { id: "JD25", label: "Jump 25 Index" },
          { id: "JD50", label: "Jump 50 Index" },
          { id: "JD75", label: "Jump 75 Index" },
        ],
      },
      {
        id: "range",
        label: "Range Index",
        markets: [
          { id: "RB100", label: "Range Break 100 Index" },
          { id: "RB200", label: "Range Break 200 Index" },
        ],
      },
      {
        id: "step",
        label: "Step Index",
        markets: [
          { id: "stpRNG", label: "Step Index 100" },
          { id: "stpRNG2", label: "Step Index 200" },
          { id: "stpRNG3", label: "Step Index 300" },
          { id: "stpRNG4", label: "Step Index 400" },
          { id: "stpRNG5", label: "Step Index 500" },
        ],
      },
    ],
  },
  {
    id: "forex",
    label: "forex",
    groups: [
      {
        id: "major",
        label: "Major Pairs",
        markets: [
          { id: "frxAUDJPY", label: "AUD/JPY" },
          { id: "frxAUDUSD", label: "AUD/USD" },
          { id: "frxEURAUD", label: "EUR/AUD" },
          { id: "frxEURCAD", label: "EUR/CAD" },
          { id: "frxEURCHF", label: "EUR/CHF" },
          { id: "frxEURGBP", label: "EUR/GBP" },
          { id: "frxEURJPY", label: "EUR/JPY" },
          { id: "frxEURUSD", label: "EUR/USD" },
          { id: "frxGBPAUD", label: "GBP/AUD" },
          { id: "frxGBPJPY", label: "GBP/JPY" },
          { id: "frxGBPUSD", label: "GBP/USD" },
          { id: "frxUSDCAD", label: "USD/CAD" },
          { id: "frxUSDCHF", label: "USD/CHF" },
          { id: "frxUSDJPY", label: "USD/JPY" },
        ],
      },
      {
        id: "minor",
        label: "Minor Pairs",
        markets: [
          { id: "frxAUDCAD", label: "AUD/CAD" },
          { id: "frxAUDCHF", label: "AUD/CHF" },
          { id: "frxAUDNZD", label: "AUD/NZD" },
          { id: "frxEURNZD", label: "EUR/NZD" },
          { id: "frxGBPCAD", label: "GBP/CAD" },
          { id: "frxGBPCHF", label: "GBP/CHF" },
          { id: "frxGBPNZD", label: "GBP/NZD" },
          { id: "frxNZDJPY", label: "NZD/JPY" },
          { id: "frxNZDUSD", label: "NZD/USD" },
          { id: "frxUSDMXN", label: "USD/MXN" },
          { id: "frxUSDPLN", label: "USD/PLN" },
        ],
      },
    ],
  },
  {
    id: "otc",
    label: "otc",
    groups: [
      {
        id: "americas",
        label: "Americas OTC",
        markets: [
          { id: "OTC_DJI", label: "Wall Street 30" },
          { id: "OTC_NDX", label: "US Tech 100" },
          { id: "OTC_SPC", label: "US 500" },
        ],
      },
      {
        id: "asia",
        label: "Asia Oceania OTC",
        markets: [
          { id: "OTC_AS51", label: "Australia 200" },
          { id: "OTC_HSI", label: "Hong Kong 50" },
          { id: "OTC_N225", label: "Japan 225" },
        ],
      },
      {
        id: "europe",
        label: "Europe OTC",
        markets: [
          { id: "OTC_AEX", label: "Netherlands 25" },
          { id: "OTC_FCHI", label: "France 40" },
          { id: "OTC_FTSE", label: "UK 100" },
          { id: "OTC_GDAXI", label: "Germany 40" },
          { id: "OTC_SSMI", label: "Swiss 20" },
          { id: "OTC_SX5E", label: "Euro 50" },
        ],
      },
    ],
  },
  {
    id: "crypto",
    label: "crypto",
    groups: [
      {
        id: "non-stable",
        label: "Non Stable Coin",
        markets: [
          { id: "cryBTCUSD", label: "BTC/USD" },
          { id: "cryETHUSD", label: "ETH/USD" },
        ],
      },
    ],
  },
  {
    id: "metals",
    label: "metals",
    groups: [
      {
        id: "metals",
        label: "Metals",
        markets: [
          { id: "frxXAGUSD", label: "Silver/USD" },
          { id: "frxXAUUSD", label: "Gold/USD" },
          { id: "frxXPDUSD", label: "Palladium/USD" },
          { id: "frxXPTUSD", label: "Platinum/USD" },
        ],
      },
    ],
  },
];

const OTC_IDS = new Set(
  CHART_MARKET_TREE.find((c) => c.id === "otc")?.groups.flatMap((g) => g.markets.map((m) => m.id)) ?? [],
);

export function isOtcMarket(id: string): boolean {
  return OTC_IDS.has(id);
}

export function flattenChartMarkets(): ChartMarket[] {
  return CHART_MARKET_TREE.flatMap((cat) => cat.groups.flatMap((g) => g.markets));
}

export function chartMarketLabel(id: string): string {
  return flattenChartMarkets().find((m) => m.id === id)?.label ?? id;
}

/** Fast Trader dropdown — A–Z synthetics. */
export const TRADER_DESK_MARKETS: ChartMarket[] = [
  { id: "RDBEAR", label: "Bear Market Index" },
  { id: "BOOM1000", label: "Boom 1000 Index" },
  { id: "BOOM150", label: "Boom 150 Index" },
  { id: "BOOM300N", label: "Boom 300 Index" },
  { id: "BOOM50", label: "Boom 50 Index" },
  { id: "BOOM500", label: "Boom 500 Index" },
  { id: "BOOM600", label: "Boom 600 Index" },
  { id: "BOOM900", label: "Boom 900 Index" },
  { id: "RDBULL", label: "Bull Market Index" },
  { id: "CRASH1000", label: "Crash 1000 Index" },
  { id: "CRASH150", label: "Crash 150 Index" },
  { id: "CRASH300N", label: "Crash 300 Index" },
  { id: "CRASH50", label: "Crash 50 Index" },
  { id: "CRASH500", label: "Crash 500 Index" },
  { id: "CRASH600", label: "Crash 600 Index" },
  { id: "CRASH900", label: "Crash 900 Index" },
  { id: "JD10", label: "Jump 10 Index" },
  { id: "JD100", label: "Jump 100 Index" },
  { id: "JD25", label: "Jump 25 Index" },
  { id: "JD50", label: "Jump 50 Index" },
  { id: "JD75", label: "Jump 75 Index" },
  { id: "RB100", label: "Range Break 100 Index" },
  { id: "RB200", label: "Range Break 200 Index" },
  { id: "stpRNG", label: "Step Index 100" },
  { id: "stpRNG2", label: "Step Index 200" },
  { id: "stpRNG3", label: "Step Index 300" },
  { id: "stpRNG4", label: "Step Index 400" },
  { id: "stpRNG5", label: "Step Index 500" },
  { id: "1HZ10V", label: "Volatility 10 (1s) Index" },
  { id: "R_10", label: "Volatility 10 Index" },
  { id: "1HZ100V", label: "Volatility 100 (1s) Index" },
  { id: "R_100", label: "Volatility 100 Index" },
  { id: "1HZ15V", label: "Volatility 15 (1s) Index" },
  { id: "1HZ25V", label: "Volatility 25 (1s) Index" },
  { id: "R_25", label: "Volatility 25 Index" },
  { id: "1HZ30V", label: "Volatility 30 (1s) Index" },
  { id: "1HZ50V", label: "Volatility 50 (1s) Index" },
  { id: "R_50", label: "Volatility 50 Index" },
  { id: "1HZ75V", label: "Volatility 75 (1s) Index" },
  { id: "R_75", label: "Volatility 75 Index" },
  { id: "1HZ90V", label: "Volatility 90 (1s) Index" },
];

/** Bulk Trader market menu — dangote dropdown order. */
export const BULK_TRADER_MARKETS: ChartMarket[] = [
  { id: "1HZ100V", label: "Volatility 100 (1s) Index" },
  { id: "1HZ10V", label: "Volatility 10 (1s) Index" },
  { id: "1HZ15V", label: "Volatility 15 (1s) Index" },
  { id: "1HZ25V", label: "Volatility 25 (1s) Index" },
  { id: "1HZ30V", label: "Volatility 30 (1s) Index" },
  { id: "1HZ50V", label: "Volatility 50 (1s) Index" },
  { id: "1HZ75V", label: "Volatility 75 (1s) Index" },
  { id: "1HZ90V", label: "Volatility 90 (1s) Index" },
  { id: "BOOM1000", label: "Boom 1000 Index" },
  { id: "BOOM150", label: "Boom 150 Index" },
  { id: "BOOM300N", label: "Boom 300 Index" },
  { id: "BOOM50", label: "Boom 50 Index" },
  { id: "BOOM500", label: "Boom 500 Index" },
  { id: "BOOM600", label: "Boom 600 Index" },
  { id: "BOOM900", label: "Boom 900 Index" },
  { id: "CRASH1000", label: "Crash 1000 Index" },
  { id: "CRASH150", label: "Crash 150 Index" },
  { id: "CRASH300N", label: "Crash 300 Index" },
  { id: "CRASH50", label: "Crash 50 Index" },
  { id: "CRASH500", label: "Crash 500 Index" },
  { id: "CRASH600", label: "Crash 600 Index" },
  { id: "CRASH900", label: "Crash 900 Index" },
  { id: "JD10", label: "Jump 10 Index" },
  { id: "JD100", label: "Jump 100 Index" },
  { id: "JD25", label: "Jump 25 Index" },
  { id: "JD50", label: "Jump 50 Index" },
  { id: "JD75", label: "Jump 75 Index" },
  { id: "RB100", label: "Range Break 100 Index" },
  { id: "RB200", label: "Range Break 200 Index" },
  { id: "RDBEAR", label: "Bear Market Index" },
  { id: "RDBULL", label: "Bull Market Index" },
  { id: "R_10", label: "Volatility 10 Index" },
  { id: "R_100", label: "Volatility 100 Index" },
  { id: "R_25", label: "Volatility 25 Index" },
  { id: "R_50", label: "Volatility 50 Index" },
  { id: "R_75", label: "Volatility 75 Index" },
  { id: "stpRNG", label: "Step Index 100" },
  { id: "stpRNG2", label: "Step Index 200" },
  { id: "stpRNG3", label: "Step Index 300" },
  { id: "stpRNG4", label: "Step Index 400" },
  { id: "stpRNG5", label: "Step Index 500" },
];

/** Ultimate Bot Active Markets table — exact 13 rows and order. */
export const ULTIMATE_BOT_MARKETS: ChartMarket[] = [
  { id: "1HZ100V", label: "Volatility 100 (1s) Index" },
  { id: "1HZ10V", label: "Volatility 10 (1s) Index" },
  { id: "1HZ15V", label: "Volatility 15 (1s) Index" },
  { id: "1HZ25V", label: "Volatility 25 (1s) Index" },
  { id: "1HZ30V", label: "Volatility 30 (1s) Index" },
  { id: "1HZ50V", label: "Volatility 50 (1s) Index" },
  { id: "1HZ75V", label: "Volatility 75 (1s) Index" },
  { id: "1HZ90V", label: "Volatility 90 (1s) Index" },
  { id: "R_10", label: "Volatility 10 Index" },
  { id: "R_100", label: "Volatility 100 Index" },
  { id: "R_25", label: "Volatility 25 Index" },
  { id: "R_50", label: "Volatility 50 Index" },
  { id: "R_75", label: "Volatility 75 Index" },
];

/** Analysis Tool DCIRCLE — 13 markets, dangote order. */
export const ANALYSIS_DCIRCLE_SYMBOLS = [
  "1HZ100V",
  "1HZ10V",
  "1HZ15V",
  "1HZ25V",
  "1HZ30V",
  "1HZ50V",
  "1HZ75V",
  "1HZ90V",
  "R_10",
  "R_100",
  "R_25",
  "R_50",
  "R_75",
] as const;

/** Edging 2 symbol list. */
export const EDGING2_MARKETS: ChartMarket[] = [
  { id: "R_10", label: "Volatility 10 Index" },
  { id: "R_25", label: "Volatility 25 Index" },
  { id: "R_50", label: "Volatility 50 Index" },
  { id: "R_75", label: "Volatility 75 Index" },
  { id: "R_100", label: "Volatility 100 Index" },
  { id: "1HZ10V", label: "Volatility 10 (1s) Index" },
  { id: "1HZ25V", label: "Volatility 25 (1s) Index" },
  { id: "1HZ50V", label: "Volatility 50 (1s) Index" },
  { id: "1HZ75V", label: "Volatility 75 (1s) Index" },
  { id: "1HZ100V", label: "Volatility 100 (1s) Index" },
];
