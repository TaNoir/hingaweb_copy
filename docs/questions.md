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

## Demo mode (team decision, branch `demo-mode`)

**Decision (team):** a demo mode with sample data is allowed for local demos and screenshots only.
For the demo file `src/content/demo-content.js` **only**, it overrides must-never 11 (and the
matching rule 6 in 00 Section 1): that file holds two real public hotlines (NCMH Crisis Hotline,
National Emergency Hotline 911), sample office hours, a sample room, and sample office numbers. The
sample crisis items and protocol step exist only in `scripts/demo-seed.js`, which writes to the
LOCAL database only. Everything fictional ends with "(sample)". `src/copy/ceb.js` and `tl.js` are
untouched. The `[[...]]` placeholders in `site.js` and `directory.js` are unchanged and still listed
by `check:placeholders`.

- **Switch:** `import.meta.env.VITE_DEMO_CONTENT === 'true'`. Vite replaces this with a constant, so
  with the flag off the demo module is unused and left out of the bundle. Checked: after a normal
  `vite build`, `grep -rl "(sample)" dist` and `grep -rl NCMH dist` find nothing.
- **Safety:** `check-placeholders.js --strict` (`build:pilot`) fails if `VITE_DEMO_CONTENT` is
  `"true"` in the environment or in any root `.env*` file. Checked both cases.
- **Demo seed:** `scripts/demo-seed.js` refuses unless `.env.local` `VITE_SUPABASE_URL` is
  `127.0.0.1` or `localhost` (checked with a hosted-style URL: refused). It applies through
  `docker exec … psql` (no new packages) and never touches `supabase/seed.sql` or migrations. Scores
  and bands come from `saw.js` + `scoring-config.js`. Office tag values are read from
  `src/config/vocabulary.js`, so the script itself holds no colour words. Only the check-in stamp
  trigger is turned off (for the backdated rows) and it is turned on again in the same run.
- **Note:** requests, audit rows, and crisis events are stamped by the database at seed time, so the
  queue and audit trail all show the same minute; the "No first contact in 3 school days" marker
  therefore does not appear in the demo data. Backdating them would mean turning off more stamp
  triggers, which was not asked for.
- How to use it: `docs/demo.md`.

## UI polish (students)

Branch `ui-students`. `ui-polish-2` does not exist, so items 1 to 3 were done. Every verify, e2e,
and screenshot run used `VITE_DEMO_CONTENT=false`, because `.env.local` currently turns demo mode
on (and Vitest reads `.env.local` too). Screenshots: `hingaweb2-screenshots/ui-students/`.

1. **No mid-word breaks in the answer buttons.** `ScaleButtons.jsx`: the buttons override the
   body's `overflow-wrap: anywhere` with `overflow-wrap: normal; word-break: normal` and keep
   `hyphens: auto` (`<html lang="en">`). Below `sm`: side padding 0 (was 4 px), grid gap 3 px
   (was 6 px), text 12 px (was 13 px); `CheckInPage.jsx` check-in question cards use 12 px padding
   below `sm` (was 20 px). Reducing padding, gap, and card padding alone was not enough: at 13 px
   "Somewhat" is 64.7 px wide (66.5 px when selected, semibold) and the widest a button can get at
   390 px with sensible card padding is about 62 px, so the text also drops to 12 px below `sm`.
   Measured at 390 px: button content 62 px, "Somewhat" 59.8 px (61.4 px selected): fits whole.
   At 360 px it cannot fit (56 px), so it relies on `hyphens: auto` ("Some-what"). **Note:** the
   headless Chromium used for screenshots on Windows has no hyphenation dictionary, so
   `crop-360-somewhat-selected.png` shows the word cut at the button edge instead of hyphenated;
   phone browsers (Android Chrome, iOS Safari) ship English hyphenation. Height stays 44 px. e2e 05
   6/6. One unrelated unit test (`request.test.jsx`, a 1 s `findBy`) timed out once under full-suite
   load; it passed alone 3/3 and on the next full verify, so no change was made.
2. **Only Save is sticky on phones.** `CheckInPage.jsx`: below `md` the sticky bar holds just the
   full-width "Save check-in" button (bar 73 px tall at 360 and 390 px). The "Answer questions 1 to
   6 to save. The note is optional." line sits in the normal page flow above it, and "Cancel and
   return" sits in the flow below it. The Save/Cancel wrapper is `display: contents` below `md`, so
   the bar's sticky area is still the whole page column; from `md` up the wrapper is the same single
   row as before (Save left, Cancel right). While the note textarea has focus the bar is not sticky
   (it returns to its own place after the safety box, off screen while typing), so it never sits
   above the phone keyboard. `index.css`: `scroll-padding-bottom` 11rem → 6rem to match the smaller
   bar. Checked with Tab at 360 and 390 px: no focused control ends up behind the bar. e2e 05 6/6.
3. **Primary button first: audit only, nothing to fix.** Checked every file with more than one
   button. Each action row and dialog footer already has the primary button first in the DOM, so it
   is on the left from `sm` up and on top on phones: AccountsPage (3 dialogs), ConsentPage (2),
   ReferencePage (2), ResourceEditPage (page row and delete dialog), AssentPage,
   WaitingForConsentPage, CheckInPage (save row, saved card), PromptDialog, RequestPage,
   RequestSentPage, ResourcesPage (no check-in yet), OfficeTagPage, CrisisChannelPage,
   RequestDetailPage (follow-up row), StaffVerifyPage, LandingPage hero. Rows with only outline
   buttons (RequestDetailPage tag/directory links) or one button have no primary to move. Not
   changed, **for review:** the public header and its phone menu show "Log in" (outline) before
   "Create account" (primary). That is navigation, not a form action, and the usual order for
   sign-in/sign-up; swapping it would change every public page. No code change, so no screenshots
   or e2e for this item.
4. **Focus and scroll on page change.** New `src/components/layout/RouteFocus.jsx`, mounted once in
   `App.jsx` inside the router (not in each page). When the path changes (not on the first load, not
   when the URL has a hash such as `/#how`, never on `/crisis`), it scrolls to the top and focuses
   `main h1`, adding `tabindex="-1"` and `data-route-focus` if needed. Lazy pages: it waits up to 5 s
   for the h1 to appear (MutationObserver). It never takes focus from a control inside the page that
   the person is already using. `index.css`: `[data-route-focus]:focus { outline: none }` (a heading,
   not a control), so mouse users see no outline; Tab after it shows the normal ring on the next
   control. Checked at 360/390/1280 px: after sign-in, after "Cancel and return", and after Enter on
   a nav link to a lazy page, focus is on the new h1 at `scrollY` 0; the landing `#how` link still
   jumps to its section. New `RouteFocus.test.jsx` (4 tests; no existing test changed). Full e2e
   02–09 passed.
5. **Tab titles.** New `src/lib/usePageTitle.js`: `document.title = "<h1 text> · HingaWeb"` (app
   name from `SITE.appName`), back to "HingaWeb" when the page closes. Each student and public screen
   passes the same copy key its h1 shows, including the alternate states (registration sent,
   reset-link sent, reset link expired / password changed, check-in saved, waiting for consent /
   consent withdrawn, assent and crisis in the chosen language). No new text. The landing page
   keeps "HingaWeb". Hooks sit before every early return. Checked in the browser: 20 screens, every
   title equals its h1 plus " · HingaWeb" (list in `05-tab-titles/titles.txt`). Staff screens are
   not part of this item and show "HingaWeb". New `usePageTitle.test.jsx` (1 test). e2e 02–07
   passed.
6. **Help link in the student header on phones.** `StudentLayout.jsx` passes a new `mobileAction`
   to `AppHeader.jsx`: a link to `/help` with a `LifeBuoy` icon (aria-hidden) and the existing
   `nav.public.needHelp` text ("Need help right now?"), blush background, ink text, 44×44 px minimum.
   It sits next to the Menu button below `lg` (the desktop nav already has "Where to get help").
   **The text does not fit at 360 px:** the header row has 328 px, the logo is 192 px and Menu 95 px.
   So below `sm` only the icon shows and the text is `sr-only` (it stays the link's accessible
   name); from `sm` to `lg` icon and text show on one line (192 px). To fit the 44 px icon at 360 px,
   the student header only, below `sm`, uses 12 px side padding (was 16) and an 8 px gap (was 16),
   and Menu's side padding is 8 px (was 12; still 87×44 px). Measured: no overflow at 360/390/768/
   1023 px, header height unchanged (61 px), visible focus ring on the link. Public, staff, and admin
   headers are unchanged. The link is outside the nav landmark, so the five nav items are unchanged.
   e2e 03, 05, 06, 07 passed.
7. **Check-in progress.** The one new copy key: `checkin.progress = '{answered} of 6 answered'`
   (`src/copy/en/checkin.js`). `CheckInPage.jsx` counts only the six questions (`CHECKIN_ITEMS`),
   never the note or the safety items, and shows no other number. Shown twice: under the lead at the
   top (plain text) and in the Save bar (`role="status"`, the one polite live region, so a screen
   reader hears each change once). In the bar the count shares the row with Save so the bar stays
   73 px (under 80 px): Save is first in the DOM, and on phones the row is reversed so the count is
   on the left and Save on the right; from `md` up Save is on the left, then the count, then Cancel
   at the far right. Checked: 0 → 2 (with a note typed, still 2) → 6. e2e 05 6/6.
8. **Question card icons.** `ScaleButtons.jsx` gets two optional props: `icon` (a lucide icon in a
   32 px blush square beside the question, aria-hidden) and `markAnswered` (a small `CircleCheck`,
   aria-hidden, ink, at the end of the question line once a value is chosen). The legend `<p>` keeps
   its id and text, so the radiogroup's name is unchanged. `CheckInPage.jsx` maps the icons:
   c1 school work `BookOpen`, c2 home and family `House`, c3 future `Compass`, c4 managing
   `HandHeart`, mood `Smile`, stress `Gauge`. Ink and blush tokens only. "Somewhat" still fits whole
   at 390 px (the icon sits beside the question text, not the buttons). e2e 05 6/6 (axe included).
9. **Unsaved check-in warning.** `CheckInPage.jsx`: while at least one question is answered or the
   note has text, and the check-in is not saved, a `beforeunload` listener calls `preventDefault()`
   (the browser's own prompt, no custom text). It is removed once saved (saving clears the draft) and
   while nothing is entered. In-app moves (React Router, including ticking a safety item to
   `/crisis` and coming back) never unload the page, so they never prompt; the draft stays in page
   memory as before (never browser storage). Checked in Chromium: reload with nothing = no prompt;
   reload with one answer = one `beforeunload` prompt; tick a safety item and come back = none;
   reload after save = none. New `unsavedWarning.test.jsx` (3 tests). Not visible in screenshots
   (the prompt is the browser's). e2e 05, 06, 07 passed.
10. **Focus the first field with an error.** New `src/lib/focusFirstError.js`: after a submit finds
    problems, on the next frame it focuses the first `[aria-invalid="true"]` in the form (set by
    `Field`) and scrolls it to the middle of the screen. Called from `/register`, `/login`,
    `/forgot-password`, and `/reset-password` when validation fails. No text changes; the existing
    error messages (role="alert") still show. **`/request`: not applicable, so nothing changed:**
    the request page has no field errors. "Send" stays disabled until a concern is chosen and the
    acknowledgement is ticked, so a submit can never find problems. Checked at 360/390/1280 px:
    empty register → "Full name", empty login and forgot-password → "School email address", each
    in view with the focus ring. New `focusFirstError.test.jsx` (3 tests). The helper calls
    `scrollIntoView` only when it exists (jsdom has none; the unchanged `RegisterPage.test.jsx`
    hit that). e2e 02 28/28.
11. **Focus after saving a check-in.** `CheckInPage.jsx` `SavedCard`: on mount, focus moves to the
    "Your check-in is saved" h1 (it already had `tabIndex={-1}`; now also `data-route-focus` so it
    shows no outline, like item 4). Works for both paths to the saved card: straight after Save and
    after "Not now" on the prompt. Checked at 360/390/1280 px: focus on the h1, in view, no outline.
    New `savedFocus.test.jsx` (2 tests). One full verify run failed with Vitest workers that could
    not start and four unrelated tests timing out (machine under load; 299 of 311 tests ran); the
    next run passed 313/313 with no change. e2e 05 6/6.

## Landing strip removed and "(sample)" dropped from demo content (user request, 2026-10-11)

- **Landing top strip removed** at the user's request: the blush line "RIZAL MEMORIAL COLLEGES
  GUIDANCE SERVICES · Senior High School Department (SHS)" and "Free · Private check-ins · No app
  to install" (`LandingPage.jsx`). Its three copy keys (`public.landing.strip`, `stripDept`,
  `stripRight`) are deleted; nothing else used them and no test referred to them. verify 313/313,
  e2e 03 16/16.
- **"(sample)" removed from the demo content values** at the user's request
  (`src/content/demo-content.js`). This changes the earlier demo-mode rule that every fictional value
  ends with "(sample)". The values are still fictional: "Sample Guidance Associate", "Sample
  Psychology Clinic", Room 101, `000` numbers, `example.org` emails. `docs/demo.md` now checks a
  clean build with `grep -rlE "NCMH|Room 101" dist` instead of "(sample)". Checked: the flag-off build
  contains neither; the demo build has no "(sample)". **Not changed:** the demo seed's crisis items and
  protocol step still end with "(sample)" (they live only in the local database); say if those
  should change too.

## Logo caption changed (user request, 2026-10-11)

The caption under "HingaWeb" (`SITE.tagline` in `src/config/site.js`) is now "Start with a breath",
written exactly as given (sentence case). This changes 00 Section 8.5 / 6.2, which specified
"SENIOR HIGH GUIDANCE" in 10px letter-spaced caps; the 10 px size and letter spacing stay. The logo
is now 158 px wide (was 192), so the student phone header still fits at 360 px. No test referred to
the old caption. verify 313/313, e2e 02 28/28, 03 16/16. The landing chip "SENIOR HIGH GUIDANCE
PLATFORM" is a separate copy key and is unchanged.

## Student log in links to the staff sign-in (user request, 2026-10-11)

`LoginPage.jsx`: under "New here? Create an account" there is now always a link to `/staff/login`,
labelled with the existing `staff.login.title` ("Guidance office sign in"), with a `KeyRound` icon
(aria-hidden), 44 px tall. Staff who use the landing page's "Log in" can switch to their own sign-in.
Logins are still separate: staff sign in at `/staff/login` with the second factor, and a staff
account entered on `/login` is still refused with the existing message (the Fig 9 tests are
unchanged). No new text. New `loginStaffLink.test.jsx` (1 test). verify 314/314, e2e 02 28/28. The
first e2e 02 run failed 18 tests at about 6 s each while the local Supabase containers were
restarting (edge runtime up 1 s, the logging container in a restart loop); the re-run passed
with no change.

## Guides layout and landing animation (branch ui-guides-layout, user request, 2026-10-11; merged into main 2026-10-11)

- **Guides page width.** `Main.jsx` gets a third width, `'library'` = `max-w-6xl` (1152 px); only
  `/guides` uses it (its own layout route in `routes.jsx`; `/help` stays 768 px). Side padding is
  unchanged (16 px on phones). The page header, the "Free to read without an account" chip, and
  the filter bar now all span the grid width: the filter bar gets `className="flex w-full"` through
  a new optional `className` prop on `SegmentedControl` (other uses unchanged). The lead paragraph
  keeps its existing `max-w-2xl` reading width (shared `PageHeader`, not changed).
- **Guide grid.** 1 column under 640 px, 2 from 640 px, 3 from 1024 px, 24 px gap. Cards in a row
  are equal height (`li` is flex, card `h-full w-full` through a new optional `className` prop on
  `ResourceCard`; "Read guide" was already `mt-auto`). Measured: 1/2/3 columns at 390/768/1280 px,
  rows equal, no horizontal scroll.
- **Wave picture replaced.** The three-wave SVG existed in one place only: the landing hero
  (`LandingPage.jsx`). Not on the crisis screen. (The logo's lucide `Waves` icon is a different,
  single-colour icon and is unchanged.) Now: `BreathAnimation.jsx` plays
  `public/animations/hinga-breath.lottie` (downloaded from lottie.host, 8.7 KB) with
  `@lottiefiles/dotlottie-react@0.20.0` (installed `--save-exact`), loop + autoplay, loaded with
  `React.lazy` (`lazyNamed`). The player's 1.2 MB WebAssembly renderer is bundled from
  `node_modules` (`?url`) and set with `setWasmUrl`, because by default the player fetches it from
  cdn.jsdelivr.net / unpkg.com. Checked: no request leaves the site.
  - In a reserved `aspect-square` box, 200 px wide, in the old picture's spot, `aria-hidden`, nothing
    focusable; the box does not change size while loading. The animation is a 512×512 square
    illustration, so it cannot match the old 420×75 strip; 200 px fits the empty space beside the help
    card on desktop.
  - Reduced motion: no autoplay, no loop; the still first frame shows (checked: two captures 1.5 s
    apart identical).
  - **CSP:** `vercel.json` `script-src` gains `'wasm-unsafe-eval'` (needed to run same-origin
    WebAssembly; it does not allow `eval()` of JavaScript or outside scripts).
  - **Colours:** the illustration uses its own palette (skin, hair, light blue, purple, greys), not
    the app's colour tokens. It is decorative, not system output; flagged for review.
  - The service worker precaches the new 168 KB player chunk (all `.js` files are precached); the
    `.wasm` and `.lottie` are not precached, so offline the box stays empty (decorative only).
- Checks: verify 314/314 (check:copy and check:colours OK), check:bundle OK (core views 255–268 KB),
  e2e 03 16/16, 06 3/3.

## Hero animation bigger and centred (branch ui-hero-animation, user request, 2026-10-11; merged into main 2026-10-11)

Branched from `ui-guides-layout`, not `main`: the Lottie animation exists only on that unmerged
branch (`main` still has the wave SVG), so merging this branch also brings in the guides layout.
`LandingPage.jsx` only:
- The hero row is `md:items-stretch`; the left column fills the row; the help card is wrapped in
  `md:self-start` so its own height is unchanged (the card component is not edited).
- The animation wrapper (`aria-hidden`, `pointer-events-none`) sits under the reassurance line,
  `flex-1` + `items-center justify-center`, so the animation is centred in the leftover space.
- Reserved box: 260×260 below 640 px, 360×360 from 640 px, 480×360 from 1024 px. The brief said
  about 400 px tall on desktop; at 400 the figure's feet ended about 120 px below the help card, so
  360 is used (feet about 80 px below the card; box bottom 106 px below). The box never moves while
  the player loads (measured).
- The player is `scale-[1.4]` inside the box (the .lottie has empty space around the figure); the
  figure stays inside the box. The wrapper is `overflow-x-clip` (only the transparent canvas edges)
  so the page never scrolls sideways; vertical overflow stays visible.
- A blush circle (`bg-blush`, #FDE4EA, 85 % of the box height) sits behind the figure. No shadow,
  no new colour.
- Unchanged: decorative and not focusable, still frame under reduced motion (checked), lazy player,
  self-hosted files (no outside requests, checked), crisis screen untouched.
- Checks: verify 314/314 (check:copy OK), e2e 03 16/16 (axe on `/` included), no horizontal scroll at
  390/768/1280/1440 px.

## Hotline number shown once (branch ui-hotline-cleanup, user request, 2026-10-11; merged into main 2026-10-11)

The plain monospace number line under each hotline is removed; the number stays in the Call button
("Call {number}", tel: link and accessible name unchanged).
- `HotlineList.jsx` (shared by the landing "Need help right now?" card, `/help`, and the request and
  request-sent pages): the `font-mono` number line is deleted. Description to button gap is the
  existing 12 px (`gap-3`). The Call button gets `py-2 text-left leading-snug` and a non-shrinking
  icon, so the long NCMH label wraps neatly to two lines on phones.
- `CrisisPage.jsx`: the crisis screen does **not** use `HotlineList` (it has its own `ContactRow`,
  because its labels follow the Bisaya/Tagalog switch). Its hotline line was "number • description";
  it is now the description only, and its Call button gets the same wrapping classes. The crisis
  screen stays in the main bundle (no lazy loading); numbers remain visible inside the buttons.
  The emergency banner at the top ("…call this number: 911") is unchanged.
- No test looked for the plain number text (all hotline tests find the Call links by their
  accessible names), so no test was changed.
- Checked on a demo build (real numbers): home, `/help`, and the crisis screen at 390 and 1280 px;
  `tel:09178998727` and `tel:911`; at 390 px the NCMH button wraps to two lines inside the card, no
  clipping, no horizontal scroll. verify 314/314 (check:copy OK), check:bundle OK, e2e 03 16/16,
  05 6/6 (axe on `/`, `/help`, `/crisis` included).

## Hero columns end on the same line (branch ui-hero-balance, user request, 2026-10-11; merged)

`LandingPage.jsx` hero only.
- From 1024 px: 2-column grid, `items-stretch`; the help card is no longer `self-start`, so it sets
  the row height. The left column is `flex h-full flex-col`; text, buttons, and reassurance line keep
  their natural size. The animation wrapper is `relative flex-1 overflow-hidden` with no height of
  its own; the player is `absolute inset-0` (canvas `size-full`, fit contain, centred) at
  `scale-[1.15]` (was 1.4). The 480 px max-width, aspect-ratio box, and `overflow-x-clip` from
  ui-hero-animation are removed.
- **Minimum height 180 px, not 260 px:** the space left under the text is about 205 px (flag-off and
  demo builds alike), so a 260 px minimum made the left column 55 px taller than the card and left
  55 px of blank space inside the card. With 180 px the card decides: measured at 1280, 1440, and
  1920 px, the animation bottom equals the card bottom (0 px) and the card has no blank space (1 px).
  The figure is smaller than before (about 170 px tall) because it now fits the leftover space.
- Below 1024 px the columns stack (they used to sit side by side from 768 px); the animation is a
  fixed 240 px tall (`h-60`) after the buttons, then the help card.
- Blush circle: `h-[85%] max-w-[85%]`, centred; the height is the smaller side at every width, so
  it is 85 % of the smaller side and is never cut off (checked).
- Spacing to "How HingaWeb works": 64 px from 1024 px (`gap-12` + `lg:mb-4`), 48 px below.
- Unchanged: aria-hidden, no pointer events, not focusable; still frame with reduced motion
  (checked); lazy player; self-hosted (no outside requests); crisis screen untouched.
- Checks: verify 314/314 (check:copy OK), e2e 03 16/16 with axe, no horizontal scroll at 390 and
  768 px, box does not jump while loading.

## New logo (branch ui-new-logo, user request, 2026-10-11; merged)

- **Files:** `public/hingaweb-mark.svg` and `public/hingaweb-logo.svg` were not in `public/` as
  stated. `hingaweb-logo.svg` was copied from `Downloads/` (identical to the file attached to the
  request; checked: no scripts, event handlers, or external links). **No mark file existed
  anywhere**, so `hingaweb-mark.svg` was made from the full logo: same three paths, clipped to the
  logo's own pink circle (viewBox = that circle), so the breath tail outside the circle is cut off.
  Replace the file to use a different mark; the app refers to it only by name.
- `Logo.jsx`: the lucide `Waves` icon and its blush square are removed (`Waves` is no longer used
  anywhere); the mark is `<img src="/hingaweb-mark.svg" alt="" width="44" height="44">`, 36 px below
  640 px and 44 px from 640 px. Wordmark, caption, link, and its "HingaWeb home" name unchanged.
  Used by `AppHeader` (public, student, guidance, admin headers), `BareLayout` (crisis, welcome,
  waiting), and `PortalLayout` (staff sign-in); the footer has no logo. On the crisis screen it is a
  plain same-origin image (precached by the service worker), never lazy.
- Favicon: `public/favicon.svg` is now a copy of the mark (index.html already linked it).
- `public/apple-touch-icon.png`: 180×180, the mark on #FFF1F4, rendered with the Playwright Chromium
  already in devDependencies (no new packages); linked in index.html. No web manifest exists
  (`manifest: false`), so no 192/512 icons were made.
- Login and sign-up form pages: the full logo, 120 px, centred at the top of the card above the
  heading (`AuthLogo` in `AuthCard.jsx`, `alt=""`).
- Checks: verify 314/314 (check:copy OK), check:bundle OK, e2e 02 28/28, 03 16/16, 05 6/6, 08 6/6
  (axe included). Favicon and touch icon served as image/svg+xml and image/png.
