# E-14 — Widget confirmation messages

**Scope:** Widget only, taxi and shuttle.

Create branch `phase/E-14` from an up-to-date `main` using
`git pull --ff-only` before implementation.

## Goal

Make every successful booking response final for the widget. Show the booking
reference prominently, give the customer accurate next-step wording, and never
leave a completed booking on a payment-processing screen.

## QA-005 — Accurate confirmation wording

After a successful taxi or shuttle booking:

- show `Booking reference: {reference}` prominently;
- provide a button that copies the reference;
- for Cash show:
  `Your booking is requested. Our team will contact you to confirm.`;
- for Card show:
  `Payment submitted. Your booking is requested. Our team will contact you to confirm.`;
- do not promise an email.

If public business config later exposes an email-enabled flag, add
`A confirmation email has been sent.` only when that flag is true. The current
API has no such public flag, so record it as a backend gap and do not infer the
capability from a booking response field.

This supersedes ED-023 only for the source and display of email-confirmation
wording. Booking idempotency, response totals and all other ED-023 behavior stay
unchanged.

## QA-006 — Booking response is final

- A successful booking response immediately shows the confirmation screen and
  reference above.
- Never leave the customer on `Payment processing` after a booking response.
- Do not poll. The public API has no booking-status endpoint; record that as a
  backend gap.

## Constraints

- Preserve pricing, payment, Square, car-seat and booking logic.
- Preserve taxi/shuttle endpoint separation.
- Add no dependencies.
- Do not invent API fields.
- Keep all widget-owned confirmation UI inside the Shadow DOM.

## Tests and verification

Cover both taxi and shuttle confirmations:

- Cash confirmation text;
- Card confirmation text;
- booking reference is prominent and copyable;
- no email promise;
- no lingering `Payment processing` state after success.

Run focused Vitest, typecheck and lint, then exactly one production build and
`test:dist`. Report raw and gzipped `dist/embed.js` sizes.

## Delivery

- Update `EMBED-TRACKER.md` and add a decision that supersedes the email-wording
  part of ED-023.
- Commit the completed phase.
- Keep `docs/reference/bro/promo-code-edit.png` and
  `docs/reference/bro/promo-codes-list.png` out of the commit.
- Do not deploy and do not push.
- Finish with `git log -3 --oneline`, `git status --short`, the push command and
  backend gaps.
