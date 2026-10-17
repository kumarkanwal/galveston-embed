# E-7a — Promo code box

## Approved request

Branch `phase/E-7a` from an updated `main`. Backend B-30 is live. Refresh the
API files from backend commit
`3943c62c00d572a251366d568117711e43f9eb07` and verify both copied source files
byte-for-byte.

- Step 3 gets an optional **Promo code** field and Apply button like BRO.
- Apply calls taxi price-breakdown with the code. Display the server's discount
  line and new total unchanged.
- Invalid or expired codes show the API message under the field. Booking remains
  possible without a code.
- Tracking-only codes are accepted quietly: show `Code applied` and no discount
  line.
- Send the same successfully applied code with booking; the server re-checks it.
- Case and spaces do not matter because the server normalises them.
- Remove restores a normal server price breakdown.
- Never calculate money.

The project owner confirmed that `API_CONTRACT.md` section I-6 is stale. B-30
promos are wired on taxi pricing rows; schema, code and backend tests are the
source of truth for this phase.

Keep the two untracked BRO promo-admin screenshots out of all commits. Run
focused tests and `pnpm check`, commit the work, inspect the final log and
status, and push the branch with one push command.

## Approved implementation plan

### API

- Use generated `TaxiPriceBreakdownRequest.promo_code` and
  `TaxiBookingRequest.promo_code`, each an optional string or null with a
  64-character maximum.
- Apply through `POST /v1/public/taxi/price-breakdown`; do not use the standalone
  promo-validation endpoint.
- Continue rendering only server-returned line items, amounts, order, currency
  and total. Route `422 PROMO_INVALID` messages to the Promo code field even
  though the backend currently omits `error.field`.
- Do not show the control for Request-a-Quote vehicles because ED-009 forbids a
  price-breakdown call and the backend cannot apply a promo without a price.

### UI and state

- Place the BRO-style field between Car Seats and Total for priced vehicles.
- Send the entered string unchanged. Only a successful breakdown makes a code
  applied and eligible for booking.
- Preserve the last valid normal total when an Apply attempt returns
  `PROMO_INVALID`, show the API message under the field and keep no promo on the
  booking request.
- After success, show `Code applied`, keep the code on later repricing and send
  that same code with booking. A tracking code therefore succeeds without a
  visible discount row.
- Remove explicitly fetches a fresh breakdown without a code. Do not retry a
  failed POST automatically. Ignore stale overlapping responses.
- A booking-time `PROMO_INVALID` appears under the same field; removing the code
  and repricing allows submission without it.

### Files and tests

Add a focused Promo code component and test file; update the Step 3 pricing hook,
request builders, booking hook/error mapping, Confirm wiring and Confirm CSS.
Update architecture, tracker and the decision log only where the finished
behavior requires it. Add no dependency.

Focused coverage must include discount pricing, tracking-only success, exact
server error placement, unchanged case/spacing, removal, stale responses,
booking payload/idempotency behavior, booking-time invalidation and the
Request-a-Quote exclusion. Run those tests and then the full `pnpm check`.

Baseline production bundle: 81,612 bytes raw and 25,712 bytes gzipped. Report
the measured final size and delta.
