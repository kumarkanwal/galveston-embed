# E-6c — Company car-seat preferences and confirmation statuses

**Read first:** `AGENTS.md`, `EMBED-TRACKER.md`, `docs/architecture.md`,
`docs/decisions.md`, `docs/WORKFLOW.md`, `docs/phases/E-6-hardening.md`, and
`docs/phases/E-5-booking.md`.
**Branch:** `phase/E-6c`, from `main` after E-6b was merged.
**Approved API source:** backend commit
`9438c3d4f4f334e0a8ffd277bee15b988272ea17`.

## Goal

Replace the hard-coded Car Seats control with the business's public B-29
preferences, keep all car-seat pricing server-owned, handle stale-preference
errors without losing customer input, and make priced-booking confirmation
wording reflect the booking response status.

Meet & Greet is staff-only and must not appear in the widget.

## 1. API refresh

- Copy `openapi.json` and `docs/API_CONTRACT.md` byte-for-byte from the approved
  backend commit.
- Record the commit in both source records, verify byte size and SHA-256 against
  the source, and regenerate `src/api/schema.d.ts`.
- Use these new fields under `GET /v1/public/business` → `data.settings`:
  - `offer_car_seats: boolean` (schema default `true`)
  - `max_car_seats: number` (schema default `5`)
  - `car_seat_price: string` (schema default `"15.00"`)
- Do not add or infer any other public settings. Meet & Greet remains absent.

## 2. Step 3 Car Seats

- When `offer_car_seats` is false, hide the control and always send top-level
  `car_seats: 0` to price breakdown and booking.
- When it is true, offer counts from `0` through `max_car_seats`, replacing the
  hard-coded five. Treat a maximum of zero as hidden and send zero.
- For priced vehicles, show `car_seat_price` as a per-seat label such as
  `$15.00 each`. This is display-only: no browser arithmetic and no locally
  generated charge or total.
- Price-breakdown line items and total remain exactly what the backend returns.
- Request-a-Quote vehicles use the same visibility and option rules, but show
  no price and never call price breakdown.
- Send car seats only through the existing top-level `car_seats` field. Never
  add a generic `charges` entry.

## 3. Stale-preference errors

- A backend HTTP 400 whose `field` is `car_seats` can mean the company disabled
  seats or reduced its maximum after the widget loaded.
- Show the API message directly under Car Seats, mark the select invalid, focus
  it, retain the customer's selected count, and retain every other form field.
- Apply this to both price-breakdown and booking failures, including Request a
  Quote booking.
- The server wins. Never clamp, reset or otherwise change the customer's choice
  silently, and never retry a POST automatically.

## 4. Confirmation wording by response status

Use the existing booking response `status`; add no API fields.

- Request a Quote: keep the current quote-request wording.
- Priced booking with `status: "requested"` or `status: "pending"`:
  "Thank you! Your booking request was submitted. Your reservation number is
  **{number}**. The company will confirm your trip."
- Priced booking with `status: "confirmed"`: keep the current priced wording.
- Do not promise an email for any confirmation status.
- Continue to show the booking response total for priced bookings only.

## 5. Planned files

- API contract and generated types: `src/api/openapi.json`,
  `src/api/schema.d.ts`, `src/api/SOURCE.md`, `docs/api/API_CONTRACT.md`, and
  `docs/api/SOURCE.md`.
- Car-seat UI and errors: `src/app/confirm/Confirm.tsx`, `Charges.tsx`,
  `RequestQuotePrice.tsx`, `use-price-breakdown.ts`, `breakdown-error.ts`,
  `ConfirmForm.tsx`, `types.ts`, and `src/app/booking/booking-error.ts`.
- Confirmation status wording: `src/app/booking/Confirmation.tsx`.
- String-only price-label formatting: `src/money/format.ts` and `index.ts`.
- Styling: `src/styles/confirm.css`.
- Tests: `tests/confirm.test.tsx`, `tests/booking.test.tsx`, and
  `tests/money.test.ts`.
- Tracking and BRO differences: `EMBED-TRACKER.md`.

No new dependency or decision-log entry is expected.

## 6. Tests

Add focused coverage for:

- disabled and zero-maximum controls being hidden and sending zero;
- options `0..max_car_seats` and the priced per-seat label;
- Request a Quote using the same options without a price;
- top-level-only `car_seats`, with no generic charge;
- price-breakdown and booking `car_seats` errors appearing under the control,
  receiving focus, preserving the selection and preserving all other fields;
- no clamping after a server-side preference change and no automatic retry;
- Request-a-Quote booking error behavior;
- compact money formatting without numeric money operations;
- confirmed, priced requested/pending, and Request-a-Quote confirmation wording;
- no email promise for any confirmation status.

Run the focused tests for touched areas, then `pnpm check`.

## 7. BRO differences to record

- Car Seats is company-controlled instead of always showing a fixed `0–5` list.
- Priced vehicles show the configured per-seat label.
- Request-a-Quote vehicles intentionally show no car-seat price.
- Meet & Greet remains absent because it is staff-only.

## 8. Size and report

Baseline tracked `dist/embed.js`: 78,164 bytes raw and 24,659 bytes gzipped.
Report the final raw and gzipped sizes and their deltas, focused-test results,
`pnpm check`, files changed, backend gaps, decisions, BRO differences, and
anything unverified. Give Git commands beginning with
`git switch -c phase/E-6c`, but do not run Git commands that change the repo.

Then stop.
