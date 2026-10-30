# Architecture — galveston-embed

Each choice states **why**, so it is not "simplified" into a bug later.

## 1. System shape

```
Client website (any CMS)
  └─ <div id="galveston-booking"></div>
     <script src="https://<our-host>/embed.js" data-business-key="bk_live_..." async></script>
           │
           ▼  runs in the visitor's browser
     embed.js ── mounts a Shadow DOM inside #galveston-booking
           │
           ▼  HTTPS, X-Business-Key header
     galveston-backend  /v1/public/*   (on our VPS, behind Caddy)
           │
           ▼
     Admin panel (galveston-admin) shows the booking in Runs
```

- **embed.js is a static file hosted on our VPS.** It holds no secrets.
- **The business key is in the script tag and is public by design** (decision ED-002). It grants only the public booking endpoints.
- **Google Maps** (Places autocomplete and the route map) loads in the browser with a **browser key**, restricted by HTTP referrer. It is separate from the backend's server key.
- **Square Web Payments SDK** loads only after a card-ready business selects Card. The public business response selects Square's sandbox or production script; no Square secret enters the browser.

## 2. Stack

| Area | Choice | Why |
|---|---|---|
| UI | **Preact** + TypeScript `strict` | About 4 KB against React's 45 KB. The script loads on every page of six client sites |
| Build | **Vite library mode**, IIFE output, single file | The client pastes one tag; a second file is a second thing to break |
| Styles | Plain CSS with design tokens, inlined into the Shadow DOM | No global CSS; no CSS framework weight |
| API types | **openapi-typescript** from `src/api/openapi.json` | Types always match the backend; never hand-written |
| API client | **openapi-fetch** | Typed calls; same as the admin panel |
| Maps | Google Maps JS API (Places + Maps) | BRO uses Google; the backend's distances come from Google |
| Tests | **Vitest** | Same as the admin panel |
| Package manager | **pnpm 11.19.0**, exact pins | Matches `galveston-admin` |

## 3. Directory structure

```
galveston-embed/
├─ AGENTS.md
├─ EMBED-TRACKER.md
├─ README.md
├─ docs/
│  ├─ architecture.md          # this file
│  ├─ decisions.md
│  ├─ phases/                  # one spec per phase
│  ├─ api/                     # API_CONTRACT.md copy + SOURCE.md
│  └─ reference/bro/           # BRO screenshots, by service and step
├─ dev/                        # local harness — never shipped
│  └─ index.html
├─ src/
│  ├─ embed.ts                 # loader: read script tag, mount, guard double load
│  ├─ app/                     # the 3-step form (Preact components)
│  ├─ api/                     # openapi.json, SOURCE.md, schema.d.ts, client, errors
│  ├─ money/                   # string-only money formatting
│  ├─ time/                    # business-timezone date/time helpers
│  ├─ maps/                    # Google Maps loader, Places, route rendering
│  └─ styles/                  # tokens.css and component CSS (inlined)
└─ tests/
```

## 4. Loader rules (`src/embed.ts`)

- Read `data-business-key` from `document.currentScript`, **captured synchronously at load** (it is null later).
- Optional `data-api-base` overrides the API base URL (for staging). Default comes from the build-time `VITE_API_BASE`. No hardcoded URLs.
- Mount into `#galveston-booking`. If it is missing, log one `console.error` and stop.
- Create a Shadow DOM on the mount element; render everything inside it.
- Add one empty `#galveston-square-card` light-DOM child inside the mount. A named Shadow DOM slot projects it only for Card, allowing Square to own its iframe while every widget-owned field and style stays isolated (ED-030).
- If the script is included twice, mount once.

## 5. API layer (`src/api/`)

- Every request sends `X-Business-Key` and `Content-Type: application/json`.
- Errors arrive as `{ "error": { "code", "message", "field"? } }`. Parse into a typed `ApiError`. `field` may be absent.
- `Idempotency-Key`: one helper creates a UUID per cart and returns the same key until the cart changes.
- No automatic retries on POST. `402 PAYMENT_FAILED` is never retried.
- `409 REQUEST_IN_FLIGHT` and `429 RATE_LIMITED` are distinct error types, not generic failures.

## 6. The form

One widget dispatches by `GET /business` → `type`; there is no customer-facing
mode selector. Taxi businesses retain BRO's 3-step flow. Shuttle businesses
use Trip → Departures → Confirm. Screenshots in `docs/reference/bro/` are the
reference where applicable. **A screenshot is not the full spec**: it may
contain BRO bugs and features we dropped. The phase spec says what to keep.

| Mode | Step | Calls |
|---|---|---|
| Shared | Load | `GET /business`, then dispatch by `type` |
| Taxi | Load | `GET /taxi/service-types` (and airports, airlines when needed) |
| Taxi | Trip Details → Check Pricing | `POST /taxi/quote` |
| Taxi | Choose Vehicle | none (uses the quote) |
| Taxi | Confirm | `POST /taxi/price-breakdown`, then `POST /taxi/booking` |
| Shuttle | Trip | `GET /shuttle/locations` |
| Shuttle | Departures | `GET /shuttle/search`, then `GET /shuttle/search/return` after an outbound is selected for round trip; both lists remain on one page |
| Shuttle | Confirm | `POST /shuttle/quote`, then `POST /shuttle/booking` |

Taxi and shuttle endpoint families never mix. Their request/state modules stay
separate while contact fields, promo presentation, server-line rendering,
errors and idempotency may be shared. Scheduled shuttle cards render
`service_label` as documented service text and, when B-38D's nullable
`vehicle_type` is present, render its `name` as the vehicle display text.
Shuttle passenger categories remain separate request counts inside one dropdown.
Each search result's `route.from_requires_address` and
`route.to_requires_address` flags control separate precise Places pickup and
drop-off fields. Booking sends those values only inside their corresponding leg;
quote bodies remain address-free. Round-trip return fields use the reversed
outbound values as editable defaults. Changing a location or resolved route
clears its remembered addresses.

**Dropped from BRO:** the site header (Menu, Login) and customer accounts.
Taxi round trip is an allowed `service_type`; hourly remains deferred. Businesses
may hide the service dropdown or map through public settings. Hidden service
selection uses the first permitted non-round-trip service in API order, with a
One way / Round trip switch when both paths are offered (ED-027).
**Added beyond BRO:** card payment.

Public `settings.payment_methods` and usable capability jointly determine the
confirmation payment UI. Cash requires `"cash"`; Card requires both `"online"`
and `payments.card_available`. Both methods render a choice, one method renders
plain `Payment: Cash` or `Payment: Card` text, and no usable method blocks
submission with the contact-company message. Selecting Card re-prices with
`payment_method: "online"`; Cash uses `"cash"`. Square tokenizes only after a
valid submit. The one-time token is added only to the booking POST and is
excluded from the persisted cart fingerprint, so a retry gets a new token while
reusing the unchanged cart's idempotency key. Cash-only and manual quote paths
never load Square.

## 7. Environments

| Variable | Example | Purpose |
|---|---|---|
| `VITE_API_BASE` | `https://galveston-api.kanwalkumar.com` | Default API base |
| `VITE_MAPS_BROWSER_KEY` | — | Google Maps browser key (referrer-restricted) |

`.env.local` for development; never commit `.env*` files. Commit `.env.example`.

## 8. Portability

Nothing in the code references `kanwalkumar.com`, Hostinger or Caddy. Moving to the client's infrastructure means changing environment values and where `embed.js` is served.
