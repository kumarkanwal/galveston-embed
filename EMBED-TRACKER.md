# Booking Widget (Embed) — Tracker

**Repo:** `galveston-embed` (new, separate) · **Last updated:** 17 October 2026
**Talks to:** the hosted `galveston-backend` API on the VPS.
**Replaces:** the client's live Book Rides Online (BRO) booking form.

Every item has a status and a reason. Nothing is marked buildable unless the backend was verified by a code audit. Anything not proven is **VERIFY**, never assumed.

---

## Status legend

| Status | Meaning |
|---|---|
| ✅ **Build** | Backend exists and was verified by audit. Build it now. |
| 🔍 **Verify** | Buildable, but one fact must be confirmed first. The item says what and how. |
| ⏸ **Later** | Add-on. Deliberately after the core flow works. |
| ⛔ **Blocked** | Needs something that doesn't exist yet. The item says what. |

---

## What the widget is

- One `<script>` tag the client pastes into their own website. Works on any site, not only WordPress.
- The widget file is hosted on our VPS. It calls our backend API from the visitor's browser.
- **No header, no login, no customer accounts.** Out of scope.
- **Copy BRO's 3-step flow:** Trip Details → Choose Vehicle → Confirm. Customers and staff already know it.

## Goal of the core

1. Show the services and vehicles the admin configured.
2. Get the correct price from the API.
3. Create a real booking that appears in the admin panel.

**Proof point:** BRO's live form priced the 14 PAX Mercedes Sprinter at **$413.75** (base $390.00 + fuel $11.70 + CC $12.05). Our backend's test produces exactly $413.75 for the same row. The widget must show the same figure for the same trip.

---

## Progress

**Overall: 70%** ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░ · **"Built" means 100%, add-ons included.**

| # | Phase | Side | Weight | Status | Done |
|---|---|---|---|---|---|
| 0 | Planning & research | Both | 4% | ✅ Complete | 4% |
| 1 | Project setup & docs | Widget | 4% | 🔄 Other setup items pending | 3% |
| 2 | Backend prep (B-20, VPS deploy, config, B-21) | Backend | 7% | ✅ Complete | 7% |
| 3 | E-1 Skeleton, API, money, time | Widget | 7% | ✅ Complete | 7% |
| 4 | E-2 Step 1 — Trip Details | Widget | 12% | ✅ Complete | 12% |
| 5 | E-3 Step 2 — Choose Vehicle | Widget + VPS | 11% | ✅ Complete — address filter fixed | 11% |
| 6 | E-4 Step 3 — Confirm & breakdown | Widget | 9% | ✅ Complete — ready for review | 9% |
| 7 | E-5 Create Trip, confirmation, errors | Widget + Admin | 9% | ✅ Complete — merged and verified live | 9% |
| 8 | E-6 Mobile, side-by-side with BRO, hosting | Both | 12% | 🔄 E-6e exact airport pin complete; BRO/hosting pending | 4% |
| 9 | E-7 Card payment (Square) | Both | 9% | ⛔ B-16 | 0% |
| 10 | E-7a Promo codes | Both | 4% | ✅ Complete — ready for review | 4% |
| 11 | E-9 Round trip | Both | 5% | ⛔ I-1 | 0% |
| 12 | E-10 Peak / blackout | Both | 3% | ⛔ B-7 | 0% |
| 13 | E-11 Hourly (hours + Add Stops) | Both | 4% | ⛔ Backend hourly pricing (C-6) | 0% |
| | **Total** | | **100%** | | **70%** |

Weights are estimates. Phase details and dependencies: `AGENTS.md` section 3.

## Setup (before the widget can call the API)

| # | Item | Status | Why |
|---|---|---|---|
| S-1 | New repo `galveston-embed` | ✅ | Separate from `galveston-widgets` (old cancelled plugin; leave untouched) |
| S-2 | **VPS runs the latest backend**, including the pricing migration `f1a2b3c4d5e6` | ✅ | Pricing migration and B-20 are deployed on the preview VPS |
| S-3 | D-1 (contract v1.2) and B-20 pushed to `origin` | ✅ | B-20 is included in backend commit `7e15a04` |
| S-4 | `openapi.json` and `API_CONTRACT.md` copied byte-for-byte from pushed backend `main` | ✅ | Refreshed from backend commit `3943c62c00d572a251366d568117711e43f9eb07` (including B-30 taxi promo pricing) |
| S-5 | Demo company API key, named `embed` | ✅ Ready when needed | Runbook: `docs/runbooks/embed-keys.md` (backend) |
| S-6 | Developer's local address (e.g. `http://localhost:5173`) added to `CORS_ORIGINS` on the VPS | ⛔ Not yet | Otherwise the browser cannot read API responses |
| S-7 | **Google Maps browser key**, HTTP-referrer restricted to dev address now, client sites later | 🔍 Key available; enable Routes API and restrict it | Must be separate from the server key. Maps JavaScript API, Places API (New), and Routes API are required; never use the server key in the browser |
| S-8 | Demo company offers **cash** in `payment_methods` and allows cash bookings | 🔍 Check `GET /v1/public/business` and the `require_payment` setting | Otherwise every booking returns `422 PAYMENT_METHOD_NOT_OFFERED` |

**The developer can build screens before S-2 to S-8 are done. He needs them only to connect.**

---

## Step 1 — Trip Details

| # | Item | Status | API | Notes |
|---|---|---|---|---|
| 1.1 | Service dropdown | ✅ | `GET /taxi/service-types` | Show only `one_way`, `airport_pickup`, and `airport_dropoff` (ED-016). Uses the generated `ServiceTypeOption` schema (ED-024) |
| 1.2 | Pickup date and time | ✅ | `GET /business` → `timezone`, `advance_booking_hours` | Times and advance-booking validation use the **business's timezone**, not the visitor's browser. Server enforcement remains authoritative |
| 1.3 | Passengers dropdown | ✅ | `GET /business` → `max_passengers` | Uses the business limit capped at the request-schema maximum. Null means no vehicles are available (ED-020, ED-024) |
| 1.4 | Luggage dropdown | ✅ | `GET /business` → `max_luggage` | Uses the business limit capped at the request-schema maximum. Null means no vehicles are available (ED-020, ED-024) |
| 1.5 | Pickup / dropoff address autocomplete | ✅ | Google Places (browser key, S-7) | US-only suggestions allow cities, street addresses and places such as hotels, terminals and airports; country, state, region and postal-code-only suggestions are excluded. Send **both** the address text and the zipcode. **Take the zipcode from Places `address_components` (`postal_code`), never by parsing the typed text.** Why: zipcodes decide zone prices; a wrong guess is a wrong price |
| 1.6 | Pin icon beside each address | ✅ | — | Decorative icon only, no action (ED-014) |
| 1.7 | Map | ✅ | Google Maps JavaScript API + Routes API | Draws and updates a browser route as soon as both Step 1 endpoints are known; airport endpoints use the API's exact address and zipcode with a silent name-search fallback; the decoded backend quote route takes over after pricing (ED-025) |
| 1.8 | Airport Pickup / Dropoff fields: airport, airline, flight number | ✅ | `GET /taxi/airports`, `GET /taxi/airlines` | Airport is a plain select; airline is searchable. The BRO airport screenshots are present |
| 1.9 | Hourly: hours field, stops | ⏸ E-11 | — | Removed from the core by ED-016; ignore `hourly` until its add-on phase |
| 1.10 | Check Pricing | ✅ | `POST /taxi/quote?hide_incapable=true` | Sends once per click, disables while in flight, and handles quote errors without losing fields |

## Step 2 — Choose Vehicle

| # | Item | Status | Notes |
|---|---|---|---|
| 2.1 | Vehicle list | ✅ | From the quote response `vehicles[]` |
| 2.2 | Photo | ✅ | HTTPS `photo_url` images are fixed-size, lazy-loaded and contained; null, invalid, non-HTTPS and failed images use the same-size inline car placeholder |
| 2.3 | Name and capacity icons | ✅ | **Names are display text only.** Capacity from `passenger_capacity` and `luggage_capacity`. Why: real data has a vehicle named "up to 14 pax" with capacity 9 |
| 2.4 | Three states | ✅ | `quote_status`: `"priced"` → show price · `"request_quote"` → "Request a Quote", Choose stays active · `"unavailable"` → greyed, button reads "Unavailable" |
| 2.5 | Base fare column | ✅ | `base_price` (string). Format only; never calculate |
| 2.6 | Vehicles too small for the party | ✅ | Use `?hide_incapable=true`, or hide rows with `unavailable_reason: "capacity"` |
| 2.7 | Back button | ✅ | Keeps step 1 inputs |
| 2.8 | Out of service area for every vehicle | ✅ | `out_of_service_area: true` is **HTTP 200, not an error**. Show the Request a Quote path |

## Step 3 — Confirm

| # | Item | Status | Notes |
|---|---|---|---|
| 3.1 | Trip summary | ✅ | Service, date/time, vehicle, distance (`distance_miles`), passengers, luggage, addresses |
| 3.2 | Charges breakdown | ✅ | `POST /taxi/price-breakdown` with `payment_method: "cash"`. Display `line_items` and `total` exactly as returned |
| 3.3 | Line-item labels | ✅ | Show exactly what the API returns (ED-011). Any label change happens in the backend |
| 3.4 | Zero-value lines | ✅ | Hide every line whose amount string is exactly `"0.00"` (ED-022); never identify lines by label |
| 3.5 | Company-configured Car Seats | ✅ with backend gap | `/business` settings show or hide the control, set options `0..max_car_seats`, and provide the per-seat label. Send only top-level `car_seats`; re-call price-breakdown on change; server lines and totals remain authoritative. A stale-preference 400 stays under the control without changing the customer's choice. Request a Quote shows no price. **Legacy anchor-zone/hourly pricing still ignores top-level `car_seats` (backend I-3).** |
| 3.6 | Special requests | ✅ | Booking `comments` |
| 3.7 | First name, last name, phone, email | ✅ | Booking `customer` |
| 3.8 | Terms & Conditions checkbox and link | ✅ | `terms_and_conditions` from `/business` may be **null**: hide the link when null and render admin-entered content as literal plain text, never `innerHTML`. `accepted_terms` must be `true` |
| 3.9 | Create Trip (cash) | ✅ | Sends once with a request-bound UUID idempotency key. A fingerprint/key pair (no customer data) survives reloads; retries reuse it until trip, vehicle, car seats, or customer details change (ED-026) |
| 3.10 | Request a Quote vehicle chosen | ✅ | Shows Step 3 without charges, never calls price-breakdown, and submits a zero-total manual quote request |
| 3.11 | Back button | ✅ | Returns to step 2 |
| 3.12 | Promo code | ✅ | Priced vehicles only. Apply re-runs price-breakdown with the exact entered code; discount lines and totals remain server-owned. Tracking-only codes show `Code applied` without a discount line. Invalid codes retain the normal total and booking path; Remove re-prices without the code. The same applied code is sent with booking for the server to re-check. |

## After booking

| # | Item | Status | Notes |
|---|---|---|---|
| 4.1 | Confirmation screen | ✅ provisional | Uses the returned reservation number and total plus `/business` currency. Priced `requested`/`pending` responses say the company will confirm; `confirmed` keeps the submitted-reservation wording; Request a Quote keeps its pending-reservation wording. No status promises an email. Priced wording awaits a BRO screenshot |
| 4.2 | Error handling | ✅ | Offline, timeout, 5xx, 429, bad-key 401 and named 422 outcomes keep the form and never retry automatically; retryable unknown outcomes reuse the same idempotency key |
| 4.3 | Booking appears in admin Runs | ✅ | E-5 was merged into `main` and verified live |

## Add-ons (after the core flow works)

| # | Item | Status | Why later / what blocks it |
|---|---|---|---|
| A-1 | **Card payment** (new; BRO has none) | ⛔ | C-15 answered: one Square account, one location per company (ED-015). Still needs B-20 pushed, each company's Square location id, and B-16 sandbox test |
| A-2 | Promo code | ✅ | E-7a uses B-30 price-breakdown and booking support on Distance and Flat Rate rows. Request-a-Quote vehicles keep ED-009 and do not show the control. |
| A-3 | Round trip | ⛔ | Pricing unverified (I-1). Currently disabled for all businesses in the client's real setup |
| A-4 | Peak / blackout display | ⏸ | Peak increases not on the new pricing path yet (B-7) |
| A-5 | Per-pricing-row airport filter | ⏸ | `pricing_row_airports` exists but nothing uses it |
| A-6 | Production hosting of `embed.js` on the VPS | ⏸ | Behind Caddy. Config only, no host-specific code |

---

## Rules (non-negotiable)

| Rule | Why |
|---|---|
| **Money is a string.** Never `parseFloat`, `Number()`, `toFixed()` or arithmetic on money | The server prices and re-prices everything. A browser-calculated total can only disagree with what is charged |
| **Send only `"cash"` as payment method** in the core | Booking accepts only `online` and `cash`; card is an add-on |
| **Never retry a booking POST automatically.** Reuse the same `Idempotency-Key` if the customer retries the same cart; new key only if the cart changes | Stops double bookings and, later, double charges |
| **Never invent API fields.** If something is missing from `openapi.json`, stop and report it | Request bodies reject unknown fields with 400 |
| **Shadow DOM** for all widget UI and styles | Client site CSS must not break the form, and ours must not break their site |
| **One self-contained file**, `embed.js` | The client pastes one tag |
| **Business key is public by design** (decision D-0). No proxy, no obfuscation | It grants only the public booking endpoints |
| Exact dependency versions, no `^` or `~` | Reproducible builds; matches the admin repo |

## Errors the widget must handle

| Response | Show |
|---|---|
| `400 VALIDATION_ERROR` | Message on the named `field` (field may be absent) |
| `401` | "This booking form is not configured."; one sanitized developer log, with no key |
| `403`, `404`, `503` | The API message, or a friendly fallback; never retry automatically |
| `409 REQUEST_IN_FLIGHT` | "Your booking is still being processed. Please wait a moment and try again."; a customer retry reuses the same key |
| `422 ADVANCE_BOOKING_VIOLATION`, `OUT_OF_SERVICE_AREA`, `VEHICLE_UNAVAILABLE`, `BELOW_MINIMUM_HOURS`, `PAYMENT_METHOD_NOT_OFFERED`, `AIRPORT_ADDRESS_MISSING` | The API's `message` |
| `422 PROMO_INVALID` | The API's `message` under Promo code; Remove restores pricing and booking without the code |
| `429 RATE_LIMITED` | "Too many requests, please wait a moment and try again." |
| Other `5xx`, network failure | "We couldn't confirm your booking. Please try again — you will not be booked twice."; a customer retry reuses the same key |

---

## Screenshots still needed from BRO

1. Step 3 — after choosing a Request a Quote vehicle
2. The page after a priced Create Trip (the Request a Quote confirmation is present)
3. Mobile view of each step
4. Step 1 — Hourly, before E-11

## E-6c differences from BRO

- Car Seats is controlled by each company's Preferences instead of always
  showing BRO's fixed `0–5` list.
- Priced vehicles show the company's configured per-seat price as a label; the
  charge and total still come only from the backend price breakdown.
- Request-a-Quote vehicles use the configured Car Seats options but deliberately
  show no car-seat price.
- Meet & Greet is not shown because it is a staff-only option.

## Open questions

| # | Question | Who |
|---|---|---|
| Q-4 | Square location id for each of the six companies | Client |
| Q-5 | I-1: round-trip pricing | Test on BRO's form, if the client ever enables it |

## Open items

- **B-26:** document the taxi-booking `200` idempotent replay response in OpenAPI, mark `Idempotency-Key` required there, and document server retention. This does not block the widget, which always sends a UUID and scopes a key to one unchanged request body.
- **E-6 deployment:** enable Routes API on the referrer-restricted Maps browser-key project, finish BRO side-by-side verification, configure client-domain CORS, and deploy the reviewed bundle.

## Sources of truth

- `galveston-backend/docs/API_CONTRACT.md` (commit `3943c62c00d572a251366d568117711e43f9eb07`; section I-6 is stale for B-30)
- `galveston-backend/openapi.json` (commit `3943c62c00d572a251366d568117711e43f9eb07`)
- `galveston-backend/docs/PROJECT-TRACKER.md`
- BRO screenshots in this repo

## Changelog

| Date | Change |
|---|---|
| 17 Oct 2026 | E-7a complete for review: refreshed and byte-verified the B-30 API sources, added the BRO-style Step 3 promo control for priced vehicles, kept discount lines and totals server-owned, supported tracking-only and invalid/expired codes, removed codes through a fresh normal breakdown, and sent only the successfully applied code with booking. |
| 17 Oct 2026 | E-6e complete for review: refreshed the pushed B-28 contract, geocoded each selected airport's server-owned address and zipcode for the Step 1 pin and route, retained a silent airport-name fallback with at most one developer warning, and kept quote, breakdown, booking, and money behavior unchanged. |
| 15 Oct 2026 | E-6d complete for review: Step 2 now loads only HTTPS vehicle photos, reserves fixed responsive image space, lazy-loads with the vehicle name as alt text, and replaces absent, invalid, non-HTTPS, or failed images with a neutral inline car placeholder. |
| 15 Oct 2026 | E-6c complete for review: refreshed the approved B-29 contract, replaced the fixed Car Seats list with company Preferences, kept pricing server-owned, placed stale-preference errors under the preserved selection, and made priced confirmation wording follow `requested`/`pending` versus `confirmed`. Request a Quote shows no car-seat price, Meet & Greet remains staff-only, and no confirmation promises email. |
| 15 Oct 2026 | E-6b complete for review: field errors stay with their controls and appear only after blur or submit; mobile controls use 44px targets and 16px text through tablet widths; keyboard focus, Terms trapping, form semantics, concise announcements, map alternatives, completed progress, and same-brand WCAG AA colours are covered by regression tests and an exact-width browser pass. |
| 15 Oct 2026 | E-6 hardening complete for review: refreshed the pushed backend contract, removed temporary limits/service typing, persisted fingerprint-only booking idempotency across reloads, covered submission/error/embed safety, and added immediate race-safe Step 1 route previews. Live asset currently has validators but no explicit cache policy; recommend short revalidation for the stable `embed.js` URL. Mobile/BRO/hosting work remains. |
| 15 Oct 2026 | E-5 merged into `main` and verified live; a booking appears in admin Runs. |
| 11 Oct 2026 | E-5 complete for review: cash booking POST with body-bound idempotency, double-submit protection, manual retry handling, Request a Quote Step 3, conditional-email confirmation screens, booking error placement, and keyboard-accessible Terms closing. Priced confirmation wording remains provisional; live preview booking/admin verification is pending. Added backend documentation item B-26. |
| 11 Oct 2026 | E-4 complete for priced vehicles: server-owned price breakdown, ED-022 zero-line filtering, race-safe Car Seats repricing, trip summary, customer fields, plain-text terms panel, validation, and typed cash booking-request preparation without a booking POST. Legacy anchor-zone pricing ignores `car_seats` (backend I-3). |
| 11 Oct 2026 | E-3 follow-up: kept address autocomplete US-only while excluding country, state, administrative-region and postal-code-only suggestions; cities, street addresses and places remain available. Added focused request and type-filter tests. |
| 11 Oct 2026 | E-3 complete: one-request quote submission, quote-error mapping, Step 2 vehicle states, out-of-area handling, route rendering on the Step 1 map, preserved Back navigation, and the Step 3 placeholder. Airport quote requests remain blocked by the documented backend/contract conflict. |
| 10 Oct 2026 | E-2 complete: core Trip Details services, business-time validation, passenger/luggage selectors, Shadow DOM Places autocomplete, map pins, airport fields, and validated handoff to E-3. E-1 was merged before this phase. |
| 10 Oct 2026 | Hourly moved to add-on E-11 (ED-016). Maps loading/autocomplete approach (ED-017). Test company Checker Yellow Cabs (ED-018). Backend Dockerfile fix and VPS sync done. |
| 10 Oct 2026 | Add-ons weighted into the 100%. C-15 answered: one Square account, one location per company. Pin icon is decorative. Real BRO rates to be entered during backend work. |
| 10 Oct 2026 | Q-1 to Q-3 answered (ED-011 to ED-013). Phases E-1 to E-6 core, E-7 to E-10 add-ons. Backend gap B-21: no public field for the largest vehicle capacity. |
| 10 Oct 2026 | Tracker created. Core scope fixed: one-way, airport pickup/dropoff, hourly, cash. Round trip, promo and card are add-ons. |
