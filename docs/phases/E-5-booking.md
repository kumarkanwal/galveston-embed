# E-5 — Create the booking and show the confirmation

**Read first:** `AGENTS.md`, `EMBED-TRACKER.md`, `docs/architecture.md`, `docs/decisions.md` (ED-006, ED-007, ED-009, ED-011, ED-021, ED-022), `docs/api/API_CONTRACT.md` (taxi booking section, idempotency, errors), the generated types in `src/api/`, `docs/phases/E-4-confirm.md`.
**Branch:** `phase/E-5`, from `main` after `e-4`.
**Reference screenshots:** `docs/reference/bro/step4-confirmation-request-quote.png` (BRO's confirmation after a quote request). There is **no** BRO screenshot of a priced booking's confirmation or of step 3 for a Request a Quote vehicle (taking them would create real bookings in the client's live system).

## Goal

Create Trip sends the booking built in E-4 and shows a confirmation page. Request a Quote vehicles get their own step 3 and submit a quote request. This is the phase where the widget first **writes** data.

## Out of scope

Card payment (E-7), promo (E-8), round trip (E-9), hourly (E-11), airport bookings beyond what works today (blocked on backend B-25), emails (backend), mobile polish (E-6), customer accounts.

## 0. Plan first (required)

Before any code, report from the committed contract and generated types only:
1. The booking **response** schema: booking/order id, the customer-facing reservation number, status values (e.g. `requested`, confirmed), the final total and currency.
2. **Idempotency:** is `Idempotency-Key` required, what format, how long the server remembers it, and what it returns for a repeat (same body / different body). The contract says required; OpenAPI marks it optional — say which the server actually enforces.
3. **Re-pricing:** the server prices again at booking. If its total differs from the breakdown the customer saw, what does it do (accept and return the new total, or reject with a code)? Never guess.
4. Every error the booking can return (400 + `field`, 409, 422 codes such as `ADVANCE_BOOKING_VIOLATION`, 429, 5xx).
5. For a Request a Quote vehicle: confirm the booking creates a `requested` order with a $0 total (ED-009), and which fields it requires.
6. Anything the backend must add before E-5 can be built → list as a **backend prerequisite** and stop.

Then stop and wait for approval.

## 1. Send the booking (priced vehicle)

- Create Trip (already validated by E-4) sends `POST /v1/public/taxi/booking` with the request E-4's builder produces. Do not change what the builder sends.
- **One idempotency key per booking attempt**, created when Create Trip is first pressed (`crypto.randomUUID()`), kept until success or until the customer changes the trip, vehicle, car seats or personal details.
- **No automatic retry** (AGENTS rule). If the network fails, show "We couldn't confirm your booking. Please try again." The customer may press Create Trip again: it **reuses the same key**, so the server cannot create the booking twice.
- Disable Create Trip while sending; show a loading state.
- Errors keep every field: 400 with `field` → next to the field; 400 without → above the button; 422 → the API message; 429 → "Too many requests, please wait a moment and try again."; 5xx/network → the retry message above.

## 2. Confirmation page

- Progress indicator shows all three steps done. Heading **"Confirmation"** with BRO's check icon.
- One green notice, copying BRO's layout:
  - **Request a Quote:** "Thank you! Your quote request was successfully submitted. Your pending reservation number is **{number}**."
  - **Priced booking:** "Thank you! Your reservation was successfully submitted. Your reservation number is **{number}**."
- **Do not say "You will receive an email"** (BRO does). Our backend does not send booking emails yet; the widget must not promise one. Add that sentence when email is live (tracker item).
- Show the reservation number and, for a priced booking, the **total returned by the booking response** (not the breakdown). Format via `src/money/`.
- No Back button (the booking exists). Clear the booking state so a page refresh never resubmits.
- Mark the priced wording **provisional** in the tracker until BRO's real wording is seen.

## 3. Step 3 for a Request a Quote vehicle

Replace the E-3 placeholder:
- Same layout as E-4's step 3 **without** Charges and Total. In their place: "Price: **Request a Quote** — we'll send you a quote for this trip."
- Show the out-of-service-area notice from E-3 when the quote returned `out_of_service_area: true`.
- **No price-breakdown call** (ED-009). Car Seats stays (the count is saved on the booking) but shows no price.
- Special Requests, Personal Info, Terms and validation exactly as E-4. Button label: **"Request Quote"**. Sends the booking as in section 1.

## 4. Carry-over from E-4: Terms panel

The Terms & Conditions panel was not verified live. Verify and fix: it opens and closes, scrolls when long, shows text literally (no HTML rendering), is reachable by keyboard and closes with Esc, and does not tick the checkbox by itself.

## 5. Rules

- Money: strings only; display the server's numbers; no arithmetic.
- Never retry a POST automatically. Never create a second key for the same attempt.
- Test only against **our preview server** with Checker Yellow Cabs — **never** the client's live BRO form.
- Code limits from AGENTS.md.

## 6. Tests (files you touch)

- Booking sent once with the E-4 body and an `Idempotency-Key` header.
- Network failure → no automatic retry; pressing again reuses the **same** key; changing a field creates a **new** key.
- Double-click sends one request.
- Each error row keeps the fields and shows the message in the right place.
- Success → confirmation with the number; priced shows the response total; state cleared.
- Request a Quote: no price-breakdown call; no charges; "Request Quote" button; quote-request wording.
- No "email" promise in either confirmation text.
- Terms panel: open/close, Esc, literal text, checkbox unchanged.

## 7. Acceptance (browser, preview server, Checker Yellow Cabs, real Galveston addresses)

1. Priced vehicle → Create Trip → confirmation with a reservation number.
2. That booking appears in **admin → Reservations** with the same number, customer and total.
3. Request a Quote vehicle → step 3 without charges → Request Quote → confirmation → it appears in **admin → Pending Requests**.
4. Network off (DevTools → Offline) → Create Trip → error; back online → press again → **only one** booking exists in admin.
5. Terms panel checks from section 4.
6. Afterwards, cancel or delete the test bookings in admin.

## 8. Report (AGENTS.md section 7), plus

- One trimmed booking response (priced) and one (request quote).
- The answers to plan items 2 and 3.
- `dist/embed.js` size, gzipped.
- Update `EMBED-TRACKER.md` (E-5 status, items, provisional wording, email sentence pending, changelog) in the last commit.
- Give the git add / git commit commands; do not run git commands that change the repository.

**Then stop. Do not start E-6.**
