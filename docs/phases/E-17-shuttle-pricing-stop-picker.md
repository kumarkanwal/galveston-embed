# E-17 — Shuttle pricing, modes, minimums and stop picker

**Status:** Complete — ready for review
**Contract:** backend `f693611a104dd52cf89d728add4c609a795c830c` (B-48)

## Scope delivered

- Compact taxi and shuttle form spacing across all steps, with 16px input text,
  controls and mobile rows kept at least 38px high, and party controls retained on
  one line at 360px.
- Accessible Shared Shuttle and Private Shuttle labels on every shuttle choice.
- Private shuttle date/time pickup without a scheduled-departure list, using the
  existing business-time lead rules and showing its group-vehicle note.
- B-48 pricing summaries: per-seat display remains server-owned, tier rules and
  selected-party totals use server-returned values, and fixed-vehicle summaries
  show their API capacity. No charged amount is calculated in the widget.
- Effective minimum-passenger checks for each route, vehicle, date and round-trip
  leg. Continue is blocked below the minimum; `MIN_PASSENGERS_NOT_MET` preserves
  inputs and uses the server message with a safe generic fallback.
- Private passenger capacity checks and per-leg mode, price and minimum summaries.
- Public business logo in the widget header when `logo_url` is present.
- Shuttle-only From/To searchable accordion comboboxes. Categories start
  collapsed, only one manually opened category is retained, search opens matching
  categories, selected items reopen highlighted, and To remains restricted to the
  backend locations reachable from From. The controls close on selection, outside
  click, Escape or Tab and support Up/Down/Enter keyboard operation.

Public shuttle collections do not expose activation flags; deactivated vehicles,
zones, routes, airports and airlines therefore remain excluded by their public
backend endpoints. Existing friendly empty-result messages are retained, including
an empty-locations message in the stop picker.

## Verification

Each implementation commit passed focused Vitest coverage for its touched flow,
TypeScript strict checking, and ESLint on touched TypeScript files. Final branch
gates are recorded in the E-17 handoff report.

## BRO comparison

E-17 extends the post-BRO shuttle flow. No equivalent BRO shared/private pricing,
effective-minimum, business-logo, or grouped searchable stop-picker screen is
available for a meaningful same-input comparison. Taxi appearance retains the
existing widths, colours and layout with vertical spacing only reduced.

## Backend gaps and decisions

No backend gap was worked around. The final booking/quote remains server-owned,
money stays string-valued, and no new dependency or architectural decision was
introduced.
