# E-33 progress — departures and confirmation polish

Completion date: 2026-11-21.

E-33 is complete on branch `hotfix/E-33` and has not been pushed. It consumes
the committed local B-69 OpenAPI contract at `153d75b`.

## Commits

- `66628ad` `chore(api): sync B-69 contract`
- `f823d02` `fix(shuttle): polish departures and confirmation`
- this commit: `docs: E-33`

## Delivered

- Departures renders private cars first in the backend/admin vehicle order, then
  shared departures by time. The same renderer and ordering apply to Return.
- Pickup-time inputs accept any valid minute and no longer publish a 15-minute
  `step` attribute.
- An empty date says exactly: “No departures available for this date. Please
  choose another date.”
- Private pricing displays the server's one flat-rate line without a per-person
  split on Confirm and the success screen.
- Success journeys use the business-timezone format
  `Sat, Nov 21, 2026 · 9:00 AM`; private date-only service displays only the
  formatted date before the separately supplied customer pickup time.
- Broken luggage glyphs were replaced with the same plain Bags/Carry-on wording
  used by Trip Summary.

## Verification

- `pnpm typecheck`: exit 0.
- `pnpm lint`: exit 0.
- Full Vitest: 40 files and 426 tests passed on the final run.
- `pnpm build`: exit 0; `dist/embed.js` is 163.01 kB raw and 45.66 kB gzip.
- `git diff --check`: exit 0 (Git reported only the generated schema's normal
  future LF-to-CRLF checkout warning).

The first full-suite run timed out six unrelated airport-marker cases. That file
passed 7/7 alone and the immediate complete rerun passed 426/426, matching the
known shared-suite timing behavior recorded in earlier phases.

## Decisions and gaps

- ED-038 records any-minute pickup entry and the approved private-before-shared
  ordering. No dependency was added.
- No backend gap was found; every price and label comes from the B-69 schema.
- Live browser comparison and light/dark host-page checks are **UNVERIFIED**
  because this task explicitly prohibited computer control.

## Exact next step

Deploy B-69 first with `alembic upgrade head`, then F-62, then E-33.
