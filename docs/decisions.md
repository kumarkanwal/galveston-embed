# Decision log — galveston-embed

Each decision records **why**, so a later agent does not undo it. To change a decision, add a new entry that supersedes it; never edit history.

## Entry template

```text
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
Date: 2026-10-10 · Status: accepted, provisional (answers ED-Q2)
Decision: when the CC Surcharge line amount is `"0.00"`, do not display it.
Why: for cash the backend returns the line with `"0.00"`; showing a card fee to a cash customer is confusing.
Consequences: identify the line by its `kind` and `source_id`, never by its label. To be confirmed against BRO's behaviour in the side-by-side test (phase E-6).

## ED-013 — Passenger and luggage maximums come from the backend
Date: 2026-10-10 · Status: accepted (answers ED-Q3); **blocked on backend B-21**
Decision: the dropdowns go up to the largest passenger and luggage capacity among the business's active vehicles.
Why: the client's admin controls capacity; the widget must not hardcode it.
Consequences: **no public endpoint returns this today** — the quote only returns capacities after Check Pricing. Backend item **B-21** adds the two maximums to `GET /v1/public/business`. Until it lands, E-2 uses a temporary constant marked `// TEMPORARY until B-21` and the tracker records it.
