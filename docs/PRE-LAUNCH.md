# Pre-launch checklist

Use this before pointing production traffic at the platform. Items marked **code** are in-repo; **manual** need a human pass; **infra** need AWS/Deriv credentials.

## Code complete (in repo)

- [x] Copy trading desk — signals, auto-copy, history, per-provider stakes, copy-specific risk
- [x] Copy provider admin (`/admin/copy`) with persistent JSON registry
- [x] Partner agent admin (`/admin`) with persistent JSON registry
- [x] Portfolio source filters + badges (manual / copy / auto)
- [x] Double-click buy guard (`useDerivWorker`)
- [x] Rate limits on `POST /api/auth/pat` and `POST /api/trading/otp`
- [x] Health probe `GET /api/health`
- [x] `.env.example` template
- [x] GitHub Actions CI — lint, build, Playwright (demo mode)
- [x] Docker standalone image + data volume docs (`docs/DEPLOY.md`)
- [x] E2E — smoke, admin, copy flows
- [x] E2E fixtures + global setup (isolated admin JSON per run)
- [x] SSR hydration fixes (theme, display currency, portfolio filter)
- [x] Pre-deploy script (`npm run pre-deploy`)
- [x] Health probe includes version + demo flag

## Automated QA (this pass)

- [x] `npm run pre-deploy` (lint + build + Playwright demo suite)
- [x] `npm run staging:smoke` against local demo server
- [x] Chaos e2e (`e2e/chaos.spec.ts`) — double-buy guard, stake cap, hard refresh
- [x] Website exit — sidebar brand → `/` without logged-in redirect bounce

Still **manual in Chrome** (DevTools Network): Slow 3G reconnect, offline burst ×10, tab background, pending intent on disconnect, PWA install.

## Manual QA (Chrome)

**Without Docker** — use the dev server:

```bash
npm run dev:restart
# Open http://localhost:3000/dashboard in Google Chrome
```

Run scenarios from `docs/CHAOS.md` (1–8, 10). Skip scenario 9 unless you have Docker or a cloud staging environment.

**With Docker** (optional): `npm run staging:up && npm run staging:smoke`, then all scenarios including 9.

Checklist:

1. Slow 3G reconnect — ticks resume, no duplicate contracts
2. Offline burst (10×) — bot/copy recover without duplicate buys
3. **Double-click buy** — single contract only
4. Daily / session drawdown — new buys blocked, sells allowed
5. Hard refresh with open positions — IndexedDB hydration OK
6. Copy: follow provider → signal → copy → portfolio badge **Copy**
7. Admin: save partner + copy provider → restart container with volume → data persists
8. Wallet Cashier deep-link opens Deriv deposit flow
9. PWA install + theme preference survive reload

## Environment & secrets

Copy `.env.example` → `.env.local` (dev) or inject via Secrets Manager (prod):

| Variable | Production |
| --- | --- |
| `NEXT_PUBLIC_DEMO_MODE` | `false` |
| `SESSION_SECRET` | Unique, ≥ 32 chars |
| `NEXT_PUBLIC_DERIV_APP_ID` | Production app ID |
| `ADMIN_SECRET` | Strong random if using `/admin` |
| `PARTNER_AGENTS_DATA_PATH` | `/app/data/payment-agents-partners.json` |
| `COPY_PROVIDERS_DATA_PATH` | `/app/data/copy-providers.json` |
| `SENTRY_DSN` | Recommended |

Do **not** set `DERIV_API_TOKEN` in production.

## Infra (external)

Staging on your laptop (pick one):

```bash
# No Docker
npm run dev:restart
# → http://localhost:3000 — CHAOS scenarios 1–8, 10 in Chrome

# With Docker (optional)
npm run staging:up && npm run staging:smoke
```

Deploy image build runs in GitHub Actions (`.github/workflows/docker-build.yml`) — no local Docker required. See `infra/README.md`.

Then in AWS:

- [ ] ECS/Fargate in `af-south-1` — see `docs/DEPLOY.md`
- [ ] ALB health check: `GET /api/health` or `GET /api/auth/status`
- [ ] Persistent volume at `/app/data` for admin JSON files
- [ ] TLS (ACM) + HTTPS redirect + HSTS
- [ ] Deriv OAuth redirect URI registered for production domain
- [ ] OAuth reachable from EA networks (or PAT fallback documented)
- [ ] CloudWatch logs + optional Sentry DSN

## Post-deploy smoke (production domain)

1. OAuth login → dashboard **Live**
2. PAT login fallback works
3. Place one small real/demo trade; portfolio updates
4. `GET /api/health` → 200
5. `/admin` gated by `ADMIN_SECRET`; save persists across redeploy

## Deferred (post-MVP)

- Redis session store (multi-instance)
- Daraja STK / licensed MoMo float
- Swahili i18n
- Signal list virtualization (only if feed grows large)
- Live OAuth E2E in CI
