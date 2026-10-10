# BRO booking form — reference screenshots

Screenshots of the client's current Book Rides Online form. They show layout and fields. **They are not the full spec** — they may contain BRO bugs or features we dropped. The phase spec says what to keep.

**Blur any real customer name, phone, email or address before committing.** Git history keeps them forever.

## File names

Use `<service>-step<N>-<what>.png`. One image per state.

| File | Shows | Have it? |
|---|---|---|
| `one-way-step1-trip-details.png` | Step 1 filled in, map with route | ✅ |
| `step1-service-dropdown-open.png` | Service dropdown opened | ✅ |
| `step1-passengers-dropdown-open.png` | Passengers dropdown | ✅ |
| `step1-luggage-dropdown-open.png` | Luggage dropdown | ✅ |
| `step1-airport-pickup-airline-dropdown.png` | Airport Pickup with the searchable airline dropdown open | ✅ |
| `step1-airport-dropoff-dropdown-open.png` | Airport Dropoff with the service dropdown open | ✅ |
| `step1-airport-dropoff-addon.png` | Airport Dropoff fields added below the trip fields | ✅ |
| `hourly-step1.png` | Step 1 for Hourly (hours, stops) | ❌ needed |
| `step2-choose-vehicle.png` | Vehicle list with Priced / Request a Quote / Unavailable | ✅ |
| `step3-confirm-priced.png` | Misnamed Step 1 reference; replace with the real priced Confirm screen before E-4 | ✅ temporary |
| `step3-confirm-request-quote.png` | Confirm page after choosing a Request a Quote vehicle | ❌ needed |
| `step4-confirmation.png` | Page after Create Trip | ❌ needed |
| `step1-pin-button.png` | What the pin button beside an address does | ❌ needed |
| `mobile-step1.png`, `mobile-step2.png`, `mobile-step3.png` | Mobile view of each step | ❌ needed |
| `validation-errors.png` | A step with validation errors showing | ❌ nice to have |

## Notes on what the screenshots show

- `step3-confirm-priced.png` currently shows a completed Step 1 state, not the Confirm page its name implies. It is useful as an E-2 visual reference but must be replaced before E-4.
- The service dropdown lists One Way Transfer, Airport Dropoff, Airport Pickup, Hourly (6 Hour min). No Round Trip.
- Drop from our build: the BRO site header (Menu, Login), the promo code box (for now).
