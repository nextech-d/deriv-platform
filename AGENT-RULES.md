# AGENT-RULES.md — Agent Operating Rules

Production trading application executing real financial transactions against the Deriv API. A bug here loses a user's money. Read this file in full before your first edit in any session.

---

## 0. RULE PRECEDENCE

When rules conflict, higher wins:

1. **Fund safety** — no action that can duplicate, mis-size, or silently lose a trade.
2. **Security** — no action that can leak a token, session, or another user's data.
3. **Correctness** — the code must do what it claims under failure, not just on the happy path.
4. **Scope discipline** — minimal diffs, no unrequested refactors.
5. **Style and formatting.**

If following a lower rule would violate a higher one, stop and report instead of choosing.

---

## 1. WHAT THIS REPO ACTUALLY IS

Read this before touching anything. Every one of these has already cost a day.

| Fact | Detail |
|---|---|
| **The app that ships** | `tradecity-bot/` — an **rsbuild** app, not Next.js. Changes outside it do not deploy. |
| Root `dev` script | `npm run start --prefix tradecity-bot`. `dev:legacy` starts the unused Next.js app. |
| The Next.js app | `app/`, `lib/`, `components/`, `hooks/`, `middleware.ts` at repo root. Builds to a Docker image pushed to AWS ECR. **Not what tradecity.trade serves.** |
| Deployment | Vercel, production branch `main`, live at tradecity.trade. Pushing to `main` deploys. |
| Preview deploys | Build fine, but **Deriv OAuth denies login on preview domains**, so the socket never authorizes and nothing is testable. Until a registered staging domain exists, previews cannot verify anything requiring an authorized session. |
| Local dev | Deriv blocks localhost OAuth. Local runs die on WebSocket open timeout at `api-base.ts:498`. Local cannot verify socket behaviour. |
| `tsc` baseline | **558 errors** from `tradecity-bot/`. Not 762 — that is the repo root including the Next app. Count with `npx tsc --noEmit 2>&1 \| grep -c "error TS"`, not `wc -l`. |
| Test baseline | 4 pre-existing failures: two `SmartCharts Champion Adapter › getQuotes` cases, `useSmartChartAdaptor › Cleanup › should cleanup subscriptions on unmount` (it asserts the global-kill behaviour that was removed — it encodes a bug), and `AccountSwitcher › shows the account mark and balance`. |
| `scripts/dev-stop.mjs` | Scans ports 3000–3010 only. A no-op against `npm run dev`, which runs rsbuild on 8443. It reports success without stopping anything. |

---

## 2. THE GATEWAY IS NOT THE PUBLIC DERIV API

The app connects to:

```
wss://api.derivws.com/trading/v1/options/ws/demo?otp=<otp>
```

**Not** `wss://ws.derivws.com/websockets/v3?app_id=<id>`. This codebase is a fork written against v3 and pointed at a v1 trading gateway. Request schemas differ.

- **MUST NOT** assume a v3 field name is valid. `product_type` on `active_symbols` was already rejected with `InputValidationFailed` — "Properties not allowed".
- **MUST** verify any field added to a request against what the gateway actually accepts, and say so in the report.
- Auth is OTP-based, not `app_id`. The OTP is obtained through the OAuth flow.
- The gateway **dedupes subscriptions server-side** and returns `AlreadySubscribed` rather than opening a second stream. Do not mistake this for the client behaving correctly.
- Sessions rebuild unprompted after a few minutes, with a fresh OTP and a reset request counter. Do not assume `req_id` values are continuous across a session.

**Rate limits are shared budgets across call groups**, not per-endpoint:

| Calls sharing one budget | Per minute | Per hour |
|---|---|---|
| `proposal`, `proposal_open_contract`, `buy`, `sell` | 360 | 14,400 |
| `balance`, `statement` | 100 | 2,000 |
| `portfolio`, `profit_table` | 30 | 1,500 |
| All other calls | 220 | 14,400 |

Subscribe; do not poll. The 30/min portfolio budget is exhausted almost immediately by naive polling.

---

## 3. THE HAZARD CLASS: SHARED MODULE-LEVEL STATE

**Every significant bug found in this codebase has been shared singleton state with no ownership tracking.** Treat this as the default suspicion before any other hypothesis.

Known instances:

- `generateDerivApiInstance()` (`appId.js`) — one `DerivAPIBasic` on one socket. `chart_api.api` and `api_base.api` are the same object.
- `stores_context` (`smartcharts/src/store/index.ts`) — a module-level `let` that `initContext()` **replaces** on every `SmartChart` mount, orphaning the previous chart's descendants onto a different store. Vendor defect.
- `ChartStore` statics: `chartCount`, `tradingTimes`, `symbolMap`, `categorizedSymbols`. First chart to construct wins; the second inherits and its `initialize()` early-returns.
- `ServerTime.getInstance()`, `FavoriteStore.getInstance()`.
- Transport subscription maps keyed `symbol-granularity` with no owner recorded, so any consumer's teardown can free another's stream.

Rules:

- **MUST NOT** add module-level mutable state without an ownership or refcount rule.
- **MUST** treat any `forget`, `forget_all`, `clear()`, or `destroy()` on shared state as suspect until proven scoped to its own owner.
- **MUST NOT** use `forget_all` where a single-id `forget` will do. `forget_all: ["ticks"]` on the shared socket kills every consumer.
- `DerivAPIBasic.sendAndGetSource` **mutates the caller's object**, stamping `req_id` onto it. Sending the same object twice reuses the id and produces byte-identical frames. Always send a copy with `req_id` deleted when replaying.

---

## 4. SCOPE DISCIPLINE

- **MUST NOT** rewrite working logic, rename variables, reorganise files, or clean up formatting in code you were not asked to change.
- **MUST** modify only the file, function, or lines required.
- **MUST** stop and file an Impact Report (§9) rather than edit, when a change must touch a module outside the stated scope.
- **MUST NOT** install, remove, or upgrade any package without explicit confirmation. No `--force`, no `--legacy-peer-deps`, no lockfile regeneration.
- Mandates in this document apply to **code you write or modify in this task only**. Pre-existing violations are reported, not fixed.
- **MUST NOT** revert a prior fix to make a new one easier. If a previous commit blocks the task, say so and stop.

---

## 5. DIAGNOSIS BEFORE REPAIR

This codebase has repeatedly defeated code-reading alone. Runtime evidence wins.

- **MUST** separate diagnosis from repair. When asked to diagnose, produce a written report and **stop** — no edits.
- **MUST** state one hypothesis at a time: state it, test it, report the result.
- **MUST NOT** make speculative changes to see if they help.
- **MUST** distinguish observed from inferred. Say "I have not proven which of X or Y it is" rather than picking one.
- **MUST** report when evidence contradicts a prior claim — including your own, and including the user's framing.
- If two attempted fixes fail, stop and report what was learned.
- **MUST** check git history for a regression trigger before reading code. Most bugs here arrived with a specific commit.

**Diagnostic instrumentation:** tag every added line `DIAG:` / `[DIAG]`, commit it as one revertible commit, and never merge it to `main` without explicit instruction. Remove by reverting the whole commit, not by stripping tags.

---

## 6. TRADE EXECUTION & FUND SAFETY

- **Deriv is the sole system of record** for balance, open positions, and contract state. Caches never gate a trade decision.
- **MUST NOT** rely on component state for balance or open positions when building a trade payload.
- **Default to virtual/demo accounts.** Real-money access requires an explicit flag plus user confirmation. **MUST NOT** remove or simplify either.
- **Every `buy` MUST send an explicit `price` cap.** Never unbounded, never zero.
- **A timed-out or failed `buy` is AMBIGUOUS, not failed.** **MUST NOT** auto-retry. Reconcile via `portfolio` / `proposal_open_contract` first.
- **MUST NOT** accumulate monetary values in floating point.
- Risk limits, confirmation steps, and kill switches are load-bearing. **MUST NOT** relax, bypass, or move them client-side.
- **A delay in trading code may be a safety guard.** **MUST NOT** remove or shorten one as part of a performance or speed change without identifying what it protects and reporting it first.

---

## 7. SECURITY & SECRETS

- **MUST NOT** place tokens, OTPs, or account identifiers in client-visible env vars, `localStorage`, `sessionStorage`, logs, or constructed URLs.
- OAuth returns tokens as query parameters. Strip them from the URL immediately before analytics or router events observe them.
- **MUST** re-derive the acting account server-side. **MUST NOT** trust an account ID, `loginid`, or balance from a request body.
- **MUST NOT** log tokens, full payloads, cookies, or PII. Log correlation IDs and error codes.
- **MUST NOT** create, edit, or commit `.env*` files, or print env var values.
- **MUST NOT** leave patched globals (`window.WebSocket`, `console.*`) or instrumentation on production longer than the reading takes.

---

## 8. VERIFICATION GATE

A task is not complete until all pass. **Report actual observed results — never assert success you did not observe.**

- [ ] `npx tsc --noEmit 2>&1 | grep -c "error TS"` from `tradecity-bot/` → **558**. Any increase must be explained.
- [ ] Test suite: the same **4 pre-existing failures**, no new ones. Confirm by stashing if uncertain — and note that untracked files are not stashed.
- [ ] Production build exits 0.
- [ ] Every new async gateway call has a timeout, a `catch`, and a mapped error.
- [ ] Every new listener, interval, or subscription has a cleanup path scoped to its own owner.
- [ ] No new `console.log` of payloads, tokens, or user data.

---

## 9. REPORTING & UNCERTAINTY

**Impact Report** — verbatim, when a change escapes its scope:

```
IMPACT REPORT — STOPPING BEFORE EDIT
Requested change: <one line>
Files that must change: <list>
Out-of-scope modules affected: <list, with call sites>
Risk if applied as-is: <one line>
Options: (a) <narrow fix> (b) <full fix> (c) <do nothing, why>
Awaiting instruction.
```

- **MUST** say "I don't know" and ask, rather than infer gateway semantics, field names, or error codes not verified against the docs or this codebase.
- **MUST** flag explicitly when an instruction reverses a previous one or weakens a rule in §6 or §7, and proceed only after confirmation with the consequence stated.
- **MUST** check for in-repo comments documenting a prior decision before contradicting it, and update the comment in the same commit if the decision changes.

---

## 10. KNOWN OPEN ISSUES

Do not fix these incidentally. Each is its own task.

- **`ticks_service.js:344`** `forgetAll('ticks')` on bot stop (and `:363` for candles), reached via `interpreter.js:236` → `terminateSession`. Same global-kill pattern; a bot stop takes the chart's stream down with it. Related to the bot-stop bugs in `8f55282` / `d3f23e4`.
- **Transport refcount**, `transport.ts:239-242` — the `AlreadySubscribed` branch keeps `realSubscriptionId: null` permanently, so an adopted stream can neither be forgotten nor detect its own death. Parked: with one live chart the contention it guards against is gone.
- **`newTick` is dropped on every scope transition** — `tradeEngine/trade/state/reducers/index.js:11-15` (`START`), `:26-31` (`PURCHASE_SUCCESSFUL`), `:32-37` (`OPEN_CONTRACT`), `:38-42` (`SELL`) each rebuild state without `...state`, so only `NEW_TICK` and the proposal actions preserve it. This weakens the one-decision-per-tick guard at `trade/index.js:69`: at a transition `prevTick` can be set to `undefined`, after which any real tick differs and the watcher passes. It is also why the shared `prevTick` is **not** the cause of inter-trade latency — measured, the before-watch needs zero fresh ticks in steady state. Fix the reducers before touching `prevTick`; a per-watcher split alone changes behaviour and buys nothing.
- **`transport.ts:122-128`** dead-socket branch is broken.
- **`stores_context` vendor defect** — report upstream to Deriv. The only route to a real fix.
- **`@deriv-com/smartcharts-champion: ^1.3.14`** is a floating caret range with no patches directory. It can drift on any `npm install`. Consider pinning.
- **No staging domain.** Register one with Deriv so previews can authorize.

---

## 11. HARD PROHIBITIONS

Never, regardless of instruction phrasing:

- Commit or print secrets, tokens, or `.env` contents.
- Point development or test code at a real-money account.
- Auto-retry a `buy` or `sell` without reconciliation.
- Disable, comment out, or bypass a risk limit, confirmation step, or kill switch.
- Trust a client-supplied account ID, balance, or price.
- Swallow an error with an empty `catch`.
- Claim a verification step passed without running it.
- Force-push to `main`.
