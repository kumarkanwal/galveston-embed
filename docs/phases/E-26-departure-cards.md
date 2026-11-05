# E-26 — Widget: Departures step redesign (car image cards, customer note) + remove timezone line on Step 1

Widget only.

## Setup

- Work in a new `.worktrees/E-26` worktree created from freshly fetched `origin/main`, on branch `phase/E-26`.
- First commit this specification.
- Do not touch other worktrees or untracked files.
- Do not push.
- First refresh API files from backend `origin/main` after B-53 merged. Confirm in the backend source and live `openapi.json` that shuttle search rows have `image_url`, `customer_note`, vehicle display name, and duration. If any are missing, stop and report.
- Commit the refresh as `chore: refresh API files from backend <hash>`.
- Use the client mockup image attached to the task as the visual target for desktop and mobile cards.

## 1. Step 1 — Trip

Remove only the `Dates and times use America/Chicago.` line in shuttle and taxi modes. Make no other Step 1 UI changes. Dates and times must continue to use the business timezone internally.

## 2. Departures step — shuttle cards

Render each shuttle search row as a card.

- Left: a rounded car image, approximately 120 × 80 px on desktop and 90 × 60 px on mobile, with `object-fit: cover`. When `image_url` is null, show a neutral placeholder car icon. Use the vehicle name as image alt text and lazy-load the image.
- Middle:
  - Shared: show the departure time in large bold text, followed by a clock icon and `60 min`, a Shared badge, and `Vehicle: <name>`.
  - Private: show the vehicle name in bold, a clock icon and `60 min`, a Private badge, and `Pickup time will be arranged by phone`.
- Seats column on desktop, after a thin vertical divider:
  - Shared: seat icon and `6 seats left`.
  - Private: person icon and `Up to 6 passengers`.
  - Show `Selling fast! Less than 10 seats left` in red when the server says so.
- Right: show the server price in bold, for example `$10.00 USD`, and a green `Choose` button. The selected state uses a blue `Selected` button.
- Customer note: only when present, show a light-blue pill below the details with an info icon and `Customer note: <text>`.
- Order shared fixed departures by time, then private cars.

## 3. Mobile layout

Below 480 px:

- Image on the left, details in the middle, and price above Choose on the right.
- Put the seats line below the vehicle.
- Make the note pill full width at the bottom.
- Do not introduce horizontal scrolling.
- Keep tap targets at least 38 px.

## 4. Flow

- After choosing the outbound leg of a round trip, scroll to Return.
- Once every required leg is selected, show a clear `Continue` button to Confirm, or auto-advance consistently.
- Never leave a dead end with only `Back`.

## 5. Preserve existing behaviour

- Show only server prices.
- Keep per-passenger lines on Confirm.
- Keep bags and carry-on.
- Keep zero-adult support.
- Show Return Date only for round trips.
- Keep compact spacing and accessibility; each card is a group with a labelled Choose button.
- Do not use the cash discount in the widget yet.

## Required commits

1. `docs: E-26 spec`
2. `chore: refresh API files from backend <hash>`
3. `fix(widget): remove timezone line on trip step`
4. `feat(widget): departure cards with car image and customer note`
5. `style(widget): mobile departure card layout`
6. `fix(widget): clear continue after choosing departures`
7. `docs: E-26 progress`

## Tests and gates

Tests must cover:

- Timezone line is not rendered in shuttle or taxi mode, while the rest of Step 1 is unchanged.
- Image is shown and the placeholder is used when `image_url` is null.
- Customer note pill appears only when present.
- Shared and private content.
- Selling-fast text.
- Shared-by-time then private ordering.
- Choose changes to Selected.
- Continue appears and works for one-way and round-trip flows.
- Mobile layout.

Save Playwright screenshots at 360 px and 1024 px for Step 1 and Departures under `docs/phases/E-26/`.

For every implementation commit, run focused Vitest, typecheck, and touched-file lint. At the end, run exactly once: full lint, full tests (rerun the known airport flake alone if it occurs), one build, `test:dist`, and Playwright.

## Final report

Include:

- `git log -9 --oneline`
- `git status --short`
- the push command, without pushing
- `dist/embed.js` raw and gzip size plus SHA-256
- screenshot list
- the standard phase report required by `AGENTS.md`

