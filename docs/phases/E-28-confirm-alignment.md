# E-28 — Confirm step icons and alignment hotfix

**Scope:** Widget only. Shuttle Confirm is the primary target; shared Confirm
components must apply the same correction to Taxi Confirm where applicable.

## Requirements

1. Replace Trip Summary text glyphs and broken squares with 18 px inline SVG
   route/plane, calendar, vehicle, person, and luggage icons. Icons use
   `currentColor`, are decorative with `aria-hidden="true"`, align vertically
   with text, use the widget blue, and share one fixed icon-column width.
2. Replace the cash-banner circle glyph with a green inline coins SVG. Format
   the server-provided discount percentage by string manipulation so trailing
   fractional zeros are omitted everywhere it appears.
3. Render each shuttle charge line per leg as a consistent label-left,
   amount-right row. Fare, included-charge, and adjustment rows use the same
   text size and vertical spacing. The Total row is unchanged. Labels and
   money remain exact server values; no pricing arithmetic is permitted.
4. Replace Phone and Email text symbols with matching 18 px inline phone and
   envelope SVG icons in the existing icon boxes.
5. Keep the Terms checkbox inline left of its text, vertically centered, make
   the whole label clickable, and allow clean mobile wrapping.
6. Keep Cash/Card cards only when both are usable. A cash-only business keeps
   `Payment: Cash` as a compact read-only line with the coins SVG.

Everything else remains unchanged. No dependency is added.

## Required commits

1. `fix(widget): confirm step icons`
2. `fix(widget): charges alignment and percent format`
3. `fix(widget): terms checkbox and contact icons`
4. `docs: E-28`

## Tests and gates

- Verify decorative icons are inline SVG with `aria-hidden="true"`, not text
  glyphs.
- Verify `10.00` displays as `10%`.
- Verify charge rows have separate label and amount columns.
- Verify clicking the Terms label toggles its checkbox.
- Verify cash-only mode renders the read-only payment line.
- For every implementation commit, run focused Vitest, typecheck, and
  touched-file lint.
- At phase end run full lint once, full tests once (rerun only the known airport
  flake in isolation if needed), one production build, `test:dist`, and
  Playwright once.
- Save Cash-only and Cash/Card Confirm screenshots at 360 px and 1024 px under
  `docs/phases/E-28/`.

## Final report

Include `git log -6 --oneline`, `git status --short`, the unrun push command,
`dist/embed.js` raw/gzip size and SHA-256, screenshot list, test results,
reference differences, backend gaps, decisions, and anything unverified.

## Progress — 10 November 2026

- Taxi and shuttle Trip Summary rows now use one shared 18 px inline-SVG icon
  system with `currentColor`, the widget blue, `aria-hidden="true"`, and a fixed
  icon column. Phone and Email use the same SVG system in their existing boxes.
- Shuttle price rows are grouped by leg. Each non-zero passenger line shows its
  server unit price in the left label and its server line total at right;
  included charges and method adjustments use the same spacing and two-column
  structure. Total presentation is unchanged.
- `formatPercent` removes only trailing fractional zero characters. It never
  parses or performs arithmetic, so `10.00` becomes `10` and `12.50` becomes
  `12.5` in the banner and recommendation badge.
- The cash banner and cash-only read-only payment line use the coins SVG.
  Cash/Card cards still render only when both methods are usable.
- The Terms checkbox is inline and centered against its wrapping text. The
  entire sentence label toggles the checkbox while the Terms dialog button
  remains a separate control.
- No dependency, API field, backend gap, or architecture decision was added.

### Verification

- Per-commit focused Vitest, typecheck, and touched-file lint passed.
- Full lint passed.
- The one full Vitest run reported 419 passes and two failures: the Terms target
  CSS assertion exposed a missing compatibility minimum that was corrected,
  and the native-picker focus test hit an unrelated parallel focus race. The
  two affected files then passed 20/20 together in isolation.
- The single production build and `test:dist` passed.
- Built-widget Playwright passed cash-only and both-method Confirm at 360 px
  and 1024 px after its fixture date was moved beyond the current test date.

### Browser screenshots

- `docs/phases/E-28/confirm-cash-only-360.png`
- `docs/phases/E-28/confirm-both-360.png`
- `docs/phases/E-28/confirm-cash-only-1024.png`
- `docs/phases/E-28/confirm-both-1024.png`

The hotfix keeps E-27's approved structure, colors, typography, responsive
ordering, server text, and totals. The intentional differences are the proper
SVG iconography, aligned charge columns, compact percentage text, read-only
cash treatment, and corrected Terms/contact controls requested by E-28.

Live company data, live Square, and host-page rendering remain **UNVERIFIED**;
Playwright used the built bundle with mocked public API and Square responses.
