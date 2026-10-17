# E-6e — Exact airport pin

**Read first:** `AGENTS.md`, `EMBED-TRACKER.md`, `docs/architecture.md`,
`docs/decisions.md`, `docs/WORKFLOW.md`, and
`docs/phases/E-6-hardening.md`.
**Branch:** `phase/E-6e`, freshly created from updated `main`.

## Background

Backend B-28 is live. `GET /v1/public/taxi/airports` now returns the shared
airport list for all six companies, including each airport's server-owned
`address` and `zipcode`.

## Request

1. Refresh `openapi.json` and `API_CONTRACT.md` byte-for-byte from backend
   `origin/main` at commit `983c21d` or later, record and report the exact
   commit, regenerate API types, and report the new airport fields.
2. When a customer selects a pickup or dropoff airport, geocode that airport's
   exact address and zipcode for the map pin and Step 1 route. Keep the visible
   airport field and map label showing the airport name.
3. If the address or zipcode is missing, or exact geocoding fails, silently use
   the existing airport-name lookup. Show no customer error. If the Geocoding
   API is unavailable, produce no console spam beyond one warning.
4. Keep pricing unchanged. Quote, price-breakdown, and booking requests send
   only the applicable airport id for the airport side; the server resolves
   its address. Make no money changes.
5. Verify the Step 1 route works from airport to address and from address to
   airport.

## Approved implementation plan

1. Copy the backend API files, update both source records, verify byte size and
   Git blob hash against the source, then run `pnpm gen:api`.
2. Add a Google Maps geocoding-library loader. Resolve an airport from its
   server-owned address plus zipcode first, then fall back to the current
   name/code airport search when either field is absent or geocoding fails.
3. Keep stale-result protection, marker clearing, airport-name display, quote
   request construction, price breakdown, booking, and money logic unchanged.
4. Add focused tests named `pin uses airport address`, `fallback when address
   missing`, `airport id still sent`, and `no pricing change`, plus geocoding
   failure, once-only warning, both route directions, stale lookups, and the
   refreshed airport response shape.
5. Run focused tests and `pnpm check`. Report exact before/after raw and gzipped
   `dist/embed.js` sizes and compare the visible behavior with BRO.

## Expected files

- `docs/phases/E-6e-airport-pin.md`
- `src/api/openapi.json`
- `src/api/schema.d.ts`
- `src/api/SOURCE.md`
- `docs/api/API_CONTRACT.md`
- `docs/api/SOURCE.md`
- `src/api/airport-data.ts`
- `src/maps/google-maps-loader.ts`
- `src/maps/airport-location.ts`
- `src/app/trip/use-airport-location.ts`
- `src/app/trip/AirportFields.tsx`
- focused tests for airport data, airport pinning, request construction, and
  route direction
- `EMBED-TRACKER.md`

No dependency is expected. Leave unrelated untracked BRO promo screenshots out
of every commit.

## Delivery

Run focused tests and `pnpm check`, commit with exact file lists, and report:

- `git log -3 --oneline`
- `git status --short`
- before/after raw and gzipped `dist/embed.js` size
- the single push command `git push -u origin phase/E-6e`

Then stop.
