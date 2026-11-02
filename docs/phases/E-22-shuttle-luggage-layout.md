# E-22 — Shuttle luggage, zero adults, trip layout, and departure labels

**Status:** Implementation complete — browser verification unverified
**Scope:** Widget only.

## Setup

- Build in a new clean worktree from freshly fetched `origin/main` on branch
  `phase/E-22`.
- Keep every other worktree and all existing untracked files untouched.
- Do not push.
- This specification is the first phase commit: `docs: E-22 spec`.
- Before implementation, refresh the API sources from backend `origin/main`
  containing B-50 in the same byte-for-byte manner as earlier API refreshes.
  Confirm locally and against
  `https://galveston-api.kanwalkumar.com/openapi.json` that
  `POST /v1/public/shuttle/quote` and
  `POST /v1/public/shuttle/booking` accept and return `large_bags` and
  `small_bags`, each constrained to `0..99` with default `0`.
- Commit the refresh separately as
  `chore: refresh API files from backend <B-50 hash>`.

## Required behavior

All changes in this phase are shuttle-only. Taxi behavior remains unchanged
unless this specification explicitly says otherwise.

### 1. Trip-step layout

Match the supplied shuttle reference layout:

1. Row 1: `From` | `To`.
2. Row 2: `Departure Date` | `Return Date`.
   - Return Date is greyed and disabled until `Round trip` is checked.
   - When Round trip is checked, Return Date is enabled and required.
   - Return Date must be on or after Departure Date.
3. Row 3: `Passengers` | `Bags` | `Carry-on`.
   - Use the same stepper controls, icons, and sizes as taxi.
   - Keep all three controls on one line at mobile widths.
4. Row 4: the `Round trip` box.
5. Then show the business-timezone note and `Find Departures` action.

Preserve the existing whole-field interactions, compact layout, accessibility,
and business-timezone date handling.

### 2. Shuttle bags and carry-on

- `Bags` maps to `large_bags`.
- `Carry-on` maps to `small_bags`.
- Send both generated-schema fields in shuttle quote and booking requests.
- The fields are tracking-only and must not change client-side pricing.
- Show both values on Confirm and on the booking confirmation, using the
  established taxi presentation.
- Continue to display only server-provided prices, line items, labels, ordering,
  and totals.

### 3. Shuttle passenger picker

- Adults may be zero.
- A party with `0` adults and at least one senior or child is valid.
- A party with all passenger categories at `0` is invalid and must be blocked.
- Preserve server-owned minimum-passenger, capacity, and pricing behavior.

### 4. Departure result labels

- Do not render the internal route name on the Departures step.
- Continue to render the departure duration when the API provides it.
- Preserve the established fixed/any-time ordering, server prices, selection
  behavior, compact layout, and accessibility.

## Non-regression requirements

- Taxi rendering, requests, validation, luggage handling, and booking flow are
  unchanged.
- Shuttle quote and booking requests contain only generated API schema fields.
- Shuttle bag counts do not alter, derive, or recalculate prices in the widget.
- Server line items, labels, amounts, order, and totals remain authoritative.
- Mobile `Passengers | Bags | Carry-on` stays on one line.
- No new dependency, host-page write, output file, or retry behavior is added.

## Commit plan

1. `docs: E-22 spec`
2. `chore: refresh API files from backend <B-50 hash>`
3. `feat(widget): shuttle bags and carry-on`
4. `feat(widget): allow zero adults in shuttle passenger picker`
5. `style(widget): shuttle trip step layout with return date beside departure`
6. `fix(widget): hide internal route name on departures`
7. `docs: E-22 progress`

## Tests

Focused coverage must verify:

- Bags and Carry-on render on the shuttle Trip step;
- `large_bags` and `small_bags` are sent in shuttle quote and booking requests;
- Bags and Carry-on are shown on Confirm and booking confirmation;
- `0` adults plus `1` senior is allowed;
- all-zero passenger categories are blocked;
- Return Date is disabled until Round trip is checked;
- enabled Return Date is required and must be on or after Departure Date;
- the internal route name is not rendered and duration is rendered;
- taxi behavior is unchanged; and
- the mobile Passengers/Bags/Carry-on row stays on one line.

For every implementation commit, run focused Vitest for touched behavior,
TypeScript typecheck, and ESLint only on touched files. Run final full lint and
full tests once. If the known airport test flake occurs in the full suite,
rerun only those files and report both results. Run one production build and
`test:dist` once at the end.

## Final report

Report:

1. `git log -9 --oneline`;
2. `git status --short`;
3. the push command without pushing;
4. `dist/embed.js` raw and gzipped sizes plus SHA-256;
5. focused and final gate results;
6. differences from BRO screenshots and why;
7. backend gaps found;
8. decisions not covered by this spec; and
9. everything unverified, marked **UNVERIFIED**.

Then stop.

## Results

### Implementation

- Refreshed the API contract and generated types byte-for-byte from merged
  backend B-50 at `5761a81fa0cf549182cbc54c95b4e641c2ce299d`. The fetched and
  deployed OpenAPI documents both confirm `large_bags` and `small_bags` on
  shuttle quote and booking requests (`0..99`, default `0`) and responses.
- Shuttle Trip now reuses the taxi bag icons and steppers, enforces the
  generated per-field limits plus the public business combined limit, and
  sends the chosen values in quote and booking requests.
- Confirm renders the quote-returned bag counts; the final shuttle confirmation
  renders the booking-returned counts. Taxi confirmation remains unchanged.
- Adults can reach zero while combined Adults, Seniors, and Children must still
  total at least one. A zero-adult senior party is retained in search, quote,
  and booking state.
- Trip renders From/To, paired Departure/Return dates, one
  Passengers/Bags/Carry-on row, Round trip, the timezone note, and Find
  Departures in that order. Return Date remains visible but disabled and grey
  until Round trip is selected, then becomes required with the existing
  on-or-after-departure validation.
- Departures no longer renders the internal `service_label`; fixed and any-time
  rows retain the server duration, vehicle, seats, mode, and server price.

### Verification

- API refresh gate: 28/28 focused tests passed; typecheck and touched-file lint
  passed after the generated required fields were added with zero compatibility
  defaults.
- Luggage gate: 53/53 focused tests passed; typecheck and touched-file lint
  passed.
- Zero-adult gate: 30/30 focused tests passed; typecheck and touched-file lint
  passed.
- Layout gate: 46/46 focused tests passed; typecheck and touched-file lint
  passed.
- Departure-label gate: 28/28 focused tests passed; typecheck and touched-file
  lint passed.
- Final full lint passed. Final full Vitest passed 35/37 files and 382/392
  tests. The 10 failures were the documented timing flake in untouched
  `airport-marker.test.tsx` and `airport-location.test.ts`; those two files then
  passed 13/13 together in isolation. **UNVERIFIED:** a clean single-run full
  suite without the known airport flake.
- The single production build and `test:dist` passed. `dist/` contains only
  `embed.js` and `embed.js.map`.
- Bundle: 145,217 bytes raw and 41,150 bytes gzip. SHA-256:
  `d8eed9b2a4912688e342f10b42ff1cce1864ccbef2d1512b857c9541a249a4d6`.

### Comparison, gaps, and decisions

- The repository has no shuttle BRO screenshots. Automated DOM, behavior, CSS,
  accessibility, and 360px-container regressions pass, but the requested live
  reference and browser comparison is **UNVERIFIED**.
- Backend documentation gap: B-50 is present in backend `origin/main`
  `openapi.json` and the deployed OpenAPI document, but the copied
  `docs/API_CONTRACT.md` still identifies itself as Version 1.11 through B-49
  and does not document the shuttle luggage fields. Generated types remain
  authoritative for this implementation; the backend contract prose needs a
  follow-up refresh.
- ED-033 records this specification's explicit override of ED-029's earlier
  scheduled-card label consequence. No decision outside this specification was
  required, and no dependency was added.
