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

## Phase 07 · e2e/phase-07/request.spec.js · wait added after sign-in (standing rule)

Test "a failed send keeps the note and says nothing was sent (Fig 17)" had the same race as Phase 06:
`studentLogin()` then an immediate `page.goto('/request')`; the failure snapshot showed the `/login`
page ("Welcome back"). Added `await expect(page).toHaveURL(/\/check-in$/);` after `studentLogin()`.
Expected results unchanged. `e2e/phase-07`: 3 passed on desktop, 3 skipped on mobile.

## Phase 07 · RequestPage.jsx · observation, no change made: button focus order on mobile

The form's buttons are in DOM order "Cancel", "Send request" inside
`flex flex-col-reverse … sm:flex-row`. On desktop they show left-to-right in DOM order, so Tab
order matches. Below 640 px, `flex-col-reverse` shows "Send request" above "Cancel", but Tab still
reaches "Cancel" first, so the focus order does not match the visual order on phones (WCAG 2.4.3).
Acceptance check 12 (select → note → checkbox → buttons) still passes, so nothing was changed.
Question for the team: should the DOM order be "Send request", "Cancel" with a desktop-only
`sm:flex-row-reverse`, or is the current order intended?

## Phase 07 · note: specs depend on a fresh seed (full-suite runs)

Run the plan's way (`db reset` + `dev-enrol-totp.js`, then `npm run test:e2e -- e2e/phase-07`),
Phase 07 passes 3/3. In a single run of the whole suite (02–07), the Phase 05/06 specs first add
check-ins for `student.full`, so Phase 07's "with no check-in yet…" correctly sees a latest check-in
and fails; the other two Phase 07 tests then do not run (serial). Not an app or timing issue; no
change made. For regression runs, reset before each phase's specs (or run phase by phase).

## Phase 08 · live crisis alert never reaches guidance after the second factor (app bug, not a race)

`e2e/phase-08/guidance.spec.js` › "a crisis tick reaches an open dashboard at once…" fails: the
student's crisis event is saved (201, "The guidance office has been told."), but the guidance page
never shows "A new crisis event was raised." (also with the Realtime container healthy first).

Diagnosis (measured):
- Database side is correct: `crisis_events` is in `supabase_realtime`; policy
  `crisis_events_select_guidance` uses `is_guidance()` (requires aal2). A Node probe signed in as
  guidance at aal2, with that token given to Realtime, received the INSERT in 421 ms.
- The browser joins `realtime:guidance-crisis-events` with an **aal1** token (captured `phx_join`
  frame, decoded: `aal=aal1`) although the page is already on `/staff/queue` after
  `/staff/verify`. RLS then filters every event, so nothing arrives. The join itself replies "ok".
- Cause: supabase-js 2.117.3 (`SupabaseClient._handleTokenChanged`) passes a new token to Realtime
  only on `SIGNED_IN`, `TOKEN_REFRESHED`, or `INITIAL_SESSION`. `mfa.challengeAndVerify` emits
  `MFA_CHALLENGE_VERIFIED`, which it ignores. `completeStaffSignIn` reloads the account but does
  not refresh the Supabase session, so Realtime keeps the aal1 token from the password step until
  a page reload or the hourly token refresh. (Plan 02 §3.7 says "session refreshed" on success.)
- Effect today: after signing in, the alert and the live Crisis count do not update until the
  60-second poll (count only) or a reload. 2.1.6.1.6 / P08-D14 ("at once") is not met.

Two possible fixes (not applied; app code, not a spec wait):
1. `src/features/auth/StaffVerifyPage.jsx` and `StaffSetupPage.jsx`: after a successful
   `challengeAndVerify`, `await supabase.auth.refreshSession()` before `completeStaffSignIn()`.
   This emits `TOKEN_REFRESHED`, so supabase-js gives Realtime the aal2 token. Matches 02 §3.7
   "session refreshed". (Phase 02 files.)
2. `src/features/guidance/crisisFeed.js`: before `.subscribe()`, read the current session and call
   `supabase.realtime.setAuth(session.access_token)`. Local to Phase 08, but other future Realtime
   users would need the same.
What we need to know: which fix (1 recommended), and may it be applied?

**Team decision (10 Oct 2026), answering the question above — change to a Phase 02 file (option 1,
in one place):** `src/features/auth/completeStaffSignIn.js` now calls
`await supabase.auth.refreshSession()` after `setLastActivity` and `timeoutFlag.clear()`, before
`refresh()` and `navigate()`. Reason: supabase-js 2.117.3 does not pass the aal2 token to Realtime
after MFA verify (`MFA_CHALLENGE_VERIFIED` is not handled), so the guidance crisis subscription
joined at aal1 and RLS filtered every event. Refreshing emits `TOKEN_REFRESHED`, which updates
Realtime. If the refresh returns an error (or throws), sign-in continues anyway: the second factor
already succeeded and the 60-second poll still covers the crisis count. Both `/staff/verify` and
`/staff/setup` use this function; `StaffVerifyPage.jsx` and `StaffSetupPage.jsx` are unchanged.
New test `src/features/auth/completeStaffSignIn.test.js` (3 tests: refresh happens before
navigating; an error result still navigates; a thrown error still navigates). No existing test changed.

## Polish before defense

1. **Phase 07 · `RequestPage.jsx` button order on phones** (see the Phase 07 observation above):
   below 640 px "Send request" shows above "Cancel" but Tab reaches "Cancel" first (WCAG 2.4.3).
   Team decision: leave as is for now; fix before the defense. **Done in UI polish item 3.**

## Phase 09 · local `SITE_URL` for the invitation e2e (environment only, no code change)

`e2e/phase-09/admin.spec.js` › "accounts: lists staff and invites a new guidance account" failed
only because the invitation link redirected to `http://localhost:5173/staff/setup` (the
`admin-accounts` default `SITE_URL`), while Playwright serves the app on `http://localhost:4173`:
`page.goto: net::ERR_CONNECTION_REFUSED … redirect_to=http://localhost:5173/staff/setup`.
As agreed in advance, `SITE_URL=http://localhost:4173` was added to `supabase/functions/.env`
(git-ignored, local only) and the functions server restarted. No code or spec change.
Note: with this line, invitations sent while using `npm run dev` (port 5173) will point at 4173;
remove or change the line for manual testing on the dev server. Hosted: 09 Step 12 sets
`SITE_URL` to the production domain.

## Phase 09 · e2e/phase-09/admin.spec.js · selector fixed (standing rule)

Test "resources: a published resource appears on the public guides page" failed with a Playwright
strict-mode violation: on `/guides`, `getByText('E2E published guide')` matched both the card's
`<h3>` and the screen-reader text inside its "Read guide … (opens in a new tab)" link. The app was
correct (the published guide was on the page). Selector changed to
`p.getByRole('heading', { name: 'E2E published guide' })`; the test still expects it to be visible.
`e2e/phase-09`: 6 passed on desktop, 6 skipped on mobile.

## Phase 09 (found while checking) · staff sign-in navigates home twice; a fast click elsewhere is undone

Measured in Chromium on a production build (`nav-trace`, admin.one): after "Verify",
`/admin/accounts` at 1395 ms → user clicks "Consent" → `/admin/consent` at 1483 ms →
**`/admin/accounts` again at 1624 ms**, and the user stays there. No full page reload happens; both
are client-side navigations. Same pattern for guidance (`/staff/queue`).

Cause: two things send the staff member home after the second factor:
1. `RequireStaffSession` on `/staff/verify` (and `/staff/setup`) renders
   `<Navigate to={homePathFor(...)} />` as soon as `AuthProvider` sees aal2 (from the
   `MFA_CHALLENGE_VERIFIED` / `TOKEN_REFRESHED` events), and
2. `completeStaffSignIn()` then finishes `refreshSession()` + `refresh()` and calls
   `navigate(home, { replace: true })` regardless of where the user is now.
In the Phase 02 code both fired at almost the same moment, so the gap was tiny; the Phase 08
`refreshSession()` (team decision above) widened it to about 0.2 s. No Phase 02–09 spec clicks
that fast, so all specs pass; it would surprise a quick user and it blocks a scripted check run.

Proposed fix (not applied; change to `src/features/auth/completeStaffSignIn.js` only, the same file
as the Phase 08 decision): navigate only if the browser is still on the sign-in step, e.g.
`if (['/staff/verify', '/staff/setup'].includes(window.location.pathname)) navigate(...)`,
plus one unit test that it does not navigate when the path has already changed. The aal2 refresh
for Realtime stays as it is. What we need to know: may this be applied?

**Team decision (10 Oct 2026), answering the question above — `completeStaffSignIn.js` only:**
navigate home only while the browser is still on the sign-in step (`/staff/verify` or
`/staff/setup`). `setLastActivity`, `timeoutFlag.clear()` and `refreshSession()` stay where they were.
Implementation note: the function records `window.location.pathname` when it starts and navigates
only if the path is unchanged after `refresh()`. Both callers are the `/staff/verify` and
`/staff/setup` pages, so in the app this is exactly "still on /staff/verify or /staff/setup". A
literal `['/staff/verify', '/staff/setup'].includes(window.location.pathname)` check was tried
first and broke four tests, including the plan's own `StaffVerifyPage.test.jsx` ("on success … goes
to the queue"): those tests render with `MemoryRouter`, where `window.location` stays at `/`. The
unchanged-path check keeps every existing test expectation as it was. New unit test in
`completeStaffSignIn.test.js`: from each sign-in step it navigates when the path is unchanged and
does not navigate when the path changed before it finished (291 tests).

## UI polish

Branch `ui-polish` (from `main`). One commit per item; each checked with `npm run verify`, the
affected phase's e2e (after `db reset` + `dev-enrol-totp`), and screenshots at 390, 768 and 1280 px
(kept outside the repository, in `C:\Users\Modern15\hingaweb2-screenshots\ui-polish\`).

1. **ScaleButtons — 5 columns at every width.** `src/components/ui/ScaleButtons.jsx`: grid is
   `grid-cols-5` at all widths (was one column below 640 px); answers may wrap to two lines
   (`leading-tight`, `py-1`); 13 px text and `px-1` below 640 px, 14 px and `px-2` from 640 px; min
   height still 44 px; radio-group keyboard behaviour unchanged. At 390 px each answer is 58×44 px.
   **Limitation:** "Somewhat" is 65–67 px wide at the 13 px minimum (00 §8.2), wider than a column
   at 390 px, so it cannot stay on one line. `hyphens-auto` breaks it as "Some-/what" where the
   browser has English hyphenation (Chrome on Android, Safari iOS, Firefox, Chrome on macOS);
   elsewhere `overflow-wrap:anywhere` breaks it without a hyphen ("Somew/hat", seen in the headless
   test browser). Nothing is clipped. Team may prefer to reword the scale label at co-design.
2. **AppHeader — full nav from lg (1024 px).** `src/components/layout/AppHeader.jsx`: the nav, the
   right-hand extras, the "Menu" button and its sheet now switch at `lg` instead of `md` (page padding
   `md:px-6` unchanged). Measured header height (one row = 61 px): public, student, guidance and admin
   are 61 px at 390, 768, 1024 and 1280 px, except admin at 1024 px (below). Before: admin 114 px and
   student 66 px at 768 px (wrapped). e2e phase-02 28/28, phase-03 16/16.
   **Found, not changed (pre-existing, needs a decision):** between 1024 px and about 1150 px the
   admin header (chip "ADMIN CONSOLE" + five nav items + display name) does not fit, and nav labels
   break mid-word ("Accoun/ts", "Conse/nt"); it fits from about 1180 px. This was already so before
   item 2 (the full nav showed from 768 px). Options: hide the "ADMIN CONSOLE" chip below `xl`, or
   keep the admin "Menu" sheet below `xl`. Screenshots: `02-header/admin-header-crop-1024.png`,
   `-1100.png`, `-1180.png`.
   **Unit test timeout (separate commit):** `src/features/auth/RegisterPage.test.jsx` › "signs up
   with exactly the student metadata…" types ~80 characters key by key and takes ~3.5 s here; under
   load it hit Vitest's 5 s default and failed 2 of ~10 runs ("Test timed out in 5000ms"). Given a
   15 s per-test timeout; its steps and assertions are unchanged. Not caused by the UI items (jsdom
   ignores CSS breakpoints; RegisterPage does not use ScaleButtons).
3. **Button rows: DOM order = screen order.** Every `flex-col-reverse` button row (11 rows in 7 files)
   now lists the primary button first in the DOM and uses `flex flex-col … sm:flex-row …`:
   `src/features/admin/AccountsPage.jsx` (3: change role, deactivate/reactivate, create staff account),
   `src/features/admin/ConsentPage.jsx` (2: record consent, record withdrawal),
   `src/features/admin/ReferencePage.jsx` (2: add agreed item, retire item),
   `src/features/admin/ResourceEditPage.jsx` (1: delete resource),
   `src/features/assent/AssentPage.jsx` (Continue / Not now),
   `src/features/checkin/CheckInPage.jsx` (Save check-in / Cancel and return),
   `src/features/requests/RequestPage.jsx` (Send request / Cancel). Buttons, props and copy unchanged.
   At 390 px the look is unchanged (primary on top). **Desktop change:** from 640 px the primary
   button is now first (left) instead of last, because a DOM order can only match one visual order;
   keeping the old desktop look with `sm:flex-row-reverse` would just move the Tab mismatch to
   desktop. Measured: Tab order matches screen order at 390 and 1280 px on `/welcome`, `/check-in`,
   `/request`, the create-staff and deactivate dialogs. e2e 04, 05, 07, 09 pass. This resolves the
   Phase 07 "polish before defense" item.
4. **HotlineList `variant`.** `src/features/public/HotlineList.jsx` takes `variant` (`'primary'`
   default, `'outline'`; any other value falls back to primary) for the "Call …" buttons. `outline`
   is used only in `src/features/public/NeedHelpCard.jsx` (landing page) and
   `src/features/public/HelpPage.jsx`. `RequestPage.jsx` and `RequestSentPage.jsx` keep the default
   primary style; the crisis screen does not use `HotlineList` (its own rows are unchanged). Existing
   `outline` button tokens only (surface background, ink border and text). e2e 03 16/16, 07 3/3.
5. **ResourceCard — "Free access" removed.** `src/features/public/ResourceCard.jsx`: the "Free access"
   line is gone; the card footer keeps the "Read guide" link on the right (`justify-end`). Copy key
   `public.guides.freeAccess` removed from `src/copy/en/public.js` (it was used nowhere else). No unit
   test or e2e spec checked that text, so no test changed. Affects `/`, `/guides`, `/resources`.
   e2e 03 16/16, 06 3/3.
6. **PortalLayout — one "STAFF PORTAL".** `src/components/layout/PortalLayout.jsx`: the duplicate
   label beside the logo (shown from 640 px) is removed; the pill with the lock icon stays (copy key
   `staff.portal.label` still used there). Applies to `/staff/login`, `/staff/verify`, `/staff/setup`.
   No test referenced the label. e2e 02 28/28.
7. **Table — each row its own card below md.** `src/components/ui/Table.jsx`: below 768 px the outer
   box has no border/background, `<tbody>` is a column with a 12 px gap, and each row is a card
   (`bg-surface`, `rounded-card`, `border-line`, `px-4 py-3`). From `md` it is the previous table
   (one bordered card, rows separated by lines, header row shown). Used by the queue, crisis channel
   (resolved list), trends table, and the accounts, consent, reference, resource library and audit
   screens. Measured at 390 px: tables are still exposed as tables with rows and cells
   (`getByRole('table', { name })`), axe 0 violations on the queue, accounts, consent and reference
   screens. e2e 06 3/3, 08 6/6, 09 6/6.
   **Spec timing fix (separate commit, standing rule):** `e2e/phase-09/admin.spec.js` › "reference
   data: … a retired one disappears" failed once: after "Add item", the page already shows "Saved.",
   so the wait for "Saved." after "Retire item" could pass before the retire was stored, and the
   student page reloaded too early. Added a wait for the item's "Retire" button to disappear before
   the reload. Expected results unchanged. Pre-existing race, not caused by the table change.
8. **Queue Notes markers as chips.** `src/features/guidance/QueuePage.jsx`: each Notes marker ("Has
   another open request", "Follow-up overdue", "No first contact in 3 school days") is a default
   (blush) `Chip` instead of bold text, in a wrapping row (right-aligned on phone cards, left in the
   desktop table). Long markers wrap to two lines inside the chip in the desktop column (kept, so the
   other columns are not squeezed). Same text, so `queue.test.jsx` is unchanged. e2e 08 6/6.
9. **Check-in Save bar sticky on phones.** `src/features/checkin/CheckInPage.jsx`: below 768 px the
   "Answer questions 1 to 6 to save. The note is optional." line (while incomplete) and the Save /
   Cancel row sit in one bar with `sticky bottom-0`, `bg-surface`, a top `border-line`, full screen
   width (`-mx-4`). From 768 px it is the previous static row. `position: sticky` (not fixed) keeps
   the bar's own place after the last card, so at the end of the page it never covers a field
   (measured at 390 px: bar top 486, safety box bottom 462). `src/index.css`: below 768 px, while the
   bar is on the page, `html { scroll-padding-bottom: 11rem }`, so a control focused with Tab is
   scrolled clear of the bar. Without it, Tab put two answer buttons and three crisis-item
   checkboxes completely behind the bar; with it, none (13 stops checked). No new colours.
   **Note for review:** on a 390×844 phone the bar is 165 px tall with the hint and 129 px without
   (Save stacked above Cancel). If that feels heavy, Save and Cancel could share one row in the bar.
   e2e 05 6/6. Screenshot `09-sticky-save/student-check-in-390-scrolled-viewport.png` shows it
   mid-scroll.
10. **Landing hero waves.** `src/features/public/LandingPage.jsx`: one inline SVG (three calm wave
    lines, like the logo) at the end of the hero text column, `aria-hidden="true"`,
    `focusable="false"`, no text, no image file. Strokes use tokens only:
    `var(--color-blush-strong)`, `var(--color-line)`, `var(--color-ink)`. Width up to 420 px, scales
    down on phones. Landing stays in the main bundle; check:bundle OK (+~0.5 KB). e2e 03 16/16 (axe on
    `/` included).
