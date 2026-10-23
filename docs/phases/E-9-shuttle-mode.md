# E-9 — Shuttle mode in the shared widget

## Approved request

One `embed.js` serves both taxi and shuttle businesses. `GET /v1/public/business`
selects the mode from `business.type`; customers do not choose a mode. Taxi
behavior remains exactly as delivered in E-8. This phase supersedes ED-003 and
the blanket prohibition on `/v1/public/shuttle/*` calls, but ED-006 remains in
force: E-9 is cash-only and includes no card selector or Square integration.

Branch `phase/E-9` from an updated `main`. Backend B-38C is merged into backend
`origin/main` and includes commit `6c4191f`. Refresh `openapi.json` and
`API_CONTRACT.md` from the exact backend `origin/main` commit, record that full
commit in both `SOURCE.md` files, regenerate API types, and verify both copied
files byte-for-byte.

Keep `docs/reference/bro/promo-code-edit.png` and
`docs/reference/bro/promo-codes-list.png` untracked and out of every commit.

## Backend gate

Use only generated types and documented fields. Stop and report a backend gap,
rather than inventing, renaming or deriving a field, if B-38C lacks any of:

- a public business type that distinguishes taxi from shuttle;
- grouped shuttle locations and reachable-destination filtering;
- an explicit way to decide whether senior and child prices are separate;
- scheduled and on-request outbound and return leg inputs;
- remaining-seat data;
- server-owned quote line items and totals;
- shuttle promo and cash-payment fields; or
- `SEATS_UNAVAILABLE` and `SCHEDULE_INACTIVE` error outcomes.

The B-38C refresh at backend commit
`2fdc7b1753dcce119b887313ebf16304341b2a0f` exposes
`OnRequestAvailability.vehicle_type_name`, but scheduled `Departure` exposes no
vehicle/car-name field. E-9 proceeds without that label: scheduled cards show
time, seats, price and the documented `service_label`; on-request shows
`vehicle_type_name`. **TODO E-9b / backend B-38D:** add `vehicle_type` to the
public scheduled `Departure`, then display its name in a small follow-up.

## Mode boundary

- Load the public business first and dispatch strictly on `business.type`.
- A taxi business calls only the existing taxi endpoints and renders the E-8
  flow unchanged.
- A shuttle business calls only the shuttle endpoints below.
- An unknown business type fails closed with the existing configuration error.
- Shared presentation and pure helpers may be reused, but taxi and shuttle
  request/state modules stay isolated.

## Shuttle flow

### 1. Trip

- Render **From** and **To** as grouped dropdowns from
  `GET /v1/public/shuttle/locations`.
- After an origin is selected, request destinations with its
  `exclude_location_id`; do not infer route availability locally.
- Collect the pickup date in the business timezone.
- Collect adult passengers. Show senior and child controls only when the API
  explicitly reports separate prices; do not infer this from labels.
- Offer **One way / Round trip**. Round trip adds a return selection after the
  outbound choice.

### 2. Departures

- Search with `GET /v1/public/shuttle/search` and show only bookable results
  returned by the server.
- Each scheduled result displays its time, seats remaining, price and
  `service_label` exactly as documented. Do not present `service_label` as a car
  name. Preserve server strings; never calculate money or availability.
- When no departures are returned, show the existing no-departures message.
  `filtered_summary` may refine the explanation without exposing hidden rows.
- For an `on_request` result, show a business-local time picker instead of a
  departure list, display its `vehicle_type_name`, and construct only the
  generated on-request leg shape.

### 3. Return

- After an outbound selection, a round trip calls
  `GET /v1/public/shuttle/search/return` using the generated scheduled or
  on-request outbound identity.
- Scheduled return options use the server's `selectable` flag and render
  `unselectable_reason` verbatim. Do not reproduce chronology calculations.
- An on-request return uses a time picker and enforces the server-published
  earliest local date/time as a UX guard; quote and booking remain authoritative.

### 4. Details and confirm

- Reuse the contact form, terms treatment, promo control, price-line
  presentation, error primitives and idempotency helper.
- Call `POST /v1/public/shuttle/quote`. Display its returned line items in
  order, with exact labels and money strings, and display its returned total.
- Promo Apply and Remove re-quote the cart; booking sends at most the one
  successfully applied code.
- E-9 sends cash only. Quote uses `payment_method: "cash"`; booking uses
  `payment: { "method": "cash" }`. Do not add a payment selector or Square.
- Call `POST /v1/public/shuttle/booking` with an `Idempotency-Key` bound to the
  complete request body. Reuse it for an unchanged cart and replace it only
  when the cart changes. Never retry the POST automatically.

## Errors and server ownership

- A booking-time `409 SEATS_UNAVAILABLE` or `SCHEDULE_INACTIVE` returns the
  customer to Departures with a clear message, preserves prior trip inputs and
  does not retry automatically.
- Blacked-out, inactive, past, sold-out and otherwise unbookable departures
  simply do not appear unless the API deliberately returns a disabled return
  option with its own reason.
- Peak, blackout, promo, insurance, fee and fare amounts are server-owned.
  Render server lines only; never calculate, merge, rename or reorder them.
- Existing unauthorized, rate-limit, timeout, network and unknown-outcome
  behavior remains consistent with the taxi flow.

## Packaging and size

- Keep one IIFE output at `dist/embed.js`; no lazy network chunks and no extra
  CSS file.
- Keep shuttle modules isolated so the mode boundary remains clear.
- Baseline is 93,422 bytes raw / 28,390 bytes gzip. Target approximately 35 KB
  gzip or less. If exceeded, consolidate shared confirmation/error code before
  committing; do not add a dependency merely to reduce the bundle.

## Verification and report

Focused coverage must include:

- business-type dispatch and proof that each mode avoids the other's endpoints;
- grouped/reachable locations and business-timezone date validation;
- conditional senior/child controls;
- scheduled departure display, empty-day behavior and on-request time input;
- scheduled and on-request return searches and request bodies;
- exact server line order/labels/amounts and promo re-quoting;
- cash-only quote and booking bodies;
- shuttle idempotency reuse/change behavior;
- `SEATS_UNAVAILABLE` and `SCHEDULE_INACTIVE` returning to Departures without
  an automatic retry; and
- regression coverage for the complete E-8 taxi flow.

Run focused Vitest files, `pnpm typecheck`,
`pnpm lint`, one `pnpm build`, then `pnpm test:dist`. Do not run `pnpm check`,
because it would build a second time; report it as **UNVERIFIED**. Report raw
and gzipped bundle size, backend gaps, decisions, BRO differences and anything
unverified. Commit the approved work, do not push, and finish with
`git log -5 --oneline`, `git status --short`, and the push command.

