# E-31 progress — pickup time on Confirm

Completion date: 2026-11-16.

E-31 is complete on branch `hotfix/E-31` and has not been pushed.

## Commits

- `9160e53` `chore(api): sync B-65 contract`
- `ba3ebcc` `fix(shuttle): move pickup time to confirm`
- this commit: `docs: E-31`

## Delivered

- Restored the three-screen Trip → Departures → Confirm shuttle flow and removed
  the separate pickup-time screen and its price button.
- Departures now loads the quote without pickup times and goes directly to
  Confirm.
- Confirm renders required 15-minute pickup-time inputs directly below Email:
  one for one-way and outbound/return inputs side by side on desktop and stacked
  on mobile.
- Trip Summary updates the pickup-time rows live and shows an em dash before a
  value is entered.
- Create Trip is blocked until each required time is valid. Booking 422 field
  errors map beneath the matching input, and booking sends the unchanged
  `requested_pickup_time` value per leg.
- Removed pickup-arrangement wording from runtime UI, tests, tracker, decisions,
  architecture, historical phase notes, and the legacy private-pricing browser
  script.

## Verification

- `pnpm typecheck`: passed.
- `pnpm lint`: passed after extracting pickup validation from the oversized
  Confirm hook.
- `pnpm vitest run`: 40 files and 425 tests passed on the final run.
- `pnpm build`: passed with Vite 8.3.4; `dist/embed.js` is 162,638 bytes,
  SHA-256 `F2F10E61740FB99E6712EBFBC594B4FA80114F0785EC025E6D7196B78EA9D4C2`.

## Pre-existing failure

- The first full-suite run passed 419 tests and timed out six unrelated
  `airport-marker.test.tsx` cases. That file passed 7/7 in isolation and the
  complete rerun passed 425/425.

## Decisions

- ED-037 supersedes ED-036: quote occurs before pickup-time entry, while booking
  remains gated by the Confirm inputs and backend required-field validation.
- No dependency was added. Taxi, payment, seat, status and shuttle departure
  selection behavior are unchanged.

## Exact next step

Deploy B-65 first, then F-58, then E-31.
