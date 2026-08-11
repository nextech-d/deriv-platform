# Chaos & Resilience QA Runbook

Manual tests for Phase C exit criteria. Run in **Google Chrome** with DevTools open.

**Target:** Reconnect success ≥ 99% · zero duplicate buys · zero orphaned intents.

---

## Setup

1. Start dev server: `npm run dev:restart`
2. Open http://localhost:3000/dashboard
3. Open DevTools → **Network** tab
4. Settings → **WebSocket metrics** — reset counters before each scenario

For **live OAuth** staging, set `NEXT_PUBLIC_DEMO_MODE=false` and sign in first. Demo mode is fine for scenarios 1–3, 5–7.

---

## Scenario 1 — Slow 3G reconnect

1. Confirm connection pill shows **connected** and ticks are streaming.
2. DevTools → Network → Throttling → **Slow 3G**
3. Click **Reconnect** in the connection banner (or toggle offline below).
4. Wait for **reconnecting** → **connected** (≤ 60 s).
5. Verify ticks resume and portfolio P/L updates.

**Pass:** Reconnect success in WS metrics ≥ 99% · no duplicate open contracts.

---

## Scenario 2 — Offline burst (10×)

1. Reset WS metrics.
2. Repeat 10 times:
   - DevTools → Network → **Offline** (30 s)
   - Restore **No throttling**
   - Wait for **connected**
3. Optionally start **Auto** bot on demo with MA cross (stake $1, cooldown 10).

**Pass:** Bot heartbeat returns to **running** after each burst · `tradesExecuted` does not spike abnormally (no duplicate buys on reconnect).

---

## Scenario 3 — Tab background

1. Start Auto bot (demo mode).
2. Switch to another tab for 2 minutes.
3. Return to dashboard tab.

**Pass:** Connection pill reconnects if needed · bot status still **running** or **paused** (not crashed).

---

## Scenario 4 — Pending intent on disconnect

1. *(OAuth mode only)* Place a manual trade.
2. Immediately toggle **Offline** before contract confirms.
3. Restore network.

**Pass:** Pending intent marked **failed** or contract reconciled in IndexedDB · no orphan **pending** intents after 5 min.

*(Demo mode: intents resolve locally — verify in DevTools → Application → IndexedDB → `deriv-platform-v1`.)*

---

## Scenario 5 — Risk lockout mid-session

1. Settings → set session stop-loss to **$1**.
2. Place a losing demo trade or wait for bot loss.
3. Confirm **Trading locked** banner.
4. Toggle offline/online.

**Pass:** Buy blocked while locked · reconnect still works · sell/close still allowed on open positions.

---

## Scenario 6 — Double-click buy guard

1. Trade view → wait for live quote (Rise button enabled).
2. Rapidly double-click **Rise** (or use DevTools to replay two clicks within 200 ms).

**Pass:** Exactly **one** open contract · ticket shows “Trade already in progress” or single “Demo Rise opened” notice · no duplicate rows in portfolio.

---

## Scenario 7 — Hard refresh with open positions

1. Open a demo Rise trade (5t duration).
2. Confirm **1 open** in session stats.
3. Hard refresh (`Cmd+Shift+R` / `Ctrl+Shift+R`).

**Pass:** IndexedDB hydrates · open position reappears within 10 s · P/L updates on ticks · no console hydration errors.

---

## Scenario 8 — Copy → portfolio badge

1. Copy view → **Follow** first provider.
2. Wait for a signal card (≤ 90 s on live feed).
3. Click **Copy trade** → confirm success notice.
4. Portfolio view → open row shows **Copy** source badge.

**Pass:** Badge visible before contract expires · copy history lists the signal · no “Wait for live ticks” rejection.

---

## Scenario 9 — Admin persistence (Docker)

1. `docker build -t deriv-platform .`
2. Run with data volume (see `docs/DEPLOY.md`):
   ```bash
   docker run -p 3000:3000 \
     -v deriv-admin-data:/app/data \
     -e ADMIN_SECRET=your-admin-token \
     -e SESSION_SECRET=your-32-char-minimum-secret \
     -e NEXT_PUBLIC_DEMO_MODE=true \
     -e NEXT_PUBLIC_DERIV_APP_ID=000000 \
     deriv-platform
   ```
3. Open `/admin` and `/admin/copy` → paste `ADMIN_SECRET`.
4. Save a partner agent and a copy provider (mark active).
5. Stop container · start again with same volume.

**Pass:** Saved listings survive restart · public `/api/copy/providers` and `/api/payments/agents` reflect edits.

---

## Scenario 10 — Wallet Cashier & PWA

1. Wallet view → **Open Cashier** (or deposit CTA) opens Deriv deposit flow in a new tab.
2. Install PWA (Chrome → Install app) · switch theme in Settings · reload.

**Pass:** Cashier URL is valid Deriv domain · theme preference persists · no flash of wrong theme on load.

---

## Recording results

| Scenario | Pass/Fail | Reconnect OK % | Notes |
| --- | --- | --- | --- |
| 1 Slow 3G | | | |
| 2 Offline ×10 | | | |
| 3 Tab background | | | |
| 4 Pending intent | | | |
| 5 Risk lockout | | | |
| 6 Double-click buy | | | |
| 7 Hard refresh | | | |
| 8 Copy badge | | | |
| 9 Admin Docker | | | |
| 10 Wallet / PWA | | | |

Export WS metrics from Settings before ending the session (screenshot or copy reconnect counts).

---

## Automated follow-up

- Playwright E2E with network interception
- Mock WS server (see `ARCHITECTURE.md` §12.3)
- CI job with throttled headless Chrome (`npm run test:e2e:ci`)
