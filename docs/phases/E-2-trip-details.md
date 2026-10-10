# E-2 — Step 1: Trip Details

**Read first:** `AGENTS.md`, `EMBED-TRACKER.md`, `docs/architecture.md`, `docs/decisions.md` (especially ED-004, ED-010, ED-013, ED-014, ED-016, ED-017).
**Branch:** `phase/E-2`, from `main` after E-1 is merged.
**Reference screenshots:** `docs/reference/bro/` — one-way step 1 (empty and filled), service dropdown, passengers/luggage dropdowns, airport pickup and airport dropoff step 1, airport and airline dropdowns, the 12-hour advance-booking error.

## Goal

The first step of the booking form, matching BRO's step 1: the customer chooses a service, date, time, party size and addresses (or airport details), and presses **Check Pricing**. This phase ends with a **validated quote request**. Sending it and showing vehicles is E-3.

## Notes on the BRO screenshots

- **Do not copy** stale route lines or extra markers shown in BRO's airport screenshots; that is BRO behaviour from earlier input, not a feature.
- BRO's Amsterdam map position is test data. Use our display default.
- **Omit** BRO's footer (copyright and links) along with its header.
- `step3-confirm-priced.png` is misnamed (it shows step 1). Treat it as extra step 1 reference; it will be replaced before E-4.

## Out of scope

Calling `POST /taxi/quote`, the vehicle list, drawing the route (E-3). Round trip and hourly (ED-004, ED-016). BRO's site header (Menu, Login).

## 1. Layout

Copy BRO's step 1 layout from the screenshots:

- Title **Reservations** and the subtitle line shown in BRO.
- The 3-step progress indicator (Trip Details · Choose Vehicle · Confirm), step 1 active.
- Form on the left, map on the right. Below a narrow width, stack them: form first, then map. (Full mobile polish is E-6; it must already be usable.)
- Field order exactly as BRO for each service type. **The screenshots decide the order and labels.**

## 2. Data loaded

| Data | Endpoint | When |
|---|---|---|
| Business (timezone, advance-booking hours) | `GET /v1/public/business` | Already loaded by E-1 |
| Services | `GET /v1/public/taxi/service-types` | On load — typed and runtime-validated per ED-019 |
| Airports | `GET /v1/public/taxi/airports` | First time an airport service is selected |
| Airlines | `GET /v1/public/taxi/airlines` | First time an airport service is selected |

Show a loading state while loading. If a request fails, show a friendly error in the widget; never a blank widget.

## 3. Fields

### Service

- Dropdown from `service-types`, **filtered to `one_way`, `airport_pickup`, `airport_dropoff`**, in the order the API returns. Display the API's `name` unchanged.
- **Why filter:** round trip and hourly are not verified or not built (ED-004, ED-016). If the API lists them because an admin ticked them, customers must still not see them.
- If none of the three is offered, show: "Online booking is not available. Please contact us." and no form.
- Default: the first offered service.

### Pickup date and time

- Default date and time: **now, in the business's timezone** (E-1's `src/time/`), never the visitor's browser time. Why: a visitor in London booking a Houston ride must see Houston time.
- **Advance-booking check:** the pickup must be at least `advance_booking_hours` after now (business timezone). If it is not, show BRO's message in BRO's position (see the 12-hour error screenshot), with the number taken from `advance_booking_hours`, never hardcoded. This check is a convenience only; the server enforces it again.

### Passengers and luggage

- Passengers: 1 to `MAX_PASSENGERS`. Luggage: 0 to `MAX_LUGGAGE`. Labels as BRO ("1 passenger", "2 passengers", "0 luggage").
- **Temporary constants**, in one file, `src/app/trip/limits.ts`:
  ```ts
  // TEMPORARY until B-21: backend will provide the largest vehicle capacity.
  export const MAX_PASSENGERS = 74;  // or the schema maximum, if lower
  export const MAX_LUGGAGE = 99;     // TaxiQuoteRequest.luggage maximum is 99 (ED-020)
  ```
  Why: the dropdowns must go up to the largest capacity configured in the backend (ED-013), but no public field gives it yet. The admin panel allows up to 74 passengers and 100 luggage, but the quote schema caps luggage at 99, so 99 it is (ED-020). Check the schema's passengers maximum too and use the lower value. When B-21 lands, these are replaced by values from `/business` in a small follow-up.

### Addresses (one-way: pickup and dropoff; airport pickup: dropoff only; airport dropoff: pickup only)

- Text input with **our own suggestion list rendered inside the Shadow DOM**, fed by the Places API (New) data API: `AutocompleteSuggestion.fetchAutocompleteSuggestions` with one `AutocompleteSessionToken` per address being typed (ED-017).
- When the customer picks a suggestion, fetch the place's details and keep:
  - the formatted address (sent as `pickup_address` / `dropoff_address`)
  - the **zipcode from `address_components` (`postal_code`)**, or `null` if absent (ED-010). Never parse it from text.
- An address counts as filled only when a suggestion was picked. Typed text without a pick is not valid.
- Debounce typing (about 300 ms). Keyboard: arrow keys, Enter, Escape.
- The pin icon beside each address is **decorative** (ED-014).

### Airport services (`airport_pickup`, `airport_dropoff`)

From the airport screenshots:
- **Airport** dropdown from `/taxi/airports` (display `name`). It replaces the pickup address for Airport Pickup and the dropoff address for Airport Dropoff.
- **Airline:** a **searchable** list from `/taxi/airlines` (type to filter, as BRO's screenshot shows). Reuse the same accessible combobox pattern as the address field; no Google calls.
- The **Airport** control is a plain select (the list is short).
- **Flight number** text input.
- Airline and flight number are **required** on both airport services (the API returns 400 naming the field otherwise).

## 4. Map

- Load the Google Maps JavaScript API once (ED-017). Key from `VITE_MAPS_BROWSER_KEY`. If the script is already on the host page, reuse it.
- Render a Google map inside the Shadow DOM, as in BRO's screenshots (Map/Satellite toggle and fullscreen control as Google provides).
- Initial view: the Houston–Galveston area. Put the default centre and zoom in `src/maps/config.ts` with a comment that it is a display default only.
- When an address is picked, drop a marker (A for pickup, B for dropoff) and fit both in view.
- **No route line in E-2.** The route comes from the quote's `route_polyline` in E-3.
- If the Maps key is missing or Google fails to load: hide the map, show a small notice, and **keep the form fully usable**. Addresses then cannot be picked, so show a clear message that address lookup is unavailable.

## 5. Check Pricing

- Validate all fields. Show each error next to its field, in BRO's style. Required fields per service:

| Field | one_way | airport_pickup | airport_dropoff |
|---|---|---|---|
| Date, time (advance check) | ✓ | ✓ | ✓ |
| Passengers, luggage | ✓ | ✓ | ✓ |
| Pickup address (picked) | ✓ | — | ✓ |
| Dropoff address (picked) | ✓ | ✓ | — |
| Pickup airport | — | ✓ | — |
| Dropoff airport | — | — | ✓ |
| Airline, flight number | — | ✓ | ✓ |

- When valid, build the quote request with **one function**, `buildQuoteRequest(form)`, typed **only** from the generated OpenAPI types for `POST /v1/public/taxi/quote`:
  - Every field that does not apply to the service is `null` (and `stops: []`, `hours: null`, `return_date: null`, `return_time: null`), as the API contract's examples show.
  - **Send no field that is not in the schema** — unknown fields are a 400.
  - Date `YYYY-MM-DD`, time `HH:MM`, in the business's timezone.
- E-2 does **not** send it. The button passes the request to an `onCheckPricing(request)` handler. In the dev harness, that handler logs the JSON so the reviewer can check it. E-3 replaces the handler.
- Keep the whole form state in one place above step 1, so step 2's **Back** (E-3) returns with every field still filled.

## 6. Styling

- Inside the Shadow DOM only, using the tokens in `src/styles/`. Visually close to BRO's screenshots: same structure, labels and button colours (green Check Pricing). Readable sizes (at least 13 px text).
- No CSS framework.

## 7. Tests (files you touch)

- Service filtering: `round_trip` and `hourly` are dropped; order is preserved; none offered → message.
- Advance-booking check: uses `advance_booking_hours` and the business timezone; a visitor timezone different from `America/Chicago` gives the same result.
- `buildQuoteRequest` for each of the three services: correct fields set, inapplicable fields `null`, no extra keys (compare keys against the OpenAPI schema).
- Zipcode taken from `address_components`; `null` when missing.
- Validation table above: each missing field produces its error.
- Maps failure: the form still renders and validates.
- Places and Maps are **mocked** in tests. No real Google calls in tests.

## 8. Report (AGENTS.md section 7), plus

- Screenshot pairs (BRO vs ours) for: one-way empty, one-way filled, airport pickup, airport dropoff, the advance-booking error. Save them in `docs/reviews/E-2/`.
- The JSON logged by Check Pricing for each of the three services.
- `dist/embed.js` size (gzipped). Flag it if it grows past 30 KB gzipped.
- Update `EMBED-TRACKER.md` (E-2 status, items 1.1–1.10, changelog) in the last commit.

**Then stop. Do not start E-3.**
