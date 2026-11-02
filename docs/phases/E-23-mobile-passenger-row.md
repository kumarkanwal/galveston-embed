# E-23 — Mobile passenger/luggage layout and passenger popup

**Status:** Spec ready
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
