# E-10 — Widget UI fixes from live testing

## Scope

Widget-only fixes. Cash/card behavior, pricing behavior, shuttle flows, and
E-11 hourly/Add Stops behavior must remain unchanged.

1. Show taxi Trip Details field errors only after the first **Check Pricing**
   press or after that field has been blurred (touched). Do not show red field
   errors on first load.
2. Keep the Pickup/Dropoff adornment decorative under ED-014. Replace the
   add-like glyph with a clear map-pin icon. It must not be focusable, must be
   `aria-hidden`, and must have no button styling or hover behavior. Do not add
   stops; Add Stops remains E-11.
3. Render an unavailable taxi vehicle message once as plain greyed text. The
   row remains non-selectable and must not present the message as a button.
4. Use the API's `unavailable_reason` to select the message:
   - `capacity` → “Too many passengers or bags for this vehicle”
   - `blackout` or a time reason → “Not available at this time”
   - any other non-capacity reason → “Not available”
   - absent/null reason → keep the existing “Not available at this time” text
5. Keep capacity/summary icons and add visible text: for example,
   “6 passengers · 6 bags” on vehicle rows and
   “7 passengers · 4 check-in · 5 carry-on” in the trip summary.
6. Taxi address autocomplete accepts only a precise place: street address,
   establishment, or airport. City/region-only results are rejected with
   “Please choose a street address or airport.” Airport choices from the taxi
   airport list remain valid.
7. A Terms & Conditions URL may become a link only when the public business
   config publishes a `terms_url`. The current schema has no such field, so
   record a backend gap and keep the widget's terms wording as plain text.

## Implementation plan

1. Add focused validation visibility state and precise-place helpers without
   changing request payloads or endpoint behavior.
2. Adjust the decorative address icon, unavailable vehicle presentation, and
   visible capacity copy inside the existing Shadow DOM styles/components.
3. Add focused Vitest coverage for validation timing, Places precision,
   vehicle reason messages, non-selectability, decorative pins, and summary
   copy.
4. Run focused Vitest, typecheck, lint, exactly one production build, then
   `test:dist`. Report raw and gzipped `dist/embed.js` size.

## Delivery

- Commit this spec first on `phase/E-10` branched from fast-forwarded `main`.
- Keep `docs/reference/bro/promo-code-edit.png` and
  `docs/reference/bro/promo-codes-list.png` untracked and out of every commit.
- Update `EMBED-TRACKER.md` in the final implementation commit, including the
  public `terms_url` backend gap.
- Finish with `git log -4 --oneline`, `git status --short`, and the push command.
