# E-3 — Step 2: Choose Vehicle

**Read first:** `AGENTS.md`, `EMBED-TRACKER.md`, `docs/architecture.md`, `docs/decisions.md` (especially ED-006, ED-007, ED-009, ED-011, ED-021), `docs/api/API_CONTRACT.md` (taxi quote section).
**Branch:** `phase/E-3`, from `main` after E-2 is merged.
**Reference screenshots:** `docs/reference/bro/` — `step2-choose-vehicle.png`, and the step 1 screenshots that show BRO's route line.

## Goal

Check Pricing sends the quote request built in E-2, draws the route, and shows BRO's vehicle list with each vehicle in one of three states. Choosing a vehicle moves to step 3, which stays a placeholder until E-4.

## Out of scope

The price breakdown, customer details and booking (E-4, E-5). Card payment, promo, round trip, hourly.

## 1. Send the quote

- **Check Pricing** sends `POST /v1/public/taxi/quote?hide_incapable=true` with the request from E-2's `buildQuoteRequest`. Do not change what that function builds.
  - Why `hide_incapable=true`: vehicles too small for the party are hidden by the server, so the widget never filters on capacity itself.
- Show a loading state on the button while waiting. Disable a second click.
- Errors, shown in step 1 without losing any field:

| Response | Show |
|---|---|
| `400 VALIDATION_ERROR` with `field` | The API message next to that field |
| `400` without `field` | The API message above the button |
| `422` (e.g. `ADVANCE_BOOKING_VIOLATION`) | The API message |
| `429 RATE_LIMITED` | "Too many requests, please wait a moment and try again." |
| Network / 5xx | A friendly retry message. **No automatic retry.** |

## 2. Route on the map

- The quote returns `route_polyline` (Google encoded polyline). Decode it with the Maps **geometry** library (`importLibrary("geometry")`) and draw it as a line between A and B, as BRO does. Fit the map to the route.
- `route_polyline` is `null` for some journeys: then keep the A/B markers only. Never fail because the route is missing.
- If Maps failed to load, step 2 still works without a map.

## 3. Step 2 layout

Copy BRO's step 2 from `step2-choose-vehicle.png`:
- Progress indicator: step 2 active.
- Title "Choose Your Vehicle Type".
- One row per vehicle in `vehicles[]`, **in the order the API returns**:
  - **Photo** from `photo_url`; when null, a "No photo available" placeholder like BRO's.
  - **Name** exactly as the API returns it (names are display text — AGENTS rule 8).
  - **Capacity icons** from `passenger_capacity` and `luggage_capacity`.
  - **Base fare** column.
  - **Choose** button.
- **Back** button: returns to step 1 with every field and the markers intact (E-2 keeps the state above step 1).

## 4. The three vehicle states

Driven only by `quote_status` (ED-009). Never infer state from price or name.

| `quote_status` | Base fare column | Button |
|---|---|---|
| `"priced"` | `base_price` formatted per ED-021 | **Choose**, active |
| `"request_quote"` | "Request a Quote" | **Choose**, active |
| `"unavailable"` | "Unavailable" | "Unavailable", greyed, disabled |

- `out_of_service_area: true` is **HTTP 200, not an error** (contract). Show a short notice above the list: "This trip is outside our standard service area. Choose a vehicle and we'll send you a quote." The vehicles themselves still follow the table above.
- If `vehicles` is empty: "No vehicles are available for this trip. Please contact us." and the Back button.

## 5. Choosing a vehicle

- **Choose** stores the selected vehicle and the full quote response in the booking state, then shows step 3.
- **Step 3 in E-3 is a placeholder** with the progress indicator (step 3 active), the chosen vehicle's name, the text "Confirm — coming next", and **Back** to step 2. E-4 replaces it.
- If the customer goes Back to step 1 and **changes any field**, the stored quote and selected vehicle are cleared; they must press Check Pricing again. Why: a quote is only valid for the exact trip it was made for.

## 6. Money

- Money stays a string. Format with `src/money/` only (ED-007, ED-021).
- Never compare, sort or compute prices.

## 7. Test data note

Checker Yellow Cabs on the preview server has demo or migrated rates. Expect some vehicles to show **Request a Quote**:
- vehicles with no pricing row,
- vehicles whose row is **Zone to Zone** (not built in the backend yet),
- trips outside the service areas.

That is correct behaviour, not a widget bug. List which vehicles showed which state in the report.

## 8. Tests (files you touch)

- Quote request sent once, with `hide_incapable=true` and the E-2 body unchanged.
- Each error row in section 1, including `field` absent.
- No automatic retry on any failure.
- Each `quote_status` renders as in section 4.
- `out_of_service_area: true` shows the notice and still lists vehicles.
- Empty `vehicles` message.
- `route_polyline` present → line drawn; `null` → no crash.
- Back keeps step 1 fields; changing a field clears the quote and selection.
- Choose stores the vehicle and shows the step 3 placeholder.
- Money formatting uses `src/money/` only (no `Number`/`parseFloat` in new files).

## 9. Report (AGENTS.md section 7), plus

- The quote response JSON (trimmed) for one one-way trip and one airport trip on Checker Yellow Cabs.
- Which vehicles were Priced / Request a Quote / Unavailable, and why where known.
- `dist/embed.js` size, gzipped.
- Update `EMBED-TRACKER.md` (E-3 status, items 2.1–2.8, 1.7 route, changelog) in the last commit.
- Give the git add / git commit commands; do not run git commands that change the repository.

**Then stop. Do not start E-4.**
