# E-11 — Shuttle widget fixes from live testing

## Scope

Widget-only live-testing fixes for **shuttle mode only**. Taxi rendering,
requests, validation, pricing, confirmation and booking behavior must remain
unchanged. Do not add dependencies, deploy or push.

Branch `phase/E-11` from fast-forwarded `main`. Refresh `openapi.json` and
`API_CONTRACT.md` byte-for-byte from the exact backend `origin/main` commit,
record its full hash in both `SOURCE.md` files, regenerate generated API types,
and commit the refresh separately only when files change.

Keep `docs/reference/bro/promo-code-edit.png` and
`docs/reference/bro/promo-codes-list.png` untracked and out of every commit.

## Backend gate

Use only generated types and documented fields. Stop and record a backend gap
instead of inventing or deriving data if the public shuttle contract cannot:

- identify whether senior and child passengers have separate prices;
- express category-wise passenger counts and seat limits;
- identify locations that require a customer address;
- accept the existing single shuttle booking `address` field; or
- search valid return departures after a selected outbound leg.

Separate pickup and drop-off customer addresses are explicitly out of scope.
The backend exposes only one `address` field; record this limitation as backend
gap **B-45** and do not work around it.

## WIDGET-01 — Scoped checkbox and radio styles

- Remove the vertical oval blue shadow from the shuttle trip-type control.
- Do not apply generic text-input height, padding or box-shadow rules to
  checkbox or radio inputs.
- Scope the fix so taxi styles and controls do not change.
- Preserve a clear `:focus-visible` ring for keyboard users.

## WIDGET-02 — One Round trip checkbox

- Replace the shuttle One way / Round trip radio pair with one checkbox labelled
  **Round trip**.
- It defaults unchecked, which means a one-way trip.
- Checking it shows the return date and enables the return flow.
- Unchecking it hides and clears the return date, return selection, return
  results and any stored quote.
- Every trip input change invalidates any quote that was based on the old cart.
  Never reuse an old quote after a change.

## WIDGET-03 — Same-page departures and returns

- Keep outbound departures at the top of one selection page.
- For round trips only, show return departures below the outbound section.
- Search or refresh returns only after an outbound is selected, using that
  outbound identity and the generated return-search shape.
- Changing the outbound clears the prior return selection and results, then
  loads only returns valid for the new outbound.
- One-way trips show no return heading, controls or results.
- Preserve server-owned pricing, selectable flags, availability validation,
  on-request handling and booking-time stale-availability recovery.

## WIDGET-04 — Passenger dropdown

- Replace separate visible Adults, Seniors and Children fields with one
  **Passengers** dropdown.
- Its panel contains plus/minus counter rows for Adults, Seniors and Children.
- Show Seniors and Children only when the API says those categories are priced
  separately, using the same contract signal as the current shuttle flow.
- Default to 1 Adult, 0 Seniors and 0 Children. Adults cannot go below 1.
- Keep category-wise request counts, API seat limits and the current total-seat
  validation. Do not combine categories in request bodies.
- The closed control shows the total, with singular/plural copy such as
  `1 passenger` and `3 passengers`.
- The dropdown is keyboard accessible. Escape closes it and returns focus to
  its trigger.

## Customer address for required locations

- When the selected From or To location requires a customer address, show the
  existing single shuttle `address` field.
- Reuse or extract the taxi `AddressField` Places-suggestion behavior: US-only
  precise street addresses, establishments and airports; typed text without a
  selected suggestion is invalid.
- The address is required before booking and uses only the API's existing
  `address` field.
- Clear the selected address whenever From or To changes.
- Hide and clear it when neither selected location requires an address.
- Pass `mapsKey` through the shuttle flow to the shuttle confirmation step.
- Keep all suggestion UI inside the Shadow DOM and retain the existing Maps
  loader rules.

## Verification

Focused Vitest coverage must include:

- one Round trip checkbox, default unchecked, and complete return-state clearing
  when unchecked;
- outbound and return departures on the same page;
- return results refreshing after outbound changes;
- no return UI for one-way trips;
- passenger-dropdown defaults, category visibility, lower/upper limits, total
  copy, Escape handling and focus return;
- the address field appearing only when a selected location requires it,
  precise Places suggestions, clearing on From/To changes and booking blocked
  when the required address is empty; and
- taxi regression coverage proving the taxi flow is unchanged.

Run focused Vitest files, `pnpm typecheck`, `pnpm lint`, exactly one
`pnpm build`, then `pnpm test:dist`. Do not run `pnpm check`, because it would
build a second time; report it as **UNVERIFIED**. Report the raw and gzipped
`dist/embed.js` size.

## Delivery

Use this commit sequence:

1. this specification;
2. API refresh, only if source files or generated types changed;
3. WIDGET-01 and WIDGET-02;
4. WIDGET-03;
5. WIDGET-04;
6. customer address support plus docs and tracker updates.

Before every commit run `git remote -v`. The final report must include
`git log -8 --oneline`, `git status --short`, the push command, backend gaps,
BRO differences, decisions and anything unverified. Then stop.
