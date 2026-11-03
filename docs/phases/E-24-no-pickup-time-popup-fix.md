# E-24 — Remove shuttle pickup time and fix passenger popup overflow

**Status:** Implementation complete — browser verified
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

## Results

### Implementation

- Shuttle Departures renders only fixed scheduled rows. Both outbound and
  return omit pickup-time inputs, "Or pick your own time", on-request options,
  and private cars returned by the API.
- Shuttle selection types and the return-search, quote, and booking builders
  accept scheduled legs only. Generated API types remain unchanged, but widget
  requests can no longer contain an on-request pickup date, time, route, or
  vehicle id.
- A date with no visible fixed departure shows exactly: "No scheduled
  departures on this date. Please try another date."
- A zero-total passenger party shows "Select at least 1 passenger" and does not
  issue another departure search. Valid zero-adult parties with a senior or
  child remain allowed.
- Taxi pickup time is unchanged.
- The popup clipping came from the more-specific narrow-layout bag-counter rule,
  which changed every `.party-fields .counter-controls` grid to 28px outer
  tracks while passenger buttons retained a 40px minimum. The `+` button
  overflowed its track by 12px and ancestor clipping hid its border. The rule
  now excludes `.passenger-popup-stepper`, preserving compact bag controls and
  the popup's intended 40px tracks with equal 14px padding.

### Verification

- Scheduled-only commit gate: 6 focused files and 45 tests passed; TypeScript
  and touched-file ESLint passed.
- Overflow commit gate: 3 focused files and 52 tests passed; TypeScript,
  touched-file ESLint, browser-script syntax, and the pre-commit real Chromium
  geometry pass succeeded.
- Final full lint passed.
- The one full Vitest run passed 35/37 files and 383/393 tests. Its 10 failures
  were the documented timing flake in untouched `airport-marker.test.tsx` and
  `airport-location.test.ts`; the prescribed isolated rerun passed 13/13.
  A clean single-run full suite without that known flake remains **UNVERIFIED**.
- Exactly one production build passed, followed by `test:dist` (1/1). `dist/`
  contains only `embed.js` and `embed.js.map`.
- Playwright Chromium rendered the built widget at 320, 360, 375, 400, and
  1024px for shuttle and taxi. All measured rows had no horizontal scroll;
  every stepper right edge was inside its content boundary. Shuttle popup
  padding was equal on both sides. Taxi retains its native passenger select, so
  that control was activated and its two visible bag-stepper rows were measured.
- Bundle: 141,344 bytes raw and 40,438 bytes gzip. SHA-256:
  `3199eaa1ff8a3443d2e2055f323476bd048dee4d20420c287e952579cb72bb16`.

### Browser screenshots

- `docs/phases/E-24/shuttle-320.png`
- `docs/phases/E-24/shuttle-360.png`
- `docs/phases/E-24/shuttle-375.png`
- `docs/phases/E-24/shuttle-400.png`
- `docs/phases/E-24/shuttle-1024.png`
- `docs/phases/E-24/taxi-320.png`
- `docs/phases/E-24/taxi-360.png`
- `docs/phases/E-24/taxi-375.png`
- `docs/phases/E-24/taxi-400.png`
- `docs/phases/E-24/taxi-1024.png`

### Comparison, gaps, and decisions

- E-24 intentionally removes the E-17/E-21 any-time and private shuttle paths;
  fixed scheduled-row presentation remains unchanged. No matching BRO
  any-time/private reference exists in the repository.
- Taxi layout and pickup-time behavior are unchanged. The browser screenshots
  verify its native passenger select and compact bag steppers without overflow.
- No backend gap or dependency was introduced.
- ED-034 records that the widget now exposes only fixed shuttle schedules and
  ignores public on-request options.
