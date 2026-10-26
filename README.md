# Galveston booking embed

The customer booking widget is a single browser script. It mounts inside a Shadow DOM and calls the public Galveston backend with the business key supplied by the host page.

## Embed snippet

```html
<div id="galveston-booking"></div>
<script
  src="https://<widget-host>/embed.js"
  data-business-key="bk_live_..."
  async
></script>
```

`data-business-key` identifies the transport company. It is a public booking key, not an admin credential. `data-api-base` is an optional staging override; production normally uses the `VITE_API_BASE` value compiled into the script.

## Development

Copy `.env.example` to `.env.local` and fill in `VITE_API_BASE`, `VITE_BUSINESS_KEY`, and the referrer-restricted `VITE_MAPS_BROWSER_KEY`. Environment files other than `.env.example` must never be committed.

```sh
pnpm dev
pnpm test
pnpm build
pnpm check
```

The dev harness is at `http://127.0.0.1:5173/dev/`. A production build creates only `dist/embed.js` and `dist/embed.js.map`.

## Card-payment Content Security Policy

Card-ready companies load Square's Web Payments SDK only after the customer
selects Card. A client site that sets Content Security Policy headers must merge
Square's current directives into its policy; the widget never changes host-page
headers or `<meta>` tags.

For Sandbox, allow `https://sandbox.web.squarecdn.com` in `script-src`,
`frame-src`, and `style-src`, and `https://pci-connect.squareupsandbox.com` in
`connect-src`. For Production, use `https://web.squarecdn.com` in `script-src`,
`frame-src`, and `style-src`, and `https://pci-connect.squareup.com` in
`connect-src`. Square also documents `https://o160250.ingest.sentry.io` for
`connect-src` and `https://square-fonts-production-f.squarecdn.com` plus
`https://d1g145x70srn7h.cloudfront.net` for `font-src`. Keep the rest of the
site's existing policy. See Square's [Web Payments SDK CSP guide](https://developer.squareup.com/docs/web-payments/content-security-policy).

## Refreshing API files

Refresh the contract only at a backend commit supplied by the project owner, after that commit has been pushed:

1. Copy backend `openapi.json` to `src/api/openapi.json`.
2. Copy backend `docs/API_CONTRACT.md` to `docs/api/API_CONTRACT.md`.
3. Record the supplied commit in both `src/api/SOURCE.md` and `docs/api/SOURCE.md`.
4. Run `pnpm gen:api`.
5. Commit the API refresh separately as `chore: refresh API files from backend <hash>`.

Never refresh from an arbitrary local backend checkout.
