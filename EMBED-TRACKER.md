# Booking Widget (Embed) — Tracker

**Repo:** `galveston-embed` (new, separate) · **Last updated:** 10 October 2026
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

**Overall: 10%** ▓▓░░░░░░░░░░░░░░░░░░ · **"Built" means 100%, add-ons included.**

| # | Phase | Side | Weight | Status | Done |
|---|---|---|---|---|---|
| 0 | Planning & research | Both | 4% | ✅ Complete | 4% |
| 1 | Project setup & docs | Widget | 4% | 🔄 API files pending | 3% |
| 2 | Backend prep (B-20, VPS deploy, config, B-21) | Backend | 7% | 🔄 B-20 tested, not pushed | 3% |
| 3 | E-1 Skeleton, API, money, time | Widget | 7% | ⬜ Next | 0% |
| 4 | E-2 Step 1 — Trip Details | Widget | 12% | ⬜ | 0% |
| 5 | E-3 Step 2 — Choose Vehicle | Widget + VPS | 11% | ⬜ | 0% |
| 6 | E-4 Step 3 — Confirm & breakdown | Widget | 9% | ⬜ | 0% |
| 7 | E-5 Create Trip, confirmation, errors | Widget + Admin | 9% | ⬜ | 0% |
| 8 | E-6 Mobile, side-by-side with BRO, hosting | Both | 12% | ⬜ | 0% |
| 9 | E-7 Card payment (Square) | Both | 9% | ⛔ B-16 | 0% |
| 10 | E-8 Promo codes | Both | 4% | ⛔ Backend promo wiring | 0% |
| 11 | E-9 Round trip | Both | 5% | ⛔ I-1 | 0% |
| 12 | E-10 Peak / blackout | Both | 3% | ⛔ B-7 | 0% |
| 13 | E-11 Hourly (hours + Add Stops) | Both | 4% | ⛔ Backend hourly pricing (C-6) | 0% |
| | **Total** | | **100%** | | **10%** |

Weights are estimates. Phase details and dependencies: `AGENTS.md` section 3.

## Setup (before the widget can call the API)

| # | Item | Status | Why |
|---|---|---|---|
| S-1 | New repo `galveston-embed` | ✅ | Separate from `galveston-widgets` (old cancelled plugin; leave untouched) |
| S-2 | **VPS runs the latest backend**, including the pricing migration `f1a2b3c4d5e6` | ⛔ Not yet | The VPS runs old pricing. Every price tested there is wrong until deployed |
| S-3 | D-1 (contract v1.2) and B-20 pushed to `origin` | ⛔ Not yet | D-1 is committed locally only; B-20 is uncommitted pending tests |
| S-4 | `openapi.json` copied from the backend **after B-20 is committed** | ⛔ After S-3 | B-20 adds the `payments` field and `429 RATE_LIMITED` |
| S-5 | Demo company API key, named `embed` | ✅ Ready when needed | Runbook: `docs/runbooks/embed-keys.md` (backend) |
| S-6 | Developer's local address (e.g. `http://localhost:5173`) added to `CORS_ORIGINS` on the VPS | ⛔ Not yet | Otherwise the browser cannot read API responses |
| S-7 | **Google Maps browser key**, HTTP-referrer restricted to dev address now, client sites later | 🔍 Key available; restrict it | Must be separate from the server key. Never use the server key in the browser |
| S-8 | Demo company offers **cash** in `payment_methods` and allows cash bookings | 🔍 Check `GET /v1/public/business` and the `require_payment` setting | Otherwise every booking returns `422 PAYMENT_METHOD_NOT_OFFERED` |

**The developer can build screens before S-2 to S-8 are done. He needs them only to connect.**

---

## Step 1 — Trip Details

| # | Item | Status | API | Notes |
|---|---|---|---|---|
| 1.1 | Service dropdown | ✅ | `GET /taxi/service-types` | **Show only `one_way`, `airport_pickup`, `airport_dropoff`, `hourly`.** Ignore `round_trip` even if listed. Why: round-trip pricing is unverified (I-1); an admin tick must not show customers an unchecked price |
| 1.2 | Pickup date and time | 🔍 | `GET /business` → `timezone`, `advance_booking_hours` | Times are in the **business's timezone**, not the visitor's browser. Verify the advance-booking message against BRO. Server enforces it; the widget check is UX only |
| 1.3 | Passengers dropdown | ⛔ B-21 | `GET /business` (after B-21) | Max = largest passenger capacity among active vehicles (ED-013). **No public endpoint returns it yet.** Temporary constant until backend B-21 |
| 1.4 | Luggage dropdown | ⛔ B-21 | `GET /business` (after B-21) | Max = largest luggage capacity (ED-013). Same as 1.3 |
| 1.5 | Pickup / dropoff address autocomplete | ✅ | Google Places (browser key, S-7) | Send **both** the address text and the zipcode. **Take the zipcode from Places `address_components` (`postal_code`), never by parsing the typed text.** Why: zipcodes decide zone prices; a wrong guess is a wrong price |
| 1.6 | Pin icon beside each address | ✅ | — | Decorative icon only, no action (ED-014) |
| 1.7 | Route map | ✅ | Quote returns `route_polyline` | Show the map; draw the route after a quote |
| 1.8 | Airport Pickup / Dropoff fields: airport, airline, flight number | 🔍 | `GET /taxi/airports`, `GET /taxi/airlines` | Public endpoints exist (audit). **Need BRO screenshots of step 1 for both airport services** to copy the layout. Airline and flight number are required (400 names the field) |
| 1.9 | Hourly: hours field, stops | 🔍 | `minimum_hours` on the hourly service type | **Need BRO screenshot of step 1 for Hourly.** No dropoff for hourly. Hourly uses the older pricing path, so verify one hourly quote |
| 1.10 | Check Pricing | ✅ | `POST /taxi/quote` | Rate-limited after B-20; handle `429` with a friendly retry message |

## Step 2 — Choose Vehicle

| # | Item | Status | Notes |
|---|---|---|---|
| 2.1 | Vehicle list | ✅ | From the quote response `vehicles[]` |
| 2.2 | Photo | ✅ | `photo_url`; show a placeholder when null (BRO shows "No photo available") |
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
| 3.4 | CC surcharge line | ✅ provisional | Hide when `"0.00"` (ED-012). Identify by `kind`/`source_id`, never label. Confirm in the E-6 side-by-side test |
| 3.5 | Car Seats dropdown (0–5) | ✅ | Send `car_seats`; re-call price-breakdown on change; show the returned total. $15 each, server-priced |
| 3.6 | Special requests | ✅ | Booking `comments` |
| 3.7 | First name, last name, phone, email | ✅ | Booking `customer` |
| 3.8 | Terms & Conditions checkbox and link | ✅ | `terms_and_conditions` from `/business` is HTML and may be **null**: hide the link when null. **Sanitise the HTML before rendering.** `accepted_terms` must be `true` |
| 3.9 | Create Trip (cash) | ✅ | `POST /taxi/booking` with `payment: { "method": "cash" }` and an `Idempotency-Key` header |
| 3.10 | Request a Quote vehicle chosen | 🔍 | **Do not call price-breakdown** (it returns a validation error). Booking creates a $0 `requested` order. **Need BRO screenshot of step 3 for a Request a Quote vehicle** |
| 3.11 | Back button | ✅ | Returns to step 2 |

## After booking

| # | Item | Status | Notes |
|---|---|---|---|
| 4.1 | Confirmation screen | 🔍 | Booking returns `order_number`, `status`, `total`. **Need BRO screenshot of the page after Create Trip** |
| 4.2 | Error handling | ✅ | See "Errors" below |
| 4.3 | Booking appears in admin Runs | 🔍 | **The end-to-end proof.** Verify after S-2 |

## Add-ons (after the core flow works)

| # | Item | Status | Why later / what blocks it |
|---|---|---|---|
| A-1 | **Card payment** (new; BRO has none) | ⛔ | C-15 answered: one Square account, one location per company (ED-015). Still needs B-20 pushed, each company's Square location id, and B-16 sandbox test |
| A-2 | Promo code | ⛔ | Not wired into the new pricing path (D-1 report) |
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
| `401` | "This booking form is not configured." Log for the developer |
| `409 REQUEST_IN_FLIGHT` | Wait; do not resubmit |
| `422 ADVANCE_BOOKING_VIOLATION`, `OUT_OF_SERVICE_AREA`, `VEHICLE_UNAVAILABLE`, `BELOW_MINIMUM_HOURS`, `PAYMENT_METHOD_NOT_OFFERED` | The API's `message` |
| `429 RATE_LIMITED` | "Too many requests, please wait a moment and try again." |
| `5xx`, network failure | Friendly retry message; no automatic retry on POST |

---

## Screenshots still needed from BRO

1. Step 1 — Airport Pickup
2. Step 1 — Airport Dropoff
3. Step 1 — Hourly
4. Step 3 — after choosing a Request a Quote vehicle
5. The page after Create Trip (confirmation)
7. Mobile view of each step

## Open questions

| # | Question | Who |
|---|---|---|
| Q-4 | Square location id for each of the six companies | Client |
| Q-5 | I-1: round-trip pricing | Test on BRO's form, if the client ever enables it |

## Sources of truth

- `galveston-backend/docs/API_CONTRACT.md` **v1.2** (commit `ce58ff4`), plus the B-20 additions once committed
- `galveston-backend/openapi.json` (after B-20)
- `galveston-backend/docs/PROJECT-TRACKER.md`
- BRO screenshots in this repo

## Changelog

| Date | Change |
|---|---|
| 10 Oct 2026 | Hourly moved to add-on E-11 (ED-016). Maps loading/autocomplete approach (ED-017). Test company Checker Yellow Cabs (ED-018). Backend Dockerfile fix and VPS sync done. |
| 10 Oct 2026 | Add-ons weighted into the 100%. C-15 answered: one Square account, one location per company. Pin icon is decorative. Real BRO rates to be entered during backend work. |
| 10 Oct 2026 | Q-1 to Q-3 answered (ED-011 to ED-013). Phases E-1 to E-6 core, E-7 to E-10 add-ons. Backend gap B-21: no public field for the largest vehicle capacity. |
| 10 Oct 2026 | Tracker created. Core scope fixed: one-way, airport pickup/dropoff, hourly, cash. Round trip, promo and card are add-ons. |
