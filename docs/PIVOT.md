# TradeCity platform pivot

**Goal:** Match [binarytool.site](https://www.binarytool.site/) / [bot.deriv.com](https://bot.deriv.com/) — real Blockly bot builder, SmartCharts, bot runtime.

The custom Next.js bot builder and hand-wired SmartCharts have been **retired** in favour of Deriv’s official [trading-bot-template](https://github.com/deriv-com/trading-bot-template), vendored at `tradecity-bot/`.

## Run locally (primary app)

```bash
npm run install:bot   # first time only
npm run dev           # https://localhost:8443 (Deriv template dev server)
```

Branding: `tradecity-bot/brand.config.json` (TradeCity colors, `tradecity.trade` hostname).  
OAuth: `tradecity-bot/.env` → `CLIENT_ID` (same Deriv App Manager ID as before).

## Legacy Next.js app

The previous custom platform remains under `app/`, `components/`, etc. for reference only.

```bash
npm run dev:legacy    # http://localhost:3000
npm run build:legacy
```

Do **not** deploy the legacy app for bot/charts — it will never reach binarytool parity.

## Production deploy

1. Build: `npm run build` → output in `tradecity-bot/dist/`
2. Host `dist/` as a static SPA (Vercel, Cloudflare Pages, S3+CloudFront)
3. Set output directory to **`tradecity-bot/dist`**
4. Register OAuth redirect URI: **`https://tradecity.trade/`** (root, not `/api/auth/callback`)
5. Set `CLIENT_ID` in the host environment at build time
6. Set `platform.hostname.production.com` to `tradecity.trade` in `brand.config.json` (already done)

## Deriv OAuth change

| Before (legacy Next.js) | After (TradeCity bot) |
|-------------------------|------------------------|
| `https://tradecity.trade/api/auth/callback` | `https://tradecity.trade/` |

Add the new redirect URI in [Deriv App Manager](https://developers.deriv.com/) before going live.

## What was removed / deprecated

- Custom `BotBuilderDesk` Blockly-like UI (replaced by real Blockly in template)
- Custom SmartCharts glue in Next.js (template bundles SmartCharts + stores)
- Charts-tab parity work on the custom stack

## Theme

TradeCity accent (`#ff444f`), dark surfaces (`#0c0e12` / `#141820`), and IBM Plex Sans are applied via `brand.config.json` + `npm run generate:brand-css --prefix tradecity-bot`.

Footer theme toggle is enabled in brand config.
