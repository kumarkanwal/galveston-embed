# E-12 — Shuttle separate pickup/drop-off addresses

## Scope

Widget-only support for backend B-45 in **shuttle mode only**. Taxi behavior
must remain unchanged. Branch `phase/E-12` from fast-forwarded `main`; refresh
the API files byte-for-byte from backend `origin/main`, including `d78fb27`,
and regenerate API types. Do not deploy.

## Address fields and requests

- Use `route.from_requires_address` and `route.to_requires_address` to show
  **Pickup address**, **Drop-off address**, both, or neither.
- Reuse E-11 Places suggestions and its precise-address validation.
- Clear an address when its location changes.
- Put `pickup_address` and `dropoff_address` inside each booking leg. Do not
  send the deprecated top-level `address`.
- For round trips, reverse outbound address defaults onto the return leg and
  keep those defaults editable.
- Keep shuttle quote requests address-free.

## Stale availability

When a remembered route or schedule is unavailable through HTTP 409,
`SCHEDULE_INACTIVE`, or a not-found response, return to Departures, refresh
the outbound search, clear remembered selections, and show a clear message.

## Verification and delivery

Cover pickup-only, drop-off-only, both, neither, round-trip reversed editable
defaults, booking addresses per leg, unchanged quote bodies, stale-route
refresh, and unchanged taxi dispatch. Run focused Vitest, typecheck, lint,
exactly one build, and `test:dist`; report bundle sizes. Commit the work, leave
the two promo screenshots untracked, do not push, and finish with
`git log -4 --oneline`, `git status --short`, and the push command.
