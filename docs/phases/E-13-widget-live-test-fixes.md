# E-13 — Widget fixes from live testing

**Scope:** Widget only.

Create branch `phase/E-13` from `main` after `git pull --ff-only`.

The API files already match backend `origin/main` at
`6b6fb8e14169cd7e01a6a8e47a893e02ce9d0f9b`; re-verify them byte-for-byte.
Build directly. Stop only for a real contract gap and record it.

## Taxi flow only

### TAXI-01 — Pickup date and time layout

- Put Pickup Date and Pickup Time side by side on one desktop row.
- Give them equal widths and the same height, with labels above.
- In a narrow container, stack them with Date first.

### TAXI-02 — Party and luggage layout

- Put Passengers, Check-in / trunk and Carry-on in one horizontal desktop row.
- Use three equal columns and keep the existing labels and icons.
- In a narrow container, stack them in the same order.
- Keep all existing controls, limits and validation.

## Shuttle flow only

### SHUTTLE-01 — Passenger categories from the start

- Fix the frontend gating bug that hides Seniors and Children until the first
  search.
- Show Adults, Seniors and Children in the Passengers dropdown from the start.
- Keep `+` / `-` controls for each category.
- Defaults are Adults 1, Seniors 0 and Children 0; Adults has a minimum of 1.
- Fares remain server-side and existing seat limits remain unchanged.

## Payment — taxi and shuttle

### TAXI-03 / SHUTTLE-02 — Respect public payment settings

Use `settings.payment_methods` from the public business config:

- When `"cash"` is allowed, Cash is available.
- When `"online"` is allowed and `payments.card_available` is `true`, Card is
  available.
- When both are available, show the Cash / Card choice.
- When only one is available, show plain text before booking:
  `Payment: Cash` or `Payment: Card`.
- The customer must always see how they will pay before booking.
- Keep the existing Square card integration unchanged.

### SHUTTLE-03 — No available payment method

When no method is available — including an empty `payment_methods` list, or
only `"online"` while Card is unavailable — block submission and show:

> Online booking is temporarily unavailable. Please contact us to book.

Do not show a phone number because one is not in the public API yet.

## Terms

- If the public business config already includes the company's terms text,
  make **Terms & Conditions** open it in an accessible popup with a focus trap;
  Escape closes the popup.
- If the terms text is not present, keep plain text and record a backend gap.

## Constraints

- Preserve pricing, booking, availability and all other taxi and shuttle
  behavior.
- Add no dependencies.
- Keep Square card integration unchanged.
- Record backend gaps for:
  - public company phone;
  - public `require_payment` / payment-method consistency, especially card-only
    configuration while Card is not set up;
  - public terms text, if missing.

## Tests and verification

Add tests for every item:

- layout classes and structure;
- shuttle dropdown categories visible from the start;
- the payment-method matrix, including the empty-method submission block;
- the Terms popup.

Run focused Vitest, typecheck and lint, then exactly one build and `test:dist`.
Report raw and gzip bundle sizes.

## Delivery

- Commit the phase spec first, then commit the implementation yourself.
- Keep `docs/reference/bro/promo-code-edit.png` and
  `docs/reference/bro/promo-codes-list.png` out of every commit.
- Do not deploy and do not push.
- Finish with `git log -6 --oneline`, `git status --short`, the push command and
  the backend gaps.
