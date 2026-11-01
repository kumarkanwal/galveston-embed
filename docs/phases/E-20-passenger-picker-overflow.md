# E-20 — Fix passenger picker overflow on narrow screens

**Status:** Implementation complete — browser screenshots unverified
**Scope:** Widget only.

## Setup

- Build in a new clean worktree from freshly fetched `origin/main` on branch
  `phase/E-20`.
- Keep untracked `.worktrees/` and BRO screenshots untouched.
- Do not push.
- This specification is the first phase commit: `docs: E-20 spec`.

## Bug

On the live widget embedded in an Elementor/WordPress page, at a widget width of
about 355px, Departure Date and Passengers sit side by side on the Trip step.
Opening Passengers anchors the dropdown panel to the Passengers field's left
edge, so the panel overflows the widget's right edge. The count input and `+`
buttons for Adults, Seniors, and Children are cut off and cannot be used.

At about 552px, the passenger panel fits correctly.

## Root cause

Before editing, confirm and report the responsible file and line. Check for:

- a left-anchored panel with a fixed minimum width wider than the half-width
  Passengers column; and
- a parent with `overflow: hidden` that clips the panel.

## Required fix

1. The passenger panel must stay fully inside the widget container at every
   width from 280px upward.
   - On a narrow widget, the panel spans the full form width and aligns to the
     form's left and right edges, rather than only the Passengers column.
   - Otherwise, align the panel to the field's right edge when left alignment
     would overflow on the right.
   - The panel must never be wider than the container.
   - No horizontal scrolling and no clipping by a parent.
2. Base responsive behavior on the widget root's **container width**, not
   viewport media queries. Use CSS container queries or measure the widget root.
3. Below approximately 420px widget width, stack Departure Date and Passengers
   in one column at full width. From/To already use this pattern. The round-trip
   return date/time row follows the same rule.
4. Keep every stepper row usable: label, minus button, count, and plus button
   remain visible; touch targets are at least 40px; the count is not truncated.
5. Preserve existing behavior:
   - open/close toggle;
   - outside click and Escape close;
   - focus returns to the trigger;
   - keyboard behavior and screen-reader labels remain unchanged;
   - the `1 passenger` summary updates;
   - the E-17 minimum-passenger rule remains unchanged.
6. Keep all styles scoped to the widget. No styles may leak into the host theme,
   and host theme CSS must not break the widget.

## Commit plan

1. `docs: E-20 spec`
2. `fix(widget): passenger picker stays inside container`
3. `fix(widget): stack trip fields on narrow widgets`
4. `test(widget): narrow-width regression tests`
5. `docs: E-20 progress`

## Verification

Focused Vitest coverage must verify:

- the panel stays within container bounds at widget widths 280, 320, 360, 375,
  414, 552, and 768px;
- the layout stacks below the container breakpoint;
- open/close toggle, Escape, outside click, and focus return;
- passenger counts still change correctly.

For every implementation commit, run focused Vitest, typecheck, and ESLint on
touched files. At the end, run the build and `test:dist`, and report the raw and
gzipped bundle sizes compared with the current `origin/main` bundle.

## Final report

Report:

1. the confirmed root cause with file and line;
2. `git log -6 --oneline`;
3. `git status --short`;
4. the push command, without pushing;
5. before/after screenshots at 360px and 552px when a browser is available;
   otherwise mark the browser check **UNVERIFIED**;
6. the standard phase report required by `AGENTS.md` section 7, including tests,
   BRO differences, backend gaps, decisions, and everything unverified.

Then stop.

## Results

### Root cause confirmed before editing

- `src/styles/shuttle.css:155-167` positioned `.passenger-menu` with `left: 0`
  and `right: 0`, constraining it to the half-width Passengers field.
- `src/styles/shuttle.css:169-174` required at least 222px of row content before
  the menu's 28px horizontal padding, wider than that narrow half-column.
- `src/styles/widget.css:1-16` and `src/styles/widget.css:35-40` clipped horizontal
  overflow at both the Shadow host and `.widget-root`, cutting off the excess.
- `src/styles/widget.css:611-614` stacked date grids only in the below-320px
  micro layout, leaving a roughly 355px widget in the failing two-column layout.

### Implementation

- The passenger panel is right-aligned, never wider than its form row, and uses
  the full row width in measured `layout-narrow` and `layout-micro` modes.
- Shuttle Departure Date / Passengers and the round-trip return row stack at the
  existing measured-container narrow breakpoint (`<440px`, approximately the
  requested 420px), without viewport media queries.
- Each passenger stepper reserves 40px for minus, count, and plus. Labels and
  controls shrink safely without truncating the count.
- Existing trigger, Escape/focus-return, labels, totals, limits, and E-17
  minimum behavior are unchanged. Outside pointer presses now close the panel.

## Verification results

- Per implementation commit: focused Vitest, TypeScript, and touched-file ESLint
  passed.
- Final focused regression run: 41/41 tests passed across passenger UI,
  container widths, shuttle minimums, and shuttle validation. Width coverage is
  280, 320, 360, 375, 414, 552, and 768px.
- Final full TypeScript and ESLint passed.
- The full Vitest run passed 35/37 files and 369/379 tests. The 10 failures were
  the known timing flake in untouched `airport-marker.test.tsx` and
  `airport-location.test.ts`; both files then passed 13/13 together in
  isolation. **UNVERIFIED:** a clean single-run full suite without this known
  flake.
- Production build and `test:dist` passed. `dist/` contains only `embed.js` and
  `embed.js.map`.
- Bundle: 143,216 bytes raw and 41,075 bytes gzip, versus `origin/main` at
  142,579 bytes raw and 40,939 bytes gzip: +637 raw and +136 gzip. SHA-256:
  `bef11cc801f3e576308d7ac0de1a1cab31519e25a84d259a4a3744e3c7d60cc9`.
- **UNVERIFIED:** before/after browser screenshots at 360px and 552px. The
  in-app browser could not reach the host localhost server, and access to the
  installed browser was unavailable. No screenshot files were created.

## Comparison, gaps, and decisions

E-20 fixes an embed-width defect without changing the BRO-derived flow, field
order, labels, passenger rules, pricing, or booking behavior. No dependency,
backend gap, or architectural decision was introduced.
