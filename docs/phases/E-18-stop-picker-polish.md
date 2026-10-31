# E-18 — Widget: polish shuttle From/To stop picker

**Status:** In progress
**Scope:** Widget only
**Baseline:** fresh `phase/E-18` from fetched `origin/main` after E-17 merge

## Scope

Change only `StopPicker` and its CSS, except for the round-trip-box CSS noted
below. Preserve filtering, To-stop logic, accessibility roles, compact spacing,
and the 360px mobile layout.

1. Remove the bus icon or emoji everywhere, including the field and category
   rows.
2. Make the field a toggle: clicking it opens the picker and clicking it again
   closes it. Continue to close on outside click, Escape, and stop selection.
   Enter, Space, and Alt+Down toggle from the keyboard.
3. Make the whole field clickable, including the right-arrow area.
4. Replace the field's text `v` with a proper SVG chevron matching the size and
   colour of the widget's other selects, such as Passengers. Vertically centre
   it, give it no separate box, border, or blue highlight, and rotate it 180
   degrees while the picker is open.
5. Replace category-row `›` and `v` text with the same SVG chevron: right when
   closed and down when open. Right-align and vertically centre it on every row.
6. Replace the stop-row `↳` text with a clean roughly 16px indent under its
   category, with either a thin SVG corner-arrow marker or no marker. Keep a
   proper gap before the name and consistent alignment on every row.
7. Give the selected stop a subtle highlight and a right-aligned check mark;
   keep hover and focus styling consistent.
8. Remove the round-trip box's extra empty vertical space so its height fits
   the checkbox row only.

## Commits

After this specification commit, implement in these commits:

1. `fix(widget): stop picker toggle and clickable arrow`
2. `style(widget): stop picker chevrons, no icons, clean indent`
3. `style(widget): compact round trip box`
4. `docs: E-18 progress`

The final progress commit updates this file with results.

## Required tests

- Field click opens the picker.
- A second field click closes it.
- Arrow-area click toggles it.
- Outside click and Escape close it.
- Enter, Space, and Alt+Down toggle it.
- No bus icon is rendered.
- The field chevron reflects `aria-expanded` and rotates while open.
- Stop selection still works and closes the picker.
- Filtering remains unchanged.

## Gates

For every implementation commit, run focused Vitest coverage for touched files,
TypeScript typechecking, and ESLint only on touched TypeScript files.

At the end, run exactly once each:

1. Full lint
2. Full tests
3. One build
4. `test:dist`

Do not push. Report `git log -6 --oneline`, `git status --short`, the push
command, and `dist/embed.js` raw size and SHA-256.
