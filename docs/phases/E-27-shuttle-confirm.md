# E-27 — Shuttle Confirm redesign and cash discount payment totals

**Scope:** Widget only.
**Reference:** `docs/phases/E-27/shuttle-confirm-reference.png`.

The attached client mockup is the visual target for the shuttle Confirm step.
The generated public API schema remains authoritative for fields and the backend
remains authoritative for every label and money value.

## Setup and backend gate

- Work on branch `phase/E-27` from current widget `main`; do not push.
- Keep unrelated worktrees and untracked files untouched.
- Build and commit Part A against the widget's current backend source, B-53
  commit `28fa989bed9c6ae5e041e2b47cbb7d59f912d623`, whose shuttle pricing shape
  comes from B-51.
- Only after all Part A commits exist, fetch backend `origin/main`. Do not read
  or use an unmerged B-55 branch.
- Continue to Part B only when fetched backend `origin/main` contains B-55 and
  its shuttle quote response publishes both `totals_by_payment_method` and
  `cash_discount`. If either field is absent, stop after Part A and report.
- For Part B, copy `openapi.json` and `API_CONTRACT.md` byte-for-byte from the
  fetched backend commit, update both `SOURCE.md` files, run `pnpm gen:api`, and
  commit the refresh separately.

## Part A — current B-51 contract only

### 1. Departures cleanup

- Remove the static `Pickup time will be arranged by phone` sentence from
  private departure cards.
- Preserve the Private badge, vehicle name, duration, capacity, server price,
  image, customer note, selection behavior, and date-only request behavior.
- Do not add a customer-selected private pickup time.

### 2. Shuttle Confirm trip summary

Redesign only the shuttle Confirm summary to follow the reference:

- Present the From → To route first.
- Show each selected leg with its direction, business-timezone date, and server
  schedule time. For a date-only private leg, show `Time: to be arranged`.
- Show the separate adult, senior, and child counts that are non-zero.
- Show check-in and carry-on counts.
- Show the selected vehicle display name and its server-owned mode, Shared or
  Private, for each leg. Do not infer either value from a name.
- Use semantic text and decorative icons; the section heading remains
  keyboard-focusable when Confirm opens.

### 3. Shuttle Confirm charges

- Render the current B-51 quote `line_items` in server order, with the exact
  server labels and amounts. Hide only exact `"0.00"` amounts.
- Render the current quote `total` exactly as returned.
- Keep Promo Code functional and move its presentation into the form column,
  after Personal Info, to match the reference flow.
- Preserve promo apply/remove behavior and server re-quoting.
- Do not display a cash-discount line, discount banner, savings amount, or
  method-specific total in Part A, even though `/business` already exposes
  cash-discount configuration.
- Do not perform money arithmetic or derive unit prices.

## Part B — only after merged B-55 is on backend `origin/main`

### 4. API refresh

- Refresh the generated API files from the exact fetched B-55 backend commit.
- Use only the generated `totals_by_payment_method` and `cash_discount` shapes.
  Do not hand-type either shape or use business settings to calculate savings.

### 5. Cash discount and payment method cards

- Show the cash-discount line and green savings banner only from the quote's
  `cash_discount` data and only when the generated response says it applies.
- Preserve every backend label, amount, percent, and total. Formatting money is
  string-only through `src/money/`.
- When both Cash and Card are usable, render two accessible payment cards.
  Cash is the default and displays the server-provided recommendation/savings;
  Card displays its server-provided standard total.
- Switching the selected card switches the visible charges total using
  `totals_by_payment_method`. It must not calculate a total in the widget.
- Continue sending `cash` for Cash and `online` for Card. Square behavior and
  capability gating remain unchanged.
- One usable method remains a non-interactive payment summary. No usable method
  retains the existing blocked-booking message.
- Promo changes must update the displayed method totals and discount data from
  the new quote response without stale responses winning.

## 6. Responsive layout

- Desktop follows the reference's two-column composition: Trip Summary and
  Charges on the left; Special Requests, Personal Info, Promo Code, Payment
  Method, Terms, and Create Trip on the right.
- Use the repository's existing colors and tokens; the reference is structural,
  not permission to hardcode sample text, values, or API data.
- At narrow widths, use one column in reading order with no horizontal scroll.
  Summary rows, charge rows, promo controls, payment cards, terms, Back, and
  Create Trip must remain readable and tappable at 360 px.
- Tap targets remain at least 38 px and form labels/errors remain associated.

## Non-regression requirements

- Shuttle endpoints and taxi endpoints remain separate. Taxi Confirm is
  unchanged.
- Keep separate shuttle passenger categories, Bags and Carry-on, zero-adult
  support, round-trip legs, separate required addresses, promo codes, terms,
  Square tokenization, booking idempotency, availability errors, and Back.
- Never send unknown request fields, retry a POST, add a host-page write, add a
  dependency, or add an output file.

## Required commits and order

Part A first:

1. `docs: E-27 spec`
2. `fix(widget): remove static private pickup text on departures`
3. `feat(widget): confirm step trip summary and charges`
4. `style(widget): confirm step mobile layout`

Then fetch backend `origin/main`. Only if B-55 is present:

5. `chore: refresh API files from backend <hash>`
6. `feat(widget): cash discount banner and payment method cards`
7. `docs: E-27 progress`

The numbered task plan labels these as commits 1, 3, 4, 6 and then 2, 5, 7;
the Git history intentionally follows the required work order above so no
unmerged backend branch is used and no completed Part A commit is rewritten.

## Tests and gates

Focused coverage must verify:

- private departure cards no longer contain the static pickup sentence while
  private selection and date-only requests are unchanged;
- one-way, round-trip, shared, and private Confirm summaries use selected-leg
  data and quote data without name-derived rules;
- B-51 `line_items` and total render in exact server order/value, exact zero
  rows are hidden, and no cash-discount UI exists in Part A;
- Promo Code remains functional in its new position;
- the 360 px layout has no horizontal overflow and retains 38 px targets;
- after B-55 only: Cash/Card totals, discount visibility, promo refresh, stale
  response protection, capability gating, and submitted payment method; and
- taxi Confirm is unchanged.

For every implementation commit, run focused Vitest, typecheck, and touched-file
lint. At the end of the phase, run full lint and full tests once; rerun only the
documented airport flake files if needed. Run exactly one production build,
then `test:dist`, then Playwright at 360 px and 1024 px. Save Confirm screenshots
under `docs/phases/E-27/`.

## Final report

Include the standard `AGENTS.md` phase report plus:

- `git log -10 --oneline` and `git status --short`;
- the backend `origin/main` hash checked for B-55 and the evidence for both
  required quote fields;
- `dist/embed.js` raw/gzip sizes and SHA-256;
- the screenshot list and differences from the supplied reference; and
- the push command without pushing.

Then stop.
