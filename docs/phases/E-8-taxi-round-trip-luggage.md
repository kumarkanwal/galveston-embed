# E-8 — Taxi round trip, luggage counts and form toggles

## Approved request

This phase is taxi-only. ED-003 remains in force: never call a
`/v1/public/shuttle/*` endpoint. Taxi `round_trip` moves from E-9 to E-8 and is
the only service newly admitted by this phase; `hourly` remains excluded.

Branch `phase/E-8` from an updated `main`. Backend B-37 is merged into backend
`origin/main` and includes commit `f678b66`. Refresh `openapi.json` and
`API_CONTRACT.md` from the exact backend `origin/main` commit, record that full
commit in both `SOURCE.md` files, regenerate the API types, and verify both
copied files byte-for-byte. Stop and report a backend gap if the refreshed
schema lacks any required request or public-setting field except a configured
default service, which deliberately does not exist.

Keep `docs/reference/bro/promo-code-edit.png` and
`docs/reference/bro/promo-codes-list.png` untracked and out of every commit.

## Service selection and round trip

- `round_trip` is selected through the existing taxi `service_type`; do not
  invent a separate API field.
- When `business.settings.show_service_dropdown` is true, show the existing
  service dropdown in API order with `one_way`, `round_trip`,
  `airport_pickup`, and `airport_dropoff` when offered. Continue to exclude
  `hourly` and every other service.
- When `show_service_dropdown` is false, hide the service dropdown and choose
  the first permitted non-round-trip service in API order as the default.
- If the hidden business also offers `round_trip`, show a small
  **One way / Round trip** switch. One way selects that default service;
  Round trip selects `round_trip`. Switching back restores the same default
  service, including its airport fields when the default is an airport service.
- If there is no permitted non-round-trip service, fail closed with the
  existing `Online booking is not available. Please contact us.` configuration
  error. Round trip alone is not enough for the hidden-dropdown mode.
- Round trip shows required Return Date and Return Time fields. Return departure
  must be after pickup in the business's local wall time.
- Do not reproduce the server's route-duration/minimum-gap calculation. If the
  server rejects a return gap, show its exact message beside the named return
  field, retain all inputs and do not retry automatically. A
  `duration_minutes` error may remain at form level because there is no visible
  duration field.
- Send `return_date` and `return_time` only for `round_trip`; keep both null for
  every other service.

## Split luggage counts

- Replace the legacy Luggage dropdown with two accessible counters, each zero
  or greater:
  - **Check-in / trunk** sends `large_bags` and has a large-bag icon.
  - **Carry-on** sends `small_bags` and has a small-bag icon.
- Counter buttons have accessible names, keyboard operation and mobile-size
  targets. They cannot decrement below zero. Use inline SVG or code-native
  icons; add no image or icon dependency.
- Bound the combined count by the public business `max_luggage` and the
  generated request-schema limits. Never derive a rule from a vehicle name.
- Send `large_bags` and `small_bags` in quote, price-breakdown and booking.
  Never send the removed `luggage` field.
- Request the server's incapable vehicle rows instead of using
  `hide_incapable=true`. Render every returned `quote_status: "unavailable"`
  result with the existing unavailable UI. Do not compare the bag total with a
  vehicle's `luggage_capacity` in the widget.
- Step 3 displays the two submitted counts separately.

## Public form toggles

- `business.settings.show_service_dropdown` controls the service picker and
  the hidden-mode switch described above.
- `business.settings.show_map` controls only the visible map. When false, do
  not mount the map or route-preview component and expand the form to the
  available width. Google Places address autocomplete remains available.

## Pricing and booking

- Price breakdown remains wholly server-owned for both legs. Preserve returned
  line-item order, labels and amount strings, and the returned total.
- Send at most the one successfully applied promo code already owned by E-7a.
  Never calculate, merge, duplicate or rename promo, card-fee or leg lines.
- Cash-only ED-006 remains in force. A server-returned non-zero fee line is
  displayed once like any other line; exact `"0.00"` lines remain hidden under
  ED-022.
- Request-a-Quote vehicles continue to skip price-breakdown under ED-009.
- Return and bag fields participate in the booking request fingerprint, so an
  unchanged cart reuses its idempotency key and a changed cart gets a new one.

## Governance updates

- Replace the stale generic E-8 Promo codes phase label; promo is E-7a.
- Move taxi round trip from E-9 to this E-8 phase.
- Add a decision superseding ED-004 and ED-016 only for taxi `round_trip`.
- Update hard rule 7 and architecture consistently. ED-003 taxi-only and the
  `hourly` exclusion remain unchanged.

## Verification and report

Add focused coverage for service filtering and hidden-mode selection, return
validation and server errors, both counter controls and request bodies, server
unavailable rows, both public toggles, Step 3 propagation, line-item ownership
and idempotency changes. Update existing fixtures for the generated schema.

Run focused tests, typecheck, lint, one production build, then `test:dist`
individually. Do not run `pnpm check`, because it would build a second time;
mark that aggregate command **UNVERIFIED**. Report the final raw and gzipped
bundle size against the 87,023-byte raw / 27,048-byte gzip baseline.

Commit the approved work, then finish with `git log -4 --oneline`,
`git status --short`, and the push command. Do not push.
