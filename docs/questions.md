# Open questions for the team

Write one question per heading. Include the phase, the file, and what you would need to know.

## Phase 04 · e2e/phase-04/assent.spec.js line 8–11 · the `test.skip` line fails lint and crashes Playwright

The spec is copied exactly from the plan:

```js
test.skip(
  ({ browserName }, testInfo) => testInfo.project.name !== 'desktop',
  'changes seed data; runs once',
);
```

Two problems with the pinned versions (eslint 10.12.0, @playwright/test 1.64.0):

1. `npm run verify` fails at lint: `9:6 error 'browserName' is defined but never used (no-unused-vars)`.
   `eslint.config.js` lints `e2e/**` with the recommended rules.
2. Playwright passes only fixtures to a file-level `test.skip(callback)`, not `testInfo`, so every test
   in the file fails with `TypeError: Cannot read properties of undefined (reading 'project')`
   (2 failed, 8 not run) before any app code runs.

The plan allows changing only selectors or waits in a spec, so this was not changed. Proposed one-line fix
that keeps the intent (run once, on the desktop project only) and passes lint:

```js
test.skip(({ isMobile }) => isMobile, 'changes seed data; runs once');
```

(`isMobile` is a built-in fixture: false for `Desktop Chrome`, true for `Pixel 7`.) What we need to know:
may this line be replaced?

## Phase 04 · acceptance check 3 · placeholder count includes the test file

`docs/placeholders.md` lists 32 `TEAM:CEB` and 32 `TEAM:TL` entries from `src/copy/ceb.js` and
`src/copy/tl.js`, as expected, plus 4 more from `src/features/assent/assent.test.jsx` (literal
placeholder strings in assertions), because `check-placeholders.js` scans all of `src/`. Totals are
therefore 33 CEB and 35 TL. Is check 3 meant to count only `ceb.js` and `tl.js`?

**Resolved (both questions above):** fixed by `05-checkin-crisis.md` Step 0 (replaces
`e2e/phase-04/assent.spec.js`) and Step 0b (`scripts/check-placeholders.js` skips test files),
applied early on the Phase 04 branch.
