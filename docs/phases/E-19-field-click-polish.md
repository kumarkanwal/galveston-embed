# E-19 — Widget: consistent select arrows and whole-field controls

**Status:** In progress
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
