# TradeCity go-live checklist

Production URL: **https://tradecity.trade**

## Scope (Deriv parity)

**Keep exactly what Deriv ships today — no more, no less:**

| In production | Out of scope |
| --- | --- |
| `tradecity-bot/` ([trading-bot-template](https://github.com/deriv-com/trading-bot-template)) | Custom Next.js bot engine (`app/`, `lib/bot/`) |
| Blockly toolbox + blocks (RSI, purchase, martingale, etc.) | Custom MA/RSI auto-trader tab |
| SmartCharts, Run, Journal, Quick strategies | Hand-built chart modal / custom Blockly fork |
| OAuth via Deriv App Manager | Legacy `/api/auth/callback` Next.js route |

Bot Builder default workspace = upstream `main.xml` (4 blocks: Trade parameters, Purchase, Sell, Restart). Strategies like RSI bots are built from **standard Deriv blocks only**. Toolbar **Reset** restores that default.

Only intentional diffs from upstream template: TradeCity shell branding (`brand.config.json`, logo, tab title) and OAuth `redirect_uri` trailing slash fix.

## Done

- [x] Deriv trading-bot-template deployed (`tradecity-bot/`)
- [x] Vercel project root → `tradecity-bot/`, output `dist/`
- [x] OAuth redirect URI: `https://tradecity.trade/`
- [x] `CLIENT_ID` / `APP_ID` on Vercel
- [x] Login flow verified (email/password → return to TradeCity)
- [x] TradeCity branding: title, favicon, manifest, logo wordmark

## Before sharing publicly

- [ ] **Smoke test** (Chrome): Bot Builder → Run on **demo** → Journal entry
- [ ] **Charts tab**: `R_100` ticks, toolbar visible
- [ ] **Account switcher**: demo account for first-time users
- [ ] Add **https://localhost:8443/** to Deriv redirect URIs (local dev login)
- [ ] Deriv App Manager redirect URI must be exactly **`https://tradecity.trade/`** (trailing slash)
- [ ] OAuth only works on **tradecity.trade** — not Vercel preview URLs
- [ ] Optional: your Google Analytics / support chat snippet in `tradecity-bot/index.html`
- [ ] Optional: affiliate signup link in Deriv App Manager

## Deploy

Push to `main` → Vercel auto-builds from `tradecity-bot/`.

Manual deploy:

```bash
cd tradecity-bot && npm install --ignore-scripts && npm run generate:brand-css && npm run build
vercel deploy --prebuilt --prod
```

## Legacy Next.js

The old custom platform under `app/` is **not deployed**. See **[legacy/README.md](../legacy/README.md)**. Do not point Vercel at the repo root Next.js build.

## Support

- Deriv OAuth: [developers.deriv.com](https://developers.deriv.com/)
- Template docs: `tradecity-bot/user-guide/`
