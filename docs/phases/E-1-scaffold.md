# E-1 — Scaffold, loader, API layer, money module

**Read first:** `AGENTS.md`, `EMBED-TRACKER.md`, `docs/architecture.md`, `docs/decisions.md`.
**Repo:** `galveston-embed` (new and empty apart from docs). Run `git remote -v` before the first commit.

## Goal

A working skeleton: the script tag mounts a Shadow DOM, calls `GET /v1/public/business`, and shows the business name. No booking UI yet. Everything later phases build on is in place and tested.

## 1. Project setup

- Vite library mode, TypeScript `strict`, Preact. Output **one IIFE file**: `dist/embed.js`. No code splitting. (ED-008)
- Vitest for tests.
- pnpm **11.19.0** via the `packageManager` field. **Exact versions only** — no `^` or `~`.
- openapi-typescript and openapi-fetch for the API layer.
- `.env.example` with `VITE_API_BASE` and `VITE_MAPS_BROWSER_KEY`. Never commit `.env*` files; add them to `.gitignore`.
- Scripts: `dev`, `build`, `test`, `check`, `gen:api` (see `AGENTS.md`).

## 2. Loader — `src/embed.ts`

The client pastes:

```html
<div id="galveston-booking"></div>
<script src="https://<host>/embed.js" data-business-key="bk_live_..." async></script>
```

- Capture `document.currentScript` **synchronously at load**; read `data-business-key` and optional `data-api-base`.
- Default API base from `VITE_API_BASE`. No hardcoded URLs.
- Mount into `#galveston-booking`. If missing, one `console.error` and stop.
- Attach a Shadow DOM and render inside it. All styles inside it.
- If the script loads twice, mount once.
- Never throw into the host page: catch at the mount boundary, log one `console.error`.

## 3. API layer — `src/api/`

- Copy `openapi.json` from `galveston-backend` **at the commit the developer gives you**. Record the commit hash in `src/api/SOURCE.md`. If no commit is given, **stop and ask** — do not take whatever is on disk.
- Generate `schema.d.ts` with openapi-typescript. Never edit it by hand.
- Client: every request sends `X-Business-Key` and `Content-Type: application/json`.
- Parse `{ "error": { "code", "message", "field"? } }` into a typed `ApiError`. `field` may be absent.
- Distinct error types for `409 REQUEST_IN_FLIGHT`, `429 RATE_LIMITED`, `401`, network failure.
- `Idempotency-Key` helper: returns the same UUID for the same cart until the cart changes.
- **No automatic retry on any POST.**
- Only typed client functions in this phase — no booking UI.

## 4. Money — `src/money/`

- `formatMoney(amount: string, currency: "USD"): string` → `"$1,413.75"`, by splitting the string. Handles negatives (`"-45.00"` → `"-$45.00"`) and zero.
- Malformed input (not `/^-?\d+\.\d{2}$/`): throw in development, render `"—"` in production.
- A test fails if `parseFloat`, `Number(`, `toFixed(` or `Math.` appears in `src/money/`.

## 5. Time — `src/time/`

- Helpers that format and compare dates/times in the **business's timezone** from `/business`, not the browser's. (AGENTS rule 13)
- Tests with a visitor timezone different from `America/Chicago`.

## 6. Proof it works

On mount, call `GET /v1/public/business` and render the business name inside the Shadow DOM. Show a loading state, and an error state for `401` and network failure.

## 7. Dev harness

`dev/index.html` loads the built embed with a key from `.env.local`. It must **not** be in `dist/`. A test fails if `dist/` contains anything except `embed.js` and its sourcemap.

## 8. Docs

- `README.md`: the snippet, data attributes, commands, how to refresh `openapi.json` (only after a complete backend change is pushed).
- Update `EMBED-TRACKER.md`: mark S-1 done, add a changelog line.

## Tests (files you touch only)

Loader (missing mount, double load, key read), API client (headers, error parsing with and without `field`, no POST retry), idempotency helper, money, time, dist contents.

## Report

1. Commits and `git log --oneline`.
2. `dist/embed.js` size, raw and gzipped.
3. The backend commit `openapi.json` came from.
4. Test results.
5. Anything you decided that this spec did not cover. Mark anything unverified **UNVERIFIED**.

**Then stop. Do not start E-2.**
