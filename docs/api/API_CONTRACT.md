# API Contract — Public Surface

**Multi-Business Transfer Booking Platform**
Stack: FastAPI (Python) · PostgreSQL · Square payments
Base URL: `https://api.<domain>.com/v1`
Consumers: Booking-form embed (taxi)

**Version 1.2** — generated from the implemented schemas, routers, services and
`openapi.json` through B-30. This document covers the public
surface; the admin surface (`/admin/*`) is not documented here.

---

## Changes from v1.1

Read this section first if you have already built against v1.1.

- **B-28 shared air-travel catalogs:** every company now receives the same
  active airport and airline lists. Public airport rows include the exact
  server-owned `address` and `zipcode` pin used for quote and booking
  resolution. Existing endpoint paths and airport-id request fields are
  unchanged.
- **B-1 booking email behavior:** every successful shuttle or taxi submission
  queues a direct company alert plus the customer message matching its final
  status. Taxi cash bookings now return `requested`; shuttle cash bookings keep
  their existing confirmed status and seat/hold behavior. Priced taxi card
  bookings use `auto_confirm_card_payments`: confirmed when enabled, requested
  when disabled. Customer-facing request, confirmation and reminder messages
  are BCCed to `alerts_email`; company and driver messages are not.
- **B-24 admin integration:** authorized owners and managers can reveal the
  newest active API key named `embed`; owners can regenerate it, immediately
  revoking every previous active `embed` key. Public authentication and the
  `X-Business-Key` wire format are unchanged.
- **B-27a admin service areas:** `POST /v1/admin/service-areas` returns `200`
  and reactivates an inactive canonical duplicate, while an active duplicate
  remains a `400` with field `value`. `DELETE /v1/admin/service-areas/{id}`
  returns `422 LAST_SERVICE_AREA` rather than deactivating the business's final
  active coverage rule. New rows still return `201`.
- **B-29 preferences and inbound leads:** public business settings now publish
  the taxi tenant's car-seat availability, maximum and unit price. Meet &
  Greet is staff-only and does not appear in any public schema. Admin settings,
  manual reservations and reservation edits expose the corresponding staff
  controls; lead-source attribution is snapshotted on each admin-created or
  edited order rather than rewriting the shared customer. B-29a reservation
  detail responses now include `meet_and_greet`, `meet_and_greet_amount` and
  the order-level `lead_source` object while preserving
  `customer.lead_source`; email detail responses expose stored `text_body` and
  `html_body` values.
- **B-30 promo codes:** promo validation and taxi Distance/Flat Rate breakdowns
  now apply percent and fixed-amount codes using the business-local date.
  Tracking-only codes use `discount_type: "none"` with value `"0.00"`; they
  are accepted, snapshotted on the order and counted once on confirmation but
  do not change any price. Codes are unique per business without regard to
  letter case. Optional `max_uses` behavior is unchanged.

### Airport locations are server-resolved

- `airport_pickup` and `airport_dropoff` requests send the airport id but do not
  send an address or zipcode for the airport side. The API resolves both from
  that business's active airport record; any client-supplied airport-side
  location is ignored.
- Airport configuration without both a non-empty address and zipcode returns
  `422 AIRPORT_ADDRESS_MISSING` before Maps is called.

### Public business capacity limits

- `GET /v1/public/business` now publishes `max_passengers` and
  `max_luggage` so the booking form can bound its party-size selectors before
  the first quote.

### Taxi pricing rows are live

- Legacy `anchor_zone_prices` still win before the replacement pricing-row
  dispatcher. Hourly also remains on the legacy calculator. Distance and Flat
  Rate use the replacement row pipeline.
- Flat Rate is configurable per pricing row and dropoff service area. The stored
  row type is `"flat_rate"`; the public `pricing_basis` value is `"flat"`.
- For an otherwise available vehicle, a missing or `"0.00"` Flat Rate produces
  `quote_status: "request_quote"`, `base_price: null`, `pricing_basis: null`,
  `available: true` and `unavailable_reason: null`. It does not by itself set
  `out_of_service_area: true` when both addresses are otherwise covered.
- Submitting that manual-quote choice to `/taxi/booking` creates a zero-total
  `"requested"` order. The embed may submit it; it must not treat it as a free
  priced ride.

### Taxi request and response additions

- Optional top-level `payment_method` on `/taxi/quote` and
  `/taxi/price-breakdown` controls whether the preview includes the card fee.
- Optional `car_seats` (`0`–`5`, default `0`) is accepted by
  `/taxi/price-breakdown` and `/taxi/booking`.
- Every quoted vehicle now has `quote_status`: `"priced"`, `"request_quote"`
  or `"unavailable"`.
- The replacement row pipeline has new labels and ordering. See
  [Line items](#line-items).

### Worked examples changed

The verified regression fixtures are now `413.75` for Distance and `77.63` for
Flat Rate. The old `467.15` round-trip example is **UNVERIFIED** against the
replacement pricing-row path; see [Open questions](#open-questions).

---

## Changes from v1.0

Read this section first if you have already built against v1.0.

### Payments — Stripe replaced by Square

| v1.0 | v1.1 |
|---|---|
| `stripe_payment_method_id` | `payment_method_token` |
| `POST /webhooks/stripe` | `POST /v1/webhooks/square` |
| Client call confirms the booking | Client call returns `processing`; the **verified webhook** confirms settlement |

The plugin tokenises the card with Square's Web Payments SDK and sends the resulting token. Card numbers never reach this API.

### Money is a string, not a number

Every monetary value serialises as a quoted two-decimal string.

```json
"amount": "36.15"     // v1.1 — correct
"amount": 36.15       // v1.0 — wrong
```

JSON has no decimal type, so `36.10` would arrive as `36.1` and lose its trailing zero. Parse these as decimal strings; do not run currency arithmetic in JavaScript floats.

### Line items carry structure, and the labels changed

| v1.0 label | v1.1 label |
|---|---|
| `"Base Price"` | `"Base fare"` |
| `"Car Seats (0)"` | `"Car Seats"` with `quantity: 0` |

Line items now include `kind`, `quantity`, `unit_price` and `source_id`. **The plugin composes the `(0)` suffix from `quantity`** — do not match on label strings.

### The round-trip example in v1.0 was wrong — UNVERIFIED in v1.2

v1.0 showed a round trip totalling `514.65`; v1.1 replaced it with the legacy
calculator example below. **Do not implement from this example.** The replacement
pricing-row path may not double the base or extras. A live comparison with the
client's current system is still required (I-1).

| Line | Amount |
|---|---|
| Base fare | `487.50` |
| Round Trip Discount | `-45.00` |
| Fuel Surcharge | `8.85` |
| CC Surcharge | `15.80` |
| **Total** | **`467.15`** |

The `487.50` subtotal is also a legacy-path value. Distance and Flat Rate rows
return the replacement pipeline's different subtotal; see
[Subtotal semantics](#subtotal-semantics).

### New fields

- `pricing_basis` on each quoted vehicle — `"zone" | "distance" | "hourly" | "flat"`
- `unavailable_reason` is `null`, `"capacity"`, `"admin_disabled"` or `"blackout"`
- `pickup_zipcode` / `dropoff_zipcode` on taxi journey requests
- `filtered_summary` on shuttle search when the result is empty
- `requires_address` on shuttle locations
- `minimum_hours` on the hourly service type
- `?hide_incapable=true` on the taxi quote
- Error code `PAYMENT_METHOD_NOT_OFFERED` (422), plus `REQUEST_IN_FLIGHT` (409) and `BOOKING_UNAVAILABLE` (503)

### Anchor zone pricing

Taxi fares are no longer distance-first. A fixed price between an anchor
location and a listed destination zipcode still takes precedence over the new
Distance and Flat Rate pricing rows. See
[Taxi pricing cascade](#taxi-pricing-cascade).

---

## Conventions

### Authentication

Every public request carries the business's **publishable** API key. The key is
embedded in the browser snippet and must be treated as public. **The business is
resolved from the key** — the client never sends a business id and cannot spoof
one.

```
X-Business-Key: bk_live_...
Content-Type: application/json
```

A missing, unknown, revoked, or inactive-business key all return an identical `401`. This is deliberate: the response must not reveal which.

The key grants only the public booking endpoints. It must never receive admin
scope or any ability to read bookings or customer data. A future customer
booking lookup must use a secret scoped to that individual booking, never the
business key. Give every business a dedicated key named `embed`, so a scraped
key can be revoked without disrupting another integration.

CORS is not access control. The controls are the API key's deliberately narrow
scope and both rate-limit dimensions below. A request must pass both counters;
an idempotent booking replay counts as another request.

| Endpoint | Per API key / minute | Per client IP / minute |
|---|---:|---:|
| `POST /v1/public/taxi/quote` | 30 | 20 |
| `POST /v1/public/taxi/price-breakdown` | 60 | 30 |
| `POST /v1/public/taxi/booking` | 20 | 10 |
| `POST /v1/public/promo/validate` | 20 | 10 |

### Response shapes

```json
// Single resource
{ "data": { ... } }

// List
{ "data": [ ... ] }

// Error
{ "error": { "code": "SEATS_UNAVAILABLE",
             "message": "Only 2 seats remain on this departure.",
             "field": "schedule_id" } }
```

`field` is **omitted** when there is no relevant field, rather than serialised as null. Read it defensively.

### Types

| Type | Format | Example |
|---|---|---|
| Money | quoted string, 2dp | `"82.50"` |
| Date | `YYYY-MM-DD` | `"2026-08-13"` |
| Time | `HH:MM` | `"08:00"` |
| Id | UUID string | `"3f2a...e91"` |

### Request validation

All request bodies use `extra="forbid"`. **Sending an unrecognised field is a 400, not a silently ignored value.** In particular, do not send prices, totals, or discounts — the server re-prices everything from the database and there is nothing for a client to influence.

### Status codes

`200` OK · `201` Created · `400` Validation · `401` Unauthenticated · `402` Payment failed · `403` Wrong business scope · `404` Not found · `409` Conflict · `422` Business-rule failure · `429` Rate limited · `503` Temporarily unavailable

### Error codes

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Malformed or missing input; `field` names it |
| `UNAUTHENTICATED` | 401 | Missing, unknown, or revoked API key |
| `PAYMENT_FAILED` | 402 | The gateway declined, or the outcome is unknown |
| `FORBIDDEN_BUSINESS_SCOPE` | 403 | Resource belongs to another business |
| `NOT_FOUND` | 404 | No such resource (or it belongs to another business) |
| `LAST_SERVICE_AREA` | 422 | The final active admin service-area rule cannot be deactivated |
| `SEATS_UNAVAILABLE` | 409 | Requested seats exceed what remains |
| `REQUEST_IN_FLIGHT` | 409 | The same `Idempotency-Key` is currently being processed |
| `SCHEDULE_INACTIVE` | 422 | The departure was disabled or has passed |
| `OUT_OF_SERVICE_AREA` | 422 | Outside coverage — route to the quote path |
| `AIRPORT_ADDRESS_MISSING` | 422 | Selected airport lacks an address or zipcode |
| `BELOW_MINIMUM_HOURS` | 422 | Hourly booking under the vehicle's minimum |
| `VEHICLE_UNAVAILABLE` | 422 | Vehicle disabled, blacked out, or too small |
| `ADVANCE_BOOKING_VIOLATION` | 422 | Inside the minimum advance window |
| `PROMO_INVALID` | 422 | Code expired, exhausted, or wrong business |
| `PAYMENT_METHOD_NOT_OFFERED` | 422 | This business does not accept that method |
| `RATE_LIMITED` | 429 | The key or client-IP request ceiling was exceeded |
| `BOOKING_UNAVAILABLE` | 503 | Booking is temporarily unable to proceed safely |

---

## Shared endpoints

### `GET /v1/public/business`

Called by both plugins on load. Supplies branding and the settings that shape the form.

```json
{ "data": {
  "id": "uuid",
  "name": "10 Galveston Shuttle",
  "type": "shuttle",
  "currency": "USD",
  "timezone": "America/Chicago",
  "distance_unit": "mi",
  "logo_url": "https://...",
  "brand_color": "#e08a2b",
  "settings": {
    "advance_booking_hours": 6,
    "insurance_enabled": true,
    "insurance_pct": "15.00",
    "offer_car_seats": true,
    "max_car_seats": 5,
    "car_seat_price": "15.00",
    "payment_methods": ["online", "cash"],
    "terms_and_conditions": "<p>...</p>"
  },
  "payments": {
    "square_application_id": "sandbox-sq0idb-...",
    "square_location_id": "L..."
  },
  "max_passengers": 14,
  "max_luggage": 20
}}
```

`terms_and_conditions` is HTML and may be **null** if the business has not written any. Hide the link rather than opening an empty modal.

`payment_methods` drives which options the form offers. Do not hardcode them.

`offer_car_seats`, `max_car_seats` and `car_seat_price` drive the taxi widget's
top-level `car_seats` control. Meet & Greet is deliberately absent: it is a
staff-only admin booking option.

`payments` contains Square's publishable application and location identifiers
for Web Payments SDK tokenisation. It is `null` if either identifier is not
configured; in that case offer only the non-card methods in `payment_methods`.
No Square access token or secret is ever returned.

`max_passengers` is the largest passenger capacity among the business's active,
enabled vehicle offerings; a disabled business assignment is excluded, and the
value is `null` when no enabled vehicle is offered.

`max_luggage` is the largest luggage capacity among the business's active,
enabled vehicle offerings; a disabled business assignment is excluded, and the
value is `null` when no enabled vehicle is offered. The two maxima may come from
different vehicle types.

### `POST /v1/public/promo/validate`

Live inline feedback while the customer types a promo code.

```json
// request
{ "code": "KIYA", "subtotal": "165.00" }

// response — valid
{ "data": { "valid": true, "discount_type": "percent",
            "discount_value": "15.00", "discount_amount": "24.75" } }

// response — invalid, still HTTP 200
{ "data": { "valid": false, "reason": "This code has expired." } }
```

An invalid code returns **200, not an error**, so the plugin can show inline feedback without treating it as a failure. The `reason` never reveals whether a code exists for a different business.

The `subtotal` is used **only** to preview the discount. It never prices a booking.

Rate limited per API key and client IP as documented under Authentication.

---

## Shuttle plugin

Legacy. Not used by the booking-form embed. Scheduled for removal.

### `GET /v1/public/shuttle/locations`

Powers the From/To dropdowns, grouped by category.

**Query:** `exclude_location_id` (optional) — narrows the list to destinations that actually have a route from the chosen origin. Categories left empty are omitted entirely.

```json
{ "data": [
  { "category_id": "uuid",
    "category": "Galveston Cruise Terminal",
    "locations": [
      { "id": "uuid", "name": "Carnival Breeze", "requires_address": false },
      { "id": "uuid", "name": "Gaido's Seaside Inn", "requires_address": true }
    ]}
]}
```

**`requires_address`** is how the plugin knows to show the street-address field at checkout. Hotels and residences set it true; terminals and airports do not. The booking request rejects a missing address when a selected location requires one.

### `GET /v1/public/shuttle/search`

The core search.

**Query:** `from_location_id`, `to_location_id`, `date`, `pax_senior`, `pax_adult`, `pax_child`

```json
{ "data": {
  "route": { "id": "uuid", "from": "Carnival Breeze",
             "to": "George H.W. Bush Airport (IAH)",
             "duration_minutes": 120, "service_label": "Direct Service" },
  "date_strip": [
    { "date": "2026-08-13", "from_price": "82.50", "available": true },
    { "date": "2026-08-15", "from_price": null,    "available": false }
  ],
  "departures": [
    { "schedule_id": "uuid",
      "start_time": "08:00", "end_time": "10:00",
      "duration_minutes": 120, "service_label": "Direct Service",
      "from_price": "82.50",
      "prices": { "senior": "75.00", "adult": "82.50", "child": "60.00" },
      "total_for_selection": "217.50",
      "seats_remaining": 8,
      "low_seat_warning": "Selling fast! Less than 10 seats left",
      "selectable": true,
      "unselectable_reason": null }
  ],
  "filtered_summary": null
}}
```

**Departures the customer cannot book are normally not returned.** The server omits anything sold out, short of seats for the requested party, already departed, inactive, or inside the advance-booking window. Return-search chronology is the documented exception below.

`low_seat_warning` is a **complete sentence or null**. Render it verbatim; do not apply your own threshold. The business configures the number.

`date_strip` always has 7 entries: the requested date and the following six.

No route between the two locations is a **404**, not an empty list.

#### `filtered_summary`

Populated **only when `departures` is empty**, so the plugin can explain the dead end:

```json
"filtered_summary": {
  "total_scheduled": 4,
  "excluded_insufficient_seats": 3,
  "max_seats_available": 4
}
```

- `max_seats_available: 0` → genuinely sold out
- `max_seats_available > 0` with exclusions → the party is too large; suggest reducing it
- `total_scheduled: 0` → nothing runs that day; point at the date strip

Deliberately coarse. There are no per-departure reasons and no schedule ids.

### `GET /v1/public/shuttle/search/return`

**Breaking change — update the shuttle widget before deploying this API:**
`outbound_schedule_id` (UUID) is now a required query parameter. Missing,
unknown or other-business ids return HTTP 400 `VALIDATION_ERROR`, with
`field: "outbound_schedule_id"`. It was previously ignored.

Otherwise identical to outbound search, with `from_location_id` and
`to_location_id` still supplied in the outbound direction and reversed by the
server. Called when the customer chooses **Add Return**.

The endpoint returns every otherwise-bookable departure and date-strip entry,
including options that are too early for the selected outbound. Each departure
has these fields:

| Field | Shape | Meaning |
|---|---|---|
| `selectable` | boolean | `true` when the return meets the server's chronology rule |
| `unselectable_reason` | string or null | Complete customer-facing sentence when `selectable` is false; otherwise null |

The two false-state messages are:

- `This departure leaves before your outbound trip arrives.`
- `This departure leaves before the required {gap}-minute gap after arrival.`

Show the option disabled and render `unselectable_reason` verbatim. Do not
recalculate selectability in the widget. Quote and booking enforce the same
rule again, so bypassing the widget cannot create an invalid cart.

Arrival uses the stored route duration and business timezone, with elapsed
minutes computed on actual instants across midnight and DST. The setting
defaults to 0: departure exactly at arrival is allowed. Positive values add
the configured buffer.

A missing reverse route returns 404 with a message you can show, not an empty list.

### `POST /v1/public/shuttle/quote`

Prices a full cart. **Nothing is held and nothing is written.** Safe to call repeatedly as the customer toggles insurance or retypes a promo code.

For a two-leg cart, the second leg must depart at or after the first leg's
arrival plus the configured minimum return gap. An impossible cart returns
HTTP 400 `VALIDATION_ERROR`, `field: "legs.1.schedule_id"`, at both quote and
booking time; clients cannot override the stored duration or gap.

```json
// request — 1 or 2 legs
{ "legs": [
    { "schedule_id": "uuid", "pax_senior": 1, "pax_adult": 1, "pax_child": 1 }
  ],
  "insurance_selected": true,
  "promo_code": "KIYA" }

// response
{ "data": {
  "legs": [
    { "schedule_id": "uuid",
      "from": "Galveston Cruise Terminal", "to": "AIRPORT: George Bush (IAH)",
      "date": "2026-08-13", "time": "16:00 - 18:00",
      "duration_minutes": 120,
      "pax_summary": "1 Adults, 1 Children (10 & under)",
      "leg_price": "82.50" }
  ],
  "subtotal": "165.00",
  "discount_amount": "0.00",
  "insurance_amount": "24.75",
  "total": "189.75",
  "currency": "USD"
}}
```

**Order of operations:** subtotal → discount → insurance on the discounted amount → total. Insurance covers what is actually paid, so it is computed after any promo.

A departure that has become unbookable since the search returns the appropriate error rather than a stale price.

### `POST /v1/public/shuttle/booking`

Creates the order and takes payment.

**Header:** `Idempotency-Key: <uuid>` — required.

Generate the key when the customer reaches the payment step and **reuse it across retries of that same cart**. Generate a fresh one only if the cart changes. This is what stops a double-click creating two orders.

```json
// request
{ "legs": [ { "schedule_id": "uuid", "pax_senior": 0, "pax_adult": 1, "pax_child": 1 } ],
  "insurance_selected": true,
  "promo_code": null,
  "customer": { "first_name": "Sarah", "last_name": "Gerrison",
                "email": "sarah@example.com", "phone": "+447969615497" },
  "comments": "Ship name: Carnival Breeze.",
  "address": "3700 Seawall Blvd, Galveston TX",
  "payment": { "method": "online", "payment_method_token": "cnon:..." },
  "accepted_terms": true }

// 201
{ "data": {
  "order_id": "uuid",
  "order_number": "GS-2026-004821",
  "status": "confirmed",
  "total": "189.75",
  "amount_paid": "189.75",
  "legs": [ { "booking_id": "uuid", "seats_confirmed": 2 } ],
  "confirmation_email_sent": true
}}
```

`confirmation_email_sent` means the confirmation was accepted into the
asynchronous delivery queue while email delivery was enabled. It does not mean
the SMTP server has already accepted it. When delivery is disabled, the row is
retained for history but is permanently ineligible and this field is `false`.
The shuttle flow also queues a direct company alert. Cash shuttle bookings keep
the same confirmed status, hold consumption and seat mutation as online shuttle
bookings; B-1 does not move them into Pending Requests.

`address` is required when any selected location has `requires_address: true`.

`accepted_terms` must be `true`.

**Seats are only committed on successful payment.** Two customers racing for the last seat: one receives 201, the other 409 `SEATS_UNAVAILABLE`. **This is a normal outcome, not a crash** — send them back to results with a clear message rather than an error screen.

---

## Taxi booking-form embed

### Taxi pricing cascade

The dispatcher resolves each vehicle in this order. This is path selection, not
a sequence of fallbacks: once a matching path is selected, a missing price
becomes Request a Quote rather than trying a different basis.

1. **Legacy anchor-zone — `pricing_basis: "zone"`.** If
   `anchor_zone_prices` contains a fare for the vehicle and the two zipcodes, it
   wins before every pricing row, including a Distance or Flat Rate row. It is
   symmetric and stays on the legacy calculator.
2. **Legacy hourly — `pricing_basis: "hourly"`.** A legacy hourly assignment or
   an Hourly pricing row still dispatches to the legacy hourly calculator.
3. **Distance row — `pricing_basis: "distance"`.** The replacement row computes
   `price_per_mile × miles + base_price`, floored at `minimum_price`, then runs
   the shared row pipeline.
4. **Flat Rate row — `pricing_basis: "flat"`.** The replacement row reads the
   matched **dropoff** service area's rate, ignores `base_price` and
   `minimum_price`, then runs the same row pipeline. `"flat_rate"` is the stored
   configuration value; it is never returned as `pricing_basis`.
5. **No usable price** produces `quote_status: "request_quote"` unless a
   capacity, admin-disabled or blackout reason makes the vehicle
   `"unavailable"`.

The exact public `pricing_basis` values are therefore `"zone"`, `"hourly"`,
`"distance"` and `"flat"`. The field is null when no breakdown was produced.

The replacement row pipeline currently applies only to Distance and Flat Rate.
Do not assume its additions, percentages, card fee, promo behavior or round-trip
behavior are identical to the preserved legacy anchor-zone/hourly calculator.

### Flat Rate behavior

Flat Rate selects the most specific service-area match for the **dropoff** and
reads that area's rate for the chosen vehicle/service row. The pickup area is
not consulted for the price.

For a vehicle with no independent capacity, admin-disabled or blackout reason,
a missing rate or a rate at or below `"0.00"` is surfaced as:

```json
{
  "base_price": null,
  "pricing_basis": null,
  "available": true,
  "quote_status": "request_quote",
  "unavailable_reason": null
}
```

This condition is not the `"unavailable"` state. `"unavailable"` is reserved
for capacity, admin-disabled and blackout outcomes. The top-level
`out_of_service_area` flag describes address coverage or whether the journey as
a whole can be located/priced; it can remain `false` for a covered Flat Rate
journey whose selected dropoff area has a missing or zero rate.

`POST /taxi/price-breakdown` has no manual-quote response shape: selecting a
vehicle with no breakdown returns `400 VALIDATION_ERROR`, field
`"vehicle_type_id"`. Skip that step for `quote_status: "request_quote"`.

`POST /taxi/booking` does accept the same choice. It writes a `"requested"`
order with `total: "0.00"` and `amount_paid: "0.00"`, skips the payment provider,
and leaves staff to price it. The embed should submit only after making clear
that this is a request, not a confirmed zero-price ride.

### Addresses and zipcodes

The plugin sends **both** the free-text address and the zipcode, and they are used for different things.

| Sent | Used for |
|---|---|
| `pickup_address` (text) | Distance via Maps; city/state coverage matching; stored verbatim for the driver |
| `pickup_zipcode` | Zone pricing; zip coverage matching |

**Extract the zipcode from Google Places' structured `address_components`** (`postal_code`), not by parsing the typed string. The server never parses a zipcode out of an address — a wrong guess there is a wrong price.

Local addresses that Maps cannot resolve are expected. They produce `out_of_service_area: true`, never an error.

### `GET /v1/public/taxi/service-types`

```json
{ "data": [
  { "id": "uuid", "code": "one_way", "name": "One Way Transfer" },
  { "id": "uuid", "code": "round_trip", "name": "Round Trip Transfer" },
  { "id": "uuid", "code": "hourly", "name": "Hourly (6 Hour min)", "minimum_hours": 6 },
  { "id": "uuid", "code": "airport_pickup", "name": "Airport Pickup" },
  { "id": "uuid", "code": "airport_dropoff", "name": "Airport Dropoff" }
]}
```

`minimum_hours` appears **only on the hourly entry**, and only when a vehicle configures one. It is the lowest minimum any available vehicle asks for — the one the customer could actually meet. **The field is omitted, not null, when absent.**

### `GET /v1/public/taxi/airports`

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "George Bush Intercontinental Airport",
      "code": "IAH",
      "address": "2800 N Terminal Rd, Houston, TX",
      "zipcode": "77032"
    }
  ]
}
```

This active list is shared by all companies. `address` and `zipcode` are the
exact server-owned location used when the customer selects the airport; the
plugin should use them for display and must not substitute a different pin.

### `GET /v1/public/taxi/airlines`

Feeds the flight-details dropdown on airport services.

The active airline list is shared by all companies.

```json
{ "data": [ { "id": "uuid", "name": "British Airways" } ] }
```

### `GET /v1/public/taxi/charges`

Customer-selectable extras only. Admin-applied charges never appear here.

```json
{ "data": [
  { "id": "uuid", "name": "Car Seat", "amount": "15.00", "is_per_unit": true, "max_quantity": 4 }
]}
```

`max_quantity` is **omitted, not null**, when unlimited. `is_per_unit: false` means quantity is ignored and the charge applies once.

### Taxi request fields added in v1.2

These are the only request fields added by pricing-rework Parts 1–2.

| Field | Endpoints | Required | Type and allowed values | Implemented effect |
|---|---|---|---|---|
| `payment_method` | `/taxi/quote`, `/taxi/price-breakdown` | No; default `null` | string enum: `"online"`, `"cash"`, `"cheque"`, `"bank_transfer"`, or `null` | `"online"` applies the row's CC surcharge; every other value and `null` produces a zero CC amount |
| `car_seats` | `/taxi/price-breakdown`, `/taxi/booking` | No; default `0` | integer `0`–`5` inclusive | On replacement Distance/Flat Rate rows, validates against public business settings and adds `car_seat_price × car_seats`; the amount is not read from `/taxi/charges` |

`/taxi/booking` does **not** accept top-level `payment_method`. It retains the
required `payment` object with optional `payment.method` (default `"online"`)
and optional `payment.payment_method_token`. At booking time the service accepts
only the methods published by `/public/business`: `"online"`, plus `"cash"`
when the tenant allows it. An online booking requires the token.

### `POST /v1/public/taxi/quote`

Step 1 → Step 2. Prices every vehicle the business offers.

For `round_trip`, both `return_date` and `return_time` are required and the
Maps result must include a known outbound duration. Return departure must be
at or after outbound arrival plus `return_minimum_gap_minutes` (default 0).
Quote, price-breakdown and booking enforce the same actual-instant rule.
Invalid ordering returns HTTP 400 `VALIDATION_ERROR`, `field: "return_date"`.
Missing return time names `return_time`; an unresolved duration names
`duration_minutes`, with message `The journey time could not be determined.`
This applies even when a zone fare exists. Out-of-area round trips now measure
duration too: a valid, known-duration journey retains the manual-quote/request
path, but an unresolved duration is rejected. One-way behavior is unchanged.

**Query:** `hide_incapable=true` (optional) — omits vehicles that fail on capacity, so the plugin does not have to filter them out itself.

One request shape covers all five service types; fields that do not apply are null.

```json
// request — distance or zone
{ "service_type": "one_way",
  "pickup_date": "2026-08-12", "pickup_time": "16:45",
  "pickup_address": "1301 McKinney St, Houston, TX", "pickup_zipcode": "77010",
  "dropoff_address": "George Bush Intercontinental Airport", "dropoff_zipcode": "77032",
  "pickup_airport_id": null, "dropoff_airport_id": null,
  "airline": null, "flight_number": null,
  "return_date": null, "return_time": null,
  "hours": null, "stops": [],
  "passengers": 3, "luggage": 2,
  "payment_method": null }

// request — hourly
{ "service_type": "hourly",
  "pickup_date": "2026-08-12", "pickup_time": "04:50",
  "pickup_address": "...", "pickup_zipcode": "77010",
  "dropoff_address": null, "dropoff_zipcode": null,
  "stops": ["..."], "hours": 6,
  "passengers": 3, "luggage": 0 }

// request — airport pickup
{ "service_type": "airport_pickup",
  "pickup_airport_id": "uuid",
  "airline": "British Airways", "flight_number": "195",
  "dropoff_address": "...", "dropoff_zipcode": "77550",
  "pickup_date": "2026-08-12", "pickup_time": "16:45",
  "passengers": 6, "luggage": 5 }

// request — airport dropoff
{ "service_type": "airport_dropoff",
  "dropoff_airport_id": "uuid",
  "airline": "British Airways", "flight_number": "196",
  "pickup_address": "...", "pickup_zipcode": "77550",
  "pickup_date": "2026-08-12", "pickup_time": "16:45",
  "passengers": 6, "luggage": 5 }
```

For both examples, the airport-side address and zipcode come from the selected
airport record. Do not send them from the client.

```json
// response
{ "data": {
  "distance_miles": "12.91",
  "duration_minutes": 28,
  "route_polyline": "encoded...",
  "out_of_service_area": false,
  "vehicles": [
    { "vehicle_type_id": "uuid", "name": "TAXI",
      "passenger_capacity": 6, "luggage_capacity": 6, "photo_url": null,
      "base_price": "36.15", "pricing_basis": "zone",
      "available": true, "quote_status": "priced",
      "unavailable_reason": null },
    { "vehicle_type_id": "uuid", "name": "SEDAN",
      "passenger_capacity": 3, "luggage_capacity": 3, "photo_url": null,
      "base_price": "38.73", "pricing_basis": "distance",
      "available": false, "quote_status": "unavailable",
      "unavailable_reason": "capacity" }
  ]
}}
```

`distance_miles`, `duration_minutes` and `route_polyline` are **null for hourly** — there is no fixed destination.

`base_price` is null when nothing could price the journey for that vehicle.

#### `quote_status` and vehicle availability

| `quote_status` | `available` | Price fields | Meaning |
|---|---|---|---|
| `"priced"` | `true` | `base_price` and `pricing_basis` are non-null | Selectable price |
| `"request_quote"` | `true` | Both are null | Manual quote; no price exists yet |
| `"unavailable"` | `false` | May still contain a price | Vehicle cannot serve the request |

For `"unavailable"`, `unavailable_reason` is `"capacity"`,
`"admin_disabled"` or `"blackout"`, in that precedence order. Otherwise it is
null. Capacity rows may be omitted with `?hide_incapable=true`.

Evaluated in that precedence order. An unavailable vehicle still carries a price wherever one can be computed — a price with a reason beside it tells the customer more than a shorter list they cannot account for.

#### `out_of_service_area`

When true, the response is **still HTTP 200**. Show the "we'll quote you" path.
This is a normal business outcome, not an error, and the booking still submits —
it simply becomes a request that staff price by hand. Do not use this top-level
flag as the per-vehicle state; use `quote_status`.

#### Validation

Airport services require `airline`, `flight_number`, and the matching
`pickup_airport_id` or `dropoff_airport_id` (400 naming the field). Only the
non-airport side's address is required. An airport without both a configured
address and zipcode returns 422 `AIRPORT_ADDRESS_MISSING`. Hourly requires
`hours > 0`. A return time must not precede pickup. All checks are server-side;
the plugin's are UX only.

Rate limited per API key and client IP as documented under Authentication,
since each request may call Google.

### `POST /v1/public/taxi/price-breakdown`

Step 2 → Step 3. Itemises the chosen vehicle after extras. Side-effect free.

Rate limited per API key and client IP as documented under Authentication.

```json
// request — the journey fields, plus:
{ "...journey fields...": "...",
  "vehicle_type_id": "uuid",
  "charges": [ { "charge_id": "uuid", "quantity": 0 } ],
  "promo_code": null,
  "payment_method": "online",
  "car_seats": 0 }
```

#### Line items

For replacement Distance and Flat Rate rows, line items are returned in this
exact order. Zero-amount rows are retained.

| Order | `label` | `kind` | Quantity / unit-price rule |
|---:|---|---|---|
| 1 | `Base` | `base` | quantity `1`; `unit_price: null` |
| 2 | `Additional Passenger` | `charge` | `max(passengers - 1, 0)` × the row rate |
| 3 | `Additional Luggage` | `charge` | `luggage` × the row rate |
| 4 | `Additional Stop` | `charge` | number of `stops` × the row rate |
| 5 | `Airport Fee` | `charge` | quantity `1` × the row rate |
| 6 | `Tolls` | `charge` | quantity `1` × the row rate |
| 7 | `Waiting Time` | `charge` | quantity `1` × the row rate |
| 8 | `Additional Charge` | `charge` | quantity `1` × the row rate |
| 9 | `Gratuity` | `surcharge` | percentage of charged base plus additions |
| 10 | `Fuel Surcharge` | `surcharge` | percentage of charged base plus additions |
| 11 | `Sales Tax` | `surcharge` | percentage of charged base plus additions |
| 12 | `Discount` | `discount` | negative percentage amount |
| 13 | `Car Seats` | `charge` | `car_seats` × the snapshotted business preference price |
| 14 | `Meet & Greet` | `charge` | currently zero from public requests |
| 15 | `CC Surcharge` | `surcharge` | percentage of pipeline subtotal |

`kind` can still be `base`, `charge`, `surcharge`, `discount` or `insurance`
across the public pricing types. `source_id` ties legacy configured charge or
surcharge lines to their source; the row pipeline's built-in lines currently
have `source_id: null`.

The CC charge **applies only when `payment_method` is `"online"`** (card). The
current row pipeline still serialises `"CC Surcharge"` in its fixed line-item
list for `null`, cash, cheque and bank transfer, but its amount is `"0.00"` in
those cases. The embed should hide a zero line if its design calls for the line
to appear only for card.

**Zero-amount line items still appear.** Compose any display suffix from
`label`, `quantity` and `unit_price`; do not match on label text to infer the
quantity.

#### Per-passenger charges

`per_passenger` means **additional passengers after the first**. The quantity is
`max(passengers - 1, 0)`, not total headcount. For example, three passengers
produce quantity `2` on the `Additional Passenger` line.

#### Subtotal semantics

`POST /taxi/price-breakdown` is the only public taxi endpoint that returns a
`subtotal` field.

- For replacement Distance and Flat Rate rows, it is `charged + gratuity + fuel
  + sales tax - discount + car seats + meet-and-greet`, before CC surcharge.
- For preserved legacy anchor-zone and hourly paths, it retains the v1.1
  meaning: pre-discount and pre-surcharge.
- `/taxi/quote` does not return `subtotal`; its per-vehicle `base_price` is
  actually the complete calculated total, including CC surcharge when
  `payment_method: "online"`.
- `/taxi/booking` returns `total` and `amount_paid`, not `subtotal`.

A `quantity` above a charge's `max_quantity` is a validation error, not a silent clamp.

#### Verified worked examples

These are the only verified v1.2 taxi examples.

**Distance — `413.75`.** Regression tests:
`tests/pricing/test_distance_rows.py::test_live_distance_worked_example_is_exact`
and
`tests/api/public/taxi/test_pricing_rows.py::test_distance_breakdown_worked_example_is_413_75`.

| Tested value | Amount |
|---|---:|
| Raw distance base | `338.9800` |
| Minimum-floored `Base` | `390.00` |
| Fuel Surcharge | `11.70` |
| Pipeline `subtotal` | `401.70` |
| CC Surcharge | `12.05` |
| **Total** | **`413.75`** |

**Flat Rate — `77.63`.** Regression tests:
`tests/pricing/test_flat_rate_rows.py::test_live_flat_rate_worked_example_is_exact`
and
`tests/api/public/taxi/test_pricing_rows.py::test_flat_breakdown_worked_example_is_77_63`.

| Tested value | Amount |
|---|---:|
| Dropoff area `Base` | `25.00` |
| Additional Passenger (`25.00 × 2`) | `50.00` |
| Charged / pipeline `subtotal` | `75.00` |
| CC Surcharge | `2.63` |
| **Total** | **`77.63`** |

### `POST /v1/public/taxi/booking`

The round-trip arrival/duration validation documented under `/taxi/quote`
runs again before any order, payment or audit entry is written.

Rate limited per API key and client IP as documented under Authentication.
Replaying a completed `Idempotency-Key` still counts toward both limits.

**Header:** `Idempotency-Key: <uuid>` — required.

```json
// request
{ "...journey fields...": "...",
  "vehicle_type_id": "uuid",
  "charges": [ { "charge_id": "uuid", "quantity": 2 } ],
  "promo_code": null,
  "car_seats": 0,
  "customer": { "first_name": "...", "last_name": "...",
                "email": "...", "phone": "..." },
  "comments": "Please call on arrival",
  "payment": { "method": "cash" },
  "accepted_terms": true }

// 201
{ "data": {
  "order_id": "uuid",
  "order_number": "HVT-2026-003211",
  "status": "requested",
  "total": "76.30",
  "amount_paid": "0.00",
  "payment_method": "cash",
  "confirmation_email_sent": true
}}
```

`confirmation_email_sent` is the legacy field name for the customer outcome
email: confirmation for a confirmed order, or request acknowledgement for a
requested order. It reports queue eligibility, not completed SMTP delivery, and
is `false` when `EMAIL_DELIVERY_ENABLED` is off. A direct company alert is also
queued for every successful submission.

#### Resulting status

| Condition | `status` |
|---|---|
| No price was produced, including a missing/zero Flat Rate | `"requested"` — staff quote it manually |
| Cash payment | `"requested"` — staff confirm it |
| Priced card payment and `auto_confirm_card_payments` is on | `"confirmed"` |
| Priced card payment and `auto_confirm_card_payments` is off | `"requested"` — staff review it |

An unpriced booking creates a **zero-total `requested` order and does not fail**.
That includes an out-of-area journey, an unresolved Distance journey, and a
Flat Rate row whose matched dropoff area has no rate or a `"0.00"` rate. No
payment-provider call is made.

Cash bookings return `requested` with `amount_paid: "0.00"`; staff confirmation
later queues the confirmation email.

---

## Open questions

These are deliberately unresolved. The embed must follow the implemented
behavior above while product decisions and live-system comparisons are pending.

### I-1 — Round trip (UNVERIFIED)

v1.1's `467.15` example says a round trip doubles the base and extras. The
preserved legacy anchor-zone/hourly calculator still receives the round-trip
flag and contains doubling/round-trip-discount logic. The replacement Distance
and Flat Rate row pipeline receives passenger, luggage, stops, payment method
and car seats, but no round-trip flag; it therefore does not perform that
doubling. A live test against the client's current system must decide the target
behavior. Until then, the old `467.15` example is **UNVERIFIED**.

### I-2 — Subtotal

v1.1 defined `subtotal` as pre-discount and pre-surcharge. The replacement row
pipeline defines it as charged base and additions, plus gratuity/fuel/tax, minus
discount, plus post-percentage extras, before CC. Because
`/taxi/price-breakdown` returns the selected calculator's value, its semantics
currently differ between legacy anchor-zone/hourly and replacement
Distance/Flat Rate paths. `/taxi/quote` and `/taxi/booking` do not return a
`subtotal` field.

### I-3 — Car seats and generic charges

`GET /taxi/charges` can expose a customer-applied `"Car Seat"` charge while the
new top-level `car_seats` field independently prices at the business preference
price. A request
can send both. They do not currently both apply:

- Distance/Flat Rate row paths use top-level `car_seats`; selected generic
  `charges` are not passed into the row pipeline and are not persisted.
- Legacy anchor-zone/hourly paths use selected generic `charges`; top-level
  `car_seats` is not passed into the legacy calculator or snapshot.

The repository contract documents top-level `car_seats`, but the live widget
source is not present here, so exclusive use could not be confirmed. The
generic catalog row remains visible for compatibility. Replacement round trips
charge `price × count` once per order, pending a client decision for round trips.

### I-4 — Flat Rate manual-quote booking

The rework spec says a missing or zero area rate should refuse the quote and
never return a zero-priced booking. The implemented quote outcome is correctly
`"request_quote"`, but `POST /taxi/booking` accepts it and creates a zero-total
`"requested"` order. Confirm whether the embed should keep submitting manual
requests or stop before booking.

### I-5 — CC surcharge line visibility

The rework spec says the CC surcharge is absent for cash. The implementation
applies a non-zero amount only for `payment_method: "online"`, but always emits
the `"CC Surcharge"` row and uses `"0.00"` for every other method or null.
Confirm whether the API should omit that line or the embed should hide it.

### I-6 — Discounts on replacement rows

The rework spec describes booking-level `discount_pct`. It is not present in
the public quote, breakdown or booking schemas. Meet & Greet is now an explicit
staff-only admin feature and remains absent from those public schemas; the row
pipeline therefore emits a zero `"Meet & Greet"` line for public requests.
In addition, a public `promo_code` is not converted into the row pipeline's
`discount_pct`: breakdown rejects it as `PROMO_INVALID`, while booking does not
apply or persist it on a replacement row. Decide how these inputs reach the row
pipeline before the embed offers them for Distance or Flat Rate.

### I-7 — Preview payment-method enum

The quote and breakdown schemas accept `"online"`, `"cash"`, `"cheque"` and
`"bank_transfer"`, but public booking accepts only the tenant's methods from
`/public/business`, which are `"online"` and optionally `"cash"`. The embed
should use only the published methods; whether the preview enum should be
narrowed remains open.

---

## Payments

### The flow

1. The plugin tokenises the card with **Square's Web Payments SDK**. Card details never reach this API.
2. It sends the token as `payment.payment_method_token` on the booking request.
3. The server charges Square. **A successful client call is not a settled payment** — the order becomes `processing`.
4. Square delivers a signed webhook to `POST /v1/webhooks/square`. Only the **verified webhook** confirms settlement, at which point the order becomes `confirmed` and shuttle seats are committed.

### Order statuses the plugin may see

| Status | Meaning |
|---|---|
| `pending` | Created, payment not yet resolved |
| `processing` | Charged, awaiting webhook confirmation |
| `requested` | Needs staff action (manual quote or review) |
| `confirmed` | Settled and booked |
| `cancelled` | Payment declined, expired, or cancelled |
| `refunded` | Fully refunded |

### Failure handling

| Outcome | HTTP | What to show |
|---|---|---|
| Card declined | `402 PAYMENT_FAILED` | Let them retry with another method |
| Outcome unknown (timeout, gateway 5xx) | `402 PAYMENT_FAILED` | **Do not auto-retry.** Tell them to check their email before trying again — the payment may have gone through |
| Seat lost while paying | `409 SEATS_UNAVAILABLE` | Send back to results |
| Method not offered | `422 PAYMENT_METHOD_NOT_OFFERED` | Offer the methods from `/business` |
| Duplicate submit in flight | `409 REQUEST_IN_FLIGHT` | Wait, do not resubmit |
| Same key already completed | `200` with the **original** response body | Show the original confirmation |

The unknown-outcome case is the one to get right. An automatic retry there can double-charge a customer.

---

## Admin shared lead sources (B-32)

The existing admin paths remain stable:

- `GET /v1/admin/lead-sources`
- `POST /v1/admin/lead-sources`
- `PATCH /v1/admin/lead-sources/{source_id}`
- `DELETE /v1/admin/lead-sources/{source_id}`

All six businesses read the same list. Owners, managers, and dispatchers may
list and select active sources on customers and bookings. Catalog mutations
require the platform-super-admin flag and return `403 FORBIDDEN_BUSINESS_SCOPE`
for every other admin. `LeadSourceResult.business_id` remains present for client
compatibility and is always `null` for the shared catalog.

## Notes for plugin developers

**Never compute money.** Every total, discount, surcharge and seat count comes from an endpoint. The server re-prices on submission and ignores anything you send, so a locally computed figure can only ever disagree with what is charged.

**Treat the embed key as public.** Put only the dedicated `embed` key in the
browser snippet. Its safety comes from public-only scope and dual rate limits,
not secrecy or CORS.

**Cart persistence:** store the *selection* (schedule ids, pax, insurance flag, promo code) rather than prices, and re-quote on restore. A cart restored with stale prices is worse than a lost cart. Expire it after about 30 minutes — departures sell out.

**Branding** comes from `/public/business` at runtime. Do not hardcode logos or colours per site.
