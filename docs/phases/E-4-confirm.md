# E-4 — Step 3: Confirm (priced vehicle)

**Read first:** `AGENTS.md`, `EMBED-TRACKER.md`, `docs/architecture.md`, `docs/decisions.md` (especially ED-006, ED-007, ED-009, ED-011, ED-012, ED-021), `docs/api/API_CONTRACT.md` (price-breakdown and taxi booking sections), the generated API types in `src/api/`.
**Branch:** `phase/E-4`, from `main` after `e-3`.
**Reference screenshot:** `docs/reference/bro/step3-confirm-priced.png` (BRO's real step 3: Sedan, Total $92.70 USD).

## Goal

Replace the step 3 placeholder **for priced vehicles** with BRO's Confirm page: trip summary, charges from the server, total, special requests, personal info and terms. **Create Trip validates the form but does not book yet** — sending the booking is E-5.

Why split it this way: E-4 is everything the customer sees and fills in; E-5 is the one irreversible action (creating a real booking). Keeping the POST out of E-4 means no test can create a booking by accident.

## Out of scope

- Sending the booking (`POST` booking) and the confirmation page → **E-5**.
- Step 3 for **Request a Quote** vehicles → **E-5** (needs its own BRO screenshot). Until then, choosing a Request a Quote vehicle keeps showing the E-3 placeholder.
- Promo code → add-on E-8. Card payment → E-7. Mobile polish → E-6.

## 0. Plan first (required)

Before any code, report:
1. The exact request and response schema of **price-breakdown** and of the **taxi booking** request, from `openapi.json` / generated types (schema names + fields). Never invent a field.
2. Which personal-info and notes fields the **booking** request accepts (first/last name, phone, email, special requests / notes) and their limits. E-4 collects exactly those; anything BRO shows that the booking cannot accept is listed, not built.
3. **Car seats:** does price-breakdown or booking accept a car-seat count or an extras/add-ons list? Yes (field name + how it is priced) or no. **If no, do not build the Car Seats control**; record it in the report. Why: a control the server ignores would show a price the customer is never charged, or charge nothing for a seat they expect.
4. How each breakdown line identifies itself (`kind`, `source_id`, label, amount) — needed for ED-012.

Then stop and wait for approval.

## 1. Load the breakdown

- On entering step 3 with a `"priced"` vehicle, call **price-breakdown** once with the stored trip (the same request the quote used), the chosen vehicle, and `payment_method: "cash"` (ED-006).
- Show a loading state in the Charges area. **No automatic retry.**
- Errors use the same table as E-3 (400 with/without `field`, 422, 429, network/5xx). A failure shows the message plus **Back**; it never shows a stale or guessed price.
- The breakdown belongs to this exact trip + vehicle. Back to step 2 and choosing again, or changing any step 1 field, discards it (same rule as the quote in E-3).

## 2. Layout (copy BRO step 3)

Progress indicator with step 3 active. Two columns on desktop:

**Left**
- **Trip Summary:** vehicle photo (or the "No photo available" placeholder), a heading built from the service type name, the pickup date and time in the **business timezone**, the vehicle name, and the distance if the API returns it; passengers and luggage counts; pickup (green pin) and dropoff (red pin) addresses. All names are display text from the API (AGENTS rule 8).
- **Charges:** one row per breakdown line, label and amount **exactly as returned, in the order returned** (ED-011). Hide the CC Surcharge line when its amount is `"0.00"`, identified by `kind`/`source_id`, never by label (ED-012).
- **Total:** the server's total, in BRO's green bar, formatted `$92.70 USD` via `src/money/` only (ED-007, ED-021).
- **Back** → step 2 with the vehicle list intact.

**Right**
- **Special Requests:** one text field, placeholder "Enter any specialized instructions or requests here".
- **Personal Info:** First Name, Last Name, Phone, Email (only fields the booking accepts — plan item 2). The phone and @ icons are decorative.
- **Terms checkbox:** "By checking this box you agree to our Terms & Conditions". "Terms & Conditions" opens a panel **inside the Shadow DOM** showing `terms_and_conditions` from `GET /v1/public/business` as **plain text** (never `innerHTML` — the text is admin-entered). If terms are empty/null, show the checkbox without the link.
- **Create Trip** button.

## 3. Create Trip in E-4

- Validates: required fields filled, email format, phone has digits, terms checked, breakdown loaded. Errors show next to each field; focus moves to the first error.
- When valid: build the booking request object (typed from the generated schema) and keep it in the booking state, then show a short notice "Booking — coming next". **No network call.**
- The builder is a pure function with tests, so E-5 only adds the POST.

## 4. Rules

- Money: strings only; no `Number`, `parseFloat`, `toFixed` or arithmetic on money; never compute or check the total.
- Never send or show a price the server did not return.
- No secrets; the business key stays as today.
- Code limits from AGENTS.md (file ≤ 400 lines, function ≤ 50, nesting ≤ 3).

## 5. Tests (files you touch)

- Breakdown requested once, with `payment_method: "cash"` and the stored trip + vehicle.
- Each error row; no automatic retry; Back available on failure.
- Lines render in API order with API labels; total formatted via `src/money/`.
- A `"0.00"` CC Surcharge line (by kind/source_id) is hidden; a non-zero one is shown; a line *labelled* like a surcharge but of another kind is not hidden.
- Changing a step 1 field or re-choosing a vehicle discards the breakdown.
- Terms panel renders text as plain text (a `<b>` in the terms appears literally).
- Validation messages per field; Create Trip with valid input builds the expected booking request and makes **no** network call.
- A Request a Quote vehicle still shows the placeholder.

## 6. Acceptance (browser, Checker Yellow Cabs, real Galveston addresses)

1. Priced vehicle → step 3 shows the summary, server charges and total in BRO's layout.
2. Total equals the server's number exactly.
3. Empty form → Create Trip shows field errors.
4. Valid form → "coming next" notice; **no booking appears in the admin Pending/Runs**.
5. Back → step 2 → choose again → fresh breakdown.
6. Terms link opens and closes the panel.

## 7. Report (AGENTS.md section 7), plus

- One trimmed price-breakdown response from Checker Yellow Cabs.
- The car-seat answer from plan item 3.
- `dist/embed.js` size, gzipped.
- Update `EMBED-TRACKER.md` (E-4 status, items, changelog) in the last commit.
- Give the git add / git commit commands; do not run git commands that change the repository.

**Then stop. Do not start E-5.**
