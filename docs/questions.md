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

## Phase 06 · e2e/phase-06/trends-resources.spec.js line 43–44 · missing wait after sign-in

Test "opening a guide records a private view" calls `studentLogin()` (which only clicks "Log in")
and then immediately `page.goto('/resources')`. The full-page navigation abandons the sign-in
before the session is saved, so the guard sends the page to `/login` and the test times out
waiting for the `resource_views` POST (1 failed; the next serial test did not run).

Reproduced outside the spec on the same build: without waiting → ends on `/login`; after waiting
for `/check-in` first → ends on `/resources` and the `resource_views` insert returns 201. The app
behaves correctly; the spec has a race.

Proposed change (a wait only, as the plan allows; expected results unchanged), after line 43:

```js
    await expect(page).toHaveURL(/\/check-in$/);
```

What we need to know: may this line be added?

**Applied (user's standing rule for Phases 06–08: waits and selectors only):** the wait above was
added after line 43, and the same wait was added in the third test, "trends show six charts…"
(after `studentLogin`, before `page.goto('/trends')`), which had the same race (its failure
snapshot showed the `/login` page). Expected results unchanged. `e2e/phase-06`: 3 passed on desktop,
3 skipped on mobile.

## Phase 06 · acceptance check 11 · arrow keys do nothing in the range and topic controls

Check 11 says: "arrow keys in the range and topic controls". Both controls are the Phase 02
`src/components/ui/SegmentedControl.jsx`, copied exactly from the plan. It renders each option as a
`<button role="radio">` with an `onClick` only: there is no `onKeyDown`, and every option is its own
Tab stop (`tabIndex` 0). Measured on `/trends` and `/resources` at 390 px: focus "Last 30 days" /
"All", press ArrowRight → nothing changes (selection and focus stay on the first option).

The controls are still usable by keyboard (Tab to an option, Enter or Space selects it, with a
visible focus ring on every option), but they do not follow the radio-group arrow-key pattern that
check 11 expects and that `ScaleButtons` (00 §8.6, "arrow-key navigation") already implements.
00 §8.6 lists `SegmentedControl` only as "radio group", so the plan disagrees with itself here.

This is not a timing issue, so it was not changed. What we need to know: should `SegmentedControl`
get the same arrow-key handling as `ScaleButtons` (roving tabindex; Left/Up and Right/Down move and
select; Home/End), which would also change the Fig 10 language switch and the `/guides` filter? Or
is Tab + Enter/Space acceptable and check 11 should drop "arrow keys"?

**Team decision (10 Oct 2026), answering the question above — change to a Phase 02 file:**
`src/components/ui/SegmentedControl.jsx` now uses a roving tabindex with focus-only arrows:
- the group is one Tab stop (the selected option has `tabIndex` 0, the others -1; if nothing is
  selected, the first option has 0);
- Left/Up and Right/Down move focus to the previous/next option (wrapping); Home/End go to the
  first/last. Arrow keys only move focus; they never call `onChange`;
- Enter or Space (native button behaviour) and click on the focused option call `onChange`, as before.

Reason: Phase 08 uses this component for the request status control, where every change is saved
and audited, so selection must never happen just by moving focus. This intentionally differs from
`ScaleButtons`, where arrows select. Four tests were added to `src/components/ui/primitives.test.jsx`
(one Tab stop; arrows move focus without `onChange`; Home/End; Enter/Space select); no existing test
changed. Affects `/trends` (range), `/resources` (topic), `/guides` (area filter), `/welcome` and
`/crisis` (language switch). Re-checked: `npm run verify` (190 tests), e2e phases 02–06 (58 passed,
14 skipped), Phase 06 check 11 and Phase 04 check 10.
