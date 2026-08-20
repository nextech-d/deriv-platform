export type CourseTabId = "intro" | "guide" | "videos" | "faq" | "strategies";

export type QuickStrategyId =
  | "martingale"
  | "dalembert"
  | "oscars-grind"
  | "reverse-martingale"
  | "reverse-dalembert"
  | "one-three-two-six";

export type CourseBlockType = "subtitle" | "text" | "media";

export interface CourseContentBlock {
  type: CourseBlockType;
  content?: string[];
  src?: string;
  dark_src?: string;
  alt?: string;
  className?: string;
  expanded?: boolean;
}

export interface CourseStrategyChapter {
  title: string;
  blocks: CourseContentBlock[];
}

export interface CourseGuide {
  id: string;
  title: string;
  tourSubtype: "OnBoard" | "BotBuilder";
  image: string;
  searchId: string;
}

export interface CourseVideo {
  id: string;
  title: string;
  embedUrl: string;
  searchId: string;
}

export interface CourseFaq {
  id: string;
  question: string;
  answerHtml: string[];
}

export interface CourseStrategyGuide {
  id: QuickStrategyId;
  /** e.g. "About Martingale" */
  aboutLabel: string;
  title: string;
  chapterTitles: [string, string];
  searchId: string;
  params: Array<{
    key: string;
    label: string;
    defaultValue: number;
    min?: number;
    max?: number;
    step?: number;
  }>;
}

export const COURSE_TABS: Array<{ id: CourseTabId; label: string }> = [
  { id: "intro", label: "Introduction to Deriv" },
  { id: "guide", label: "Guide" },
  { id: "videos", label: "Videos on Deriv bot" },
  { id: "faq", label: "FAQ" },
  { id: "strategies", label: "Quick strategy guides" },
];

export interface IntroChapter {
  id: string;
  title: string;
  sections: Array<{ heading: string; body: string[] }>;
}

/**
 * Comprehensive course outline sourced from Deriv's official
 * Academy, Help Centre, and product documentation.
 * @see https://traders-academy.deriv.com
 * @see https://deriv.com/help-centre
 */
export const INTRO_CHAPTERS: IntroChapter[] = [
  {
    id: "what-is-deriv",
    title: "Chapter 1 — What is Deriv?",
    sections: [
      {
        heading: "Company overview",
        body: [
          "Deriv (formerly Binary.com) is a globally regulated online trading broker that has served over 2.5 million traders since 1999. It is licensed by the Malta Financial Services Authority (MFSA), the Labuan Financial Services Authority (LFSA), the Vanuatu Financial Services Commission (VFSC), and the British Virgin Islands Financial Services Commission (FSC).",
          "Deriv offers a wide range of financial instruments including forex, synthetic indices (Volatility Indices, Boom/Crash, Step Index, Range Break), commodities, stock indices, and cryptocurrencies.",
        ],
      },
      {
        heading: "Available platforms",
        body: [
          "Deriv Trader — a simple, intuitive web-based platform for trading options and multipliers.",
          "Deriv MT5 (DMT5) — the industry-standard MetaTrader 5 platform for CFDs on forex, stocks, and synthetics.",
          "Deriv X — a customisable multi-asset CFD trading platform.",
          "Deriv GO — a mobile app for trading multipliers on the go.",
          "Deriv Bot (DBot) — a visual drag-and-drop bot builder for automated strategies.",
          "SmartTrader — the classic Binary.com options trading interface.",
        ],
      },
      {
        heading: "Why Deriv synthetics?",
        body: [
          "Synthetic indices are unique to Deriv and simulate real-world market movements using a cryptographically secure random number generator. They are available 24/7, unaffected by global events, and offer consistent volatility — making them ideal for traders who want round-the-clock market access.",
        ],
      },
    ],
  },
  {
    id: "account-types",
    title: "Chapter 2 — Account types & setup",
    sections: [
      {
        heading: "Demo vs Real accounts",
        body: [
          "Deriv offers free demo accounts preloaded with 10,000 USD of virtual funds, allowing you to practise trading risk-free. Real accounts can be opened with as little as 5 USD.",
          "You can hold multiple real accounts under a single Deriv login — useful for separating strategies or currencies.",
        ],
      },
      {
        heading: "How to create an account",
        body: [
          "1. Visit deriv.com and click 'Create free demo account'.",
          "2. Enter your email address and create a password.",
          "3. Verify your email and complete your profile.",
          "4. To upgrade to a real account, go to Settings → Account and submit identity verification (KYC).",
        ],
      },
      {
        heading: "Funding & withdrawals",
        body: [
          "Deriv supports deposits via bank wire, credit/debit cards, e-wallets (Skrill, Neteller, AirTM), cryptocurrencies (BTC, ETH, USDT), and local payment agents throughout East Africa, South-East Asia, and Latin America.",
          "Payment agents in Kenya, Uganda, Tanzania, and Rwanda can process M-Pesa and mobile money deposits within minutes.",
        ],
      },
    ],
  },
  {
    id: "trade-types",
    title: "Chapter 3 — Understanding trade types",
    sections: [
      {
        heading: "Digital options",
        body: [
          "Digital options let you predict whether a market will go up or down within a set time frame. You know your maximum potential profit and loss before you place a trade.",
          "Rise/Fall — predict whether the last tick will be higher or lower than the entry spot.",
          "Higher/Lower — predict whether the exit spot will be higher or lower than a price target (barrier).",
          "Touch/No Touch — predict whether the market will touch a specific target before the contract expires.",
          "In/Out (Stays Between/Goes Outside) — predict whether the market will stay within or exit a price range.",
          "Digits (Matches/Differs/Over/Under/Even/Odd) — predict properties of the last digit of the last tick.",
        ],
      },
      {
        heading: "Multipliers",
        body: [
          "Multipliers combine the upside of leverage with the limited risk of options. Your potential profit is multiplied, but your loss never exceeds your stake. Available on forex pairs and synthetic indices.",
        ],
      },
      {
        heading: "CFDs",
        body: [
          "Contracts for Difference allow you to trade on the price movement of assets without owning them. Available on Deriv MT5 and Deriv X with leverage up to 1:1000 on synthetic indices.",
        ],
      },
    ],
  },
  {
    id: "synthetic-indices",
    title: "Chapter 4 — Synthetic indices deep dive",
    sections: [
      {
        heading: "Volatility Indices",
        body: [
          "Volatility 10, 25, 50, 75, and 100 simulate markets with fixed volatility levels (10% through 100%). Higher numbers mean larger price swings. Volatility 10 (1s) and Volatility 100 (1s) update every second for fast-paced trading.",
        ],
      },
      {
        heading: "Boom & Crash",
        body: [
          "Boom 300/500/1000 — markets with frequent small downward movements and occasional sharp upward spikes (booms).",
          "Crash 300/500/1000 — markets with frequent small upward movements and occasional sharp downward crashes.",
          "The number indicates the average frequency: a Boom 1000 index booms approximately once every 1000 ticks.",
        ],
      },
      {
        heading: "Step Index & Range Break",
        body: [
          "Step Index moves up or down by 0.1 with equal probability on each tick — a pure 50/50 random walk.",
          "Range Break 100/200 breaks out of a trading range approximately once every 100 or 200 boundary hits.",
        ],
      },
      {
        heading: "Jump Indices",
        body: [
          "Jump 10/25/50/75/100 behave like Volatility Indices but include jumps (sudden large moves) that average every 20 minutes. They offer opportunities for breakout and spike-catching strategies.",
        ],
      },
    ],
  },
  {
    id: "risk-management",
    title: "Chapter 5 — Risk management essentials",
    sections: [
      {
        heading: "Position sizing",
        body: [
          "Never risk more than 1–2% of your total account balance on a single trade. This ensures that a losing streak does not deplete your capital.",
          "Example: with a 100 USD balance, your maximum stake per trade should be 1–2 USD.",
        ],
      },
      {
        heading: "Stop-loss & take-profit",
        body: [
          "Always define your exit points before entering a trade. On options, your maximum loss is your stake. On multipliers and CFDs, use stop-loss and take-profit orders to automatically close positions.",
          "A common risk-to-reward ratio target is 1:2 — risk 1 USD to make 2 USD.",
        ],
      },
      {
        heading: "Session limits",
        body: [
          "Set daily loss limits and profit targets. When you hit either limit, stop trading for the day. This prevents emotional decision-making and overtrading.",
          "Deriv's self-exclusion and trading limits features (under Settings → Self-exclusion) let you enforce these caps at the platform level.",
        ],
      },
      {
        heading: "Diversification",
        body: [
          "Don't put all your capital on one market or one trade type. Spread your risk across different synthetic indices and strategies.",
        ],
      },
    ],
  },
  {
    id: "strategies",
    title: "Chapter 6 — Popular trading strategies",
    sections: [
      {
        heading: "Martingale",
        body: [
          "Double your stake after each loss. After a win, reset to the initial stake. The idea is that one win recovers all previous losses. Warning: requires exponentially increasing capital and can lead to catastrophic losses.",
        ],
      },
      {
        heading: "D'Alembert",
        body: [
          "Increase your stake by one unit after a loss, decrease by one unit after a win. Less aggressive than Martingale but still carries compounding risk.",
        ],
      },
      {
        heading: "Oscar's Grind",
        body: [
          "Aim for exactly one unit of profit per cycle. Increase your stake by one unit only after a winning trade within the cycle. A conservative, slow-growth approach.",
        ],
      },
      {
        heading: "Trend following",
        body: [
          "Identify the prevailing trend using moving averages or trendlines, then trade in the direction of the trend. Works well on Volatility indices. Use the 5-period and 20-period moving average crossover as an entry signal.",
        ],
      },
      {
        heading: "Digit analysis",
        body: [
          "Analyse the distribution of the last digit (0–9) of tick prices. Statistical anomalies in short windows can create short-lived edges on Digit Over/Under and Even/Odd trade types.",
        ],
      },
    ],
  },
  {
    id: "dbot-automation",
    title: "Chapter 7 — Automated trading with DBot",
    sections: [
      {
        heading: "What is DBot?",
        body: [
          "DBot is Deriv's free, browser-based bot builder. It uses a visual block-based interface (powered by Google Blockly) — no coding required. You drag and drop logic blocks to build your strategy.",
        ],
      },
      {
        heading: "Key block categories",
        body: [
          "Trade parameters — set market, trade type, duration, and stake.",
          "Purchase conditions — define when to buy Rise, Fall, or other contract types.",
          "Restart trading conditions — specify when the bot should buy the next contract.",
          "Analysis — access tick data, candle data, and indicators to inform decisions.",
          "Utility — variables, loops, and logic for complex conditional strategies.",
        ],
      },
      {
        heading: "Testing your bot",
        body: [
          "Always test on a demo account first. Run at least 50–100 trades to evaluate performance. Check the transaction log and journal for errors.",
          "Use XML export to save and share your bots. Import XML files to load strategies shared by the community.",
        ],
      },
    ],
  },
  {
    id: "trading-psychology",
    title: "Chapter 8 — Trading psychology",
    sections: [
      {
        heading: "Emotional discipline",
        body: [
          "The biggest enemy of a trader is emotion. Fear causes you to exit winning trades too early. Greed causes you to hold losing trades too long. Revenge trading — increasing stakes after losses to 'win back' money — is the fastest path to account blowup.",
        ],
      },
      {
        heading: "Building a trading plan",
        body: [
          "A written trading plan should cover: which markets you trade, what trade types you use, your entry and exit rules, your stake sizing rule, your daily loss limit, and your daily profit target.",
          "Treat your plan as law. If conditions aren't met, don't trade.",
        ],
      },
      {
        heading: "Journaling",
        body: [
          "Keep a trading journal. Record every trade: the reasoning, the outcome, and what you felt. Review weekly to identify patterns — both profitable and destructive.",
        ],
      },
      {
        heading: "Taking breaks",
        body: [
          "Step away after hitting your daily limit. Step away after three consecutive losses. A clear mind makes better decisions than a fatigued one.",
        ],
      },
    ],
  },
  {
    id: "advanced-tools",
    title: "Chapter 9 — Advanced tools & features",
    sections: [
      {
        heading: "Deriv API",
        body: [
          "The Deriv API is a free WebSocket-based API that allows developers to build custom trading applications. It supports account management, real-time price streaming, contract execution, and portfolio management.",
          "Documentation: api.deriv.com",
        ],
      },
      {
        heading: "Copy trading on Deriv",
        body: [
          "Deriv's copy trading feature (available on DTrader) lets you automatically copy the trades of experienced traders. You choose who to follow, set a maximum stake, and the platform mirrors their positions proportionally.",
        ],
      },
      {
        heading: "Trading signals & indicators",
        body: [
          "Use indicators like RSI, MACD, Bollinger Bands, and moving averages to time entries. DBot's Analysis blocks give you access to candle data and technical indicators directly within your bot logic.",
        ],
      },
    ],
  },
  {
    id: "responsible-trading",
    title: "Chapter 10 — Responsible trading",
    sections: [
      {
        heading: "Know the risks",
        body: [
          "Trading financial products involves significant risk. You can lose your entire invested capital. Past performance does not guarantee future results. Synthetic indices carry the same level of market risk as any other leveraged product.",
        ],
      },
      {
        heading: "Self-exclusion & limits",
        body: [
          "Deriv provides self-exclusion tools under Settings → Self-exclusion. You can set maximum daily turnover, maximum daily losses, session duration limits, and even exclude yourself from trading for a chosen period.",
        ],
      },
      {
        heading: "Where to get help",
        body: [
          "Deriv Help Centre: deriv.com/help-centre",
          "Deriv Academy: traders-academy.deriv.com",
          "Live chat support available 24/7 on deriv.com.",
          "Community forums and the official Deriv blog provide ongoing education.",
        ],
      },
    ],
  },
];

/** Binarytool user-guide tours. */
export const COURSE_GUIDES: CourseGuide[] = [
  {
    id: "onboard",
    title: "Get started on D-Bot",
    tourSubtype: "OnBoard",
    image: "dbot-onboard-tour.png",
    searchId: "user guide-0",
  },
  {
    id: "build",
    title: "Let’s build a bot!",
    tourSubtype: "BotBuilder",
    image: "bot-builder-tour.png",
    searchId: "user guide-1",
  },
];

export const COURSE_VIDEOS: CourseVideo[] = [
  {
    id: "intro",
    title: "An introduction to D-Bot",
    embedUrl: "https://www.youtube.com/embed/lthEgaIY1uw",
    searchId: "videos on deriv bot-0",
  },
  {
    id: "basic",
    title: "How to build a basic trading bot with D-Bot",
    embedUrl: "https://www.youtube.com/embed/mnpi2g7YakU",
    searchId: "videos on deriv bot-1",
  },
  {
    id: "martingale",
    title: "How to use Martingale strategy on D-Bot",
    embedUrl: "https://www.youtube.com/embed/FSslvF7P00I",
    searchId: "videos on deriv bot-2",
  },
  {
    id: "accumulators",
    title:
      "Introducing Accumulator Options on D-Bot: Available for automated trading",
    embedUrl: "https://www.youtube.com/embed/uMBBmdNaadU",
    searchId: "videos on deriv bot-3",
  },
];

export const COURSE_FAQS: CourseFaq[] = [
  {
    id: "faq-0",
    question: "What is D-Bot?",
    answerHtml: [
      "Binarytool is a web-based strategy builder for trading digital options. It’s a platform where you can build your own automated trading bot using drag-and-drop 'blocks'.",
    ],
  },
  {
    id: "faq-1",
    question: "Where do I find the blocks I need?",
    answerHtml: [
      "Follow these steps:",
      "1. Go to <strong>Bot Builder</strong>.",
      "2. Under the <strong>Blocks menu</strong>, you'll see a list of categories. Blocks are grouped within these categories. Choose the block you want and drag them to the workspace.",
      "3. You can also search for the blocks you want using the search bar above the categories.",
      "For more info, <a href=\"https://deriv.com/academy/blog/posts/how-to-build-a-basic-trading-bot-with-dbot/\" target=\"_blank\">check out this blog post</a> on the basics of building a trading bot.",
    ],
  },
  {
    id: "faq-2",
    question: "How do I remove blocks from the workspace?",
    answerHtml: [
      "Click on the block you want to remove and press <strong>Delete</strong> on your keyboard.",
    ],
  },
  {
    id: "faq-3",
    question: "How do I create variables?",
    answerHtml: [
      "1. Under the <strong>Blocks</strong> menu, go to <strong>Utility > Variables</strong>.",
      "2. Enter a name for your variable, and hit <strong>Create</strong>. New blocks containing your new variable will appear below.",
      "3. Choose the block you want and drag it to the workspace.",
    ],
  },
  {
    id: "faq-4",
    question: "Do you offer pre-built trading bots on D-Bot?",
    answerHtml: [
      "Yes, you can get started with a pre-built bot using the <strong>Quick strategy</strong> feature. You’ll find some of the most popular trading strategies here: Martingale, D'Alembert, and Oscar's Grind. Just select the strategy, enter your trade parameters, and your bot will be created for you. You can always tweak the parameters later.",
    ],
  },
  {
    id: "faq-5",
    question: "What is a quick strategy?",
    answerHtml: [
      "A quick strategy is a ready-made strategy that you can use in D-Bot. There are 3 quick strategies you can choose from: Martingale, D'Alembert, and Oscar's Grind.",
      "<strong>Using a quick strategy</strong>",
      "1. Go to <strong>Quick strategy</strong> and select the strategy you want.",
      "2. Select the asset and trade type.",
      "3. Set your trade parameters and hit <strong>Run</strong>.",
      "4. Once the blocks are loaded onto the workspace, tweak the parameters if you want, or hit <strong>Run</strong> to start trading.",
      "5. Hit <strong>Save</strong> to download your bot. You can choose to download your bot to your device or your Google Drive.",
    ],
  },
  {
    id: "faq-6",
    question: "How do I save my strategy?",
    answerHtml: [
      "In <strong>Bot Builder</strong>, hit <strong>Save</strong> on the toolbar at the top to download your bot. Give your bot a name, and choose to download your bot to your device or Google Drive. Your bot will be downloaded as an XML file.",
    ],
  },
  {
    id: "faq-7",
    question: "How do I import my own trading bot into D-Bot?",
    answerHtml: [
      "Just drag the XML file from your computer onto the workspace, and your bot will be loaded accordingly. Alternatively, you can hit <strong>Import</strong> in <strong>Bot Builder</strong>, and choose to import your bot from your computer or from your Google Drive.",
      "<strong>Import from your computer</strong>",
      "1. After hitting <strong>Import</strong>, select <strong>Local</strong> and click <strong>Continue</strong>.",
      "2. Select your XML file and hit <strong>Open</strong>.",
      "3. Your bot will be loaded accordingly.",
      "<strong>Import from your Google Drive</strong>",
      "1. After hitting <strong>Import</strong>, select <strong>Google Drive</strong> and click <strong>Continue</strong>.",
      "2. Select your XML file and hit <strong>Select</strong>.",
      "3. Your bot will be loaded accordingly.",
    ],
  },
  {
    id: "faq-8",
    question: "How do I reset the workspace?",
    answerHtml: [
      "In <strong>Bot Builder</strong>, hit <strong>Reset</strong> on the toolbar at the top. This will clear the workspace. Please note that any unsaved changes will be lost.",
    ],
  },
  {
    id: "faq-9",
    question: "How do I clear my transaction log?",
    answerHtml: [
      "1. Hit <strong>Reset</strong> at the bottom of stats panel.",
      "2. Hit <strong>Ok</strong> to confirm.",
    ],
  },
  {
    id: "faq-10",
    question: "How do I control my losses with D-Bot?",
    answerHtml: [
      "There are several ways to control your losses with D-Bot. Here’s a simple example of how you can implement loss control in your strategy:",
      "<strong>1.</strong> Create the following variables and place them under <strong>Run once at start</strong>:",
      "• <strong>Stop loss threshold</strong>: Use this variable to store your loss limit. You can assign any amount you want. Your bot will stop when your losses hits or exceeds this amount.",
      "Example:",
      "• <strong>Current stake</strong>: Use this variable to store the stake amount. You can assign any amount you want, but it must be a positive number.",
      "Example:",
      "This is how your trade parameters, variables, and trade options should look like:",
      "<strong>2.</strong> Set the <strong>Purchase conditions</strong>. In this example, your bot will purchase a <strong>Rise</strong> contract when it starts and after a contract closes.",
      "<strong>3.</strong> Use a logic block to check if <strong>Total profit/loss</strong> is more than the <strong>Stop loss threshold</strong> amount. You can find the <strong>Total profit/loss</strong> variable under <strong>Analysis > Stats</strong> on the <strong>Blocks menu</strong> on the left. Your bot will continue to purchase new contracts until the <strong>Total profit/loss</strong> amount exceeds the <strong>Stop loss threshold</strong> amount.",
    ],
  },
  {
    id: "faq-11",
    question: "Can I run D-Bot on multiple tabs in my web browser?",
    answerHtml: [
      "Yes, you can. However, there are limits on your account, such as maximum number of open positions and maximum aggregate payouts on open positions. So, just keep these limits in mind when opening multiple positions. You can find more info about these limits at <a href=\"https://app.deriv.com/account/account-limits\" target=\"_blank\">Settings > Account limits</a>.",
    ],
  },
  {
    id: "faq-12",
    question: "Can I trade cryptocurrencies on D-Bot?",
    answerHtml: ["No, we don't offer cryptocurrencies on D-Bot."],
  },
  {
    id: "faq-13",
    question: "Do you sell trading bots?",
    answerHtml: [
      "No, we don't. However, you'll find quick strategies on D-Bot that'll help you build your own trading bot for free.",
    ],
  },
  {
    id: "faq-14",
    question: "In which countries is D-Bot available?",
    answerHtml: [
      "We offer our services in all countries, except for the ones <a href=\"https://deriv.com/tnc/general-terms.pdf\" target=\"_blank\">mentioned in our terms and conditions.</a>",
    ],
  },
  {
    id: "faq-15",
    question: "If I close my web browser, will D-Bot continue to run?",
    answerHtml: [
      "No, D-Bot will stop running when your web browser is closed.",
    ],
  },
  {
    id: "faq-16",
    question: "What are the most popular strategies for automated trading?",
    answerHtml: [
      "Three of the most commonly used strategies in automated trading are Martingale, D'Alembert, and Oscar's Grind — you can find them all ready-made and waiting for you in D-Bot.",
    ],
  },
  {
    id: "faq-17",
    question: "How do I build a trading bot?",
    answerHtml: [
      "<a href=\"https://www.youtube.com/watch?v=QdI5zCkO4Gk&t=203s\" target=\"_blank\">Watch this video</a> to learn how to build a trading bot on D-Bot. Also, <a href=\"https://deriv.com/academy/blog/posts/how-to-build-a-basic-trading-bot-with-dbot/\" target=\"_blank\">check out this blog post</a> on building a trading bot.",
    ],
  },
];

/** Six Binarytool quick-strategy guides with editable params. */
export const COURSE_STRATEGIES: CourseStrategyGuide[] = [
  {
    id: "martingale",
    aboutLabel: "About Martingale",
    title: "Martingale",
    chapterTitles: [
      "Exploring the Martingale strategy in D-Bot",
      "An example of Martingale strategy",
    ],
    searchId: "quick strategy guides-0",
    params: [
      {
        key: "stake",
        label: "Initial stake",
        defaultValue: 0.35,
        min: 0.35,
        step: 0.01,
      },
      {
        key: "multiplier",
        label: "Multiplier",
        defaultValue: 2,
        min: 1.1,
        max: 10,
        step: 0.1,
      },
      {
        key: "maxStake",
        label: "Max stake",
        defaultValue: 20,
        min: 1,
        step: 0.01,
      },
      {
        key: "takeProfit",
        label: "Profit threshold",
        defaultValue: 10,
        min: 0,
      },
      { key: "stopLoss", label: "Loss threshold", defaultValue: 10, min: 0 },
    ],
  },
  {
    id: "dalembert",
    aboutLabel: "About D'Alembert",
    title: "D’Alembert",
    chapterTitles: [
      "Exploring the D’Alembert strategy in D-Bot",
      "An example of D’Alembert strategy",
    ],
    searchId: "quick strategy guides-1",
    params: [
      {
        key: "stake",
        label: "Initial stake",
        defaultValue: 1,
        min: 0.35,
        step: 0.01,
      },
      { key: "unit", label: "Unit", defaultValue: 1, min: 0.35, step: 0.01 },
      { key: "takeProfit", label: "Profit threshold", defaultValue: 10, min: 0 },
      { key: "stopLoss", label: "Loss threshold", defaultValue: 10, min: 0 },
    ],
  },
  {
    id: "oscars-grind",
    aboutLabel: "About Oscar's Grind",
    title: "Oscar’s Grind",
    chapterTitles: [
      "Exploring the Oscar’s Grind strategy in D-Bot",
      "An example of Oscar’s Grind strategy",
    ],
    searchId: "quick strategy guides-2",
    params: [
      {
        key: "stake",
        label: "Initial stake",
        defaultValue: 1,
        min: 0.35,
        step: 0.01,
      },
      { key: "unit", label: "Unit", defaultValue: 1, min: 0.35, step: 0.01 },
      { key: "takeProfit", label: "Profit threshold", defaultValue: 5, min: 0 },
      { key: "stopLoss", label: "Loss threshold", defaultValue: 10, min: 0 },
    ],
  },
  {
    id: "reverse-martingale",
    aboutLabel: "About Reverse Martingale",
    title: "Reverse Martingale",
    chapterTitles: [
      "Exploring the Reverse Martingale strategy in D-Bot",
      "An example of Reverse Martingale strategy",
    ],
    searchId: "quick strategy guides-3",
    params: [
      {
        key: "stake",
        label: "Initial stake",
        defaultValue: 0.35,
        min: 0.35,
        step: 0.01,
      },
      {
        key: "multiplier",
        label: "Multiplier",
        defaultValue: 2,
        min: 1.1,
        max: 10,
        step: 0.1,
      },
      { key: "takeProfit", label: "Profit threshold", defaultValue: 10, min: 0 },
      { key: "stopLoss", label: "Loss threshold", defaultValue: 5, min: 0 },
    ],
  },
  {
    id: "reverse-dalembert",
    aboutLabel: "About Reverse D’Alembert",
    title: "Reverse D’Alembert",
    chapterTitles: [
      "Exploring the Reverse D’Alembert strategy in D-Bot",
      "An example of Reverse D’Alembert strategy",
    ],
    searchId: "quick strategy guides-4",
    params: [
      {
        key: "stake",
        label: "Initial stake",
        defaultValue: 1,
        min: 0.35,
        step: 0.01,
      },
      { key: "unit", label: "Unit", defaultValue: 1, min: 0.35, step: 0.01 },
      { key: "takeProfit", label: "Profit threshold", defaultValue: 10, min: 0 },
      { key: "stopLoss", label: "Loss threshold", defaultValue: 10, min: 0 },
    ],
  },
  {
    id: "one-three-two-six",
    aboutLabel: "About 1-3-2-6",
    title: "1-3-2-6",
    chapterTitles: [
      "Exploring the 1-3-2-6 strategy in D-Bot",
      "An example of 1-3-2-6 strategy",
    ],
    searchId: "quick strategy guides-5",
    params: [
      {
        key: "stake",
        label: "Initial stake (1 unit)",
        defaultValue: 1,
        min: 0.35,
        step: 0.01,
      },
      { key: "takeProfit", label: "Profit threshold", defaultValue: 12, min: 0 },
      { key: "stopLoss", label: "Loss threshold", defaultValue: 6, min: 0 },
    ],
  },
];

export function stripCourseHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
