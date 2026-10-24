# P3 — Conditional Square card payment

## Approved request

Add card payment to both taxi and shuttle confirmation flows without changing
cash-only behavior for businesses that are not fully card-ready. This phase
supersedes ED-006 and records the replacement decision in `docs/decisions.md`.

## Contract gate

Refresh the public contract from the supplied backend `origin/main`, including
P1 commit `ca5d892`, before implementation. Card availability and the Square
environment come only from generated public-business fields.

If either an explicit readiness field or an explicit sandbox/production
environment is absent, commit E-9b and stop P3. Never infer the environment from
an application ID or any other display value.

## Availability and pricing

- A fully card-ready business sees a Cash / Card choice. Every other business
  retains today's cash-only UI and does not load the Square SDK.
- Request-a-Quote taxi vehicles remain cash/manual and skip price breakdown.
- Cash uses `payment_method: "cash"`; Card uses `payment_method: "online"`.
- Changing payment method re-quotes the current taxi breakdown or shuttle cart.
  No stale result may replace the latest selection.
- Display server line items, labels, amounts, order and total unchanged. Never
  calculate the card fee or any other money in the browser.

## Square SDK and Shadow DOM exception

- Load Square Web Payments SDK lazily from Square's exact official sandbox or
  production URL selected by the generated environment. Load it once and never
  bundle it.
- AGENTS rule 11 gains one scoped exception: an empty light-DOM card container
  may live inside `#galveston-booking` and be projected through a named Shadow
  DOM slot. Square may render its managed card iframe into that container. The
  Square script may be injected into `document.head` once.
- No other widget UI, CSS or host-page write leaves the Shadow DOM.
- The slotted integration is **UNVERIFIED** until the developer runs a real
  Square sandbox browser test after deployment. If it fails, stop; use no other
  workaround.
- Document the client-site CSP requirements, but never mutate the host page's
  CSP from the widget.

## Booking and security

- Initialize Square only from public application and location IDs.
- Tokenize only after a valid Book submission and only when Card is selected.
- Keep a token in the submit call's local scope only. Never store, log, render
  or include it in an idempotency fingerprint.
- Send the token as the generated booking payment-token field in one booking
  request. Never retry a POST automatically.
- An unchanged card cart reuses its idempotency key even when retrying with a
  new one-time token. Changing Cash/Card or any other cart field changes the
  key.
- Tokenization and decline failures show clear, non-sensitive messages and
  preserve the selected method. They never trigger an automatic retry.
- Card success shows exactly: `Payment processing. You'll get a confirmation
  email.` Cash retains the existing confirmation. Booking status remains
  `requested`; the widget never auto-confirms.

## Packaging and verification

- Keep one `dist/embed.js` IIFE plus its sourcemap, with no additional runtime
  dependency or output file.
- Run focused Vitest coverage, typecheck and lint, then exactly one production
  build followed by `test:dist`.
- Report raw/gzip change from the pre-phase baseline.
- Do not deploy and do not run a live Square sandbox smoke test. Mark the live
  sandbox result **UNVERIFIED** for the developer to test after deployment.

