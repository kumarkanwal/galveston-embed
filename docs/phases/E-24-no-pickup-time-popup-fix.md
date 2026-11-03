# E-24 — Remove shuttle pickup time and fix passenger popup overflow

**Status:** Specified
**Scope:** Widget only.

## Setup

- Build in `.worktrees/E-24` from freshly fetched `origin/main` after E-23.1
  merged, on branch `phase/E-24`.
- Keep every other worktree and existing untracked file untouched.
- Do not push.
- This specification is the first phase commit: `docs: E-24 spec`.

## Required behavior

### Shuttle fixed departures only

1. Remove the pickup-time input from the shuttle Departures step entirely for
   both outbound and return legs, including the "Or pick your own time"
   section and every private or any-time time field.
2. Show only fixed scheduled departures: each visible row has a time and a
   Choose action.
3. Hide any-time, on-request, and private cars because those paths require a
   customer pickup time. Do not include them in shuttle quote or booking
   requests.
4. When a leg has no fixed departures for the selected date, show the existing
   friendly message exactly: "No scheduled departures on this date. Please try
   another date."
5. Remove unused any-time picker code and tests without leaving dead code.
6. Taxi pickup-time behavior remains unchanged.

### Passenger popup containment

1. Fix the real overflow cause that still clips the `+` button border at phone
   widths around 360–400px in shuttle and taxi layouts. Check fixed widths,
   negative margins, ancestor overflow, input minimum widths, box sizing, and
   scrollbars rather than applying an unverified visual patch.
2. Keep equal left and right popup padding. Every stepper must sit fully inside
   the popup with its right border visible.
3. Preserve bags and carry-on controls, compact spacing, layout, accessibility,
   and the zero-adult validation rule: a total passenger count of zero shows
   "Select at least 1 passenger" and Find Departures must not search.

## Browser verification

- Use the preinstalled Playwright Chromium to render the built widget at 320,
  360, 375, and 400px plus desktop for both shuttle and taxi.
- Open the passenger control and assert for every relevant row that the stepper
  bounding-box right edge is no greater than the popup content-box right edge
  minus its right padding.
- Assert that the widget, popup, and tested rows have no horizontal scroll.
- Save browser screenshots under `docs/phases/E-24/` and list them in the final
  report.

## Commit plan

1. `docs: E-24 spec`
2. `feat(widget): remove shuttle pickup time; fixed departures only`
3. `fix(widget): passenger popup overflow (browser-verified)`
4. `docs: E-24 progress`

## Tests and gates

Tests cover:

- no time input rendered on shuttle Departures;
- any-time, on-request, and private cars are not shown or sent;
- the friendly empty message appears when no fixed departure exists;
- zero total passengers blocks shuttle search;
- Playwright overflow checks at 320, 360, 375, and 400px for shuttle and taxi,
  with an additional desktop browser pass.

For each implementation commit, run focused Vitest, TypeScript typecheck, and
ESLint on touched files. At the end, run full lint and full tests once; if the
known airport flake appears, rerun only its files. Run exactly one production
build, then `test:dist`, then the Playwright checks.

## Final report

Report `git log -6 --oneline`, clean `git status --short`, the push command
without pushing, `dist/embed.js` raw and gzip sizes plus SHA-256, and the
screenshot list. Include test results, BRO differences, backend gaps, decisions,
and anything unverified, then stop.
