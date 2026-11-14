# E-30 progress — customer pickup time

Date: 2026-11-15 · Status: complete

## Commits

- `1800b16 chore(api): sync B-64 contract`
- `b02ae0d feat(shuttle): collect customer pickup times`
- Documentation commit: this file, `EMBED-TRACKER.md`, and ED-036.

## Completed

- Refreshed `src/api/openapi.json` from local backend B-64 commit `04cbfec` and regenerated `schema.d.ts`.
- Kept Step 2 departure selection unchanged and added the service-time/pickup-time note.
- Added a required Step 3 pickup-time input for every shuttle leg, including separate round-trip values, with `step=900` and the required confirmation helper.
- Moved initial shuttle quoting into Step 3 so the required times are available without placeholders.
- Sent `requested_pickup_time` unchanged on every shared/private quote and booking leg.
- Displayed customer pickup times in the Step 3 trip summary and success screen.
- Returned quote, promo re-quote, and booking 422 errors for `legs.N.requested_pickup_time` to the matching Step 3 input.
- Kept the narrow/mobile form to one compact column. Taxi flow is unchanged.

## Verification

- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm vitest run`: passed, 40 files / 424 tests.
- `pnpm build`: passed; Vite transformed 100 modules.
- `dist/embed.js`: 163,931 bytes; gzip report 45.90 kB; SHA-256 `7e3f6edc374954aaffb9676975fc2aea76610ab6f4280dcfca8e98968c59c3b3`.
- No API URL is embedded in `dist/embed.js`; the existing build environment left `VITE_API_BASE` empty, so production must provide the runtime script `data-api-base` value.

## Pre-existing/intermittent result

- The first complete Vitest run had six failures in untouched `tests/airport-marker.test.tsx`. That suite immediately passed 7/7 alone, and a second complete run passed all 424 tests. No airport-marker code changed.

## Decisions and gaps

- ED-036 records that the shared departure is a service time while each leg's required customer pickup time is collected in Step 3; the quote therefore starts after those fields are valid.
- No backend gaps or new dependencies were found.

## Manual checks

- Live browser and real phone layout checks are unverified; no computer control was used.
- Verify the deployed embed tag supplies the intended `data-api-base` value.

## Next step

- Deploy only after backend B-64 is migrated and the admin F-57 asset is deployed.
