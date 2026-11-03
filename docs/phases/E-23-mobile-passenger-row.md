# E-23 — Mobile passenger/luggage layout and passenger popup

**Status:** Implementation complete — browser verification unverified
**Scope:** Widget only; taxi and shuttle.

## Setup

- Build in a new clean worktree from freshly fetched `origin/main` after E-22
  merged, on branch `phase/E-23`.
- Keep every other worktree and existing untracked file untouched.
- Do not push.
- This specification is the first phase commit: `docs: E-23 spec`.

## Required behavior

1. Below 480px, Passengers occupies one full-width row and Bags plus Carry-on
   occupy the next row as two equal columns. At 480px and wider, all three stay
   on one line. Taxi and shuttle use the same rule.
2. Passenger field text such as `1 passenger` and `12 passengers` stays on one
   line, using ellipsis only when the available width is genuinely insufficient.
3. The shuttle Adults/Seniors/Children popup has an opaque white background,
   border, shadow, and sufficient stacking order. It is at least as wide as the
   Passengers field, uses the full field width on phones, contains every
   decrement/value/increment stepper, and stays within a 360px screen without
   horizontal scrolling. Existing outside-tap, Escape, keyboard, and focus
   behavior remains unchanged.
4. Preserve existing 38px control heights, compact spacing, icons, and styles.

## Commit plan

1. `docs: E-23 spec`
2. `style(widget): mobile passengers row and luggage row`
3. `fix(widget): passenger popup width, background and layering`
4. `docs: E-23 progress`

## Tests and gates

Focused tests cover the sub-480px layout class/breakpoint for both taxi and
shuttle, non-wrapping passenger text, popup opacity/width/containment/stacking,
and existing outside-tap/Escape behavior.

For each implementation commit, run focused Vitest, TypeScript typecheck, and
ESLint only on touched files. At the end run full lint and full tests once; if
the known airport flake appears, rerun only its files. Run one production build
and `test:dist` once.

## Final report

Report `git log -6 --oneline`, clean `git status --short`, the push command
without pushing, and `dist/embed.js` raw/gzip sizes plus SHA-256. Mark browser
verification **UNVERIFIED** when it was not performed, then stop.

## Results

### Implementation

- Taxi and shuttle now share the same party-field breakpoint: below 480px,
  Passengers spans a full row and Bags plus Carry-on occupy two equal columns;
  at 480px and wider, all three controls remain on one line.
- Passenger trigger text is constrained to one line with ellipsis only when its
  available width is exhausted.
- The shuttle passenger popup has an explicit opaque-white class, retained
  border and shadow, a higher stacking order, and phone sizing constrained to
  the full trigger width. Its three steppers remain contained at 360px.
- Existing outside-click, Escape, keyboard, focus, 38px control height, icons,
  and compact spacing behavior remains unchanged.

### Verification

- Layout commit gate: 43/43 focused tests passed; typecheck and touched-file
  lint passed.
- Popup commit gate: 44/44 focused tests passed; typecheck and touched-file
  lint passed.
- Final full lint passed. The one full Vitest run passed 35/37 files and
  384/394 tests; its 10 failures were the documented timing flake in untouched
  `airport-marker.test.tsx` and `airport-location.test.ts`. Those two files then
  passed 13/13 together in isolation. **UNVERIFIED:** a clean single-run full
  suite without the known airport flake.
- The single production build and `test:dist` passed. `dist/` contains only
  `embed.js` and `embed.js.map`.
- Bundle: 145,273 bytes raw and 41,491 bytes gzip. SHA-256:
  `17b34703dcb25accdf3ca219e41449b498f28d5f79837cb49f43c861186bdaf3`.

### Comparison, gaps, and decisions

- Automated taxi and shuttle DOM/CSS coverage verifies the requested 479px,
  480px, and 360px behavior. A live phone/browser comparison is
  **UNVERIFIED**.
- No backend gap was found; this phase changes presentation only.
- No decision outside the specification was required, and no dependency was
  added.
