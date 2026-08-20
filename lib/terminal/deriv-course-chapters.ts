// Auto-extracted from binarytool.site course content.
import type { CourseStrategyChapter, QuickStrategyId } from "./deriv-course";

export const COURSE_IMAGE_BASE = "/assets/images";

export function courseImage(name: string): string {
  return `${COURSE_IMAGE_BASE}/${name}`;
}

const MARTINGALE_CHAPTERS: CourseStrategyChapter[] = [
  {
    "title": "Exploring the Martingale strategy in D-Bot",
    "blocks": [
      {
        "type": "subtitle",
        "content": [
          "Exploring the Martingale strategy in Binarytools"
        ],
        "expanded": true
      },
      {
        "type": "text",
        "content": [
          "The Martingale strategy involves increasing your stake after each loss to recoup prior losses with a single successful trade.",
          "This article explores the Martingale strategy integrated into Binarytools, a versatile trading bot designed to trade assets such as forex, commodities, and derived indices. We will delve into the strategy's core parameters, its application, and provide essential takeaways for traders looking to use the bot effectively."
        ]
      },
      {
        "type": "subtitle",
        "content": [
          "Key parameters"
        ]
      },
      {
        "type": "text",
        "content": [
          "These are the trade parameters used in Binarytools with Martingale strategy."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Initial stake:</strong> The amount that you are willing to place as a stake to enter a trade. This is the starting point for any changes in stake depending on the dynamic of the strategy being used."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Multiplier:</strong> The multiplier used to increase your stake if you're losing a trade. The value must be greater than 1."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Profit threshold:</strong> The bot will stop trading if your total profit exceeds this amount."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Loss threshold:</strong> The bot will stop trading if your total loss exceeds this amount."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Maximum stake:</strong> The maximum amount you are willing to pay to enter a single trade. The stake for your next trade will reset to the initial stake if it exceeds this value. This is an optional risk management parameter."
        ]
      }
    ]
  },
  {
    "title": "An example of Martingale strategy",
    "blocks": [
      {
        "type": "subtitle",
        "content": [
          "An example of Martingale strategy"
        ]
      },
      {
        "type": "media",
        "src": "martingale.svg",
        "alt": "An example of Martingale strategy"
      },
      {
        "type": "text",
        "content": [
          "1. Start with the initial stake. Let\u2019s say 1 USD.",
          "2. Select your Martingale multiplier. In this example, it is 2.",
          "3. If the first trade ends in a loss, Binarytools will automatically double your stake for the next trade to 2 USD. Binarytools will continue to double the stake after every losing trade.",
          "4. If a trade ends in a profit, the stake for the following trade will be reset to the initial stake amount of 1 USD."
        ]
      },
      {
        "type": "text",
        "content": [
          "The idea is that successful trades may recoup previous losses. However, it is crucial to exercise caution as the risk can quickly increase with this strategy. With Binarytools, you can minimise your risk by setting a maximum stake. This is an optional risk management feature. Let\u2019s say a maximum stake of 3 USD. If your stake for the next trade is set to exceed 3 USD, your stake will reset to the initial stake of 1 USD. If you didn't set a maximum stake, it would have increased beyond 3 USD."
        ]
      },
      {
        "type": "subtitle",
        "content": [
          "Profit and loss thresholds"
        ]
      },
      {
        "type": "text",
        "content": [
          "With Binarytools, traders can set the profit and loss thresholds to secure potential profits and limit potential losses. This means that the trading bot will automatically stop when either the profit or loss thresholds are reached. It's a form of risk management that can potentially enhance returns. For example, if a trader sets the profit threshold at 100 USD and the strategy exceeds 100 USD of profit from all trades, then the bot will stop running."
        ]
      },
      {
        "type": "subtitle",
        "content": [
          "Estimating the lifespan of your trades"
        ]
      },
      {
        "type": "text",
        "content": [
          "If you're about to start trading and haven't established a Maximum Stake as part of your risk management strategy, you can determine how long your funds will last by employing the Martingale strategy. Simply use this formula."
        ]
      },
      {
        "type": "media",
        "src": "martingale_formula_1.svg",
        "dark_src": "martingale_formula_dark_1.svg",
        "alt": "Martingale formula 1",
        "className": "formula"
      },
      {
        "type": "text",
        "content": [
          "Where:",
          "R is the number of rounds a trader can sustain given a specific loss threshold.",
          "B is the loss threshold.",
          "s is the initial stake.",
          "m is the Martingale multiplier."
        ],
        "className": "no-margin"
      },
      {
        "type": "text",
        "content": [
          "For instance, if a trader has a loss threshold (B) is 1000 USD, with an initial stake (s) is 1 USD, and the Martingale multiplier (m) is 2, the calculation would be as follows:"
        ],
        "className": "top-margin"
      },
      {
        "type": "media",
        "src": "martingale_formula_2.svg",
        "dark_src": "martingale_formula_dark_2.svg",
        "alt": "Martingale formula 2",
        "className": "formula"
      },
      {
        "type": "text",
        "content": [
          "Number of rounds, R \u2248 9.965",
          "This means that after 10 rounds of consecutive losses, this trader will lose 1023 USD which exceeds the loss threshold of 1000 USD, stopping the bot.",
          "This formula helps you plan your trades by considering the amount of money you have and your comfort level with risk. It involves determining your loss threshold and the initial stake you want to trade with. Then, you use this formula to calculate the number of rounds you can trade. This process provides insight into stake sizing and expectations."
        ]
      },
      {
        "type": "subtitle",
        "content": [
          "Summary"
        ]
      },
      {
        "type": "text",
        "content": [
          "The Martingale strategy in trading may offer substantial gains but also comes with significant risks. With your selected strategy, Binarytools provides automated trading with risk management measures like setting initial stake, stake size, maximum stake, profit threshold and loss threshold. It's crucial for traders to assess their risk tolerance, practice in a demo account, and understand the strategy before trading with real money."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Disclaimer:</strong>"
        ],
        "className": "italic"
      },
      {
        "type": "text",
        "content": [
          "Please be aware that while we may use rounded figures for illustration, a stake of a specific amount does not guarantee an exact amount in successful trades. For example, a 1 USD stake does not necessarily equate to a 1 USD profit in successful trades."
        ],
        "className": "italic"
      },
      {
        "type": "text",
        "content": [
          "Trading inherently involves risks, and actual profits can fluctuate due to various factors, including market volatility and other unforeseen variables. As such, exercise caution and conduct thorough research before engaging in any trading activities."
        ],
        "className": "italic"
      }
    ]
  }
];

const DALEMBERT_CHAPTERS: CourseStrategyChapter[] = [
  {
    "title": "Exploring the D'Alembert strategy in D-Bot",
    "blocks": [
      {
        "type": "subtitle",
        "content": [
          "Exploring the D\u2019Alembert strategy in Binarytools"
        ],
        "expanded": true
      },
      {
        "type": "text",
        "content": [
          "The D'Alembert strategy involves increasing your stake after a losing trade and reducing it after a successful trade by a predetermined number of units."
        ]
      },
      {
        "type": "subtitle",
        "content": [
          "Key parameters"
        ]
      },
      {
        "type": "text",
        "content": [
          "These are the trade parameters used for D\u2019Alembert strategy in Binarytools."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Initial stake:</strong> The amount that you are willing to place as a stake to enter a trade. This is the starting point for any changes in stake depending on the dynamic of the strategy being used."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Unit:</strong> The number of units that are added in the event of a trade resulting in loss or the number of units removed in the event of a trade resulting in profit. For example, if the unit is set at 2, the stake increases or decreases by two times the initial stake of 1 USD, meaning it changes by 2 USD."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Profit threshold:</strong> The bot will stop trading if your total profit exceeds this amount."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Loss threshold:</strong> The bot will stop trading if your total loss exceeds this amount."
        ]
      }
    ]
  },
  {
    "title": "An example of D'Alembert strategy",
    "blocks": [
      {
        "type": "subtitle",
        "content": [
          "An example of D\u2019Alembert strategy"
        ]
      },
      {
        "type": "media",
        "src": "dalembert.svg",
        "alt": "An example of D\u2019Alembert strategy"
      },
      {
        "type": "text",
        "content": [
          "1. Start with the initial stake. In this example, we\u2019ll use 1 USD.",
          "2. Set your preferred unit. In this example, it is 2 units or 2 USD.",
          "3. If the first trade results in profit, the stake for the following trade will not reduce but remain at the initial stake. The strategy minimally trades at the initial stake of 1 USD. See A1.",
          "4. If the second trade results in a loss, the Binarytools will automatically increase your stake for the next trade by 2 USD. Binarytools will continue to add 2 USD to the previous round\u2019s stake after every losing trade. See A2.",
          "5. If the next trades are profitable, the stake for the following trade will be reduced by 2 USD. This can be shown above where the stake of 3 USD is reduced to 1 USD. See A3."
        ]
      },
      {
        "type": "subtitle",
        "content": [
          "Profit and loss thresholds"
        ]
      },
      {
        "type": "text",
        "content": [
          "With Binarytools, traders can set the profit and loss thresholds to secure potential profits and limit potential losses. This means that the trading bot will automatically stop when either the profit or loss thresholds are reached. It's a form of risk management that can potentially enhance returns. For example, if a trader sets the profit threshold at 100 USD and the strategy exceeds 100 USD of profit from all trades, then the bot will stop running."
        ]
      },
      {
        "type": "subtitle",
        "content": [
          "Estimating the lifespan of your trades"
        ]
      },
      {
        "type": "text",
        "content": [
          "The D\u2019Alembert strategy is less risky than Martingale, but you can still determine how long your funds will last with this strategy before trading. Simply use this formula."
        ]
      },
      {
        "type": "media",
        "src": "dalembert_formula_1.svg",
        "dark_src": "dalembert_formula_dark_1.svg",
        "alt": "D\u2019Alembert formula 1",
        "className": "formula"
      },
      {
        "type": "text",
        "content": [
          "Where:",
          "R is the number of rounds a trader can sustain given a specific loss threshold.",
          "B is the loss threshold.",
          "s is the initial stake.",
          "f is the unit increment."
        ],
        "className": "no-margin"
      },
      {
        "type": "text",
        "content": [
          "For instance, if a trader has a loss threshold (B) of 100 USD, with an initial stake (s) of 1 USD and 2 units of increment (f), the calculation would be as follows:"
        ],
        "className": "top-margin"
      },
      {
        "type": "media",
        "src": "dalembert_formula_2.svg",
        "dark_src": "dalembert_formula_dark_2.svg",
        "alt": "D\u2019Alembert formula 2",
        "className": "formula"
      },
      {
        "type": "text",
        "content": [
          "Number of rounds (R) = 10"
        ]
      },
      {
        "type": "text",
        "content": [
          "This means after 10 rounds of consecutive losses, this trader will lose 100 USD. This reaches the loss threshold of 100 USD, stopping the bot."
        ]
      },
      {
        "type": "text",
        "content": [
          "This formula helps you plan your trades by considering the amount of money you have and your comfort level with risk. It involves determining your loss threshold and the initial stake you want to trade with. Then, you use this formula to calculate the number of rounds you can trade. This process provides insight into stake sizing and expectations."
        ]
      },
      {
        "type": "subtitle",
        "content": [
          "Summary"
        ]
      },
      {
        "type": "text",
        "content": [
          "The D'Alembert system offers more balanced trading through controlled stake progression. With prudent risk management like stake limits, it can be effectively automated in Binarytools. However, traders should thoroughly assess their risk appetite, test strategies on a demo account to align with their trading style before trading with real money. This allows optimising the approach and striking a balance between potential gains and losses whilst managing risk."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Disclaimer:</strong>"
        ],
        "className": "italic"
      },
      {
        "type": "text",
        "content": [
          "Please be aware that while we may use rounded figures for illustration, a stake of a specific amount does not guarantee an exact amount in successful trades. For example, a 1 USD stake does not necessarily equate to a 1 USD profit in successful trades."
        ],
        "className": "italic"
      },
      {
        "type": "text",
        "content": [
          "Trading inherently involves risks, and actual profits can fluctuate due to various factors, including market volatility and other unforeseen variables. As such, exercise caution and conduct thorough research before engaging in any trading activities."
        ],
        "className": "italic"
      }
    ]
  }
];

const OSCARS_GRIND_CHAPTERS: CourseStrategyChapter[] = [
  {
    "title": "Exploring the Oscar's Grind strategy in D-Bot",
    "blocks": [
      {
        "type": "subtitle",
        "content": [
          "Exploring the Oscar\u2019s Grind strategy in Binarytools"
        ],
        "expanded": true
      },
      {
        "type": "text",
        "content": [
          "The Oscar\u2019s Grind strategy is designed to potentially gain a modest yet steady profit in each trading session. This strategy splits trades into sessions and has three principles."
        ]
      },
      {
        "type": "subtitle",
        "content": [
          "Key parameters"
        ]
      },
      {
        "type": "text",
        "content": [
          "These are the trade parameters used for Oscar\u2019s Grind strategy in Binarytools."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Initial stake:</strong> The amount that you are willing to place as a stake to enter a trade. This is the starting point for any changes in stake depending on the dynamic of the strategy being used."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Profit threshold:</strong> The bot will stop trading if your total profit exceeds this amount."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Loss threshold:</strong> The bot will stop trading if your total loss exceeds this amount."
        ]
      }
    ]
  },
  {
    "title": "An example of Oscar's Grind strategy",
    "blocks": [
      {
        "type": "subtitle",
        "content": [
          "An example of Oscar\u2019s Grind strategy"
        ]
      },
      {
        "type": "media",
        "src": "oscars_grind.png",
        "alt": "An example of Oscar\u2019s Grind strategy"
      },
      {
        "type": "text",
        "content": [
          "<strong>Principle 1: Strategy aims to potentially make one unit of profit per session</strong>"
        ]
      },
      {
        "type": "text",
        "content": [
          "The table above demonstrates this principle by showing that when a successful trade occurs and meets the target of one unit of potential profit which is 1 USD in this example, the session ends. If trading continues, a new session will begin."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Principle 2: The stake only increases when a loss trade is followed by a successful trade</strong>"
        ]
      },
      {
        "type": "text",
        "content": [
          "The table illustrates this principle in the second session. After a trade resulting in loss in round 4 followed by a successful trade in round 5, the stake will increase to 2 USD for round 6. This is in line with the strategy's rule of raising the stake only after a loss is followed by a successful trade."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Principle 3: The stake adjusts to the gap size between current loss and the target profit for the session</strong>"
        ]
      },
      {
        "type": "text",
        "content": [
          "In round 7, the stake is adjusted downwards from 2 USD to 1 USD, to meet the target profit of 1 USD."
        ]
      },
      {
        "type": "text",
        "content": [
          "The stake adjustment: target session profit (1 USD) - current session profit (0 USD) = 1 USD"
        ]
      },
      {
        "type": "text",
        "content": [
          "The second session concludes upon reaching the aim of one unit of potential profit per session, equivalent to 1 USD. If trading continues, a new session will commence again."
        ]
      },
      {
        "type": "subtitle",
        "content": [
          "Profit and loss thresholds"
        ]
      },
      {
        "type": "text",
        "content": [
          "With Binarytools, traders can set the profit and loss thresholds to secure potential profits and limit potential losses. This means that the trading bot will automatically stop when either the profit or loss threshold is reached. This is a form of risk management that can potentially boost successful trades whilst limiting the impact of loss. For example, if a trader sets the profit threshold at 100 USD and the strategy exceeds 100 USD of profit from all trades, then the bot will stop running."
        ]
      },
      {
        "type": "subtitle",
        "content": [
          "Summary"
        ]
      },
      {
        "type": "text",
        "content": [
          "The Oscar's Grind strategy provides a disciplined approach for incremental gains through systematic stake progression. When integrated into Binarytools with proper risk management like profit or loss thresholds, it offers traders a potentially powerful automated trading technique. However, traders should first thoroughly assess their risk tolerance and first try trading on a demo account in order to familiarise with the strategy before trading with real funds."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Disclaimer:</strong>"
        ],
        "className": "italic"
      },
      {
        "type": "text",
        "content": [
          "Please be aware that while we may use rounded figures for illustration, a stake of a specific amount does not guarantee an exact amount in successful trades. For example, a 1 USD stake does not necessarily equate to a 1 USD profit in successful trades."
        ],
        "className": "italic"
      },
      {
        "type": "text",
        "content": [
          "Trading inherently involves risks, and actual profits can fluctuate due to various factors, including market volatility and other unforeseen variables. As such, exercise caution and conduct thorough research before engaging in any trading activities."
        ],
        "className": "italic"
      }
    ]
  }
];

const REVERSE_MARTINGALE_CHAPTERS: CourseStrategyChapter[] = [
  {
    "title": "Exploring the Reverse Martingale strategy in D-Bot",
    "blocks": [
      {
        "type": "subtitle",
        "content": [
          "Exploring the Reverse Martingale strategy in Binarytools"
        ],
        "expanded": true
      },
      {
        "type": "text",
        "content": [
          "The Reverse Martingale strategy involves increasing your stake after each successful trade and resets to the initial stake for every losing trade as it aims to secure potential profits from consecutive wins.",
          "This article explores the Reverse Martingale strategy integrated into Binarytools, a versatile trading bot designed to trade assets such as forex, commodities, and derived indices. We will delve into the strategy's core parameters, its application, and provide essential takeaways for traders looking to use the bot effectively."
        ]
      },
      {
        "type": "subtitle",
        "content": [
          "Key parameters"
        ]
      },
      {
        "type": "text",
        "content": [
          "These are the trade parameters used in Binarytools with Reverse Martingale strategy."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Initial stake:</strong> The amount that you are willing to place as a stake to enter a trade. This is the starting point for any changes in stake depending on the dynamic of the strategy being used."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Multiplier:</strong> The multiplier used to increase your stake if your trade is successful. The value must be greater than 1."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Profit threshold:</strong> The bot will stop trading if your total profit exceeds this amount."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Loss threshold:</strong> The bot will stop trading if your total loss exceeds this amount."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Maximum stake:</strong> The maximum amount you are willing to pay to enter a single trade. The stake for your next trade will reset to the initial stake if it exceeds this value. This is an optional risk management parameter."
        ]
      }
    ]
  },
  {
    "title": "An example of Reverse Martingale strategy",
    "blocks": [
      {
        "type": "subtitle",
        "content": [
          "An example of Reverse Martingale strategy"
        ]
      },
      {
        "type": "media",
        "src": "reverse_martingale.svg",
        "alt": "An example of Martingale strategy"
      },
      {
        "type": "text",
        "content": [
          "1. Start with the initial stake. Let\u2019s say 1 USD.",
          "2. Select your Martingale multiplier. In this example, it is 2.",
          "3. If the first trade is a successful trade, Binarytools will automatically double your stake for the next trade to 2 USD. Binarytools will continue to double the stake after every successful trade.",
          "4. If a trade ends in a loss, the stake for the following trade will be reset to the initial stake amount of 1 USD."
        ]
      },
      {
        "type": "text",
        "content": [
          "The objective of Martingale strategy is to take advantage of consecutive successful trades and maximise potential profits from them. This strategy is beneficial only if there are consecutive successful trades. Therefore, it is important to set a maximum stake to secure all the potential profits gained from a number of consecutive successful trades, or you could lose all the profits you have accumulated, including your initial stake. For example, if your goal is to maximise profits within 2 consecutive successful trades, you set a maximum stake of 2 USD, given your initial stake is 1 USD. Similarly, if your goal is to maximise profits within 3 consecutive successful trades, you set a maximum stake of 4 USD, given your initial stake is 1 USD."
        ]
      },
      {
        "type": "subtitle",
        "content": [
          "Profit and loss thresholds"
        ]
      },
      {
        "type": "text",
        "content": [
          "With Binarytools, traders can set the profit and loss thresholds to secure potential profits and limit potential losses. This means that the trading bot will automatically stop when either the profit or loss threshold is reached. This is a form of risk management that can potentially boost successful trades whilst limiting the impact of loss. For example, if a trader sets the profit threshold at 100 USD and the strategy exceeds 100 USD of profit from all trades, then the bot will stop running."
        ]
      },
      {
        "type": "subtitle",
        "content": [
          "Summary"
        ]
      },
      {
        "type": "text",
        "content": [
          "The Reverse Martingale strategy in trading may offer substantial gains but also comes with significant risks. With your selected strategy, Binarytools provides automated trading with risk management measures like setting initial stake, stake size, maximum stake, profit threshold and loss threshold. It's crucial for traders to assess their risk tolerance, practice in a demo account, and understand the strategy before trading with real money."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Disclaimer:</strong>"
        ],
        "className": "italic"
      },
      {
        "type": "text",
        "content": [
          "Please be aware that while we may use rounded figures for illustration, a stake of a specific amount does not guarantee an exact amount in successful trades. For example, a 1 USD stake does not necessarily equate to a 1 USD profit in successful trades."
        ],
        "className": "italic"
      },
      {
        "type": "text",
        "content": [
          "Trading inherently involves risks, and actual profits can fluctuate due to various factors, including market volatility and other unforeseen variables. As such, exercise caution and conduct thorough research before engaging in any trading activities."
        ],
        "className": "italic"
      }
    ]
  }
];

const REVERSE_D_ALEMBERT_CHAPTERS: CourseStrategyChapter[] = [
  {
    "title": "Exploring the Reverse D'Alembert strategy in D-Bot",
    "blocks": [
      {
        "type": "subtitle",
        "content": [
          "Exploring the Reverse D\u2019Alembert strategy in Binarytools"
        ],
        "expanded": true
      },
      {
        "type": "text",
        "content": [
          "The Reverse D'Alembert strategy involves increasing your stake after a successful trade and reducing it after a losing trade by a predetermined number of units."
        ]
      },
      {
        "type": "subtitle",
        "content": [
          "Key parameters"
        ]
      },
      {
        "type": "text",
        "content": [
          "These are the trade parameters used in Binarytools with Reverse D\u2019Alembert strategy."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Initial stake:</strong> The amount that you are willing to place as a stake to enter a trade. This is the starting point for any changes in stake depending on the dynamic of the strategy being used."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Unit:</strong> The number of units that are added in the event of successful trades or the number of units removed in the event of losing trades. For example, if the unit is set at 2, the stake increases or decreases by two times the initial stake of 1 USD, meaning it changes by 2 USD."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Profit threshold:</strong> The bot will stop trading if your total profit exceeds this amount."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Loss threshold:</strong> The bot will stop trading if your total loss exceeds this amount."
        ]
      }
    ]
  },
  {
    "title": "An example of Reverse D'Alembert strategy",
    "blocks": [
      {
        "type": "subtitle",
        "content": [
          "An example of Reverse D\u2019Alembert strategy"
        ]
      },
      {
        "type": "media",
        "src": "reverse_dalembert.svg",
        "alt": "An example of Reverse D\u2019Alembert strategy"
      },
      {
        "type": "text",
        "content": [
          "1. Start with the initial stake. Let\u2019s say 1 USD.",
          "2. Select your unit. In this example, it is 2 units or 2 USD.",
          "3. For trades that result in a profit, the stake for the next trade will be increased by 2 USD. Binarytools will continue to add 2 USD for every successful trade. See A1.",
          "4. For trades that result in a loss, there are two outcomes.  If it was traded at the initial stake, the next trade will remain at the same amount as the strategy trades minimally at the initial stake, see A2. If it was traded with a higher amount, the stake for the next trade would be reduced by 2 USD, see A3."
        ]
      },
      {
        "type": "subtitle",
        "content": [
          "Profit and loss thresholds"
        ]
      },
      {
        "type": "text",
        "content": [
          "With Binarytools, traders can set the profit and loss thresholds to secure potential profits and limit potential losses. This means that the trading bot will automatically stop when either the profit or loss threshold is reached. This is a form of risk management that can potentially boost successful trades whilst limiting the impact of loss. For example, if a trader sets the profit threshold at 100 USD and the strategy exceeds 100 USD of profit from all trades, then the bot will stop running."
        ]
      },
      {
        "type": "subtitle",
        "content": [
          "Summary"
        ]
      },
      {
        "type": "text",
        "content": [
          "Effective trading with the D'Alembert system requires careful consideration of its stake progression and risk management. Traders can automate this approach using Binarytools, setting profit and loss thresholds to ensure balanced and controlled trading. However, it is crucial for traders to assess their risk appetite, test strategies on a demo account, and align with their own trading style before transitioning to real money trading. This optimization process helps strike a balance between potential gains and losses while managing risk prudently."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Disclaimer:</strong>"
        ],
        "className": "italic"
      },
      {
        "type": "text",
        "content": [
          "Please be aware that while we may use rounded figures for illustration, a stake of a specific amount does not guarantee an exact amount in successful trades. For example, a 1 USD stake does not necessarily equate to a 1 USD  profit in successful trades."
        ],
        "className": "italic"
      },
      {
        "type": "text",
        "content": [
          "Trading inherently involves risks, and actual profits can fluctuate due to various factors, including market volatility and other unforeseen variables. As such, exercise caution and conduct thorough research before engaging in any trading activities."
        ],
        "className": "italic"
      }
    ]
  }
];

const ONE_THREE_TWO_SIX_CHAPTERS: CourseStrategyChapter[] = [
  {
    "title": "Exploring the 1-3-2-6 strategy in D-Bot",
    "blocks": [
      {
        "type": "subtitle",
        "content": [
          "Exploring the 1-3-2-6 strategy in Binarytools"
        ],
        "expanded": true
      },
      {
        "type": "text",
        "content": [
          "The 1-3-2-6 strategy aims to maximise potential profits with four consecutive successful trades. One unit is equal to the amount of the initial stake. The stake will adjust from 1 unit to 3 units after the first successful trade, then to 2 units after your second successful trade, and to 6 units after the third successful trade. The stake for the next trade will reset to the initial stake if there is a losing trade or a completion of the trade cycle.",
          "This article explores the strategy integrated into Binarytools, a versatile trading bot designed to trade assets such as Forex, Commodities, and Derived Indices. We will delve into the strategy's core parameters, its application, and provide essential takeaways for traders looking to use the bot effectively."
        ]
      },
      {
        "type": "subtitle",
        "content": [
          "Key parameters"
        ]
      },
      {
        "type": "text",
        "content": [
          "These are the trade parameters used in Binarytools with 1-3-2-6 strategy."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Initial stake:</strong> The amount that you are willing to place as a stake to enter a trade. This is the starting point for any changes in stake depending on the dynamic of the strategy being used."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Profit threshold:</strong> The bot will stop trading if your total profit exceeds this amount."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Loss threshold:</strong> The bot will stop trading if your total loss exceeds this amount."
        ]
      }
    ]
  },
  {
    "title": "An example of 1-3-2-6 strategy",
    "blocks": [
      {
        "type": "subtitle",
        "content": [
          "An example of 1-3-2-6 strategy"
        ]
      },
      {
        "type": "media",
        "src": "1-3-2-6.svg",
        "alt": "An example of 1-3-2-6 strategy"
      },
      {
        "type": "text",
        "content": [
          "1. Start with the initial stake. Let\u2019s say 1 USD.",
          "2. If the trade is successful, this strategy will automatically adjust your stake to 3 units of your initial stake for the next trade. In this case, the stake adjustment is 3 units and the initial stake is 1 USD, hence the next trade will start at 3 USD.",
          "3. If the second trade is also successful, your stake will adjust to 2 USD or 2 units of the initial stake for the next trade.",
          "4. However, if any trade results in a loss, your stake will reset back to the initial stake of 1 USD for the next trade. The third trade results in a loss hence the stake resets to the initial stake of 1 USD for the next trade.",
          "5. Upon reaching the initial stake, if the next trade still results in a loss, your stake will remain at the initial stake of 1 USD. This strategy will minimally trade at the initial stake. Refer to the fourth and fifth trade.",
          "6. If consecutive successful trades were to happen, the stake would follow a sequence of adjustment from 1 to 3, then 2, and 6 units of initial stake. After 4 consecutive successful trades, it completes one cycle and then the strategy will repeat itself for another cycle. If any trade results in a loss, your stake will reset back to the initial stake for the next trade."
        ]
      },
      {
        "type": "text",
        "content": [
          "The 1-3-2-6 strategy is designed to capitalise on consecutive successful trades while minimising losses during losing streaks. The rationale behind this strategy lies in statistical probabilities, with adjustments to stake sizes based on the perceived likelihood of success. There is a higher likelihood of success in the second trade after one successful trade. Hence the stake adjusts to 3 in the second trade. In the third trade, the stake adjusts to 2 units due to a lower probability of a successful trade. If the third trade is also successful, the strategy then allocates all the previous gains (a total of 6 units of initial stake) into the fourth trade with the aim of doubling the potential profits. If the fourth trade results in a positive outcome, the strategy helps achieve a total gain of 12 units. However, it is crucial to exercise caution, as the risk can escalate quickly with this strategy, and any loss in the fourth trade forfeits all previous gains."
        ]
      },
      {
        "type": "subtitle",
        "content": [
          "Profit and loss thresholds"
        ]
      },
      {
        "type": "text",
        "content": [
          "With Binarytools, traders can set the profit and loss thresholds to secure potential profits and limit potential losses. This means that the trading bot will automatically stop when either the profit or loss threshold is reached. This is a form of risk management that can potentially boost successful trades whilst limiting the impact of loss. For example, if a trader sets the profit threshold at 100 USD and the strategy exceeds 100 USD of profit from all trades, then the bot will stop running."
        ]
      },
      {
        "type": "subtitle",
        "content": [
          "Summary"
        ]
      },
      {
        "type": "text",
        "content": [
          "The 1-3-2-6 strategy in trading may offer substantial gains but also comes with significant risks. Each stake is independent, and the strategy does not increase your chances of successful trades in the long run. If you encounter a series of losses, the strategy can lead to significant losses. Therefore, it is crucial for traders to assess their risk tolerance, practice in a demo account, utilise profit and loss thresholds, and fully comprehend the strategy before engaging in real-money trading."
        ]
      },
      {
        "type": "text",
        "content": [
          "<strong>Disclaimer:</strong>"
        ],
        "className": "italic"
      },
      {
        "type": "text",
        "content": [
          "Please be aware that while we may use rounded figures for illustration, a stake of a specific amount does not guarantee an exact amount in successful trades. For example, a 1 USD stake does not necessarily equate to a 1 USD profit in successful trades.",
          "Trading inherently involves risks, and actual profits can fluctuate due to various factors, including market volatility and other unforeseen variables. As such, exercise caution and conduct thorough research before engaging in any trading activities."
        ],
        "className": "italic"
      }
    ]
  }
];

export const COURSE_STRATEGY_CHAPTERS: Record<QuickStrategyId, CourseStrategyChapter[]> = {
  "martingale": MARTINGALE_CHAPTERS,
  "dalembert": DALEMBERT_CHAPTERS,
  "oscars-grind": OSCARS_GRIND_CHAPTERS,
  "reverse-martingale": REVERSE_MARTINGALE_CHAPTERS,
  "reverse-dalembert": REVERSE_D_ALEMBERT_CHAPTERS,
  "one-three-two-six": ONE_THREE_TWO_SIX_CHAPTERS,
};