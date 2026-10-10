# Workflow — how each phase is built, checked and approved

One phase at a time. A phase is **approved** only when it works, matches BRO, and its review record is filled in. Nothing starts on the next phase before that.

## Who does what

| Person | Role |
|---|---|
| **Developer** (builds the widget) | Gives Codex the phase spec, runs the checks, does the side-by-side comparison with BRO |
| **Project owner** | Provides BRO screenshots and access, approves each phase, updates the main project tracker |
| **Lead reviewer** (Claude) | Writes each phase spec, reviews Codex's report and the comparison, writes the fix list |
| **Codex** | Writes the code for one phase, runs tests for files it touched, reports, stops |

## The cycle for every phase

### 1. Spec ready

The phase spec is in `docs/phases/E-<n>-<name>.md`. **Specs are written one at a time**, after the previous phase is approved, because each depends on what the last phase and the backend actually turned out to be. Never build from a spec that is not in `docs/phases/`.

### 2. Branch

```
git checkout main
git pull
git checkout -b phase/E-<n>
```

One branch per phase. Never build on `main` directly.

### 3. Build

Tell Codex:

> Read `AGENTS.md`, then build `docs/phases/E-<n>-<name>.md`. Follow the report format in `AGENTS.md` section 7. Then stop.

Do not give Codex extra instructions that are not in the spec. If something is missing from the spec, ask the lead reviewer and the spec gets updated.

### 4. Check it yourself

Do not trust the report alone. Agents have reported work they did not do.

1. `git status` — clean, everything committed on the phase branch.
2. `pnpm check` — must pass.
3. `pnpm dev` — open the dev harness and click through everything the phase built.
4. Check `dist/` contains only `embed.js` (and its sourcemap).

### 5. Side-by-side with BRO

Open BRO's live form and our dev harness next to each other. **Enter exactly the same inputs in both.** For each screen the phase built:

- Same fields, same order, same options in each dropdown
- Same behaviour: what is required, what happens on Back, what errors appear
- Same states: Priced / Request a Quote / Unavailable on the same vehicles
- **Prices match to the cent** — *only meaningful when our backend holds the same rates as BRO for that vehicle and service.* The demo seed uses our own rates, so a price difference there is expected. The 14 PAX Mercedes Sprinter one-way/airport trip ($413.75) is the known reference once its real rates are entered.
- Mobile width as well as desktop

Take a screenshot of each pair. Save them in `docs/reviews/E-<n>/`.

### 6. Fill in the review record

Copy `docs/reviews/TEMPLATE.md` to `docs/reviews/E-<n>.md` and fill it in: checks run, every difference from BRO, and whether each difference is **intended** (a decision in `docs/decisions.md`) or a **bug**.

### 7. Send for review

Send the lead reviewer: Codex's report, the review record, and the screenshot pairs. The reply is either **approved** or a **numbered fix list**.

### 8. Fix

Give Codex the fix list exactly as written. Repeat steps 4–7 until approved.

### 9. Approve and merge

1. `EMBED-TRACKER.md`: phase status ✅, changelog line, any new decision recorded.
2. Merge `phase/E-<n>` into `main` (pull request on GitHub). Never force-push.
3. Tag: `git tag E-<n>-approved` and push the tag.

Then the next phase spec is written.

## When the API is missing something

If the widget needs data the API does not give, **stop and report it as a backend gap**. It goes into the main project tracker as a backend item. The widget waits, or uses a temporary constant **only** if the phase spec allows it, marked `// TEMPORARY until B-<n>`.

## When to refresh the API files

Only when the project owner gives a new backend commit hash, after that backend change is pushed. Copy `openapi.json` → `src/api/`, `API_CONTRACT.md` → `docs/api/`, update both `SOURCE.md` files, run `pnpm gen:api`, and commit on its own: `chore: refresh API files from backend <hash>`.
