# E-1 — Scaffold, loader, API layer, money module

**Read first:** `AGENTS.md`, `EMBED-TRACKER.md`, `docs/architecture.md`, `docs/decisions.md`.
**Repo:** `galveston-embed`. **Branch:** `phase/E-1`. Run `git remote -v` before the first commit.
**Backend commit:** `7e15a04`.

## Goal

A working skeleton: the script tag mounts a Shadow DOM, calls `GET /v1/public/business`, and shows the business name. No booking UI yet. Everything later phases build on is in place and tested.

## 1. Project setup

- Vite library mode, TypeScript `strict`, Preact. Output **one IIFE file**: `dist/embed.js` (plus its sourcemap). No code splitting. (ED-008)
- Vitest for tests.
- pnpm **11.19.0** via the `packageManager` field. **Exact versions only** — no `^` or `~`.
- openapi-typescript and openapi-fetch for the API layer.
- `.env.example` with `VITE_API_BASE` and `VITE_MAPS_BROWSER_KEY`. Never commit `.env*` files except `.env.example`; add the rest to `.gitignore`.
- Scripts: `dev`, `build`, `test`, `check`, `gen:api` (see `AGENTS.md` §9).

### 1.1 Lint and size limits (enforced, not just written)

`pnpm check` must fail when any of these is broken. **Why:** agents produce large files unless a check stops them (AGENTS §4).

| Rule | Limit |
|---|---|
| File length | ≤ 400 lines |
| Function length | ≤ 50 lines |
| Nesting depth | ≤ 3 |
| `any` | Not allowed |

- Use ESLint (flat config) with `max-lines`, `max-lines-per-function`, `max-depth` and `@typescript-eslint/no-explicit-any` as **errors**.
- The **only** exclusion is the generated file `src/api/schema.d.ts`. No other exclusions, no `eslint-disable` comments.
- `pnpm check` runs, in order: typecheck, lint, tests, build, dist-contents test.

## 2. Loader — `src/embed.ts`

The client pastes:

```html
<div id="galveston-booking"></div>
<script src="https://<host>/embed.js" data-business-key="bk_live_..." async></script>
```

- Capture `document.currentScript` **synchronously at load** (it is null later); read `data-business-key` and optional `data-api-base`.
- Default API base from `VITE_API_BASE`. No hardcoded URLs.
- Mount into `#galveston-booking`. If missing, one `console.error` and stop.
- Attach a Shadow DOM and render inside it. All styles inside it.
- If the script loads twice, mount once.
- Never throw into the host page: catch at the mount boundary, log one `console.error`. (AGENTS rule 12)

## 3. API layer — `src/api/`

### 3.1 API files (already copied — verify, don't re-copy)

The developer has already copied, from backend commit **`7e15a04`**:

- `src/api/openapi.json`
- `docs/api/API_CONTRACT.md`

Both `src/api/SOURCE.md` and `docs/api/SOURCE.md` record `7e15a04`.

- **Check** that both files and both `SOURCE.md` files exist and record `7e15a04`. If anything is missing or records a different hash, **stop and ask**. Do not copy from whatever is on disk.
- Run `pnpm gen:api` to generate `src/api/schema.d.ts` with openapi-typescript. Never edit it by hand.

### 3.2 Client

- Every request sends `X-Business-Key` and `Content-Type: application/json`.
- Parse `{ "error": { "code", "message", "field"? } }` into a typed `ApiError`. `field` may be absent.
- Distinct error types for `401`, `409 REQUEST_IN_FLIGHT`, `429 RATE_LIMITED` and network failure. Not one generic error.
- **No automatic retry on any POST.**
- Only typed client functions in this phase — no booking UI.

### 3.3 Idempotency-Key helper

**The "cart" is the booking request body.** The key protects against double bookings (and later double charges) when a customer presses Create Trip twice.

- The helper takes the booking request body and returns a UUID.
- Same body as the last call → **same key**.
- Any change to the body (vehicle, date, passengers, car seats, customer details, anything) → **new key**.
- Compare bodies by a stable serialisation (keys sorted), so key order alone never creates a new key.
- Keep the key in memory only. No `localStorage`.

## 4. Money — `src/money/`

- `formatMoney(amount: string, currency: "USD"): string` → `"$1,413.75"`, by splitting the string. Handles negatives (`"-45.00"` → `"-$45.00"`) and zero (`"0.00"` → `"$0.00"`).
- **Display format is provisional.** BRO shows `"$ 390.00 USD"`; the owner has not chosen yet. Keep all formatting in this one function so the format changes in one place.
- Malformed input (not `/^-?\d+\.\d{2}$/`): throw in development, render `"—"` in production.
- **The development throw must never reach the host page.** It is caught at the mount boundary like any other error (AGENTS rule 12).
- A test fails if `parseFloat`, `Number(`, `toFixed(` or `Math.` appears in `src/money/`. (ED-007)

## 5. Time — `src/time/`

- Helpers that format and compare dates/times in the **business's timezone** from `GET /v1/public/business`, never the visitor's browser timezone. (AGENTS rule 15)
- Tests run with a visitor timezone different from `America/Chicago`.

## 6. Proof it works

On mount, call `GET /v1/public/business` and render the business name inside the Shadow DOM. Show a loading state, and an error state for `401` and network failure.

## 7. Dev harness

`dev/index.html` loads the embed with a key from `.env.local`. It must **not** be in `dist/`. A test fails if `dist/` contains anything except `embed.js` and its sourcemap. (AGENTS rule 14)

## 8. Docs

- `README.md`: the snippet, data attributes, commands, how to refresh the API files (only at a backend commit the developer gives, after it is pushed — WORKFLOW "When to refresh the API files").
- `EMBED-TRACKER.md`, **in the phase's last commit**:
  - Progress table: E-1 status → "🔄 Built, in review".
  - Changelog line: date, "E-1 built: scaffold, loader, API layer, money, time. API files from backend 7e15a04."
  - Do not change S-1 (already ✅).

## Tests (files you touch only)

- Loader: missing mount element, double load, key read, `data-api-base` override.
- API client: headers, error parsing with and without `field`, distinct `401` / `409` / `429` / network errors, no POST retry.
- Idempotency helper: same body → same key; changed body → new key; key order only → same key.
- Money: normal, thousands, negative, zero, malformed (dev throws, prod `"—"`), banned-function test.
- Time: business timezone differs from visitor timezone.
- Lint limits: a check fails on a file over the limits (proves the rules are active).
- Dist contents.

## Report

Use the format in **`AGENTS.md` §7** exactly. Also state that the API files came from backend **`7e15a04`**.

**Then stop. Do not start E-2.**
