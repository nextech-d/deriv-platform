/** Blockly-style toolbox used by Bot builder (Binarytool / D-Bot shape). */

export type BuilderCategoryId =
  | "analysis-logics"
  | "market-structure"
  | "trade-parameters"
  | "purchase-conditions"
  | "sell-conditions"
  | "restart-conditions"
  | "analysis"
  | "utility"
  | "custom-tools"
  | "math"
  | "logic"
  | "loops"
  | "text"
  | "variables"
  | "functions"
  | "notifications"
  | "time"
  | "tick-analysis";

export interface BuilderBlockDef {
  id: string;
  label: string;
  /** What happens when the block is clicked onto the canvas */
  action:
    | "focus-trade"
    | "focus-purchase"
    | "focus-sell"
    | "focus-restart"
    | "set-even-odd"
    | "set-over-under"
    | "set-matches"
    | "set-rise-fall"
    | "add-logic"
    | "add-math"
    | "add-notify"
    | "add-variable"
    | "add-loop"
    | "add-tick"
    | "noop";
  hint?: string;
}

export interface BuilderCategory {
  id: BuilderCategoryId;
  label: string;
  accent?: boolean;
  /** Show a chevron and allow collapsing sub-items */
  expandable?: boolean;
  /** Emoji or icon hint rendered before the label */
  icon?: string;
  blocks: BuilderBlockDef[];
}

export const BOT_BUILDER_TOOLBOX: BuilderCategory[] = [
  {
    id: "analysis-logics",
    label: "Analysis Logics",
    accent: true,
    icon: "🔥",
    blocks: [
      { id: "parity-logic", label: "Even / Odd bias", action: "set-even-odd", hint: "Prefers parity lane from last digits" },
      { id: "barrier-logic", label: "Over / Under bias", action: "set-over-under", hint: "Barrier digit comparison" },
      { id: "match-logic", label: "Matches / Differs", action: "set-matches", hint: "Target digit match lane" },
      { id: "streak-logic", label: "Streak flip", action: "set-even-odd", hint: "Flip after same-parity streak" },
    ],
  },
  {
    id: "market-structure",
    label: "Market Structure",
    accent: true,
    icon: "🏗️",
    blocks: [
      { id: "rise-fall-structure", label: "Rise / Fall structure", action: "set-rise-fall" },
      { id: "tick-window", label: "Tick window filter", action: "add-tick" },
      { id: "volatility-gate", label: "Volatility gate", action: "add-logic" },
    ],
  },
  {
    id: "trade-parameters",
    label: "Trade parameters",
    blocks: [
      { id: "trade-definition", label: "Trade definition", action: "focus-trade" },
      { id: "trade-options", label: "Trade options", action: "focus-trade" },
      { id: "market", label: "Market", action: "focus-trade" },
      { id: "trade-type", label: "Trade type", action: "focus-trade" },
      { id: "contract-type", label: "Contract type", action: "focus-trade" },
      { id: "duration", label: "Duration", action: "focus-trade" },
      { id: "stake", label: "Stake", action: "focus-trade" },
    ],
  },
  {
    id: "purchase-conditions",
    label: "Purchase conditions",
    blocks: [
      { id: "before-purchase", label: "Before purchase", action: "focus-purchase" },
      { id: "purchase", label: "Purchase", action: "focus-purchase" },
      { id: "purchase-condition", label: "Purchase condition", action: "focus-purchase" },
    ],
  },
  {
    id: "sell-conditions",
    label: "Sell conditions (optional)",
    blocks: [
      { id: "during-purchase", label: "During purchase", action: "focus-sell" },
      { id: "sell-at-market", label: "Sell at market", action: "focus-sell" },
      { id: "check-sell", label: "Sell is available", action: "focus-sell" },
    ],
  },
  {
    id: "restart-conditions",
    label: "Restart trading conditions",
    blocks: [
      { id: "after-purchase", label: "After purchase", action: "focus-restart" },
      { id: "trade-again", label: "Trade again", action: "focus-restart" },
      { id: "stop-after-loss", label: "Stop after loss", action: "focus-restart" },
    ],
  },
  {
    id: "analysis",
    label: "Analysis",
    expandable: true,
    blocks: [
      // ── Indicators ──
      { id: "ind-sma", label: "Simple Moving Average (SMA)", action: "add-tick", hint: "Indicators" },
      { id: "ind-smaa", label: "Simple Moving Average Array (SMAA)", action: "add-tick", hint: "Indicators" },
      { id: "ind-ema", label: "Exponential Moving Average (EMA)", action: "add-tick", hint: "Indicators" },
      { id: "ind-emaa", label: "Exponential Moving Average Array (EMAA)", action: "add-tick", hint: "Indicators" },
      { id: "ind-bb", label: "Bollinger Bands (BB)", action: "add-tick", hint: "Indicators" },
      { id: "ind-bba", label: "Bollinger Bands Array (BBA)", action: "add-tick", hint: "Indicators" },
      { id: "ind-rsi", label: "Relative Strength Index (RSI)", action: "add-tick", hint: "Indicators" },
      { id: "ind-rsia", label: "Relative Strength Index Array (RSIA)", action: "add-tick", hint: "Indicators" },
      { id: "ind-macda", label: "Moving Average Convergence Divergence", action: "add-tick", hint: "Indicators" },
      // ── Tick and candle analysis ──
      { id: "tick-last-tick", label: "Last tick", action: "add-tick", hint: "Tick and candle analysis" },
      { id: "tick-last-digit", label: "Last Digit", action: "add-tick", hint: "Tick and candle analysis" },
      { id: "tick-ticks-list", label: "Tick list", action: "add-tick", hint: "Tick and candle analysis" },
      { id: "tick-direction", label: "Market direction", action: "add-tick", hint: "Tick and candle analysis" },
      { id: "tick-ohlc", label: "Read candle value (1)", action: "add-tick", hint: "Tick and candle analysis" },
      { id: "tick-ohlc-values", label: "Create a list of candle values (1)", action: "add-tick", hint: "Tick and candle analysis" },
      { id: "tick-candles-list", label: "Get candle list", action: "add-tick", hint: "Tick and candle analysis" },
      { id: "tick-is-candle-black", label: "Is candle black?", action: "add-tick", hint: "Tick and candle analysis" },
      { id: "tick-check-direction", label: "Check direction", action: "add-tick", hint: "Tick and candle analysis" },
      { id: "tick-last-digit-list", label: "Last Digits List", action: "add-tick", hint: "Tick and candle analysis" },
      { id: "tick-stat", label: "Current Stat", action: "add-tick", hint: "Tick and candle analysis" },
      { id: "tick-stat-list", label: "Current stat list", action: "add-tick", hint: "Tick and candle analysis" },
      { id: "candle-read-ohlc-obj", label: "Read candle value (2)", action: "add-tick", hint: "Tick and candle analysis" },
      { id: "candle-ohlc-values-in-list", label: "Create a list of candle values (2)", action: "add-tick", hint: "Tick and candle analysis" },
      // ── Contract ──
      { id: "contract-last-result", label: "Last trade result", action: "add-logic", hint: "Contract" },
      { id: "contract-profit", label: "Profit", action: "add-math", hint: "Contract" },
      { id: "contract-payout", label: "Potential payout", action: "add-math", hint: "Contract" },
      { id: "contract-entry-spot", label: "Entry spot", action: "add-math", hint: "Contract" },
      { id: "contract-exit-spot", label: "Exit spot", action: "add-math", hint: "Contract" },
      { id: "contract-entry-tick-time", label: "Entry tick time", action: "add-math", hint: "Contract" },
      { id: "contract-exit-tick-time", label: "Exit tick time", action: "add-math", hint: "Contract" },
      { id: "contract-ask-price", label: "Purchase price", action: "add-math", hint: "Contract" },
      { id: "contract-sell-price", label: "Profit/loss from selling", action: "add-math", hint: "Contract" },
      { id: "contract-check-sell", label: "Can contract be sold?", action: "add-logic", hint: "Contract" },
      { id: "contract-read-details", label: "Contract details", action: "add-math", hint: "Contract" },
      { id: "contract-check-result", label: "Check result", action: "add-logic", hint: "Contract" },
      // ── Tick Trade Results ──
      { id: "ttr-last-tick-result", label: "Last tick trade result", action: "add-logic", hint: "Tick Trade Results" },
      { id: "ttr-tick-profit", label: "Tick trade profit", action: "add-math", hint: "Tick Trade Results" },
      { id: "ttr-tick-count", label: "Tick trade count", action: "add-math", hint: "Tick Trade Results" },
      { id: "ttr-tick-win-count", label: "Tick trade win count", action: "add-math", hint: "Tick Trade Results" },
      { id: "ttr-tick-loss-count", label: "Tick trade loss count", action: "add-math", hint: "Tick Trade Results" },
      // ── Hedge Results ──
      { id: "hedge-last-result", label: "Last hedge result", action: "add-logic", hint: "Hedge Results" },
      { id: "hedge-profit", label: "Hedge profit", action: "add-math", hint: "Hedge Results" },
      { id: "hedge-count", label: "Hedge trade count", action: "add-math", hint: "Hedge Results" },
      { id: "hedge-win-count", label: "Hedge win count", action: "add-math", hint: "Hedge Results" },
      { id: "hedge-loss-count", label: "Hedge loss count", action: "add-math", hint: "Hedge Results" },
      // ── Stats ──
      { id: "stats-total-profit", label: "Total profit/loss", action: "add-math", hint: "Stats" },
      { id: "stats-total-runs", label: "Number of runs", action: "add-math", hint: "Stats" },
      { id: "stats-balance", label: "Account balance", action: "add-math", hint: "Stats" },
    ],
  },
  {
    id: "utility",
    label: "Utility",
    expandable: true,
    blocks: [
      // ── Custom functions ──
      { id: "func-define", label: "Define function", action: "noop", hint: "Custom functions" },
      { id: "func-define-return", label: "Define function (with return)", action: "noop", hint: "Custom functions" },
      { id: "func-if-return", label: "If / return", action: "noop", hint: "Custom functions" },
      { id: "func-call", label: "Call function", action: "noop", hint: "Custom functions" },
      // ── Variables ──
      { id: "var-set", label: "Set variable", action: "add-variable", hint: "Variables" },
      { id: "var-get", label: "Get variable", action: "add-variable", hint: "Variables" },
      { id: "var-change", label: "Change variable by", action: "add-variable", hint: "Variables" },
      { id: "varopt-create", label: "Create variable", action: "add-variable", hint: "Variables" },
      { id: "varopt-rename", label: "Rename variable", action: "add-variable", hint: "Variables" },
      { id: "varopt-delete", label: "Delete variable", action: "add-variable", hint: "Variables" },
      // ── Notifications ──
      { id: "notify-log", label: "Notify", action: "add-notify", hint: "Notifications" },
      { id: "notify-telegram", label: "Notify (Telegram)", action: "add-notify", hint: "Notifications" },
      { id: "notify-sound", label: "Sound only", action: "add-notify", hint: "Notifications" },
      // ── Time ──
      { id: "time-epoch", label: "Epoch", action: "noop", hint: "Time" },
      { id: "time-to-datetime", label: "To date/time string", action: "noop", hint: "Time" },
      { id: "time-timeout", label: "Timeout (wait)", action: "add-loop", hint: "Time" },
      { id: "time-totimestamp", label: "To timestamp", action: "noop", hint: "Time" },
      { id: "time-tickdelay", label: "Tick delay", action: "add-loop", hint: "Time" },
      // ── Math ──
      { id: "math-number", label: "Number", action: "add-math", hint: "Math" },
      { id: "math-arithmetic", label: "Arithmetical operations", action: "add-math", hint: "Math" },
      { id: "math-single", label: "Operations on a given number", action: "add-math", hint: "Math" },
      { id: "math-trig", label: "Trigonometry", action: "add-math", hint: "Math" },
      { id: "math-constant", label: "Constants (π, e, …)", action: "add-math", hint: "Math" },
      { id: "math-number-prop", label: "Number property", action: "add-math", hint: "Math" },
      { id: "math-change", label: "Change by", action: "add-math", hint: "Math" },
      { id: "math-round", label: "Round", action: "add-math", hint: "Math" },
      { id: "math-on-list", label: "Sum / min / max / average of list", action: "add-math", hint: "Math" },
      { id: "math-remainder", label: "Remainder of", action: "add-math", hint: "Math" },
      { id: "math-constrain", label: "Constrain within a range", action: "add-math", hint: "Math" },
      { id: "math-number-positive", label: "Math Number Positive", action: "add-math", hint: "Math" },
      { id: "math-modulo", label: "Remainder after division", action: "add-math", hint: "Math" },
      { id: "math-random-int", label: "Random integer", action: "add-math", hint: "Math" },
      { id: "math-random-float", label: "Random fraction", action: "add-math", hint: "Math" },
      // ── Text ──
      { id: "text-string", label: "Text", action: "noop", hint: "Text" },
      { id: "text-join", label: "Create text with", action: "noop", hint: "Text" },
      { id: "text-append", label: "Append text", action: "noop", hint: "Text" },
      { id: "text-length", label: "Length of", action: "noop", hint: "Text" },
      { id: "text-is-empty", label: "Is empty", action: "noop", hint: "Text" },
      { id: "text-index-of", label: "Find in text", action: "noop", hint: "Text" },
      { id: "text-char-at", label: "Get letter", action: "noop", hint: "Text" },
      { id: "text-substring", label: "Get substring", action: "noop", hint: "Text" },
      { id: "text-change-case", label: "To UPPER/lower case", action: "noop", hint: "Text" },
      { id: "text-trim", label: "Trim spaces", action: "noop", hint: "Text" },
      { id: "text-print", label: "Print", action: "add-notify", hint: "Text" },
      { id: "text-prompt", label: "Request an input", action: "noop", hint: "Text" },
      { id: "text-statement", label: "Text Statement", action: "noop", hint: "Text" },
      // ── Logic ──
      { id: "logic-if", label: "If / do", action: "add-logic", hint: "Logic" },
      { id: "logic-compare", label: "Compare", action: "add-logic", hint: "Logic" },
      { id: "logic-operation", label: "And / Or", action: "add-logic", hint: "Logic" },
      { id: "logic-negate", label: "Not", action: "add-logic", hint: "Logic" },
      { id: "logic-boolean", label: "True / False", action: "add-logic", hint: "Logic" },
      { id: "logic-null", label: "Null", action: "add-logic", hint: "Logic" },
      { id: "logic-ternary", label: "Test", action: "add-logic", hint: "Logic" },
      // ── Lists ──
      { id: "lists-create-empty", label: "Create empty list", action: "noop", hint: "Lists" },
      { id: "lists-create-with", label: "Create list with", action: "noop", hint: "Lists" },
      { id: "lists-repeat", label: "Create list with item repeated", action: "noop", hint: "Lists" },
      { id: "lists-length", label: "Length of list", action: "noop", hint: "Lists" },
      { id: "lists-is-empty", label: "Is empty", action: "noop", hint: "Lists" },
      { id: "lists-index-of", label: "Find in list", action: "noop", hint: "Lists" },
      { id: "lists-get-index", label: "In list get", action: "noop", hint: "Lists" },
      { id: "lists-set-index", label: "In list set", action: "noop", hint: "Lists" },
      { id: "lists-get-sublist", label: "In list get sub-list", action: "noop", hint: "Lists" },
      { id: "lists-sort", label: "Sort", action: "noop", hint: "Lists" },
      { id: "lists-split", label: "Create list from text", action: "noop", hint: "Lists" },
      { id: "lists-statement", label: "List Statement", action: "noop", hint: "Lists" },
      // ── Loops ──
      { id: "loop-repeat", label: "Repeat", action: "add-loop", hint: "Loops" },
      { id: "loop-while", label: "Repeat while / until", action: "add-loop", hint: "Loops" },
      { id: "loop-count", label: "Count with", action: "add-loop", hint: "Loops" },
      { id: "loop-foreach", label: "For each item in list", action: "add-loop", hint: "Loops" },
      { id: "loop-break", label: "Break out/continue", action: "add-loop", hint: "Loops" },
      { id: "loop-repeat-ext", label: "Repeat (2)", action: "add-loop", hint: "Loops" },
      // ── Miscellaneous ──
      { id: "misc-console-log", label: "Console / log", action: "add-notify", hint: "Miscellaneous" },
      { id: "misc-loader", label: "Block loader", action: "noop", hint: "Miscellaneous" },
      { id: "misc-barrier-offset", label: "Offset +", action: "add-math", hint: "Miscellaneous" },
      { id: "misc-block-holder", label: "Ignore", action: "noop", hint: "Miscellaneous" },
    ],
  },
  {
    id: "custom-tools",
    label: "tradecity.trade Tools",
    expandable: true,
    blocks: [
      { id: "virtual-hook-switcher", label: "Virtual Hook Switcher", action: "noop" },
      { id: "custom-notification", label: "Custom Notification", action: "add-notify" },
      { id: "contract-modifiers", label: "Contract modifiers", action: "noop" },
      { id: "barrier-settings", label: "Barrier Settings", action: "noop" },
    ],
  },
];

/** @deprecated — use BOT_BUILDER_TOOLBOX */
export const BOT_BUILDER_BLOCK_CATEGORIES = BOT_BUILDER_TOOLBOX.map((cat) => ({
  id: cat.id,
  label: cat.label,
  accent: cat.accent,
  expandable: true as const,
}));

export const BOT_BUILDER_SUMMARY_STATS = [
  { label: "Total stake", value: "0.00 USD" },
  { label: "Total payout", value: "0.00 USD" },
  { label: "No. of runs", value: "0" },
  { label: "Contracts lost", value: "0" },
  { label: "Contracts won", value: "0" },
  { label: "Total profit/loss", value: "0.00 USD" },
] as const;

export const BOT_BUILDER_TOOLBAR = [
  { id: "reset", label: "Reset" },
  { id: "import", label: "Import" },
  { id: "save", label: "Save" },
  { id: "sort", label: "Sort" },
  { id: "charts", label: "Charts" },
  { id: "tradingview", label: "TradingView" },
  { id: "undo", label: "Undo" },
  { id: "redo", label: "Redo" },
  { id: "zoom-in", label: "Zoom in" },
  { id: "zoom-out", label: "Zoom out" },
] as const;
