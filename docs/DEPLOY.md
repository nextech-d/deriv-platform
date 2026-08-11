# Production deployment — East Africa Deriv Platform

Target region: **AWS `af-south-1`** (Cape Town) for lowest latency to Kenya, Uganda, Tanzania, and Rwanda.

## Prerequisites

- Deriv OAuth app registered with production redirect URI: `https://your-domain.com/api/auth/callback`
- Environment secrets in AWS Secrets Manager or SSM Parameter Store
- TLS certificate (ACM) on ALB or CloudFront

## Required environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_DERIV_APP_ID` | Yes | Deriv App Manager ID |
| `SESSION_SECRET` | Yes | Min 32 chars; rotate periodically |
| `NEXT_PUBLIC_DEMO_MODE` | Yes | Set `false` in production |
| `DERIV_OAUTH_CLIENT_ID` | Live OAuth | Falls back to app ID |
| `DERIV_OAUTH_CLIENT_SECRET` | If confidential client | Optional for PKCE public clients |
| `SENTRY_DSN` | Recommended | Client error forwarding |
| `ADMIN_SECRET` | If using `/admin` | Strong random token |
| `PARTNER_AGENTS_DATA_PATH` | Production `/admin` | Writable JSON path (default: `data/payment-agents-partners.json`) |
| `COPY_PROVIDERS_DATA_PATH` | Production `/admin/copy` | Writable JSON path (default: `data/copy-providers.json`) |

Do **not** set `DERIV_API_TOKEN` in production — use OAuth or user PAT entry at login only.

### Partner & copy provider persistence

Admin saves partner listings and copy providers to JSON files on disk. In Docker/ECS the image seeds both under `/app/data/` and sets:

```bash
PARTNER_AGENTS_DATA_PATH=/app/data/payment-agents-partners.json
COPY_PROVIDERS_DATA_PATH=/app/data/copy-providers.json
```

Mount a persistent volume at `/app/data` in ECS (or bind-mount locally) so edits survive redeploys:

```bash
docker run -p 3000:3000 \
  -v deriv-admin-data:/app/data \
  -e PARTNER_AGENTS_DATA_PATH=/app/data/payment-agents-partners.json \
  -e COPY_PROVIDERS_DATA_PATH=/app/data/copy-providers.json \
  -e ADMIN_SECRET=your-admin-token \
  ...
```

## Docker build & run

```bash
docker build -t deriv-platform .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_DERIV_APP_ID=your_app_id \
  -e SESSION_SECRET=your-32-char-minimum-secret \
  -e NEXT_PUBLIC_DEMO_MODE=false \
  deriv-platform
```

Build-time public env (baked into client bundle):

```bash
docker build -t deriv-platform \
  --build-arg NEXT_PUBLIC_DEMO_MODE=false \
  --build-arg NEXT_PUBLIC_DERIV_APP_ID=your_app_id \
  .
```

### Local staging (Compose)

Mirrors production layout — standalone image, `/app/data` volume, health probe:

```bash
npm run staging:up      # build + start on :3000
npm run staging:smoke   # curl health + admin registry round-trip
npm run staging:down    # tear down
```

Then run CHAOS scenarios 6–10 from `docs/CHAOS.md` against http://localhost:3000 in Chrome.

The image uses Next.js `standalone` output (`output: "standalone"` in `next.config.ts`).

## AWS ECS (Fargate) — recommended

1. Push image to ECR in `af-south-1`
2. Create ECS cluster + Fargate service behind an ALB
3. Task definition: 512 CPU / 1024 MB minimum; scale on CPU / request count
4. Health check: `GET /api/health` → 200 with `{ ok: true, version }` (or `GET /api/auth/status` for auth probe)
5. Store env vars in Secrets Manager; inject via task definition
6. Enable ALB access logs + CloudWatch container logs

### Sample task sizing

| Traffic | Tasks | CPU / Memory |
| --- | --- | --- |
| MVP | 1–2 | 0.5 vCPU / 1 GB |
| Growth | 2–6 | 1 vCPU / 2 GB |

## Security checklist

- [ ] HTTPS only (HSTS at ALB/CloudFront)
- [ ] `SESSION_SECRET` unique per environment
- [ ] OAuth redirect URI locked to production domain
- [ ] No PAT or API tokens in client bundle or git
- [ ] CSP tightened beyond defaults when domain is known
- [x] Rate-limit `/api/auth/pat` and `/api/trading/otp` (in-memory per instance)
- [ ] Mount persistent volume at `/app/data` when using `/admin` in production

Security headers are set in `next.config.ts` (X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy).

## CI / E2E before deploy

```bash
npm run lint
npm run build
npm run test:e2e:ci
# or full gate:
npm run pre-deploy
```

Playwright runs in demo mode (`NEXT_PUBLIC_DEMO_MODE=true`) for reliable CI without OAuth. The E2E dev server uses `scripts/dev-e2e.mjs` so local `.env.local` cannot disable demo mode during tests.

Manual chaos pass: see `docs/CHAOS.md`. Full go-live checklist: `docs/PRE-LAUNCH.md`.

## OAuth unblock (Cloudflare)

If `auth.deriv.com` is blocked from your region:

1. Register redirect URI for production domain in Deriv App Manager
2. Test from a non-blocked network or VPN during initial rollout
3. PAT sign-in (`/login`) remains a fallback for affected users
4. Monitor `GET /api/auth/status` → `oauthReachable` in production

## Post-deploy verification

1. Sign in via OAuth → dashboard shows **Live**
2. Hard refresh — connection stays **Live** (no flash to Offline)
3. Place demo/real trade on Volatility 10; confirm portfolio update
4. Wallet → Cashier deep-link opens Deriv deposit flow
5. PWA install + theme switch persist across reload
6. Settings → **Open partner studio** loads `/admin`; save partner + copy provider and confirm persistence after container restart (with data volume mounted)
