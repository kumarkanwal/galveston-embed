# E-21 — Simplify any-time shuttle leg selection

**Status:** Implementation complete — browser verification unverified
**Scope:** Widget only.

## Setup

- Build in a new clean worktree from freshly fetched `origin/main` on branch
  `phase/E-21`.
- Keep the existing E-20 worktree and branch, untracked `.worktrees/`, and BRO
  screenshots untouched.
- Do not push.
- This specification is the first phase commit: `docs: E-21 spec`.

## Problem

On the Departures step, an any-time leg renders one large card per vehicle. Each
card repeats “Choose your pickup time”, the pickup date already selected on the
Trip step, a pickup-time field, and a Choose Time action. Fixed-time departures
instead use compact full-width rows. The repeated date and time controls make
mixed and round-trip results inconsistent, unnecessarily tall, and difficult to
scan.

## Required behavior

1. The Departures step has no date input. Use the date selected on the Trip step
   and show it in the leg section title, for example
   `Choose Return · Wed, Nov 4`. The customer uses Back to change the date.
2. Render one pickup-time field per any-time leg at the top of that leg's
   any-time section. Label it `Pickup time` and preserve the existing
   whole-field click picker. Show lead-time and availability-window errors under
   that field.
3. Render any-time vehicles as compact full-width rows using the same layout as
   fixed departure rows. Each row shows:
   - the server-backed Shared or Private badge;
   - vehicle name;
   - seats/capacity;
   - the server price in the same label format as fixed rows, such as
     `$28.50 USD` for the selected passengers;
   - no `From` wording unless the server explicitly identifies the price as a
     starting price; and
   - a `Choose` button.
4. Disable `Choose` until a pickup time is entered and expose the hint
   `Pick a time first` accessibly. After selection, mark the row selected using
   the fixed-row selected style.
5. Departure and Return sections use the same width and alignment. Do not render
   narrow centered vehicle cards.
6. When a leg contains both fixed shared departures and any-time/private
   vehicles, render the fixed rows first, then an `Or pick your own time`
   subsection containing the single pickup-time field and any-time vehicle rows.
7. Preserve server authority and existing behavior:
   - minimum-passenger and capacity checks;
   - server quote values, labels, ordering, and totals;
   - round-trip selection per leg;
   - business-timezone date/time handling;
   - compact spacing and usability at 360px;
   - keyboard and screen-reader accessibility; and
   - taxi behavior and shuttle request shapes.

## Commit plan

1. `docs: E-21 spec`
2. `feat(widget): single time field and compact car rows for any-time legs`
3. `style(widget): consistent departure/return section layout`
4. `docs: E-21 progress`

## Tests

Focused coverage must verify:

- no date input appears on the Departures step;
- exactly one time input appears per any-time leg;
- any-time car rows show badge, server price, and Choose;
- Choose is disabled until a time is set and exposes `Pick a time first`;
- selecting a row works and submits the Trip-step date plus chosen time;
- a mixed leg shows fixed rows before the any-time subsection;
- round trips keep independent outbound and return dates, times, and selections;
  and
- the compact row layout remains usable at 360px.

For every implementation commit, run focused Vitest for touched behavior,
TypeScript typecheck, and ESLint only on touched files. Run final full lint and
full tests once. If the known airport-marker tests fail in the full suite, rerun
only those files and report both results. Run one production build and
`test:dist` once at the end.

## Final report

Report:

1. `git log -6 --oneline`;
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

- Departures now shows the immutable Trip-step date in each leg title and has no
  date input or date-refresh path.
- Each any-time leg owns one whole-field pickup-time control. Every vehicle row
  uses that time while retaining its server-provided earliest-time, minimum-
  passenger, and private-capacity checks.
- Fixed departures render before an `Or pick your own time` subsection when
  both result types exist. Any-time vehicles use the same full-width row layout,
  selected treatment, button label, and server-formatted price presentation as
  fixed departures.
- Outbound and return legs keep separate pickup times, vehicle selections, and
  the dates chosen on Trip. Quote and return-search requests continue to use the
  generated API shapes without new fields.
- Narrow container layouts keep the time field and rows full-width with compact
  spacing at the existing 360px layout class.

### Verification

- Feature commit: 39/39 focused tests passed across shuttle UI, flow, pricing,
  minimums, and business-local time formatting; TypeScript and touched-file
  ESLint passed.
- Style commit: 19/19 focused UI tests passed; TypeScript and touched-file
  ESLint passed.
- Final full ESLint passed.
- Final full Vitest passed 35/37 files and 373/383 tests. The 10 failures were
  the documented timing flake in untouched `airport-marker.test.tsx` and
  `airport-location.test.ts`; those two files then passed 13/13 together in
  isolation. **UNVERIFIED:** a clean single-run full suite without the known
  airport flake.
- The single production build and `test:dist` passed. `dist/` contains only
  `embed.js` and `embed.js.map`.
- Bundle: 143,433 bytes raw and 40,758 bytes gzip. SHA-256:
  `a3186b49bd17ac05970e8346739651c40dbaf8e590a2e80d6c0359afc9cd5fd4`.
- **UNVERIFIED:** live browser and physical 360px-device verification. Automated
  behavior and narrow-container CSS regression coverage passed.

### Comparison, gaps, and decisions

BRO screenshots do not cover the newer shuttle any-time/private result model.
E-21 intentionally replaces the repetitive production cards with the compact
fixed-row pattern while leaving server prices, result order, passenger rules,
and request bodies authoritative. No dependency, backend gap, or architectural
decision was introduced.
