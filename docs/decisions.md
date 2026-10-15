# Decision log — galveston-embed

Each decision records **why**, so a later agent does not undo it. To change a decision, add a new entry that supersedes it; never edit history.

## Entry template

```
## ED-000 — Short title
Date: YYYY-MM-DD · Status: accepted | superseded by ED-0xx
Decision: one sentence.
Why: one to three sentences.
Consequences: what code must do or avoid.
```

## ED-001 — A browser embed, not a WordPress plugin
Date: 2026-10-10 · Status: accepted
Decision: deliver one `<script>` tag the client pastes into any website; the widget file is hosted on our server.
Why: the client asked for an embed snippet directly. An earlier WordPress-plugin plan (repo `galveston-widgets`) was cancelled and must not be reused.
Consequences: no PHP, no WordPress code, no plugin packaging. Works on any site.

## ED-002 — The business key is public by design
Date: 2026-10-10 · Status: accepted (backend decision D-0)
Decision: the embed sends `X-Business-Key` from the browser; the key sits in the script tag.
Why: a code audit of the backend confirmed the key grants only the public booking endpoints — no admin access, no way to read bookings or customers. A proxy would forward the same capabilities and protect nothing extra.
Consequences: no proxy server, no token exchange, no obfuscation. Abuse is controlled by the backend's per-key and per-IP rate limits (backend B-20).

## ED-003 — Taxi only
Date: 2026-10-10 · Status: accepted
Decision: the widget books taxi services only.
Why: the client removed the shuttle product from the project.
Consequences: never call `/v1/public/shuttle/*`.

## ED-004 — Core services: one-way, airport pickup, airport dropoff, hourly
Date: 2026-10-10 · Status: accepted
Decision: show only `one_way`, `airport_pickup`, `airport_dropoff`, `hourly`, even if the API lists `round_trip`.
Why: round-trip pricing differs between two backend pricing paths and has not been verified against the client's live system (backend I-1). If an admin enables round trip, customers must not be shown an unchecked price.
Consequences: filter the service list by code. Round trip becomes an add-on once I-1 is resolved.

## ED-005 — Copy BRO's 3-step flow
Date: 2026-10-10 · Status: accepted
Decision: Trip Details → Choose Vehicle → Confirm, matching the client's current Book Rides Online form.
Why: customers and staff already know it; the screenshots in `docs/reference/bro/` are the reference.
Consequences: drop BRO's site header (Menu, Login) and customer accounts — out of scope.

## ED-006 — Cash only in the core
Date: 2026-10-10 · Status: accepted
Decision: send `payment: { "method": "cash" }` only. Card payment is a later add-on.
Why: BRO's live form has no online payment. Card payment depends on backend B-20 (Square ids), the client's answer on Square accounts (C-15) and a Square sandbox test (B-16).
Consequences: no Square SDK in the core build. `payment_method: "cash"` on price-breakdown.

## ED-007 — Money is a string
Date: 2026-10-10 · Status: accepted
Decision: money stays a two-decimal string end to end; formatting is string manipulation only.
Why: the server prices and re-prices everything. A browser-calculated total can only disagree with what is charged, and floats lose cents.
Consequences: never `parseFloat`, `Number()`, `toFixed()` or arithmetic on money.

## ED-008 — Preact, single-file IIFE, Shadow DOM
Date: 2026-10-10 · Status: accepted
Decision: Preact + TypeScript, built by Vite library mode into one `dist/embed.js`; all UI inside a Shadow DOM.
Why: about 4 KB instead of 45 KB for React on every page of six client sites; one file is one thing to paste; Shadow DOM stops the host site's CSS breaking the form and ours breaking their site.
Consequences: no code splitting, no external CSS file, no global styles.

## ED-009 — Request a Quote vehicles skip price-breakdown
Date: 2026-10-10 · Status: accepted
Decision: when the chosen vehicle has `quote_status: "request_quote"`, go straight to the booking request without calling price-breakdown.
Why: the backend returns a validation error from price-breakdown for those vehicles (no breakdown exists). Booking creates a $0 `requested` order that staff price manually.
Consequences: step 3 shows no charges for a Request a Quote vehicle; the layout follows BRO's screenshot for that case.

## ED-010 — Zipcodes come from Google Places, never parsing
Date: 2026-10-10 · Status: accepted
Decision: take `pickup_zipcode` / `dropoff_zipcode` from Places `address_components` (`postal_code`).
Why: zipcodes decide zone prices and service-area rates; a parsed guess is a wrong price.
Consequences: send both the address text and the zipcode; if Places gives no postal code, send null.

## ED-011 — The widget shows exactly what the backend returns
Date: 2026-10-10 · Status: accepted (answers ED-Q1)
Decision: line-item labels, amounts and totals are displayed exactly as the API returns them. The widget never renames, reorders by label, or recalculates.
Why: pricing is the backend's job and copies the client's admin panel. The widget is a display layer.
Consequences: if a label must change (e.g. "Base fare" → "Base Price"), it changes in the backend. Never by matching label strings in the widget.

## ED-012 — Hide a zero CC Surcharge line (provisional)
Date: 2026-10-10 · Status: superseded by ED-022
Decision: when the CC Surcharge line amount is `"0.00"`, do not display it.
Why: for cash the backend returns the line with `"0.00"`; showing a card fee to a cash customer is confusing.
Consequences: identify the line by its `kind` and `source_id`, never by its label. To be confirmed against BRO's behaviour in the side-by-side test (phase E-6).

## ED-013 — Passenger and luggage maximums come from the backend
Date: 2026-10-10 · Status: accepted (answers ED-Q3); **blocked on backend B-21**
Decision: the dropdowns go up to the largest passenger and luggage capacity among the business's active vehicles.
Why: the client's admin controls capacity; the widget must not hardcode it.
Consequences: **no public endpoint returns this today** — the quote only returns capacities after Check Pricing. Backend item **B-21** adds the two maximums to `GET /v1/public/business`. Until it lands, E-2 uses a temporary constant marked `// TEMPORARY until B-21` and the tracker records it.

## ED-014 — The pin beside an address is decorative
Date: 2026-10-10 · Status: accepted
Decision: render the pin icon beside each address field with no action.
Why: in BRO's live form it is an icon only.
Consequences: no geolocation, no map picker.

## ED-015 — One Square account, one location per company
Date: 2026-10-10 · Status: accepted (client answer to C-15)
Decision: all six companies share one Square account; each company is a separate Square location.
Why: client confirmed. This matches the backend's existing design: one global application id, a per-business location id with a global fallback.
Consequences: card payment (E-7) uses `payments.square_application_id` and `payments.square_location_id` from `GET /v1/public/business`. Each company's location id must be set in the backend before go-live, or its payments land in the fallback location.

## ED-016 — Hourly moves out of the core
Date: 2026-10-10 · Status: accepted (supersedes the hourly part of ED-004)
Decision: the core widget offers `one_way`, `airport_pickup` and `airport_dropoff` only. Hourly (hours field and Add Stops) is an add-on.
Why: hourly pricing on the new pricing-row path is not built (backend Part 3, blocked on client question C-6). Showing it would rely on the older pricing path, which is being replaced.
Consequences: ignore `hourly` in the service list until its add-on phase.

## ED-017 — Google Maps loads once into the host page; autocomplete renders inside our Shadow DOM
Date: 2026-10-10 · Status: accepted
Decision: inject the Google Maps JavaScript API `<script>` into `document.head` once (the only allowed write outside our mount element). Build address autocomplete with the Places API (New) *data* API (`AutocompleteSuggestion.fetchAutocompleteSuggestions` + `AutocompleteSessionToken`) and render our own suggestion list inside the Shadow DOM.
Why: Google's script must load globally. Google's ready-made autocomplete widget attaches its dropdown to `document.body`, outside our Shadow DOM, so it would be unstyled or broken and could clash with the host site. The data API keeps everything inside our component.
Consequences: one session token per address-entry session (cost control). If the script is already on the page, reuse it; never load it twice.

## ED-018 — Test company: Checker Yellow Cabs
Date: 2026-10-10 · Status: accepted
Decision: develop and test against Checker Yellow Cabs on the preview server.
Why: in the admin panel it is the only company offering all three core services (one-way, airport pickup, airport dropoff), so every path can be tested with one key.
Consequences: one embed key, for this company only, until go-live.

## ED-019 — Service types use a temporary validated type until the backend schema is typed
Date: 2026-10-10 · Status: accepted, temporary (until backend B-21)
Decision: `ServiceTypeOption` in `openapi.json` is an untyped object. Until the backend publishes a typed schema, the widget defines one narrow type — `id`, `code`, `name`, optional `minimum_hours` — in `src/api/service-types.ts`, marked `// TEMPORARY until B-21`, and **validates every item at runtime**. Items that fail validation are dropped; if none remain, the widget shows its error state.
Why: these four fields are documented in `docs/api/API_CONTRACT.md`, but generated types cannot provide them. Hand-typing without runtime checks would hide a backend change.
Consequences: when B-21 lands with a typed schema, delete the temporary type and use the generated one.

## ED-020 — Party-size limits never exceed the API schema
Date: 2026-10-10 · Status: accepted
Decision: the passengers and luggage dropdowns never offer a value above the maximum the OpenAPI schema accepts for `TaxiQuoteRequest` (luggage is capped at 99 there).
Why: a value the schema rejects would make every quote for that party fail with a 400.
Consequences: temporary limits are `min(admin limit, schema maximum)`; B-21 values are capped the same way.

## ED-021 — How prices are displayed
Date: 2026-10-10 · Status: accepted
Decision: show money as `$90.00 USD` — dollar sign, thousands separators, two decimals, then the currency code from `GET /v1/public/business`. Formatting lives only in `src/money/`.
Why: BRO shows the currency code after the amount ("$ 90.00 USD", "$390.00 USD"). We keep the code so customers see what they are used to, and drop BRO's inconsistent space after "$".
Consequences: one formatter for the vehicle list, breakdown and totals. Never format money anywhere else.

## ED-022 — Hide all zero-amount breakdown lines
Date: 2026-10-11 · Status: accepted (supersedes ED-012)
Decision: hide every price-breakdown line whose amount string is exactly `"0.00"`.
Why: built-in lines do not have a unique machine identifier, so the widget cannot reliably identify only the CC Surcharge without matching its display label. Zero-value rows add noise and do not affect the server total.
Consequences: compare the money string directly; never parse it, perform arithmetic, or match a line-item label. Preserve the order and exact labels of every displayed non-zero line.

## ED-023 — Booking retries and confirmation data
Date: 2026-10-11 · Status: accepted
Decision: every unchanged booking attempt reuses one UUID idempotency key; confirmation shows the response total with `/business` currency and mentions email only when `confirmation_email_sent` is true.
Why: the backend re-prices at booking and owns the final total. Reusing the key after an unknown outcome prevents duplicate orders, while changing any request-body field must create a new attempt.
Consequences: treat HTTP 200 and 201 booking envelopes identically; never retry automatically. `REQUEST_IN_FLIGHT` asks the customer to wait, network and non-503 5xx failures explain that retrying is safe, and API messages are retained for 401, 403, 404 and 503 responses.

## ED-024 — Backend-owned party limits and service types
Date: 2026-10-15 · Status: accepted (resolves ED-013 and supersedes ED-019)
Decision: use generated `BusinessPublic.max_passengers`, `max_luggage`, and `ServiceTypeOption` types from the refreshed backend schema.
Why: backend B-21 now publishes the capacities and a typed service option, so the temporary 74/99 limits and hand-written validated type are no longer needed.
Consequences: cap each business limit at the corresponding `TaxiQuoteRequest` schema maximum (ED-020). If either business limit is null, do not show a booking form; explain that no vehicles are available.

## ED-025 — Step 1 route preview uses the browser Routes library
Date: 2026-10-15 · Status: accepted
Decision: request a driving path with the Google Maps JavaScript Routes library as soon as both Step 1 endpoints have coordinates; use the backend quote polyline after pricing.
Why: before Check Pricing there is no quote and therefore no server route polyline. A browser route preview matches BRO's immediate feedback without moving pricing authority into the widget.
Consequences: the Maps browser-key project needs Maps JavaScript API and Routes API enabled. Endpoint changes replace the preview, stale responses are ignored, and preview failure never blocks quoting or booking.

## ED-026 — Persist only the booking-attempt fingerprint and key
Date: 2026-10-15 · Status: accepted (extends ED-023)
Decision: keep the SHA-256 request fingerprint and its UUID idempotency key in `sessionStorage`, with no request body or customer fields.
Why: a reload during an uncertain booking POST must retain the same attempt key, but browser storage must not duplicate customer data.
Consequences: an unchanged request reuses its key across reloads and navigation; changing trip, vehicle, car seats, or customer details creates a new fingerprint and key. Storage failures fall back safely to the in-memory behavior.
