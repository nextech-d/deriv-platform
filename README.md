# tradecity.trade

White-label Deriv trading bot platform — same foundation as [binarytool.site](https://www.binarytool.site/) ([Deriv trading-bot-template](https://github.com/deriv-com/trading-bot-template)).

Real **Blockly** bot builder, **SmartCharts**, bot run/journal, OAuth — not a custom rebuild.

## Quick start

```bash
npm run install:bot   # first time
cp tradecity-bot/.env.example tradecity-bot/.env   # set CLIENT_ID from Deriv App Manager
npm run dev           # https://localhost:8443
```

## Production

Build: `npm run build` → `tradecity-bot/dist/`

**Live:** [tradecity.trade](https://tradecity.trade)

Deploy that folder as a static SPA. See **[docs/GO-LIVE.md](./docs/GO-LIVE.md)** and **[docs/PIVOT.md](./docs/PIVOT.md)** for OAuth redirect URI (`https://tradecity.trade/`) and Vercel settings.

## Legacy Next.js app

The earlier custom platform (custom bot builder, Next.js dashboard, MA/RSI auto-trader) is **archived — not production**:

```bash
npm run dev:legacy    # http://localhost:3000 — reference only
```

See **[legacy/README.md](./legacy/README.md)**. Do not use it for bot/charts — production is `tradecity-bot/` only (Deriv template).

## Branding

Edit `tradecity-bot/brand.config.json`, then:

```bash
npm run generate:brand-css --prefix tradecity-bot
```

TradeCity colors and IBM Plex Sans are already applied.
