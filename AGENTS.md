# AGENTS.md — galveston-embed

**Read before any work, in this order:** this file → `EMBED-TRACKER.md` → `docs/architecture.md` → `docs/decisions.md` → the phase spec you were given in `docs/phases/`.

How phases are built, compared with BRO and approved: `docs/WORKFLOW.md`.

If a phase spec contradicts this file, `docs/architecture.md` or `docs/decisions.md`, **stop and ask**. Do not pick one.

---

## 1. What this repo is

The customer booking widget for six transport companies. One `<script>` tag the company pastes into its own website. It runs in the visitor's browser and calls the hosted `galveston-backend` public API (`/v1/public/*`).

It replaces the companies' current Book Rides Online (BRO) booking form. Screenshots: `docs/reference/bro/`.

**Related repos** (not editable from here):

| Repo | What it is |
|---|---|
| `galveston-backend` | FastAPI API. Owns all pricing and booking logic |
| `galveston-admin` | Next.js admin panel. Where staff configure vehicles and prices and see bookings |
| `galveston-widgets` | **Cancelled WordPress plugin. Never read or reuse it** |

---

## 2. Hard rules

Breaking any of these is a bug, even if tests pass.

1. **The backend decides everything about money.** Show line items, labels, amounts and totals exactly as the API returns them. Never rename, recalculate or reorder by label. (ED-011)
2. **Money is a string** (`"413.75"`). Never `parseFloat`, `Number()`, `toFixed()`, `Math.*` or arithmetic on money. Format by string manipulation only, in `src/money/`. (ED-007)
3. **Never invent API shapes.** Types come only from `src/api/openapi.json` via openapi-typescript. If the widget needs a field that is not there, **stop and report it as a backend gap**. Never hardcode, fake or compute it — unless the phase spec explicitly allows a marked temporary constant.
4. **Request bodies reject unknown fields with 400.** Send only schema fields.
5. **Never retry a POST automatically.** Booking sends an `Idempotency-Key` that stays the same for the same cart and changes only when the cart changes.
6. **Payment capability comes only from `GET /v1/public/business`.** Cash-only and Request a Quote paths send `"cash"`. Offer Card and send `"online"` only when `payments.card_available` is true; select Square's SDK only from `payments.environment`. (ED-030)
7. **Mode comes only from `GET /v1/public/business`.** Taxi businesses show only `one_way`, `round_trip`, `airport_pickup`, and `airport_dropoff` and still ignore `hourly`; shuttle businesses use only `/v1/public/shuttle/*`. Never mix the two endpoint families. (ED-016, ED-027, ED-029)
8. **Names are display text.** Never read a capacity, limit or rule from a vehicle or service name.
9. **Request a Quote vehicles skip price-breakdown** and go straight to booking. (ED-009)
10. **Zipcodes come from Google Places `address_components`**, never from parsing typed text. (ED-010)
11. **All widget-owned UI and CSS live inside a Shadow DOM.** The only scoped exceptions are loading the Google Maps script once (ED-017), and, for an explicitly card-ready business, loading Square's environment-specific script once plus projecting one empty light-DOM card container inside `#galveston-booking` through a named slot for Square's managed iframe (ED-030). No other host-page writes. (ED-008)
12. **Never throw into the host page.** Catch at the mount boundary; log one `console.error`.
13. **Output is one file:** `dist/embed.js`. No code splitting, no extra CSS file.
14. **Nothing from `dev/` ships.** A test fails if `dist/` contains anything except `embed.js` and its sourcemap.
15. **Dates and times use the business's timezone** from `GET /v1/public/business`, never the visitor's.
16. **Terms & Conditions HTML is sanitised** before rendering, and hidden when null.
17. **No secrets in the repo.** The business key goes in `.env.local` for development and in the `data-business-key` script attribute in production. The Maps browser key is ours (one key, referrer-restricted) and comes from the build-time `VITE_MAPS_BROWSER_KEY` in both. Never commit `.env*`.

---

## 3. Phases

One phase at a time: **spec → build → report → review → merge**. Do not start the next phase until the report is reviewed. Each phase has its own spec in `docs/phases/`.

### Core — the booking flow

| Phase | Scope | Depends on | Status |
|---|---|---|---|
| **E-1** | Scaffold, loader, Shadow DOM, API client, idempotency, money, timezone helpers, dev harness | — | ⬜ |
| **E-2** | **Step 1 — Trip Details.** Service dropdown, date/time, passengers/luggage, address autocomplete with zipcode, pin icon, map, airport fields (airport, airline, flight) | E-1 approved; Maps browser key | ⬜ |
| **E-3** | **Step 2 — Choose Vehicle.** Check Pricing → quote, vehicle list with Priced / Request a Quote / Unavailable, photos, capacity, out-of-area path, back | E-2; VPS deployed (pricing migration) | ⬜ |
| **E-4** | **Step 3 — Confirm.** Trip summary, price breakdown, car seats, special requests, customer details, Terms | E-3 | ⬜ |
| **E-5** | **Booking.** Create Trip (cash), Request a Quote booking, confirmation screen, every error state | E-4; BRO confirmation screenshot | ⬜ |
| **E-6** | **Release readiness.** Mobile layouts, accessibility, side-by-side test against BRO, production build and hosting on the VPS, client domains in CORS | E-5 | ⬜ |

**After E-6 a real customer can book on a client website and the booking appears in the admin panel.**

### Add-ons — after the core is live

| Phase | Scope | Blocked by |
|---|---|---|
| **E-7** | Card payment (Square Web Payments SDK) | Each company's Square location id, Square sandbox B-16 |
| **E-7a** | Promo codes | Backend promos wired into the new pricing path |
| **E-7b** | Peak/blackout display | Backend B-35 |
| **E-8** | Taxi round trip, split luggage counts, form toggles | Backend B-37 |
| **E-9** | Shuttle mode in the same widget | Backend B-38C |
| **E-9b** | Scheduled-departure car name | Backend B-38D public `Departure.vehicle_type` |
| **E-11** | Hourly: hours field and Add Stops | Backend hourly pricing (Part 3, client question C-6) |

---

## 4. Code standards

Enforced by lint and tests, not just written here. Agents produce large files unless a check stops them.

| Limit | Value |
|---|---|
| File length | ≤ 400 lines (hard) |
| Function length | ≤ 50 lines |
| Nesting depth | ≤ 3 |
| Component location | `src/app/<step>/` — one folder per step |
| Shared logic | `src/api/`, `src/money/`, `src/time/`, `src/maps/` — pure functions with tests |

- TypeScript `strict`. No `any` except in generated files.
- No new dependency without saying why in the report. Exact versions only.
- Do not disable a lint rule or add a checker exception.

---

## 5. Source of truth

| Topic | File |
|---|---|
| API behaviour | `docs/api/API_CONTRACT.md` (backend commit in `docs/api/SOURCE.md`) |
| API types | `src/api/openapi.json` (backend commit in `src/api/SOURCE.md`) |
| What's built, what's next | `EMBED-TRACKER.md` |
| Why things are the way they are | `docs/decisions.md` |
| What the form looks like | `docs/reference/bro/` — a reference, **not** the full spec. It may contain BRO bugs and dropped features |

### Refreshing the API files

Copy `openapi.json` and `API_CONTRACT.md` from `galveston-backend` **only at a commit the developer gives you**, and only after that backend change is pushed. Record the hash in both `SOURCE.md` files. A stale or half-finished schema broke the admin panel silently four times.

---

## 6. Definition of done (every phase)

1. `pnpm check` passes: typecheck, lint, size limits, tests, build, dist-contents test.
2. Tests cover the phase's logic, including error states.
3. Every screen in the phase is compared with its BRO screenshot; differences are listed in the report.
4. `EMBED-TRACKER.md` is updated (status + changelog line) **in the phase's last commit**.
5. A new decision is added to `docs/decisions.md` if one was made.
6. Every backend gap found is reported, not worked around.

---

## 7. Report format (end of every phase)

1. Commits (`git log --oneline`) and `git status` (must be clean).
2. `dist/embed.js` size, raw and gzipped.
3. Test results for files touched.
4. Differences from the BRO screenshots, and why.
5. Backend gaps found.
6. Decisions made that the spec didn't cover.
7. Anything unverified, marked **UNVERIFIED**.

Then stop.

---

## 8. Working rules

- Run `git remote -v` before every commit.
- Never force-push. Never rewrite pushed commits. Use `git revert` for committed work, **never Codex's Undo**.
- Write files as UTF-8 without BOM (PowerShell defaults to UTF-16 — this has bitten the project 3+ times).
- Run the tests for files you touched. The developer runs `pnpm check` before merging.
- **Agents report cleanups they didn't do.** Show `git status` and file listings as evidence.
- On `429` from the API: stop and report. Never retry in a loop.

---

## 9. Commands

| Command | Does |
|---|---|
| `pnpm dev` | Dev harness `dev/index.html` against the API base in `.env.local` |
| `pnpm build` | Builds `dist/embed.js` |
| `pnpm test` | Vitest |
| `pnpm check` | Typecheck, lint, size limits, test, build, dist-contents test |
| `pnpm gen:api` | Regenerates `src/api/schema.d.ts` from `src/api/openapi.json` |
