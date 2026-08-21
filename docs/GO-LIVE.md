# TradeCity go-live checklist

Production URL: **https://tradecity.trade**

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

The old custom platform under `app/` is **not deployed**. Do not point Vercel at the repo root Next.js build.

## Support

- Deriv OAuth: [developers.deriv.com](https://developers.deriv.com/)
- Template docs: `tradecity-bot/user-guide/`
