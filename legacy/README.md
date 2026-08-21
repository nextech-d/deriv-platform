# Legacy Next.js platform (archived)

This directory is **not deployed** and **not part of TradeCity production**.

Production is **`tradecity-bot/`** only — the official [Deriv trading-bot-template](https://github.com/deriv-com/trading-bot-template) (Blockly, SmartCharts, run/journal, OAuth).

## Do not use for bot building

The custom Next.js stack (`app/`, `components/trading/`, `lib/bot/`, etc.) was an earlier rebuild attempt. It includes a custom MA/RSI auto-trader that is **not** Deriv parity.

For bots like the RSI strategy in Bot Builder, use **Deriv's Blockly blocks only** (Analysis → Indicators → RSI, Purchase conditions, etc.) — the same blocks as [bot.deriv.com](https://bot.deriv.com).

## Local run (reference only)

```bash
npm run dev:legacy   # http://localhost:3000
```

Do not point Vercel or any production host at this build.
