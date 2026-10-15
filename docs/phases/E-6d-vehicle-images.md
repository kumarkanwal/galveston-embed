# E-6d — Vehicle images

**Read first:** `AGENTS.md`, `EMBED-TRACKER.md`, `docs/architecture.md`,
`docs/decisions.md`, `docs/WORKFLOW.md`, and
`docs/phases/E-3-choose-vehicle.md`.
**Branch:** `phase/E-6d`, from `main`.
**Reference screenshot:** `docs/reference/bro/step2-choose-vehicle.png`.

## Request

The taxi quote response already includes nullable `photo_url` for each vehicle
type. Backend B-31 will populate it through admin image upload; the widget only
displays it.

- When `photo_url` is present, show the image on every Step 2 vehicle card like
  BRO: fixed size, lazy-loaded, `object-fit: contain`, and alt text equal to the
  vehicle name.
- Load only HTTPS image URLs.
- When `photo_url` is null or the image fails, show a neutral placeholder with
  a small inline SVG car icon. Never leave a broken image visible.
- Reserve the image area so loading and failure do not shift the layout.
- The cards must work at 320px and retain 44px targets.
- Make no API changes and keep bundle growth small.

## Approved implementation plan

1. Validate `photo_url` as an absolute HTTPS URL in the Step 2 vehicle row.
2. Render valid images with fixed dimensions, lazy loading,
   `object-fit: contain`, and the exact vehicle name as alt text.
3. Swap null, missing, invalid, non-HTTPS, or failed images for an inline SVG
   placeholder in the same fixed frame.
4. Extract Step 2 styles from `src/styles/widget.css` into
   `src/styles/vehicle.css`, keeping touched files within the 400-line limit,
   and inline the new stylesheet in the existing Shadow DOM bundle.
5. Add focused tests for HTTPS-only rendering, lazy loading and alt text,
   null/invalid URL fallback, load-error fallback, fixed image space,
   `object-fit: contain`, 320px layout, and 44px targets.
6. Compare Step 2 at desktop and exactly 320 CSS pixels with BRO's layout.
7. Run focused tests and `pnpm check`, then report raw and gzipped bundle sizes
   before and after. No new dependency is expected.

## Expected files

- `docs/phases/E-6d-vehicle-images.md`
- `src/app/vehicle/VehicleRow.tsx`
- `src/styles/widget.css`
- `src/styles/vehicle.css`
- `src/embed.ts`
- `tests/choose-vehicle.test.tsx`
- `tests/lint-limits.test.ts`
- `EMBED-TRACKER.md`

## Delivery

Do not commit or push. End with one paste-ready Windows PowerShell Git block,
one command per line and no backslash continuations, in this order:

1. `git switch -c phase/E-6d`
2. `git add` with the exact changed files
3. `git commit`
4. `git status --short`
5. `git push -u origin phase/E-6d` on its own final line

Then stop.
