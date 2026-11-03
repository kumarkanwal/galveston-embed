# E-25 — Private shuttle pricing and conditional return date

**Status:** Ready to build
**Scope:** Widget only.

## Setup

- Build in `.worktrees/E-25` from freshly fetched `origin/main`, on branch
  `phase/E-25`.
- Keep every other worktree and all existing untracked files untouched.
- Do not push.
- This specification, ED-035, and the matching architecture update are the
  first phase commit: `docs: E-25 spec`.
- Before implementation, refresh the API sources from backend `origin/main`
  containing merged B-51 in the same byte-for-byte manner as earlier API
  refreshes. Confirm in backend source and against the deployed
  `openapi.json` that:
  - private departure cards are date-only and publish `time: null`;
  - shuttle search accepts `trip_type`;
  - search-row prices use the selected passenger mix;
  - shuttle quote and booking confirmation expose per-passenger breakdowns.
- If any capability is missing, stop and report it. Commit a successful refresh
  separately as `chore: refresh API files from backend <hash>`.

## Required behavior

All changes are shuttle-only except the conditional taxi Return Date behavior
described below. The backend remains the only pricing authority.

### 1. Return Date only for round trips

1. Show Return Date only while `Round trip` is checked for shuttle, and apply
   the same rule to taxi if taxi does not already behave that way.
2. Keep the existing two-column layout: Departure Date retains its column and
   the hidden Return Date slot retains its space so toggling causes no layout
   jump.
3. While hidden, Return Date is disabled, not focusable, not announced, has
   `aria-hidden`, is cleared, and is omitted from requests.
4. While shown, Return Date appears in the same slot, is required, and must be
   on or after Departure Date.

### 2. Private cars every day

1. Show private shuttle cars as rows on every searched date.
2. Each private row shows a `Private` tag, vehicle name, capacity, the exact
   server price, and `Pickup time will be arranged by phone`.
3. Private rows have no time field. Choosing a row selects that car for the
   searched date.
4. Confirm and booking confirmation show `Time: to be arranged` for a private
   leg.
5. Shared cars remain fixed scheduled departure rows only.
6. Booking sends a date without a customer-selected time for private legs.

### 3. Passenger-mix row prices

1. Send `trip_type` as `one_way` or `round_trip` on shuttle search.
2. Render the server-provided row price for the selected adult, senior, and
   child mix. Never derive or display a cheapest-seat price.
3. For round trips, each leg shows its own direction's server-provided
   round-trip price. The displayed total is always the server total.

### 4. Per-passenger pricing lines

1. On Confirm and booking confirmation, render the server breakdown per leg and
   per passenger category, for example:

   ```text
   Outbound: Adult × 1 $18.00 · Senior × 1 $22.00
   Return:   Adult × 1 $40.00 · Senior × 1 $38.00
   ```

2. Preserve server labels, amounts, and order. Do not calculate price values in
   the widget.
3. Show charges such as Peak once and mark them as included.
4. Show promo and card-fee lines exactly as returned by the server.
5. Show the server total exactly as returned.

### 5. Non-regression requirements

- Preserve Bags and Carry-on behavior, the valid zero-adult rule, mobile rows,
  the passenger-popup fix, compact spacing, and accessibility.
- Taxi behavior is unchanged except conditional Return Date if needed.
- Money remains a string and no client-side price arithmetic is introduced.
- Shuttle requests contain only generated API schema fields.
- No new dependency, host-page write, output file, or retry behavior is added.

## Commit plan

1. `docs: E-25 spec`
2. `chore: refresh API files from backend <hash>`
3. `feat(widget): return date only when round trip`
4. `feat(widget): private cars every day, time arranged by phone`
5. `feat(widget): passenger-mix prices with trip type`
6. `feat(widget): per-passenger price lines on confirm and confirmation`
7. `docs: E-25 progress`

## Tests and gates

Focused coverage must verify:

- Return Date is hidden, disabled, inaccessible, cleared, and not sent until
  Round trip is selected;
- its grid slot remains present so the layout does not jump;
- when selected, Return Date is shown, required, and validated against
  Departure Date;
- private rows appear on any date without a time field and include the arranged
  by phone text;
- private booking sends the date only;
- shuttle search sends `trip_type`;
- each row price equals the server value for the selected passenger mix;
- Confirm and confirmation per-leg lines equal the server breakdown and total;
- a Peak charge is shown once and marked included; and
- taxi is unchanged except the scoped Return Date behavior if applied.

For each implementation commit, run focused Vitest, TypeScript typecheck, and
ESLint only on touched files. At the end, run full lint and full tests once. If
the known airport flake appears, rerun only its files. Run exactly one
production build, then `test:dist`, then Playwright checks.

Use preinstalled Playwright Chromium to save 360px and desktop screenshots of
the Trip step with Round trip unticked and ticked, and of Confirm. Save them
under `docs/phases/E-25/` and list them in the final report.

## Final report

Report:

1. `git log -9 --oneline`;
2. clean `git status --short`;
3. the push command without pushing;
4. `dist/embed.js` raw and gzip sizes plus SHA-256;
5. focused and final gate results;
6. the screenshot list;
7. differences from BRO screenshots and why;
8. backend gaps found;
9. decisions not covered by this specification; and
10. everything unverified, marked **UNVERIFIED**.

Then stop.
