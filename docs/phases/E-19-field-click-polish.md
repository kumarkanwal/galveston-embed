# E-19 — Widget: consistent select arrows and whole-field controls

**Status:** Implementation complete — known full-suite airport flake documented
**Scope:** Widget only
**Baseline:** fresh `phase/E-19` from fetched `origin/main` after E-18 merge

## Scope

Keep all existing behavior and make only these field-presentation and click-area
changes:

1. Give the shuttle Passengers dropdown and every native `<select>` in taxi and
   shuttle the same arrow style as the From/To stop picker: the same SVG
   chevron, right-side divider box, size, and vertical centering. Keep native
   selects for accessibility and hide only their browser arrow with
   `appearance: none`.
2. For shuttle Departure Date, Return Date, and private time fields, plus taxi
   Pickup Date/Time and Return Date/Time, clicking anywhere in the date/time
   input opens its picker. Call `input.showPicker()` on click inside `try/catch`;
   when it is absent or throws, fall back to focus. Preserve keyboard typing and
   Tab. Keep the calendar or clock icon on the right and style it consistently
   with the chevrons.
3. Make the full Round trip box toggle its checkbox by wrapping the whole box in
   its label. Add a pointer cursor and visible focus ring. Apply the same
   behavior to any similar taxi checkbox box.
4. Keep every field 38px high. Change nothing else.
5. Use one even date/time grid for taxi Pickup Date/Pickup Time and Return
   Date/Return Time so both rows line up exactly. Use the same shared grid for
   shuttle Departure/Return date rows and private-shuttle date/time fields.
   Keep every date, time, and select control 38px high, with its right-side icon
   vertically centered and aligned.
6. Keep the taxi Passengers / Bags / Carry-on row aligned to the rows above.
   Make Passengers wide enough for `1 passenger` through `10 passengers`, keep
   the two bag steppers equal width, and retain one-line layout at 360px. A
   below-360px fallback may use `pax` if necessary.
7. Keep validation messages inside their field's grid cell so they cannot
   change column widths or push a neighboring field out of alignment.

## Commits

1. `docs: E-19 spec`
2. `style(widget): consistent select arrows`
3. `fix(widget): whole-field click opens date/time picker`
4. `fix(widget): whole round trip box toggles`
5. `docs: E-19 progress`

The final progress commit updates this file with results.

## Required tests

- The consistent select arrow is present on shuttle Passengers and taxi native
  selects.
- Clicking a date or time input calls a mocked `showPicker()`.
- When `showPicker()` throws, the input remains focused as the fallback.
- Clicking the Round trip box toggles the checkbox.
- Keyboard interaction still works.

## Gates

For every implementation commit, run focused Vitest coverage for touched files,
TypeScript typechecking, and ESLint only on touched TypeScript files.

At the end, run exactly once each:

1. Full lint
2. Full tests; if the known flaky airport-marker tests fail, rerun those files
   alone and report both results
3. One build
4. `test:dist`

Do not push. Report `git log -7 --oneline`, `git status --short`, the push
command, and `dist/embed.js` raw size and SHA-256.

## Results

- All native taxi selects retain native semantics and now use the same shared,
  non-interactive SVG chevron and divided right-side box as the From/To stop
  picker. Shuttle Passengers uses that same component and rotates it while
  open. Browser-native select arrows are hidden with `appearance: none`.
- Taxi pickup and return rows, shuttle departure/return rows, and private
  shuttle date/time pairs use the shared equal-column `date-time-grid`. Error
  text wraps inside zero-minimum-width field cells and cannot resize a sibling.
- The taxi party row reserves space for the complete `10 passengers` native
  option, keeps Bags and Carry-on equal, and remains one row at 360px; only the
  below-320px micro layout stacks Passengers above the equal bag controls.
- Every scoped date/time input safely calls native `showPicker()` on click and
  falls back to focus when it is unavailable or throws. Existing input, blur,
  typing, and Tab behavior is unchanged. Native calendar/clock indicators keep
  a 38px control with the same aligned right-side treatment.
- The shuttle Round trip border is now the checkbox label itself, so any click
  within the box toggles the native checkbox. It has a pointer cursor and a
  visible `:focus-within` ring. Taxi trip type remains its existing accessible
  two-button control; there is no equivalent taxi checkbox box.

## Verification

- Select-arrow commit: focused Vitest passed 56 tests, TypeScript passed, and
  ESLint passed on touched TypeScript files.
- Layout commit: focused Vitest passed 36 tests, including shared grid classes
  and the complete `10 passengers` label; TypeScript and touched-file ESLint
  passed.
- Native-picker commit: focused Vitest passed 26 tests, including mocked
  `showPicker()`, throwing fallback focus, and preserved typed input;
  TypeScript and touched-file ESLint passed.
- Round-trip commit: focused Vitest passed 19 tests; TypeScript and
  touched-file ESLint passed.
- Final full lint passed.
- The one full-test run passed 35 of 37 files and 359 of 369 tests. The 10 known
  failures were confined to untouched airport marker/location tests. Per the
  phase instruction, those two files were rerun alone and passed 13 of 13.
  **UNVERIFIED:** a clean single-run full suite without the known flake.
- The one production build passed. `dist/embed.js` is 142,579 bytes raw and
  40,652 bytes gzipped; SHA-256 is
  `e27cf4ad2a306e265fa880b3c246157bd3fbb8a981309146ec98d80f0dd7808d`.
- `test:dist` passed and `dist/` contains only `embed.js` and its sourcemap.

## Comparison, gaps and decisions

E-19 changes widget field affordances without changing the BRO-derived flow,
field order, options, validation, pricing, or booking behavior. No backend gap,
dependency, or architectural decision was introduced. **UNVERIFIED:** manual
browser comparison at desktop and exactly 360px; automated layout rules and
DOM behavior are covered.
