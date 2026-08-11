# Chaos & Resilience QA Runbook

Manual tests for Phase C exit criteria. Run in **Google Chrome** with DevTools open.

**Target:** Reconnect success ≥ 99% · zero duplicate buys · zero orphaned intents.

---

## Setup

1. Start dev server: `npm run dev:restart`
2. Open http://localhost:3000/dashboard
3. Open DevTools → **Network** tab
4. Settings → **WebSocket metrics** — reset counters before each scenario

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

## Recording results

| Scenario | Pass/Fail | Reconnect OK % | Notes |
| --- | --- | --- | --- |
| 1 Slow 3G | | | |
| 2 Offline ×10 | | | |
| 3 Tab background | | | |
| 4 Pending intent | | | |
| 5 Risk lockout | | | |

Export WS metrics from Settings before ending the session (screenshot or copy reconnect counts).

---

## Automated follow-up (Phase C+)

- Playwright E2E with network interception
- Mock WS server (see `ARCHITECTURE.md` §12.3)
- CI job with throttled headless Chrome
