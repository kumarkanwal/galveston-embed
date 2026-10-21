# E-7b — Peak / blackout display

## Approved request

This phase is taxi-only. ED-003 remains in force: do not call any
`/v1/public/shuttle/*` endpoint. Shuttle work belongs to E-9.

Branch `phase/E-7b` from an updated `main`. Backend B-35 is merged into backend
`origin/main` and includes commit `bf683b5`. Refresh `openapi.json` and
`API_CONTRACT.md` from the exact backend `origin/main` commit, record that full
commit in both `SOURCE.md` files, regenerate the API types, and verify both
copied source files byte-for-byte.

1. Price breakdown shows the server line `Peak Hours Increase` with kind
   `surcharge` and its server-returned amount. Do no client-side money math;
   preserve server line labels, amounts, and order.
2. A vehicle returned as unavailable because of a blackout is greyed out,
   displays `Not available at this time`, and cannot be selected.
3. A taxi booking error with code `VEHICLE_UNAVAILABLE` shows a clear message
   and returns the customer to choose another time or vehicle instead of
   showing a generic booking error.

Plan first: report what already works with file-and-line evidence and what
needs changing, then stop for approval. If all requested behavior already
works, make no production-code changes; only this phase spec is committed.

After approval, run focused tests, typecheck, lint, and one production build.
Commit the approved work, then report `git log -3 --oneline`,
`git status --short`, and the push command. Do not push.
