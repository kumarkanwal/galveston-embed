# E-29 — Widget flaky-test hotfix

**Scope:** Tests only. Product behavior and product code remain unchanged.

## Problem

Full-suite runs intermittently timed out in the airport marker/location tests even
though those files passed alone. The native-picker fallback focus assertion also
failed intermittently when another test changed the shared document focus.

Vitest intentionally runs files serially in one non-isolated module registry.
The affected tests left mounted Preact trees and document state behind, relied on
updates outside `act()`, and installed module mocks whose result depended on which
airport test imported the module first.

## Requirements

1. Await observable state rather than using fixed sleeps.
2. Unmount every Preact tree and clear test-owned document state after each test.
3. Keep airport mocks local to each test and restore them through Vitest cleanup.
4. Put Preact-driven events and state changes inside `act()`.
5. Run the native-picker fallback focus assertion in an isolated document.
6. Change product code only if investigation proves a product defect.

## Commits

1. `test(widget): stabilise airport-marker tests`
2. `test(widget): isolate focus in native-picker test`
3. `test(widget): isolate airport-location mocks`
4. `docs: E-29`

The third test commit is a gate-discovered follow-up. After the first two commits,
the second full-suite attempt exposed four timeouts in
`tests/airport-location.test.ts`. That file's hoisted loader mock was ineffective
when an earlier airport test had already cached the real module under
`isolate: false`. Per-test spies on the existing loader exports remove that
import-order dependency.

## Verification — 10 November 2026

- Airport focused tests: 25/25 passed.
- Native-picker focused tests: 12/12 passed.
- Typecheck and touched-file lint passed for every test commit.
- Final full lint passed.
- Full suite pass 1: 40 files, 421/421 tests passed in 20.07 s.
- Full suite pass 2: 40 files, 421/421 tests passed in 19.38 s.
- Full suite pass 3: 40 files, 421/421 tests passed in 19.35 s.
- No Vitest reruns were used in the final three-pass sequence.
- The single production build passed. `dist/embed.js` is 159,155 bytes raw and
  44,433 bytes gzipped; SHA-256 is
  `250f7ae003abb2f638bbbac483faeec0b0ce734f613b902709de21745e7bc3a3`.
- `test:dist` passed 1/1.

No dependency, product-code change, API change, backend gap, architecture
decision, visual change, or BRO difference was introduced. Browser verification
is not applicable to this tests-only hotfix.
