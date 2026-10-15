# E-6 — API refresh and release hardening

**Read first:** `AGENTS.md`, `EMBED-TRACKER.md`, `docs/architecture.md`,
`docs/decisions.md`, `docs/WORKFLOW.md`, and `docs/phases/E-5-booking.md`.
**Branch:** `phase/E-6-hardening`, freshly created from `main` after E-5 was merged.

## Goal

Refresh the widget against the pushed backend `main` contract, remove the two
temporary API workarounds, and prove that booking submission, errors, embedding,
and production caching are safe for release.

## 1. API refresh and temporary-workaround removal

- Copy `openapi.json` and `docs/API_CONTRACT.md` byte-for-byte from the pushed
  backend `main` commit containing B-21, B-24, B-25, and B-27a.
- Record that exact commit in both source records. Verify the copied OpenAPI
  byte size and hash against the source and verify UTF-8 encoding.
- Regenerate `src/api/schema.d.ts`.
- Use generated `BusinessPublic.max_passengers` and `max_luggage`, each capped
  at the `TaxiQuoteRequest` schema maximum (ED-020).
- If either maximum is null, show exactly: "No vehicles are available. Please
  contact us."
- Delete the temporary service-type type and validator and use the generated
  `ServiceTypeOption` type.
- Record ED-013 and ED-019 as resolved without rewriting decision history.

## 2. Booking submission hardening

Prove one booking per unchanged attempt for double-click, Enter plus click,
slow network, page refresh during submission, and navigation Back after success.

- Never retry a booking POST automatically.
- Reuse the same `Idempotency-Key` after an uncertain outcome and across a page
  refresh for the same request body.
- Generate a new key only when the booking request body changes.
- Persist only a request fingerprint and UUID in `sessionStorage`; never persist
  customer data there.
- Keep the existing in-memory in-flight guard and disabled submit state.

## 3. Booking errors

Handle offline, timeout, 5xx, 429, 401, and these 422 codes without losing the
form or automatically retrying:

- `ADVANCE_BOOKING_VIOLATION`
- `VEHICLE_UNAVAILABLE`
- `PAYMENT_METHOD_NOT_OFFERED`
- `AIRPORT_ADDRESS_MISSING`

Messages must be clear. A bad business key shows "This booking form is not
configured." and any developer log must not contain the key.

## 4. Embed safety

- Including the script twice for the one supported `#galveston-booking` mount
  is harmless and mounts only once.
- Multiple widgets on one page are out of scope. Do not add `data-mount-id` or a
  second mount contract.
- Host-page CSS cannot style widget UI, and widget CSS stays in the Shadow DOM.
- The business key is never logged or placed in a URL; it is sent only in the
  `X-Business-Key` header.

## 5. Step 1 route-preview bug

The current map receives a route only from the quote response, so it cannot draw
one before Check Pricing. Use the current Google Maps JavaScript Routes library
to request only a driving route path after both endpoint coordinates exist.

- Draw the red route on Step 1 as soon as pickup and dropoff are known.
- Recompute when either endpoint changes and ignore stale responses.
- When a quote polyline exists after returning from Step 2, it remains the
  server-quote route source.
- A browser route failure must leave the form usable and must not affect quote
  or booking behavior.
- The Maps browser-key project must have Maps JavaScript API and Routes API
  enabled. Never put a key in source, documentation, logs, or chat.
- Add focused tests for address/address and airport/address endpoints, updates,
  stale responses, and failure.

## 6. Production cache report

Inspect the current HTTP response headers for
`https://widget.kanwalkumar.com/embed.js`. Report the observed caching behavior
and recommend headers that let customers receive updates. Do not change server
configuration.

## 7. Verification and report

- Add focused tests for every submission, retry, error, embed, secret-handling,
  limit, service-type, and route-preview requirement above.
- Run tests for every touched area and `pnpm check`.
- Report raw and gzipped `dist/embed.js` size, BRO differences, backend gaps,
  decisions, cache findings, and anything unverified.
- Update `EMBED-TRACKER.md`.
- Give suggested Git commands, but do not commit or push.

Then stop.
