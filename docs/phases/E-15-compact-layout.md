# E-15 — Widget compact layout + mobile full width

**Scope:** Widget only, taxi and shuttle.

Create branch `phase/E-15` from an up-to-date `main` using
`git pull --ff-only` before implementation.

## Goal

Make the embedded widget use its available container space cleanly on mobile
and inside narrow Elementor/WordPress columns. Compact the taxi date/time and
party controls without changing their values, limits, validation or behavior.

## WIDGET-M01 — Mobile full width

- On narrow widget containers, fill 100% of the container.
- Remove the outer border, shadow and radius.
- Reduce outer padding.
- Prevent horizontal scrolling.
- Apply the same rule to taxi and shuttle modes.

## WIDGET-L02 — One-line taxi passengers and bags

Place Passengers, Check-in / trunk and Carry-on on one row:

- in the half-width form column beside the map;
- on mobile containers around 360–430px wide.

Use a compact presentation:

- a narrower Passengers select;
- compact bag counters with smaller minus/plus buttons and a narrow number
  field;
- an icon and short labels above the bag controls: `Bags` and `Carry-on`;
- equal-height controls.

Fall back to two rows only below approximately 320px. Preserve all existing
values, business/schema limits, combined-luggage validation, accessible labels,
focus rings and approximately 44px touch targets where space permits.

Do not change the shuttle passenger dropdown behavior.

## WIDGET-L03 — One-line pickup date and time

- Place Pickup Date and Pickup Time on one row in the half-width form column
  and on mobile containers.
- Make the date field wider than the time field.
- Stack only below approximately 320px.
- Preserve all date/time behavior, timezone handling and validation.

## Container-responsive behavior

Base every breakpoint on the widget's own container width, using container
queries or a `ResizeObserver`, not the page viewport. The layout must work when
embedded in Elementor/WordPress columns.

## Constraints

- Preserve all pricing, booking, payment and validation logic.
- Preserve taxi/shuttle endpoint separation.
- Add no dependencies.
- Keep all widget-owned UI and styles inside the Shadow DOM.
- Keep the production output to `dist/embed.js` and its sourcemap only.

## Tests and verification

Cover layout structure/classes at container widths of 320px, 375px, 430px, a
half-width column around 380px and a full-width container around 760px.

Verify:

- mobile full-width presentation in both taxi and shuttle modes;
- the taxi passenger/bag row and date/time row at each required width;
- the below-320px fallback;
- no horizontal overflow;
- existing behavior tests remain unchanged and passing.

Run focused Vitest, typecheck and lint, then exactly one production build and
`test:dist`. Report raw and gzipped `dist/embed.js` sizes.

## Delivery

- Update `EMBED-TRACKER.md` with the completed phase and changelog entry.
- Add a decision only if implementation requires a decision not covered here.
- Commit the completed phase.
- Keep `docs/reference/bro/promo-code-edit.png` and
  `docs/reference/bro/promo-codes-list.png` out of the commit.
- Do not deploy and do not push.
- Finish with `git log -3 --oneline`, `git status --short` and the push command.
