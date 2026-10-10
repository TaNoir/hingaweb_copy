# HingaWeb Implementation Plan — 05 · Private Check-in, Prompt, and Crisis Screen

> Upload order: `00` (v1.3), `01`, `02`, `03`, `04`, then this file. Phase 04 acceptance must have passed.
> Every file in this phase is given **in full**, except `supabase/config.toml`, where you **append** the block shown. Create or replace each file with exactly this content.

**What was verified when this plan was written:** `npm run verify` passes (**155 unit and component tests**; lint, copy, and colour checks OK; build OK). The three Edge Function entry points were started under Deno 2 with their real `npm:` imports and answered correctly (preflight, 401 without a token, fixed error shapes). With a production build in Chromium and a simulated signed-in Tier 2 student (desktop 1280 px and mobile 390 px), `/check-in`, the Fig 15 prompt, the saved state, and `/crisis` had **0 axe WCAG 2.1 A/AA violations**; the crisis screen appeared about **90 ms** after the tick; with the network cut, the crisis screen still showed every hotline, said it would send when back online, and sent the event exactly once when the network returned. The Playwright specs in `e2e/phase-05` use the real local stack and the local Edge Functions; they run for the first time on Jared's machine. If one fails, fix the app until the spec's expected result happens; change only selectors or waits in the spec, and note it in `docs/questions.md`.

---

## 1. Goal

1. The private check-in (Fig 11; 2.1.5.1.3): four criterion items, mood and stress (D-08), an optional note that is stored and never analysed (2.1.6.2.7), and the explicit crisis items.
2. The student-mediated prompt (Fig 15; 2.1.5.1.7; N-01): after a check-in, the server decides **only** whether to ask; the student chooses. Nothing is sent by itself.
3. The crisis screen (Fig 18; 2.1.5.1.8; 2.1.6.1.6): opens the instant an item is ticked, from the bundle, with no server wait; the crisis event is sent in the background and retried until saved (2.1.6.4.7). English, Bisaya, and Tagalog (2.1.6.3.1).
4. Three Edge Functions: `evaluate-checkin`, `notify-crisis` (the text-message half of 2.1.6.1.6; does nothing until the gateway exists), and the shared SAW module `saw.js` (moved here from Phase 07, P05-D10).
5. Two small fixes to earlier files (Step 0 and Step 0b).

### 1.1 Prerequisites

Phase 04 acceptance passed. Seed loaded (`npx supabase db reset && node scripts/dev-enrol-totp.js`). Deno is **not** needed on your machine: the Supabase CLI runs the functions in its own Edge Runtime container.

### 1.2 Not in this phase

- The support request screen `/request` (Phase 07). The prompt and the saved screen link to it; until Phase 07 it shows the Phase 02 placeholder.
- The staff crisis channel and its live dashboard alert (Phase 08). This phase only **creates** crisis events.
- Trends and resources (Phase 06).
- Any Cebuano or Tagalog words. The team writes them (00 §10.2).
- Real hotline numbers, crisis items, or protocol steps. The guidance office provides them (00 §11).

### 1.3 Requirements and figures covered

| Piece | Figure | Requirement |
|---|---|---|
| Check-in form | Fig 11 | 2.1.5.1.3, 2.1.5.1.4, 2.1.6.2.1, 2.1.6.2.7, 2.1.6.3.2, 2.1.6.3.4; Table 8; D-08, D-09 |
| Crisis items on the form | Fig 11 | 2.1.5.1.3 ("explicit and labelled"), Table 12 |
| Prompt dialog | Fig 15 | 2.1.5.1.7; Table 19; D-13; N-01 |
| `evaluate-checkin` | — | 2.1.5.1.7, 2.1.6.1.4 (server-side), 2.2.2.1–2.2.2.3 (Equation 1), 2.2.6; N-01 |
| Crisis screen | Fig 18 | 2.1.5.1.8, 2.1.6.1.6 (student half), 2.1.6.3.1, 2.1.6.4.6; D-18, D-24, D-31 |
| Crisis event write | — | Table 11 (dual policy), 2.1.6.4.7; N-02 |
| `notify-crisis` | — | 2.1.6.1.6 (staff half, text message; Capstone 2 build item), 2.1.6.4.7 |

### 1.4 Disagreements found in this phase

| ID | Manuscript / rule | Figure or other source shows | Ruling |
|---|---|---|---|
| P05-D1 | 00 §10.5: never tell a student how they are doing | Fig 15 body: "You have been carrying a lot lately." | Replaced with: "If you would like support, you can ask the guidance office. Nothing is sent unless you choose to send it, and you will see exactly what is shared first." |
| P05-D2 | D-13: the prompt opens `/request`; it does not send | Fig 15 button "Send to guidance office" | Button reads **"Continue to send a request"**, so the label says what happens |
| P05-D3 | 2.1.5.1.7: the prompt fires for two different reasons (maximum-severity, gray zone) | — | The student sees the **same** dialog for both. The type is stored only in the owner-only `prompt_events` row |
| P05-D4 | 2.1.6.3.1: the crisis screen must also be in Cebuano and Tagalog | Fig 18 has no language switch | Switch added (English · Bisaya · Tagalog), same control as Fig 10 |
| P05-D5 | No source for the claim | Fig 18 chip "Confidential protocol" | Not shown. The screen is the one place the privacy boundary is crossed (Fig 18 caption), so it must not suggest otherwise |
| P05-D6 | Table 12 has no display-order column | Fig 11 shows three items in a fixed order | Items are shown in **alphabetical order of their label**. **Team note:** if the guidance office needs a set order, raise a manuscript change (a new column) before Phase 09; do not add one in code (00 must-never 18) |
| P05-D7 | 2.1.6.1.6: hotlines "on selection"; D-24: no confirm step | Fig 11 does not say what a tick does to the half-filled form | Ticking opens `/crisis` at once. The answers and note stay in **page memory** and are still there after "Back to my check-in". A ticked item stays ticked and cannot be unticked (the event is already sent) |
| P05-D8 | 00 §6.5 lists only the three SMS secrets | The webhook and CORS need two more | Two new optional Edge secrets: `WEBHOOK_SECRET` (required for `notify-crisis` to accept anything) and `ALLOWED_ORIGIN` (the site origin; empty = any origin, local only). Kept in `supabase/functions/.env` locally (git-ignored) and in Supabase secrets when hosted |
| P05-D9 | 2.1.6.1.6: the text-or-call channel "is a Capstone 2 build item that depends on an SMS gateway" | — | `notify-crisis` is built and tested now, behind a generic gateway call. Until `SMS_GATEWAY_URL`, `SMS_GATEWAY_TOKEN`, and `ONCALL_CONTACT_NUMBER` are set, it returns `{ sent: false, reason: 'sms_not_configured' }` and does nothing else. The text carries **no** name, grade, section, adviser, or item: only "a crisis event was raised (Ref xxxxxxxx)" |
| P05-D10 | 00 §4 lists `saw.js` under Phase 07 | `evaluate-checkin` needs Equation 1 now | `saw.js` and its tests are created here. Phase 07 imports it unchanged |
| P05-D11 | Table 19 outcomes are only `dismissed` and `request_sent` | A student may press "Continue" and then not send | No row is written on "Continue". Phase 07 writes `request_sent` when the request is actually sent |
| P05-D12 | 2.1.5.1.7 needs the prompt | The prompt check can fail (offline after saving, function down) | The check-in stays saved and the saved screen shows, which always offers "Ask the guidance office for support". Never block or undo the save because of the prompt |
| P05-D13 | 00 §2.6: mood and stress are added to the check-in (D-08) | Fig 11 numbers four items | Mood and stress are questions **5 and 6**, after the four Fig 11 items, so Fig 11's order is unchanged |

---

## 2. Files in this phase

**Step 0 (fixes to earlier phases):** `e2e/phase-04/assent.spec.js` and `scripts/check-placeholders.js` (replace the whole files).

**New:**
- `supabase/functions/_shared/http.js`, `clients.js`, `saw.js`, `saw.test.js`
- `supabase/functions/evaluate-checkin/handler.js`, `index.js`, `handler.test.js`
- `supabase/functions/notify-crisis/handler.js`, `index.js`, `handler.test.js`
- `supabase/functions/.env.example`
- `src/config/checkin-items.js`, `src/config/checkin-items.test.js`
- `src/copy/en/checkin.js`
- `src/features/checkin/checkinDraft.js`, `useCrisisItems.js`, `PromptDialog.jsx`, `CheckInPage.jsx`, `checkin.test.jsx`
- `src/features/crisis/crisisReport.js`, `CrisisStatus.jsx`, `CrisisPage.jsx`, `crisis.test.jsx`
- `e2e/phase-05/checkin-crisis.spec.js`

**Changed (replace the whole file):** `src/copy/en/index.js`, `src/copy/ceb.js`, `src/copy/tl.js`, `src/routes.jsx`, `vite.config.js` (Vitest now also runs `supabase/functions/**/*.test.js`).

**Changed (append):** `supabase/config.toml`.

Edge Function layout (00 §5.2, made testable): each function has a **`handler.js`** (pure; receives `z`, the client factory, and config as arguments, so Vitest can run it in Node) and a thin **`index.js`** (Deno only: real `npm:` imports and `Deno.serve`). `src/` must never import anything under `supabase/functions/` (the Phase 01 lint rule enforces this).

---

## 3. Screens

### 3.1 Private check-in — `/check-in`

- Figure / requirement: Fig 11; 2.1.5.1.3, 2.1.5.1.4, 2.1.6.2.7. Guard: `RequireStudent tier2`. Layout: `StudentLayout` (reading width). Component: `CheckInPage` (no props).
- Top: chip "Private to your account • Staff cannot browse your check-ins" (lock icon), h1 "How have things been?", lead "Only you can see this. Take a quiet breath and answer however feels true today."
- Six cards, each a `ScaleButtons` radio group, legend numbered "1." to "6.":
  1. "School work and academic pressure has been affecting me." → `c1`
  2. "Things at home, family, or money have been affecting me." → `c2`
  3. "Worries about graduating, college, or my future have been affecting me." → `c3`
  4. "I have been able to manage what I am carrying." + hint "Answer honestly. There is no right answer here." → `c4`, **reverse-coded**: stored value = 6 − tapped (D-09)
  5. "How has your mood been today?" → `mood` (Very low · Low · Okay · Good · Very good)
  6. "How stressed have you felt today?" → `stress` (Not at all … Very much)
  Items 1–4 and 6 use the 00 §2.5 answer labels. The items come from `src/config/checkin-items.js`; the text from `src/copy/en/checkin.js`.
- Note card: heading "Anything you want to write down?", label "Optional note", placeholder "Write anything on your mind...", hint "This is stored as you write it. Nothing reads it or analyses it." Max 2000 characters (Table 8 CHECK). Stored exactly as typed; an empty or all-space note is stored as `null`. Nothing else ever looks at it.
- Safety box (dark 2px border, shield icon): heading "Please tell us if any of these apply"; one checkbox per **active** `crisis_items` row (label from the database); text "If you tick any of these, we will show you help right away and let the guidance office know."; then a polite live status line (empty until something is ticked).
  - Loading: 3 skeleton lines. Error: "These could not load." + "If you need help now, open Where to get help." (link to `/help`) + "Try again". No active items: "If you need help now, the hotlines are on Where to get help."
  - Ticking an item: (1) the item is marked ticked and disabled, (2) the crisis event starts sending in the background, (3) the app navigates to `/crisis` **immediately**, without waiting for anything.
- Under the cards: while any of the six is unanswered, "Answer questions 1 to 6 to save. The note is optional." "Save check-in" (primary, check icon) is **disabled** until all six are answered. "Cancel and return" (ghost) → `/`.
- Draft: answers, note, and ticked items live in page memory (`checkinDraft.js`), tied to the signed-in student's id. They survive a visit to `/crisis` and back; they vanish on reload, tab close, or a different account (00 must-never 14).
- Save: insert into `checkins` `{ student_id, c1, c2, c3, c4, mood, stress, note }` with `.select('id').single()`. Then call `evaluate-checkin` with `{ checkin_id }`.
  - `prompt` is `'max_sev'` or `'gray_zone'` → open the prompt dialog (3.2).
  - `prompt` is `null`, or the call fails → saved state.
- States: ready; incomplete (Save disabled); saving (spinner on Save); save failed ("Your check-in was not saved. Check your connection and try again. Your answers are still here."; answers kept; no success shown); offline (banner); saved.
- Saved state (replaces the form; shown only after the database confirms the insert): chip "Check-in saved privately", h1 "Your check-in is saved", "Only you can see it. Nothing was sent to the guidance office.", links "See my check-ins over time" (`/trends`), "See suggested guides" (`/resources`), "Ask the guidance office for support" (`/request`), "Back to home" (`/`).
- Data: reads `crisis_items (id, label)` where active. Writes `checkins`, `prompt_events` (dismissal only), `crisis_events` (via `crisisReport`). Calls `evaluate-checkin`.
- Copy keys: `checkin.*`.

### 3.2 Prompt dialog (Fig 15) — inside `/check-in`

- Component: `PromptDialog({ open, busy, onSend, onNotNow })`. Uses `Dialog` with `dismissible={false}`: no close button, Escape does nothing.
- Content, top to bottom: speech-bubble icon; chip "Check-in saved privately"; title "Would you like to send this to the guidance office?"; body (P05-D1); two buttons of **equal size side by side** (stacked on mobile): "Continue to send a request" (primary) and "Not now" (outline); footer "If you choose Not now, nobody is told. Only you can see that you chose it." (D-13).
- "Continue to send a request" → `navigate('/request', { state: { promptCheckinId, promptType } })`. Writes nothing (P05-D11).
- "Not now" → insert `prompt_events { student_id, checkin_id, type, outcome: 'dismissed' }`, then close and show the saved state. If that insert fails, still close (the check-in is saved; the dismissal record is for the student only).
- Never shows which prompt type fired, any number, or any reason.

### 3.3 Crisis screen — `/crisis`

- Figure / requirement: Fig 18; 2.1.5.1.8, 2.1.6.1.6, 2.1.6.3.1, 2.1.6.4.6. Guard: `RequireStudent` (any consent state). Layout: `BareLayout` (logo only). Component: `CrisisPage` (no props).
- Everything on this screen comes from the bundle: `src/content/directory.js` and `src/copy`. It makes **no** request at all. Focus moves to the h1 when it opens.
- Top box (dark border): "This service is not for emergencies. If you are in immediate danger, call this number:" followed by the emergency hotline number as a `tel:` link (the number is outside the translated sentence so it shows in every language).
- Card: chip "Guidance safety response • {school}" (school = `SITE.schoolName`); language switch (English · Bisaya · Tagalog); h1 "Help is available right now"; lead "Thank you for telling us. You do not have to handle this on your own."
- Contact rows (phone icon, name, "number • note", button): one per `HOTLINES` entry, button "Call {number}" (`tel:` link, accessible name "Call {name} at {number}"); then "Your school guidance office" with person • role and hours • location lines, button "Call guidance" (accessible name "Call the guidance office at {number}").
- "What happens next" (shown only when an item was ticked in this page session): "Because you told us about this, the guidance office will be told so that someone can check in with you. This is the one thing HingaWeb shares without asking first, and you were told about it before you started." Then the live status line:
  - sending: "Letting the guidance office know…"
  - sent: "The guidance office has been told."
  - retrying: "We could not reach the guidance office yet. Keep this page open and we will keep trying. You can also call them with the button above."
  - offline: "You're offline. We will tell the guidance office as soon as you're back online. The hotlines above work now."
  - failed (the item was retired or the account is not a student): "We could not tell the guidance office through HingaWeb. Please call them now with the button above."
- "Back to my check-in" (outline, arrow) → `/check-in`.
- Language: every text above switches; the hotline names, numbers, notes, and office details are guidance-office placeholders and do not switch. Cebuano and Tagalog values are `[[TEAM:…]]` placeholders until the team fills `ceb.js` and `tl.js`.
- Copy keys: `crisis.*` (English), `ceb.crisis.*`, `tl.crisis.*`.

### 3.4 Sending a crisis event — `crisisReport.js` (no screen)

- `reportCrisisItem(owner, itemId)` returns at once. It inserts `crisis_events { student_id, trigger_item_id }` and **never** chains `.select()` (students cannot read `crisis_events`; Table 11). The database trigger fills `disclosed` and `protocol_ref` (N-02).
- Each item is sent at most once per page session. Temporary failure: retry after 2 s, 5 s, 10 s, then every 15 s while the page is open. Offline: wait for the browser's `online` event. Permanent errors (`23502`, `23503`, `23514`, `42501`): stop and show "failed".
- `useCrisisReport(owner)` gives the state to the screens. Nothing is written to browser storage.

---

## 4. Edge Functions

| Function | Called by | JWT | Reads (as whom) | Writes | Returns |
|---|---|---|---|---|---|
| `evaluate-checkin` | `/check-in` after a save | required (`verify_jwt = true`) | `checkins.c1..c4` of one row, **as the student** (RLS: owner only) | nothing | `{ prompt: 'max_sev' \| 'gray_zone' \| null }` only |
| `notify-crisis` | Database Webhook on `crisis_events` INSERT | none (`verify_jwt = false`); header `x-hingaweb-webhook-secret` must equal `WEBHOOK_SECRET` | nothing | nothing in the database; one POST to the SMS gateway when configured | `{ sent, reason? }` |

Error bodies are fixed strings (`unauthorized`, `bad_request`, `not_found`, `read_failed`, `method_not_allowed`); never a raw database message. Neither function logs a request body.

`evaluate-checkin` decides with `checkinPrompt()` in `saw.js`: `'max_sev'` when any of c1–c4 equals `MAX_SEV_RULE.anyCriterionEquals` (5); otherwise `'gray_zone'` when S is within `GRAY_ZONE_HALF_WIDTH` of either threshold; otherwise `null`. S is computed in memory and thrown away (N-01). A staff caller gets `404` because RLS hides every check-in.

---

## 5. Who can see or do what

| Action | Tier 2 student | Student without Tier 2 | Guidance / Administrator | Signed out |
|---|---|---|---|---|
| Open `/check-in` | own form | redirected (Phase 02 guard) | sent to own home | `/login` |
| Insert a check-in | own, RLS `checkins_insert_own` | blocked by RLS | blocked | blocked |
| Read check-ins | own only | own only | **never** (no policy) | never |
| Call `evaluate-checkin` | own check-ins only | — | gets `404` | `401` |
| Insert `prompt_events` | own, for own check-in | — | never read or written | — |
| Open `/crisis` | yes | yes (no tick possible, so no "what happens next") | sent to own home | `/login` |
| Insert `crisis_events` | own row (2 columns) | own row | no | no |
| Read `crisis_events` | **no** | no | guidance only (Phase 08) | no |

Tables read: `crisis_items` (active, `id, label`), `checkins` (by the function, own row). Tables written: `checkins`, `prompt_events`, `crisis_events`.

---

## 6. Build steps

### Step 0 — Fix the Phase 04 E2E skip (bug in the Phase 04 file)

The Phase 04 spec passed `testInfo` to `test.skip(callback)`, but Playwright only passes fixtures there, so the spec would crash and `npm run lint` fails on the unused `browserName`. Replace the file:

**`e2e/phase-04/assent.spec.js`**

```js
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { studentLogin } from '../helpers/auth.js';

// These tests change seed data (they record an assent), so they run once (desktop project only)
// and in order. Run `npx supabase db reset` before them.
test.describe.configure({ mode: 'serial' });
test.beforeEach(() => {
  test.skip(test.info().project.name !== 'desktop', 'changes seed data; runs once');
});

test.describe('Phase 04 · assent and consent gate (Fig 10; 2.1.5.1.1; 2.1.6.2.3)', () => {
  test('a student without assent sees the walkthrough before anything else', async ({ page }) => {
    await studentLogin(page, 'student.noassent@example.test');
    await expect(page).toHaveURL(/\/welcome$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'What we keep private, and what we cannot' }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
    await page.goto('/check-in');
    await expect(page).toHaveURL(/\/welcome$/);
  });

  test('assent is recorded only after the box is ticked, then the parental step shows', async ({
    page,
  }) => {
    await studentLogin(page, 'student.noassent@example.test');
    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await page.getByLabel('I have read this and I understand.').check();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/\/waiting-for-consent$/);
    await expect(
      page.getByRole('heading', { name: 'One more step before your first check-in' }),
    ).toBeVisible();
  });

  test('assent with parental consent missing keeps check-ins closed', async ({ page }) => {
    await studentLogin(page, 'student.noparent@example.test');
    await expect(page).toHaveURL(/\/waiting-for-consent$/);
    await page.getByRole('button', { name: 'Check again' }).click();
    await expect(page.getByText('Not recorded yet. Please check again later.')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('withdrawn parental consent shows the closed message', async ({ page }) => {
    await studentLogin(page, 'student.withdrawn@example.test');
    await expect(page).toHaveURL(/\/waiting-for-consent$/);
    await expect(page.getByRole('heading', { name: 'Private check-ins are closed' })).toBeVisible();
  });

  test('a Tier 2 student never sees the walkthrough again', async ({ page }) => {
    await studentLogin(page, 'student.full@example.test');
    await expect(page).toHaveURL(/\/check-in$/);
    await page.goto('/welcome');
    await expect(page).toHaveURL(/\/check-in$/);
  });
});
```

Then `npm run lint` must pass before you go on.

### Step 0b — Placeholder scan skips test files (bug in the Phase 01 script)

Test files quote placeholders on purpose (for example `'[[TEAM:CEB:assent.title]]'`, to check the screen shows them as written). The Phase 01 script counted those, so `build:pilot` would stay blocked even after every real placeholder is filled, and the Phase 04 check 3 counts were slightly high (33 and 35 instead of 32 and 32). Replace the file:

**`scripts/check-placeholders.js`**

```js
// 00 Section 11.3. Lists every [[OWNER:KEY]] placeholder into docs/placeholders.md.
// --strict (used by build:pilot): exit 1 if any placeholder remains in src/, if scoring is
// PROVISIONAL, or if the check-in items are not final.
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, walk, read } from './lib.js';

export const PLACEHOLDER = /\[\[(GUIDANCE|TEAM|SCHOOL):[A-Za-z0-9_.:-]+\]\]/g;

if (process.argv[1] && process.argv[1].endsWith('check-placeholders.js')) {
  const strict = process.argv.includes('--strict');
  // Test files quote placeholders on purpose (to check they render as written), so they are
  // not counted. Only app code and the seed are listed.
  const files = [
    ...walk('src', ['.js', '.jsx', '.css', '.html']).filter(
      (f) => !/\.test\.(js|jsx)$/.test(f) && !f.startsWith('src/test/'),
    ),
    ...(existsSync(join(ROOT, 'supabase/seed.sql')) ? ['supabase/seed.sql'] : []),
  ];

  const rows = [];
  for (const file of files) {
    read(file)
      .split('\n')
      .forEach((line, i) => {
        for (const m of line.matchAll(PLACEHOLDER))
          rows.push({ file, line: i + 1, owner: m[1], key: m[0] });
      });
  }

  const md = [
    '# Placeholders still to fill',
    '',
    'Generated by `npm run check:placeholders`. Do not edit by hand.',
    '',
    `Total: ${rows.length}`,
    '',
    '| Owner | Placeholder | File | Line |',
    '|---|---|---|---|',
    ...rows.map((r) => `| ${r.owner} | \`${r.key}\` | ${r.file} | ${r.line} |`),
    '',
  ].join('\n');
  writeFileSync(join(ROOT, 'docs/placeholders.md'), md);
  console.log(`check:placeholders: ${rows.length} placeholder(s) listed in docs/placeholders.md`);

  if (strict) {
    const problems = [];
    const inSrc = rows.filter((r) => r.file.startsWith('src/'));
    if (inSrc.length) problems.push(`${inSrc.length} placeholder(s) remain in src/`);
    const scoringPath = join(ROOT, 'supabase/functions/_shared/scoring-config.js');
    if (!existsSync(scoringPath)) problems.push('scoring-config.js is missing');
    else if ((await import(pathToFileURL(scoringPath).href)).PROVISIONAL !== false)
      problems.push('scoring-config.js PROVISIONAL is not false (scoring session not applied)');
    const itemsPath = join(ROOT, 'src/config/checkin-items.js');
    if (!existsSync(itemsPath)) problems.push('src/config/checkin-items.js is missing');
    else if ((await import(pathToFileURL(itemsPath).href)).CHECKIN_ITEMS_STATUS !== 'final')
      problems.push("checkin-items.js CHECKIN_ITEMS_STATUS is not 'final' (co-design not applied)");
    const consentPath = join(ROOT, 'src/config/consent.js');
    if (existsSync(consentPath)) {
      const { ASSENT_COPY_STATUS } = await import(pathToFileURL(consentPath).href);
      if (ASSENT_COPY_STATUS !== 'final')
        problems.push(
          "consent.js ASSENT_COPY_STATUS is not 'final' (validator panel has not confirmed the assent wording)",
        );
    }
    if (problems.length) {
      console.error('build:pilot blocked:\n- ' + problems.join('\n- '));
      process.exit(1);
    }
    console.log('check:placeholders --strict: OK');
  }
}
```


### Step 1 — Vitest also runs the Edge Function tests

**`vite.config.js`**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Phase 03 · 2.1.6.4.6: the app shell (and with it the static hotline and directory content)
    // is precached so it opens with no network. NOTHING from Supabase is ever cached:
    // there is no runtimeCaching, so every API call goes to the network.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: false, // not an installable app (no app install, manuscript 1.2)
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,svg}'],
        globIgnores: ['**/*cyrillic*', '**/*greek*', '**/*vietnamese*'],
        navigateFallback: '/index.html',
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setupTests.js'],
    include: ['src/**/*.test.{js,jsx}', 'supabase/functions/**/*.test.js', 'scripts/**/*.test.js'],
  },
});
```

### Step 2 — Shared Edge Function modules

**`supabase/functions/_shared/http.js`**

```js
// JSON and CORS helpers for every Edge Function (00 Section 5.2). Pure JavaScript: runs in Deno and Vitest.

/**
 * @param {string} allowedOrigin  the site origin (ALLOWED_ORIGIN secret), or '*' when unset (local only)
 */
export function makeHttp(allowedOrigin = '*') {
  const cors = {
    'Access-Control-Allow-Origin': allowedOrigin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  return {
    cors,
    /** A JSON response with CORS headers. Never put a raw error message in `body`. */
    json(body, status = 200) {
      return new Response(JSON.stringify(body), {
        status,
        headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
      });
    },
    /** Answer for the browser's CORS preflight. */
    preflight() {
      return new Response('ok', { status: 200, headers: cors });
    },
  };
}

/** Reads the Bearer token header, or returns null. */
export function bearer(req) {
  const value = req.headers.get('Authorization') ?? '';
  return /^Bearer\s+\S+/.test(value) ? value : null;
}

/** Parses the JSON body, or returns undefined when it is not valid JSON. */
export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}
```

**`supabase/functions/_shared/clients.js`**

```js
// Supabase clients for Edge Functions (00 Section 5.2). Imported ONLY by the index.js files,
// never by handler.js (handlers receive these functions as arguments, so Vitest can test them).
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';

const NO_SESSION = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

/**
 * A client that acts AS THE CALLER: every read goes through row-level security with the
 * caller's own JWT. All reads in every function use this client (2.2.6).
 * @param {string} authorization  the caller's "Bearer <jwt>" header
 */
export function makeUserClient(authorization) {
  return createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: NO_SESSION,
  });
}

/**
 * A client that bypasses row-level security. Use it ONLY for the writes a phase file names.
 * Never use it to read student data.
 */
export function makeServiceClient() {
  return createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: NO_SESSION,
  });
}
```

**`supabase/functions/_shared/saw.js`** — Equation 1, guardrails, gray zone (P05-D10). Reads every number from `scoring-config.js`.

```js
// Simple Additive Weighting (manuscript 2.2.2.1–2.2.2.3). Pure JavaScript, no imports besides the
// config argument, so it runs in Deno (Edge Functions) and in Vitest. NEVER imported by src/.
// Output is a triage priority for a support request, or a prompt type for a private check-in.
// It never labels a student and never produces an office tag.

const RANK = { P3: 1, P2: 2, P1: 3 };
const CRITERIA = ['c1', 'c2', 'c3', 'c4'];

/** Round to 4 decimals (numeric(7,4) in triage_decisions). */
export function round4(x) {
  return Math.round(x * 10000) / 10000;
}

/** Throws if the config could not have come from the scoring session. */
export function validateConfig(cfg) {
  const sum = CRITERIA.reduce((s, k) => s + cfg.WEIGHTS[k], 0);
  if (Math.abs(sum - 1) > 0.0005) throw new Error(`Weights must sum to 1 (got ${sum})`);
  if (!(cfg.THRESHOLDS.P2_MIN < cfg.THRESHOLDS.P1_MIN))
    throw new Error('P2_MIN must be below P1_MIN');
  if (cfg.GRAY_ZONE_HALF_WIDTH < 0) throw new Error('GRAY_ZONE_HALF_WIDTH must be >= 0');
}

/** Equation 1: S = sum of w_j * r_j over c1..c4. Ratings are the stored 1-5 values (higher = more urgent). */
export function scoreS(r, weights) {
  return round4(CRITERIA.reduce((s, k) => s + weights[k] * r[k], 0));
}

/** Plain band from the thresholds, before guardrails and gray zone. */
export function bandFor(S, thresholds) {
  if (S >= thresholds.P1_MIN) return 'P1';
  if (S >= thresholds.P2_MIN) return 'P2';
  return 'P3';
}

/** True when S is within the gray zone of either threshold (strictly less than the half-width). */
export function inGrayZone(S, thresholds, halfWidth) {
  if (!halfWidth) return false;
  return Math.abs(S - thresholds.P2_MIN) < halfWidth || Math.abs(S - thresholds.P1_MIN) < halfWidth;
}

/** Names of the guardrail floors that apply to these ratings (2.2.2.3). */
export function firedGuardrails(r, guardrails) {
  const values = CRITERIA.map((k) => r[k]);
  const fired = [];
  const a = guardrails.anySingleAtMax;
  if (a.enabled && values.some((v) => v >= a.anchor)) fired.push('anySingleAtMax');
  const b = guardrails.twoOrMoreHigh;
  if (b.enabled && values.filter((v) => v >= b.minAnchor).length >= b.minCount)
    fired.push('twoOrMoreHigh');
  const c = guardrails.c4MaxFloorP1;
  if (c.enabled && r.c4 >= 5) fired.push('c4MaxFloorP1');
  return fired;
}

function floorFor(name, guardrails) {
  return name === 'c4MaxFloorP1' ? 'P1' : guardrails[name].floor;
}

/** The rule set saved with every decision (N-06), so it stays reproducible by hand. */
export function ruleSnapshot(cfg, fired) {
  return {
    fired,
    weights: { ...cfg.WEIGHTS },
    thresholds: { ...cfg.THRESHOLDS },
    grayZoneHalfWidth: cfg.GRAY_ZONE_HALF_WIDTH,
    provisional: cfg.PROVISIONAL,
  };
}

/**
 * Triage for a support request (Table 10).
 * @param {{c1:number,c2:number,c3:number,c4:number}|null} r  stored ratings from the latest check-in, or null
 * @returns {{ score: number|null, band: 'P1'|'P2'|'P3'|'FR', guardrails: object }}
 */
export function triage(r, cfg) {
  validateConfig(cfg);
  if (!r) return { score: null, band: 'FR', guardrails: ruleSnapshot(cfg, []) }; // no check-in yet (Table 9 note)
  const score = scoreS(r, cfg.WEIGHTS);
  const fired = firedGuardrails(r, cfg.GUARDRAILS);
  if (inGrayZone(score, cfg.THRESHOLDS, cfg.GRAY_ZONE_HALF_WIDTH)) {
    return { score, band: 'FR', guardrails: ruleSnapshot(cfg, fired) }; // never auto-labelled
  }
  let band = bandFor(score, cfg.THRESHOLDS);
  for (const name of fired) {
    const floor = floorFor(name, cfg.GUARDRAILS);
    if (RANK[floor] > RANK[band]) band = floor;
  }
  return { score, band, guardrails: ruleSnapshot(cfg, fired) };
}

/**
 * Student-mediated prompt for a private check-in (2.1.5.1.7; N-01).
 * Returns only the prompt type. The score is never returned, shown, or stored.
 * @returns {'max_sev'|'gray_zone'|null}
 */
export function checkinPrompt(r, cfg) {
  validateConfig(cfg);
  if (CRITERIA.some((k) => r[k] === cfg.MAX_SEV_RULE.anyCriterionEquals)) return 'max_sev';
  if (inGrayZone(scoreS(r, cfg.WEIGHTS), cfg.THRESHOLDS, cfg.GRAY_ZONE_HALF_WIDTH))
    return 'gray_zone';
  return null;
}
```

**`supabase/functions/_shared/saw.test.js`** — the manuscript worked examples and the 625-profile counts (N-04)

```js
import { describe, it, expect } from 'vitest';
import * as CONFIG from './scoring-config.js';
import {
  scoreS,
  bandFor,
  inGrayZone,
  firedGuardrails,
  triage,
  checkinPrompt,
  validateConfig,
} from './saw.js';

const noGray = { ...CONFIG, GRAY_ZONE_HALF_WIDTH: 0 };
const r = (c1, c2, c3, c4) => ({ c1, c2, c3, c4 });
const all = [];
for (let a = 1; a <= 5; a++)
  for (let b = 1; b <= 5; b++)
    for (let c = 1; c <= 5; c++) for (let d = 1; d <= 5; d++) all.push(r(a, b, c, d));
const count = (list) => list.reduce((m, x) => ({ ...m, [x]: (m[x] ?? 0) + 1 }), {});

describe('config', () => {
  it('the placeholder weights sum to 1 and thresholds are ordered', () => {
    expect(() => validateConfig(CONFIG)).not.toThrow();
  });
});

describe('Equation 1 — manuscript 2.2.2.3 worked examples', () => {
  it('(1,1,5,1) scores 1.4728: P3 by score, raised to P2 by guardrail (a)', () => {
    expect(scoreS(r(1, 1, 5, 1), CONFIG.WEIGHTS)).toBe(1.4728);
    expect(bandFor(1.4728, CONFIG.THRESHOLDS)).toBe('P3');
    const t = triage(r(1, 1, 5, 1), noGray);
    expect(t.band).toBe('P2');
    expect(t.guardrails.fired).toEqual(['anySingleAtMax']);
  });
  it('(5,5,1,1) scores 3.8588 and reaches P1', () => {
    expect(triage(r(5, 5, 1, 1), noGray)).toMatchObject({ score: 3.8588, band: 'P1' });
  });
  it('(5,1,5,5) scores 3.1876 and stays P2 (no guardrail produces P1)', () => {
    expect(triage(r(5, 1, 5, 5), noGray)).toMatchObject({ score: 3.1876, band: 'P2' });
  });
});

describe('625-profile enumeration (manuscript 2.2.2.3, gray zone off)', () => {
  it('179 / 326 / 120 before guardrails', () => {
    expect(count(all.map((x) => bandFor(scoreS(x, CONFIG.WEIGHTS), CONFIG.THRESHOLDS)))).toEqual({
      P1: 179,
      P2: 326,
      P3: 120,
    });
  });
  it('179 / 356 / 90 after guardrails', () => {
    expect(count(all.map((x) => triage(x, noGray).band))).toEqual({ P1: 179, P2: 356, P3: 90 });
  });
  it('P1 is gated on C2: none with C2 = 1, two with C2 <= 2, 21 with C2 <= 3', () => {
    const p1 = all.filter((x) => bandFor(scoreS(x, CONFIG.WEIGHTS), CONFIG.THRESHOLDS) === 'P1');
    expect(p1.filter((x) => x.c2 === 1)).toHaveLength(0);
    expect(p1.filter((x) => x.c2 <= 2)).toHaveLength(2);
    expect(p1.filter((x) => x.c2 <= 3)).toHaveLength(21);
  });
});

describe('gray zone and For Review', () => {
  it('a score near a threshold goes to For Review, never auto-labelled', () => {
    expect(inGrayZone(2.2, CONFIG.THRESHOLDS, 0.1)).toBe(true);
    expect(inGrayZone(2.35, CONFIG.THRESHOLDS, 0.1)).toBe(false); // |2.35 - 2.25| = 0.10 is not < 0.10
    expect(inGrayZone(3.45, CONFIG.THRESHOLDS, 0.1)).toBe(true);
  });
  it('a request with no check-in goes to For Review with no score', () => {
    expect(triage(null, CONFIG)).toMatchObject({ score: null, band: 'FR' });
  });
  it('the saved rule set records weights, thresholds, gray zone, and provisional flag (N-06)', () => {
    expect(triage(r(2, 2, 2, 2), CONFIG).guardrails).toEqual({
      fired: [],
      weights: CONFIG.WEIGHTS,
      thresholds: CONFIG.THRESHOLDS,
      grayZoneHalfWidth: CONFIG.GRAY_ZONE_HALF_WIDTH,
      provisional: CONFIG.PROVISIONAL,
    });
  });
});

describe('guardrails', () => {
  it('rule (b) fires on two ratings at 4 or above', () => {
    expect(firedGuardrails(r(4, 1, 4, 1), CONFIG.GUARDRAILS)).toEqual(['twoOrMoreHigh']);
  });
  it('the C4 floor to P1 is off until the raters decide', () => {
    expect(firedGuardrails(r(1, 1, 1, 5), CONFIG.GUARDRAILS)).toEqual(['anySingleAtMax']);
  });
});

describe('check-in prompt (2.1.5.1.7; N-01)', () => {
  it('max_sev when any criterion is 5', () => {
    expect(checkinPrompt(r(1, 1, 1, 5), CONFIG)).toBe('max_sev');
  });
  it('gray_zone when the score sits near a threshold', () => {
    // S = 0.2616*2 + 0.4531*2 + 0.1182*2 + 0.1671*3 = 2.1671 -> within 0.10 of 2.25
    expect(checkinPrompt(r(2, 2, 2, 3), CONFIG)).toBe('gray_zone');
  });
  it('null otherwise', () => {
    expect(checkinPrompt(r(1, 1, 1, 1), CONFIG)).toBeNull();
  });
  it('returns only a type, never a number', () => {
    for (const x of all) expect(['max_sev', 'gray_zone', null]).toContain(checkinPrompt(x, CONFIG));
  });
});
```

### Step 3 — `evaluate-checkin`

**`supabase/functions/evaluate-checkin/handler.js`**

```js
// evaluate-checkin (2.1.5.1.7; N-01). Decides whether to ask the student about a support request
// after a private check-in. Computes Equation 1 IN MEMORY under the student's own JWT and returns
// only { prompt: 'max_sev' | 'gray_zone' | null }. The score is never returned, logged, or stored.
// The browser stores nothing either, except the prompt_events row the student's answer creates.
import { bearer, makeHttp, readJson } from '../_shared/http.js';
import { checkinPrompt } from '../_shared/saw.js';

/**
 * @param {{ z: object, makeUserClient: (auth: string) => object, config: object, allowedOrigin?: string }} deps
 * @returns {(req: Request) => Promise<Response>}
 */
export function makeEvaluateCheckin({ z, makeUserClient, config, allowedOrigin = '*' }) {
  const http = makeHttp(allowedOrigin);
  const Input = z.object({ checkin_id: z.guid() }).strict();
  const Output = z.object({ prompt: z.enum(['max_sev', 'gray_zone']).nullable() }).strict();
  const Rating = z.number().int().min(1).max(5);
  const Row = z.object({ c1: Rating, c2: Rating, c3: Rating, c4: Rating });

  return async function evaluateCheckin(req) {
    if (req.method === 'OPTIONS') return http.preflight();
    if (req.method !== 'POST') return http.json({ error: 'method_not_allowed' }, 405);

    const auth = bearer(req);
    if (!auth) return http.json({ error: 'unauthorized' }, 401);

    const input = Input.safeParse(await readJson(req));
    if (!input.success) return http.json({ error: 'bad_request' }, 400);

    // Read through RLS as the student: only the owner can see this row (Table 8).
    const db = makeUserClient(auth);
    const { data, error } = await db
      .from('checkins')
      .select('c1, c2, c3, c4')
      .eq('id', input.data.checkin_id)
      .maybeSingle();
    if (error) return http.json({ error: 'read_failed' }, 500);
    if (!data) return http.json({ error: 'not_found' }, 404);

    const row = Row.safeParse(data);
    if (!row.success) return http.json({ error: 'read_failed' }, 500);

    return http.json(Output.parse({ prompt: checkinPrompt(row.data, config) }));
  };
}
```

**`supabase/functions/evaluate-checkin/index.js`**

```js
// Deno entry point for evaluate-checkin (supabase/config.toml: verify_jwt = true).
import { z } from 'npm:zod@4.6.5';
import * as config from '../_shared/scoring-config.js';
import { makeUserClient } from '../_shared/clients.js';
import { makeEvaluateCheckin } from './handler.js';

Deno.serve(
  makeEvaluateCheckin({
    z,
    makeUserClient,
    config,
    allowedOrigin: Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  }),
);
```

**`supabase/functions/evaluate-checkin/handler.test.js`**

```js
import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import * as config from '../_shared/scoring-config.js';
import { makeEvaluateCheckin } from './handler.js';

const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';

function fakeClient(result) {
  const calls = [];
  const q = {
    select: (...a) => (calls.push(['select', ...a]), q),
    eq: (...a) => (calls.push(['eq', ...a]), q),
    maybeSingle: async () => result,
  };
  return { calls, client: { from: (t) => (calls.push(['from', t]), q) } };
}

function setup(result) {
  const fake = fakeClient(result);
  const makeUserClient = vi.fn(() => fake.client);
  const handler = makeEvaluateCheckin({ z, makeUserClient, config });
  return { handler, makeUserClient, calls: fake.calls };
}

const post = (body, auth = 'Bearer student-jwt') =>
  new Request('http://local/evaluate-checkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
    body: JSON.stringify(body),
  });

describe('evaluate-checkin (2.1.5.1.7; N-01)', () => {
  it('answers the CORS preflight', async () => {
    const { handler } = setup({ data: null, error: null });
    const res = await handler(new Request('http://local/x', { method: 'OPTIONS' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('rejects a call with no JWT and never creates a client', async () => {
    const { handler, makeUserClient } = setup({ data: null, error: null });
    const res = await handler(post({ checkin_id: ID }, null));
    expect(res.status).toBe(401);
    expect(makeUserClient).not.toHaveBeenCalled();
  });

  it('rejects a body that is not exactly { checkin_id: uuid }', async () => {
    const { handler } = setup({ data: null, error: null });
    expect((await handler(post({ checkin_id: 'nope' }))).status).toBe(400);
    expect((await handler(post({ checkin_id: ID, score: 1 }))).status).toBe(400);
  });

  it('reads only c1-c4 of that one check-in, as the caller (RLS)', async () => {
    const { handler, makeUserClient, calls } = setup({
      data: { c1: 1, c2: 1, c3: 1, c4: 1 },
      error: null,
    });
    await handler(post({ checkin_id: ID }));
    expect(makeUserClient).toHaveBeenCalledWith('Bearer student-jwt');
    expect(calls).toEqual([
      ['from', 'checkins'],
      ['select', 'c1, c2, c3, c4'],
      ['eq', 'id', ID],
    ]);
  });

  it('returns 404 when RLS hides the row (not the owner, or staff)', async () => {
    const { handler } = setup({ data: null, error: null });
    const res = await handler(post({ checkin_id: ID }));
    expect(res.status).toBe(404);
  });

  it('returns 500 with no detail when the read fails', async () => {
    const { handler } = setup({ data: null, error: { message: 'secret detail' } });
    const res = await handler(post({ checkin_id: ID }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'read_failed' });
  });

  it.each([
    [{ c1: 1, c2: 1, c3: 1, c4: 5 }, 'max_sev'],
    [{ c1: 2, c2: 2, c3: 2, c4: 3 }, 'gray_zone'],
    [{ c1: 1, c2: 1, c3: 1, c4: 1 }, null],
  ])('ratings %j give prompt %s and nothing else', async (row, prompt) => {
    const { handler } = setup({ data: row, error: null });
    const res = await handler(post({ checkin_id: ID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ prompt });
    expect(Object.keys(body)).toEqual(['prompt']); // never a score, band, or rule
  });
});
```

### Step 4 — `notify-crisis`

**`supabase/functions/notify-crisis/handler.js`**

```js
// notify-crisis (2.1.6.1.6 staff half; 2.1.6.4.7). Called by a Supabase Database Webhook on every
// INSERT into crisis_events. Sends one text message to the on-duty guidance contact through an
// SMS gateway. The text-or-call channel is a Capstone 2 build item: until the three SMS secrets
// are set, this function does nothing and says so.
//
// The crisis event is ALREADY saved before this runs, so a failure here never loses the event
// (2.1.6.4.7). The dashboard alert (Phase 08) does not depend on this function.
//
// Privacy: the message carries NO student name, grade, section, adviser, or crisis item. It says
// only that an event exists and gives its Ref, so the on-duty contact opens the crisis channel.
// Never log the request body: the webhook payload contains the disclosed copy.
import { makeHttp, readJson } from '../_shared/http.js';

/**
 * @param {{ z: object, env: { get: (k: string) => string|undefined }, fetchImpl: typeof fetch }} deps
 */
export function makeNotifyCrisis({ z, env, fetchImpl }) {
  const http = makeHttp('*');
  const Payload = z.object({
    type: z.literal('INSERT'),
    table: z.literal('crisis_events'),
    record: z.looseObject({ id: z.guid() }),
  });

  return async function notifyCrisis(req) {
    if (req.method !== 'POST') return http.json({ error: 'method_not_allowed' }, 405);

    // Only the database webhook knows this secret. Fail closed when it is not set.
    const secret = env.get('WEBHOOK_SECRET');
    if (!secret || req.headers.get('x-hingaweb-webhook-secret') !== secret) {
      return http.json({ error: 'unauthorized' }, 401);
    }

    const payload = Payload.safeParse(await readJson(req));
    if (!payload.success) return http.json({ error: 'bad_request' }, 400);

    const url = env.get('SMS_GATEWAY_URL');
    const token = env.get('SMS_GATEWAY_TOKEN');
    const to = env.get('ONCALL_CONTACT_NUMBER');
    if (!url || !token || !to) return http.json({ sent: false, reason: 'sms_not_configured' });

    const ref = `Ref ${payload.data.record.id.slice(0, 8)}`;
    const message = `HingaWeb: a crisis event was raised (${ref}). Open the crisis channel now.`;
    try {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message }),
      });
      if (!res.ok) return http.json({ sent: false, reason: 'gateway_error' }, 502);
      return http.json({ sent: true });
    } catch {
      return http.json({ sent: false, reason: 'gateway_unreachable' }, 502);
    }
  };
}
```

**`supabase/functions/notify-crisis/index.js`**

```js
// Deno entry point for notify-crisis (supabase/config.toml: verify_jwt = false; the webhook
// secret header is checked instead).
import { z } from 'npm:zod@4.6.5';
import { makeNotifyCrisis } from './handler.js';

Deno.serve(makeNotifyCrisis({ z, env: Deno.env, fetchImpl: fetch }));
```

**`supabase/functions/notify-crisis/handler.test.js`**

```js
import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { makeNotifyCrisis } from './handler.js';

const EVENT = {
  type: 'INSERT',
  table: 'crisis_events',
  schema: 'public',
  record: {
    id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    student_id: '11111111-1111-1111-1111-111111111111',
    disclosed: {
      full_name: 'Ana Reyes',
      grade_level: 12,
      section: 'HUMSS-A',
      class_adviser: 'Mr. Ramon Cruz',
    },
    trigger_item_id: 'aaaaaaa1-0000-0000-0000-000000000001',
  },
  old_record: null,
};

const ALL = {
  WEBHOOK_SECRET: 's3cret',
  SMS_GATEWAY_URL: 'https://sms.example.test/send',
  SMS_GATEWAY_TOKEN: 'tok',
  ONCALL_CONTACT_NUMBER: '+630000000000',
};

function setup(values = ALL, fetchResult = { ok: true }) {
  const env = { get: (k) => values[k] };
  const fetchImpl = vi.fn(async () => fetchResult);
  return { handler: makeNotifyCrisis({ z, env, fetchImpl }), fetchImpl };
}

const post = (body, secret = 's3cret') =>
  new Request('http://local/notify-crisis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'x-hingaweb-webhook-secret': secret } : {}),
    },
    body: JSON.stringify(body),
  });

describe('notify-crisis (2.1.6.1.6; 2.1.6.4.7)', () => {
  it('rejects a call without the webhook secret', async () => {
    const { handler, fetchImpl } = setup();
    expect((await handler(post(EVENT, null))).status).toBe(401);
    expect((await handler(post(EVENT, 'wrong'))).status).toBe(401);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fails closed when WEBHOOK_SECRET is not set', async () => {
    const { handler } = setup({ ...ALL, WEBHOOK_SECRET: undefined });
    expect((await handler(post(EVENT, 'anything'))).status).toBe(401);
  });

  it('rejects anything that is not a crisis_events INSERT', async () => {
    const { handler } = setup();
    expect((await handler(post({ ...EVENT, table: 'support_requests' }))).status).toBe(400);
    expect((await handler(post({ ...EVENT, type: 'UPDATE' }))).status).toBe(400);
  });

  it('does nothing (and says so) until the SMS gateway is configured', async () => {
    const { handler, fetchImpl } = setup({ WEBHOOK_SECRET: 's3cret' });
    const res = await handler(post(EVENT));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: false, reason: 'sms_not_configured' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('sends one text with the Ref only: no name, grade, section, adviser, or item', async () => {
    const { handler, fetchImpl } = setup();
    const res = await handler(post(EVENT));
    expect(await res.json()).toEqual({ sent: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(ALL.SMS_GATEWAY_URL);
    expect(init.headers.Authorization).toBe('Bearer tok');
    const body = JSON.parse(init.body);
    expect(body).toEqual({
      to: ALL.ONCALL_CONTACT_NUMBER,
      message: 'HingaWeb: a crisis event was raised (Ref 7c9e6679). Open the crisis channel now.',
    });
    for (const word of ['Ana', 'Reyes', 'HUMSS', 'Cruz', '12', 'aaaaaaa1']) {
      expect(body.message).not.toContain(word);
    }
  });

  it('reports a gateway failure without throwing', async () => {
    const { handler } = setup(ALL, { ok: false });
    const res = await handler(post(EVENT));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ sent: false, reason: 'gateway_error' });
  });
});
```

**`supabase/functions/.env.example`** — committed; copy it to `supabase/functions/.env` (already git-ignored by the `.env` rule)

```bash
# Local Edge Function secrets (Phase 05). Copy to supabase/functions/.env, which git ignores.
# Never put a real gateway token in this example file.
#
# WEBHOOK_SECRET: any long random string. The same value goes in the Database Webhook header.
WEBHOOK_SECRET=local-dev-webhook-secret-change-me
# ALLOWED_ORIGIN: the site origin allowed to call the functions. Empty means any origin (local only).
ALLOWED_ORIGIN=
# SMS channel (2.1.6.1.6, a Capstone 2 build item). Leave empty until the gateway exists.
SMS_GATEWAY_URL=
SMS_GATEWAY_TOKEN=
ONCALL_CONTACT_NUMBER=
```

### Step 5 — `supabase/config.toml` (append at the end; change nothing else)

```toml
# ---- HingaWeb Edge Functions (Phase 05 and Phase 06) ----
[functions.evaluate-checkin]
enabled = true
verify_jwt = true
entrypoint = "./functions/evaluate-checkin/index.js"

[functions.notify-crisis]
enabled = true
# Called by the Database Webhook, not by a signed-in user. The x-hingaweb-webhook-secret header
# is checked instead (Phase 05).
verify_jwt = false
entrypoint = "./functions/notify-crisis/index.js"
```

Run the functions locally in a second terminal and leave it running while you test:

```bash
cp supabase/functions/.env.example supabase/functions/.env
npx supabase functions serve --env-file supabase/functions/.env
```

### Step 6 — Check-in items and copy

**`src/config/checkin-items.js`**

```js
// Phase 05 · check-in items (00 Section 6.3; 2.1.5.1.3; Fig 11; D-08, D-09).
// Wording is in src/copy/en/checkin.js. This file says which column each item fills, which
// answer scale it uses, and how the tapped answer becomes the stored value.
import { ANSWER_SCALE, MOOD_SCALE, STRESS_SCALE } from './vocabulary.js';

/**
 * 2.1.5.1.3: the items are co-designed with the validator panel before the form is final.
 * Set to 'final' only after co-design. build:pilot fails until then.
 */
export const CHECKIN_ITEMS_STATUS = 'provisional';

/**
 * The six check-in questions, in screen order.
 * - c1..c4 feed Equation 1 and content-based filtering; stored 1-5, higher = more urgent (2.2.2.1).
 * - c4 is worded the opposite way (Fig 11, D-09), so its stored value is 6 minus the tapped answer.
 *   If co-design rewords C4 so that "Very much" means harder, set reverseCoded to false.
 * - mood and stress are for the student's own trends only (D-08). Never scored, never shared.
 */
export const CHECKIN_ITEMS = Object.freeze([
  Object.freeze({
    column: 'c1',
    textKey: 'checkin.items.c1',
    scale: ANSWER_SCALE,
    reverseCoded: false,
  }),
  Object.freeze({
    column: 'c2',
    textKey: 'checkin.items.c2',
    scale: ANSWER_SCALE,
    reverseCoded: false,
  }),
  Object.freeze({
    column: 'c3',
    textKey: 'checkin.items.c3',
    scale: ANSWER_SCALE,
    reverseCoded: false,
  }),
  Object.freeze({
    column: 'c4',
    textKey: 'checkin.items.c4',
    hintKey: 'checkin.items.c4Hint',
    scale: ANSWER_SCALE,
    reverseCoded: true,
  }),
  Object.freeze({
    column: 'mood',
    textKey: 'checkin.items.mood',
    scale: MOOD_SCALE,
    reverseCoded: false,
  }),
  Object.freeze({
    column: 'stress',
    textKey: 'checkin.items.stress',
    scale: STRESS_SCALE,
    reverseCoded: false,
  }),
]);

/** The value written to the database for the answer the student tapped (1-5). */
export function storedValue(item, tapped) {
  return item.reverseCoded ? 6 - tapped : tapped;
}

/** The answer the student tapped, recovered from a stored value. Used by the trends view (D-09). */
export function tappedValue(item, stored) {
  return item.reverseCoded ? 6 - stored : stored;
}

export function itemFor(column) {
  return CHECKIN_ITEMS.find((i) => i.column === column);
}
```

**`src/config/checkin-items.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { CHECKIN_ITEMS, CHECKIN_ITEMS_STATUS, storedValue, tappedValue } from './checkin-items.js';
import { checkinCopy } from '../copy/en/checkin.js';

describe('check-in items (00 Section 6.3; D-08, D-09)', () => {
  it('has the six columns in screen order and stays provisional until co-design', () => {
    expect(CHECKIN_ITEMS.map((i) => i.column)).toEqual(['c1', 'c2', 'c3', 'c4', 'mood', 'stress']);
    expect(CHECKIN_ITEMS_STATUS).toBe('provisional');
  });

  it('every item has English text', () => {
    for (const i of CHECKIN_ITEMS) {
      const key = i.textKey.split('.').pop();
      expect(checkinCopy.items[key]).toBeTruthy();
    }
  });

  it('only C4 is reverse-coded: tapping "Very much" (5) stores 1', () => {
    expect(CHECKIN_ITEMS.filter((i) => i.reverseCoded).map((i) => i.column)).toEqual(['c4']);
    const c4 = CHECKIN_ITEMS[3];
    expect([1, 2, 3, 4, 5].map((v) => storedValue(c4, v))).toEqual([5, 4, 3, 2, 1]);
    expect([1, 2, 3, 4, 5].map((v) => tappedValue(c4, storedValue(c4, v)))).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(storedValue(CHECKIN_ITEMS[0], 5)).toBe(5);
  });
});
```

**`src/copy/en/checkin.js`** — every English string for Figs 11, 15, 18

```js
// Phase 05 copy: private check-in (Fig 11), the prompt (Fig 15), and the crisis screen (Fig 18).
// The crisis keys also exist in ceb.js and tl.js as team placeholders (00 Section 10.2).
export const checkinCopy = {
  chip: 'Private to your account • Staff cannot browse your check-ins',
  title: 'How have things been?',
  lead: 'Only you can see this. Take a quiet breath and answer however feels true today.',
  items: {
    c1: 'School work and academic pressure has been affecting me.',
    c2: 'Things at home, family, or money have been affecting me.',
    c3: 'Worries about graduating, college, or my future have been affecting me.',
    c4: 'I have been able to manage what I am carrying.',
    c4Hint: 'Answer honestly. There is no right answer here.',
    mood: 'How has your mood been today?',
    stress: 'How stressed have you felt today?',
  },
  note: {
    title: 'Anything you want to write down?',
    label: 'Optional note',
    placeholder: 'Write anything on your mind...',
    hint: 'This is stored as you write it. Nothing reads it or analyses it.',
  },
  safety: {
    title: 'Please tell us if any of these apply',
    body: 'If you tick any of these, we will show you help right away and let the guidance office know.',
    loadError: 'These could not load.',
    loadErrorHelp: 'If you need help now, open Where to get help.',
    helpLink: 'Where to get help',
    empty: 'If you need help now, the hotlines are on Where to get help.',
  },
  required: 'Answer questions 1 to 6 to save. The note is optional.',
  save: 'Save check-in',
  cancel: 'Cancel and return',
  saveError:
    'Your check-in was not saved. Check your connection and try again. Your answers are still here.',
  saved: {
    chip: 'Check-in saved privately',
    title: 'Your check-in is saved',
    body: 'Only you can see it. Nothing was sent to the guidance office.',
    trends: 'See my check-ins over time',
    resources: 'See suggested guides',
    request: 'Ask the guidance office for support',
    home: 'Back to home',
  },
  prompt: {
    chip: 'Check-in saved privately',
    title: 'Would you like to send this to the guidance office?',
    body: 'If you would like support, you can ask the guidance office. Nothing is sent unless you choose to send it, and you will see exactly what is shared first.',
    send: 'Continue to send a request',
    notNow: 'Not now',
    footer: 'If you choose Not now, nobody is told. Only you can see that you chose it.',
  },
};

export const crisisCopy = {
  notice: 'This service is not for emergencies. If you are in immediate danger, call this number:',
  chip: 'Guidance safety response • {school}',
  languageLabel: 'Language',
  title: 'Help is available right now',
  lead: 'Thank you for telling us. You do not have to handle this on your own.',
  hotlinesHeading: 'People you can call now',
  call: 'Call {number}',
  callLabel: 'Call {name} at {number}',
  officeTitle: 'Your school guidance office',
  officeCall: 'Call guidance',
  officeCallLabel: 'Call the guidance office at {number}',
  nextTitle: 'What happens next',
  nextBody:
    'Because you told us about this, the guidance office will be told so that someone can check in with you. This is the one thing HingaWeb shares without asking first, and you were told about it before you started.',
  statusSending: 'Letting the guidance office know…',
  statusSent: 'The guidance office has been told.',
  statusRetrying:
    'We could not reach the guidance office yet. Keep this page open and we will keep trying. You can also call them with the button above.',
  statusOffline:
    "You're offline. We will tell the guidance office as soon as you're back online. The hotlines above work now.",
  statusFailed:
    'We could not tell the guidance office through HingaWeb. Please call them now with the button above.',
  back: 'Back to my check-in',
};
```

**`src/copy/en/index.js`**

```js
// Copy sections added by Phases 03 onward. Each phase replaces this file with one more line.
import { publicCopy } from './public.js';
import { assentCopy, waitingCopy } from './assent.js';
import { checkinCopy, crisisCopy } from './checkin.js';

export const sections = {
  public: publicCopy,
  assent: assentCopy,
  waiting: waitingCopy,
  checkin: checkinCopy,
  crisis: crisisCopy,
};
```

Cebuano and Tagalog: 19 crisis keys added as team placeholders, next to the 32 assent keys. **Never fill these with AI or a translation service.** When the team fills them, keep `{number}`, `{name}`, and `{school}` exactly as written.

**`src/copy/ceb.js`**

```js
// Cebuano (Bisaya) text for the assent walkthrough and the crisis screen (2.1.6.3.1).
// WRITTEN BY THE HINGAWEB TEAM, NOT BY AI TRANSLATION (00 Section 10.2).
// Replace each placeholder with the team's text. Keep every key and every {name} token
// (for example {number}) exactly as written, so the numbers still appear.
export const ceb = {
  assent: {
    step: '[[TEAM:CEB:assent.step]]',
    languageLabel: '[[TEAM:CEB:assent.languageLabel]]',
    title: '[[TEAM:CEB:assent.title]]',
    lead: '[[TEAM:CEB:assent.lead]]',
    card1Title: '[[TEAM:CEB:assent.card1Title]]',
    card1Body: '[[TEAM:CEB:assent.card1Body]]',
    card2Title: '[[TEAM:CEB:assent.card2Title]]',
    card2Body: '[[TEAM:CEB:assent.card2Body]]',
    card3Title: '[[TEAM:CEB:assent.card3Title]]',
    card3Body: '[[TEAM:CEB:assent.card3Body]]',
    detailsToggle: '[[TEAM:CEB:assent.detailsToggle]]',
    detailsSaved: '[[TEAM:CEB:assent.detailsSaved]]',
    detailsSavedBody: '[[TEAM:CEB:assent.detailsSavedBody]]',
    detailsShared: '[[TEAM:CEB:assent.detailsShared]]',
    detailsSharedBody: '[[TEAM:CEB:assent.detailsSharedBody]]',
    detailsException: '[[TEAM:CEB:assent.detailsException]]',
    detailsExceptionBody: '[[TEAM:CEB:assent.detailsExceptionBody]]',
    detailsWho: '[[TEAM:CEB:assent.detailsWho]]',
    detailsWhoBody: '[[TEAM:CEB:assent.detailsWhoBody]]',
    detailsNot: '[[TEAM:CEB:assent.detailsNot]]',
    detailsNotBody: '[[TEAM:CEB:assent.detailsNotBody]]',
    detailsParent: '[[TEAM:CEB:assent.detailsParent]]',
    detailsParentBody: '[[TEAM:CEB:assent.detailsParentBody]]',
    detailsKept: '[[TEAM:CEB:assent.detailsKept]]',
    detailsKeptBody: '[[TEAM:CEB:assent.detailsKeptBody]]',
    detailsStop: '[[TEAM:CEB:assent.detailsStop]]',
    detailsStopBody: '[[TEAM:CEB:assent.detailsStopBody]]',
    understand: '[[TEAM:CEB:assent.understand]]',
    notNow: '[[TEAM:CEB:assent.notNow]]',
    continue: '[[TEAM:CEB:assent.continue]]',
    footer: '[[TEAM:CEB:assent.footer]]',
    saveError: '[[TEAM:CEB:assent.saveError]]',
  },
  crisis: {
    notice: '[[TEAM:CEB:crisis.notice]]',
    chip: '[[TEAM:CEB:crisis.chip]]',
    languageLabel: '[[TEAM:CEB:crisis.languageLabel]]',
    title: '[[TEAM:CEB:crisis.title]]',
    lead: '[[TEAM:CEB:crisis.lead]]',
    hotlinesHeading: '[[TEAM:CEB:crisis.hotlinesHeading]]',
    call: '[[TEAM:CEB:crisis.call]]',
    callLabel: '[[TEAM:CEB:crisis.callLabel]]',
    officeTitle: '[[TEAM:CEB:crisis.officeTitle]]',
    officeCall: '[[TEAM:CEB:crisis.officeCall]]',
    officeCallLabel: '[[TEAM:CEB:crisis.officeCallLabel]]',
    nextTitle: '[[TEAM:CEB:crisis.nextTitle]]',
    nextBody: '[[TEAM:CEB:crisis.nextBody]]',
    statusSending: '[[TEAM:CEB:crisis.statusSending]]',
    statusSent: '[[TEAM:CEB:crisis.statusSent]]',
    statusRetrying: '[[TEAM:CEB:crisis.statusRetrying]]',
    statusOffline: '[[TEAM:CEB:crisis.statusOffline]]',
    statusFailed: '[[TEAM:CEB:crisis.statusFailed]]',
    back: '[[TEAM:CEB:crisis.back]]',
  },
};
```

**`src/copy/tl.js`**

```js
// Tagalog text for the assent walkthrough and the crisis screen (2.1.6.3.1).
// WRITTEN BY THE HINGAWEB TEAM, NOT BY AI TRANSLATION (00 Section 10.2).
// Replace each placeholder with the team's text. Keep every key and every {name} token
// (for example {number}) exactly as written, so the numbers still appear.
export const tl = {
  assent: {
    step: '[[TEAM:TL:assent.step]]',
    languageLabel: '[[TEAM:TL:assent.languageLabel]]',
    title: '[[TEAM:TL:assent.title]]',
    lead: '[[TEAM:TL:assent.lead]]',
    card1Title: '[[TEAM:TL:assent.card1Title]]',
    card1Body: '[[TEAM:TL:assent.card1Body]]',
    card2Title: '[[TEAM:TL:assent.card2Title]]',
    card2Body: '[[TEAM:TL:assent.card2Body]]',
    card3Title: '[[TEAM:TL:assent.card3Title]]',
    card3Body: '[[TEAM:TL:assent.card3Body]]',
    detailsToggle: '[[TEAM:TL:assent.detailsToggle]]',
    detailsSaved: '[[TEAM:TL:assent.detailsSaved]]',
    detailsSavedBody: '[[TEAM:TL:assent.detailsSavedBody]]',
    detailsShared: '[[TEAM:TL:assent.detailsShared]]',
    detailsSharedBody: '[[TEAM:TL:assent.detailsSharedBody]]',
    detailsException: '[[TEAM:TL:assent.detailsException]]',
    detailsExceptionBody: '[[TEAM:TL:assent.detailsExceptionBody]]',
    detailsWho: '[[TEAM:TL:assent.detailsWho]]',
    detailsWhoBody: '[[TEAM:TL:assent.detailsWhoBody]]',
    detailsNot: '[[TEAM:TL:assent.detailsNot]]',
    detailsNotBody: '[[TEAM:TL:assent.detailsNotBody]]',
    detailsParent: '[[TEAM:TL:assent.detailsParent]]',
    detailsParentBody: '[[TEAM:TL:assent.detailsParentBody]]',
    detailsKept: '[[TEAM:TL:assent.detailsKept]]',
    detailsKeptBody: '[[TEAM:TL:assent.detailsKeptBody]]',
    detailsStop: '[[TEAM:TL:assent.detailsStop]]',
    detailsStopBody: '[[TEAM:TL:assent.detailsStopBody]]',
    understand: '[[TEAM:TL:assent.understand]]',
    notNow: '[[TEAM:TL:assent.notNow]]',
    continue: '[[TEAM:TL:assent.continue]]',
    footer: '[[TEAM:TL:assent.footer]]',
    saveError: '[[TEAM:TL:assent.saveError]]',
  },
  crisis: {
    notice: '[[TEAM:TL:crisis.notice]]',
    chip: '[[TEAM:TL:crisis.chip]]',
    languageLabel: '[[TEAM:TL:crisis.languageLabel]]',
    title: '[[TEAM:TL:crisis.title]]',
    lead: '[[TEAM:TL:crisis.lead]]',
    hotlinesHeading: '[[TEAM:TL:crisis.hotlinesHeading]]',
    call: '[[TEAM:TL:crisis.call]]',
    callLabel: '[[TEAM:TL:crisis.callLabel]]',
    officeTitle: '[[TEAM:TL:crisis.officeTitle]]',
    officeCall: '[[TEAM:TL:crisis.officeCall]]',
    officeCallLabel: '[[TEAM:TL:crisis.officeCallLabel]]',
    nextTitle: '[[TEAM:TL:crisis.nextTitle]]',
    nextBody: '[[TEAM:TL:crisis.nextBody]]',
    statusSending: '[[TEAM:TL:crisis.statusSending]]',
    statusSent: '[[TEAM:TL:crisis.statusSent]]',
    statusRetrying: '[[TEAM:TL:crisis.statusRetrying]]',
    statusOffline: '[[TEAM:TL:crisis.statusOffline]]',
    statusFailed: '[[TEAM:TL:crisis.statusFailed]]',
    back: '[[TEAM:TL:crisis.back]]',
  },
};
```

### Step 7 — Check-in screen and prompt

**`src/features/checkin/checkinDraft.js`**

```js
// The check-in the student is filling in, kept in page memory only (00 must-never 14).
// It survives a trip to the crisis screen and back, and is gone when the tab closes or the page
// reloads. It belongs to one signed-in student: another account never sees it.

let saved = null; // { owner, answers, note, ticked }

export function emptyDraft() {
  return { answers: {}, note: '', ticked: [] };
}

/** The draft for this student, or an empty one. */
export function loadDraft(owner) {
  if (!saved || saved.owner !== owner) return emptyDraft();
  return { answers: { ...saved.answers }, note: saved.note, ticked: [...saved.ticked] };
}

export function saveDraft(owner, draft) {
  saved = { owner, answers: { ...draft.answers }, note: draft.note, ticked: [...draft.ticked] };
}

export function clearDraft() {
  saved = null;
}
```

**`src/features/checkin/useCrisisItems.js`**

```js
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';

/**
 * The active crisis items (Table 12). Labels come from the database, never from code (00 §11.2).
 * RLS shows students only active items. protocol_ref is never read here.
 * @returns {{ status: 'loading'|'error'|'ready', items: {id: string, label: string}[], reload: () => void }}
 */
export function useCrisisItems() {
  const [state, setState] = useState({ status: 'loading', items: [] });
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }));
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let active = true;
    supabase
      .from('crisis_items')
      .select('id, label')
      .eq('is_active', true)
      .order('label', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        setState(error ? { status: 'error', items: [] } : { status: 'ready', items: data ?? [] });
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  return { ...state, reload };
}
```

**`src/features/checkin/PromptDialog.jsx`**

```jsx
// Fig 15 · student-mediated prompt (2.1.5.1.7; D-13; P05-D2, P05-D3).
// The two buttons have equal weight (same size, side by side). Not dismissible by Escape or a
// close button: the student answers with one of the two buttons.
import { Check, MessageCircleMore } from 'lucide-react';
import { t } from '../../copy/index.js';
import { Button, Chip, Dialog } from '../../components/ui/index.js';

export function PromptDialog({ open, busy = false, onSend, onNotNow }) {
  return (
    <Dialog open={open} title={t('checkin.prompt.title')} dismissible={false}>
      <div className="flex flex-col gap-4">
        <span
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-full bg-blush"
        >
          <MessageCircleMore className="size-6 text-ink" />
        </span>
        <Chip className="self-start">
          <Check aria-hidden="true" className="size-4" />
          {t('checkin.prompt.chip')}
        </Chip>
        <p className="text-base text-ink-muted">{t('checkin.prompt.body')}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button size="lg" onClick={onSend} disabled={busy}>
            {t('checkin.prompt.send')}
          </Button>
          <Button size="lg" variant="outline" onClick={onNotNow} loading={busy}>
            {t('checkin.prompt.notNow')}
          </Button>
        </div>
        <p className="text-center text-[13px] text-ink-muted">{t('checkin.prompt.footer')}</p>
      </div>
    </Dialog>
  );
}
```

**`src/features/checkin/CheckInPage.jsx`**

```jsx
// Fig 11 · private check-in (2.1.5.1.3, 2.1.5.1.4, 2.1.5.1.7, 2.1.6.2.7; D-08, D-09; N-01).
// Owner-only: the row is written with the student's own session and RLS. No score is ever shown.
// Ticking a crisis item opens /crisis at once (no server wait) and sends the event in the background.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Check, Lock, Shield } from 'lucide-react';
import { t } from '../../copy/index.js';
import { CHECKIN_ITEMS, storedValue } from '../../config/checkin-items.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import {
  Button,
  Card,
  Checkbox,
  Chip,
  Field,
  LinkButton,
  ScaleButtons,
  Skeleton,
  Textarea,
} from '../../components/ui/index.js';
import { FormMessage } from '../auth/AuthCard.jsx';
import { clearDraft, loadDraft, saveDraft } from './checkinDraft.js';
import { useCrisisItems } from './useCrisisItems.js';
import { PromptDialog } from './PromptDialog.jsx';
import { reportCrisisItem, useCrisisReport } from '../crisis/crisisReport.js';
import { CrisisStatus } from '../crisis/CrisisStatus.jsx';

export function CheckInPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const owner = session.user.id;
  const [draft, setDraft] = useState(() => loadDraft(owner));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [prompt, setPrompt] = useState(null); // { checkinId, type } while Fig 15 is open
  const [dismissing, setDismissing] = useState(false);
  const [saved, setSaved] = useState(false);
  const crisisItems = useCrisisItems();
  const report = useCrisisReport(owner);

  const update = (patch) => {
    setDraft((d) => {
      const next = { ...d, ...patch };
      saveDraft(owner, next);
      return next;
    });
  };
  const answer = (column, value) => update({ answers: { ...draft.answers, [column]: value } });
  const complete = CHECKIN_ITEMS.every((i) => draft.answers[i.column] != null);

  const onTick = (itemId) => {
    if (draft.ticked.includes(itemId)) return;
    update({ ticked: [...draft.ticked, itemId] });
    reportCrisisItem(owner, itemId); // background; never awaited (2.1.6.1.6)
    navigate('/crisis');
  };

  const onSave = async () => {
    setError('');
    setSaving(true);
    const row = { student_id: owner, note: draft.note.trim() === '' ? null : draft.note };
    for (const item of CHECKIN_ITEMS)
      row[item.column] = storedValue(item, draft.answers[item.column]);
    const { data, error: insertError } = await supabase
      .from('checkins')
      .insert(row)
      .select('id')
      .single();
    if (insertError || !data) {
      setSaving(false);
      setError(t('checkin.saveError'));
      return;
    }
    // Saved. The prompt check runs on the server; only the prompt type comes back (N-01).
    clearDraft();
    setDraft(loadDraft(owner));
    const { data: result, error: fnError } = await supabase.functions.invoke('evaluate-checkin', {
      body: { checkin_id: data.id },
    });
    setSaving(false);
    if (!fnError && (result?.prompt === 'max_sev' || result?.prompt === 'gray_zone')) {
      setPrompt({ checkinId: data.id, type: result.prompt });
    } else {
      setSaved(true);
    }
  };

  const onSend = () => {
    navigate('/request', { state: { promptCheckinId: prompt.checkinId, promptType: prompt.type } });
  };

  const onNotNow = async () => {
    setDismissing(true);
    // Owner-only record of the student's own answer (Table 19). Never shown to staff.
    const { error: dismissError } = await supabase.from('prompt_events').insert({
      student_id: owner,
      checkin_id: prompt.checkinId,
      type: prompt.type,
      outcome: 'dismissed',
    });
    if (dismissError && import.meta.env.DEV) console.error('prompt_events insert failed');
    setDismissing(false);
    setPrompt(null);
    setSaved(true);
  };

  if (saved) return <SavedCard />;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Chip className="self-start">
          <Lock aria-hidden="true" className="size-4" />
          {t('checkin.chip')}
        </Chip>
        <h1 className="text-[28px] font-semibold leading-9 text-ink md:text-[32px] md:leading-10">
          {t('checkin.title')}
        </h1>
        <p className="text-base text-ink-muted">{t('checkin.lead')}</p>
      </header>

      {CHECKIN_ITEMS.map((item, i) => (
        <Card key={item.column}>
          <ScaleButtons
            name={item.column}
            legend={`${i + 1}. ${t(item.textKey)}`}
            hint={item.hintKey ? t(item.hintKey) : ''}
            options={item.scale}
            value={draft.answers[item.column] ?? null}
            onChange={(v) => answer(item.column, v)}
          />
        </Card>
      ))}

      <Card>
        <h2 className="mb-4 text-[17px] font-semibold text-ink">{t('checkin.note.title')}</h2>
        <Field id="checkin-note" label={t('checkin.note.label')} hint={t('checkin.note.hint')}>
          <Textarea
            value={draft.note}
            placeholder={t('checkin.note.placeholder')}
            onChange={(e) => update({ note: e.target.value })}
          />
        </Field>
      </Card>

      <section
        aria-labelledby="safety-title"
        className="flex flex-col gap-3 rounded-card border-2 border-ink bg-surface p-5 md:p-6"
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-control bg-blush"
          >
            <Shield className="size-5 text-ink" />
          </span>
          <h2 id="safety-title" className="text-[17px] font-semibold text-ink">
            {t('checkin.safety.title')}
          </h2>
        </div>
        <SafetyItems crisisItems={crisisItems} ticked={draft.ticked} onTick={onTick} />
        <p className="text-[14px] text-ink-muted">{t('checkin.safety.body')}</p>
        <CrisisStatus report={report} />
      </section>

      <FormMessage>{error}</FormMessage>
      {!complete && <p className="text-[14px] text-ink-muted">{t('checkin.required')}</p>}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <LinkButton to="/" variant="ghost">
          {t('checkin.cancel')}
        </LinkButton>
        <Button
          size="lg"
          onClick={onSave}
          disabled={!complete}
          loading={saving}
          iconLeft={<Check aria-hidden="true" className="size-5" />}
        >
          {t('checkin.save')}
        </Button>
      </div>

      <PromptDialog open={prompt != null} busy={dismissing} onSend={onSend} onNotNow={onNotNow} />
    </div>
  );
}

function SafetyItems({ crisisItems, ticked, onTick }) {
  if (crisisItems.status === 'loading') return <Skeleton lines={3} />;
  if (crisisItems.status === 'error') {
    return (
      <div role="alert" className="flex flex-col gap-2 text-[14px] text-ink">
        <p className="font-semibold">{t('checkin.safety.loadError')}</p>
        <p>
          {t('checkin.safety.loadErrorHelp')}{' '}
          <Link to="/help" className="font-semibold underline">
            {t('checkin.safety.helpLink')}
          </Link>
        </p>
        <Button variant="outline" className="self-start" onClick={crisisItems.reload}>
          {t('common.error.retry')}
        </Button>
      </div>
    );
  }
  if (crisisItems.items.length === 0) {
    return (
      <p className="text-[14px] text-ink">
        {t('checkin.safety.empty')}{' '}
        <Link to="/help" className="font-semibold underline">
          {t('checkin.safety.helpLink')}
        </Link>
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {crisisItems.items.map((item) => (
        <li key={item.id} className="rounded-control bg-canvas px-3">
          <Checkbox
            id={`crisis-${item.id}`}
            label={item.label}
            checked={ticked.includes(item.id)}
            disabled={ticked.includes(item.id)}
            onChange={(on) => on && onTick(item.id)}
          />
        </li>
      ))}
    </ul>
  );
}

function SavedCard() {
  return (
    <Card className="flex flex-col gap-4">
      <Chip className="self-start">
        <Check aria-hidden="true" className="size-4" />
        {t('checkin.saved.chip')}
      </Chip>
      <h1 tabIndex={-1} className="text-[24px] font-semibold leading-8 text-ink">
        {t('checkin.saved.title')}
      </h1>
      <p role="status" className="text-base text-ink-muted">
        {t('checkin.saved.body')}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <LinkButton to="/trends">{t('checkin.saved.trends')}</LinkButton>
        <LinkButton to="/resources" variant="outline">
          {t('checkin.saved.resources')}
        </LinkButton>
        <LinkButton to="/request" variant="outline">
          {t('checkin.saved.request')}
        </LinkButton>
      </div>
      <LinkButton to="/" variant="ghost" className="self-start">
        {t('checkin.saved.home')}
      </LinkButton>
    </Card>
  );
}
```

### Step 8 — Crisis screen and background sending

**`src/features/crisis/crisisReport.js`**

```js
// Sends crisis events (Table 11; 2.1.6.1.6; 2.1.6.4.7) in the background, so the crisis screen
// never waits for the server. Each ticked crisis item becomes one crisis_events row.
// The browser sends ONLY student_id and trigger_item_id; the database fills the disclosed copy
// (N-02). Never chain .select() on this insert: students cannot read crisis_events.
//
// Kept in page memory only (00 must-never 14). If the network is down it waits for 'online';
// if the server fails it keeps retrying while the page is open.
import { useSyncExternalStore } from 'react';
import { supabase } from '../../lib/supabase.js';

/** Errors that will never succeed on retry (missing/retired item, not a student, unknown student). */
const PERMANENT = new Set(['23502', '23503', '23514', '42501']);
/** Wait before each retry, in ms. The last value repeats. */
export const RETRY_DELAYS = [2000, 5000, 10000, 15000];

const IDLE = Object.freeze({ owner: null, status: 'idle', pending: [], sent: [], failed: [] });
let state = IDLE;
let sending = false;
let attempt = 0;
let timer = null;
const listeners = new Set();

function set(patch) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

function offline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function onOnline() {
  void flush();
}

async function flush() {
  if (sending) return;
  sending = true;
  clearTimeout(timer);
  while (state.pending.length) {
    const itemId = state.pending[0];
    set({ status: 'sending' });
    let error;
    try {
      ({ error } = await supabase
        .from('crisis_events')
        .insert({ student_id: state.owner, trigger_item_id: itemId }));
    } catch {
      error = { code: 'network' };
    }
    if (!error) {
      attempt = 0;
      set({ pending: state.pending.slice(1), sent: [...state.sent, itemId] });
      continue;
    }
    if (PERMANENT.has(error.code)) {
      set({ pending: state.pending.slice(1), failed: [...state.failed, itemId] });
      continue;
    }
    // Temporary problem: try again later. Nothing is lost while the page stays open.
    sending = false;
    if (offline()) {
      set({ status: 'offline' });
      window.addEventListener('online', onOnline, { once: true });
    } else {
      set({ status: 'retrying' });
      timer = setTimeout(flush, RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)]);
      attempt += 1;
    }
    return;
  }
  sending = false;
  set({ status: state.failed.length ? 'failed' : 'sent' });
}

/**
 * Raise a crisis event for this item. Returns at once; sending happens in the background.
 * The same item is never sent twice in one page session.
 */
export function reportCrisisItem(owner, itemId) {
  if (state.owner !== owner) {
    clearTimeout(timer);
    state = { ...IDLE, owner };
  }
  if ([...state.pending, ...state.sent, ...state.failed].includes(itemId)) return;
  set({ pending: [...state.pending, itemId], status: 'sending' });
  void flush();
}

export function getCrisisReport() {
  return state;
}

export function subscribeCrisisReport(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The report for this student ('idle' when they have not ticked anything in this page session). */
export function useCrisisReport(owner) {
  const s = useSyncExternalStore(subscribeCrisisReport, getCrisisReport);
  return s.owner === owner ? s : IDLE;
}

/** Tests only. */
export function resetCrisisReport() {
  clearTimeout(timer);
  if (typeof window !== 'undefined') window.removeEventListener('online', onOnline);
  sending = false;
  attempt = 0;
  state = IDLE;
  for (const l of listeners) l();
}
```

**`src/features/crisis/CrisisStatus.jsx`**

```jsx
// One line saying whether the crisis event has reached the guidance office (2.1.6.4.7).
// Shown on the crisis screen and under the safety items. Nothing shows until an item is ticked.
import { t } from '../../copy/index.js';

const KEYS = {
  sending: 'crisis.statusSending',
  sent: 'crisis.statusSent',
  retrying: 'crisis.statusRetrying',
  offline: 'crisis.statusOffline',
  failed: 'crisis.statusFailed',
};

export function CrisisStatus({ report, lang = 'en' }) {
  const key = KEYS[report.status];
  return (
    <p role="status" aria-live="polite" className="text-[14px] font-semibold text-ink">
      {key ? t(key, {}, lang) : ''}
    </p>
  );
}
```

**`src/features/crisis/CrisisPage.jsx`**

```jsx
// Fig 18 · crisis screen (2.1.5.1.8, 2.1.6.1.6, 2.1.6.3.1, 2.1.6.4.6; D-18, D-24, D-31; P05-D4..D6).
// Renders entirely from the bundle: hotlines and the guidance office come from
// src/content/directory.js, text from src/copy. It never waits for, or reads from, the server.
// The crisis event itself is sent by crisisReport.js in the background.
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, Info, Lock, Phone } from 'lucide-react';
import { t } from '../../copy/index.js';
import { LANGUAGES } from '../../config/consent.js';
import { SITE } from '../../config/site.js';
import { GUIDANCE_OFFICE, HOTLINES, emergencyHotline } from '../../content/directory.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import {
  Card,
  Chip,
  LinkButton,
  SegmentedControl,
  buttonClasses,
} from '../../components/ui/index.js';
import { useCrisisReport } from './crisisReport.js';
import { CrisisStatus } from './CrisisStatus.jsx';

export function CrisisPage() {
  const { session } = useAuth();
  const report = useCrisisReport(session.user.id);
  const [lang, setLang] = useState('en');
  const heading = useRef(null);
  const c = (key, vars = {}) => t(`crisis.${key}`, vars, lang);
  const emergency = emergencyHotline();

  // Move focus to the heading so a screen reader starts here.
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <div lang={lang} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-card border-2 border-ink bg-surface p-4 sm:flex-row sm:items-center">
        <Info aria-hidden="true" className="size-5 shrink-0 text-ink" />
        <p className="flex-1 text-[15px] text-ink">
          {c('notice')}{' '}
          <a href={`tel:${emergency.dial}`} className="font-semibold underline">
            {emergency.number}
          </a>
        </p>
      </div>

      <Card className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Chip>{c('chip', { school: SITE.schoolName })}</Chip>
          <SegmentedControl
            label={c('languageLabel')}
            options={LANGUAGES}
            value={lang}
            onChange={setLang}
          />
        </div>

        <div>
          <h1
            ref={heading}
            tabIndex={-1}
            className="text-[28px] font-semibold leading-9 text-ink md:text-[32px] md:leading-10"
          >
            {c('title')}
          </h1>
          <p className="mt-2 text-base text-ink-muted">{c('lead')}</p>
        </div>

        <section aria-labelledby="crisis-hotlines" className="border-t border-line pt-6">
          <h2 id="crisis-hotlines" className="sr-only">
            {c('hotlinesHeading')}
          </h2>
          <ul className="flex flex-col gap-3">
            {HOTLINES.map((h) => (
              <ContactRow
                key={h.id}
                icon={Phone}
                title={h.name}
                lines={[`${h.number} • ${h.note}`]}
                href={`tel:${h.dial}`}
                action={c('call', { number: h.number })}
                actionLabel={c('callLabel', { name: h.name, number: h.number })}
              />
            ))}
            <ContactRow
              icon={Building2}
              title={c('officeTitle')}
              lines={[
                `${GUIDANCE_OFFICE.personInCharge} • ${GUIDANCE_OFFICE.roleTitle}`,
                `${GUIDANCE_OFFICE.hours} • ${GUIDANCE_OFFICE.location}`,
              ]}
              href={`tel:${GUIDANCE_OFFICE.dial}`}
              action={c('officeCall')}
              actionLabel={c('officeCallLabel', { number: GUIDANCE_OFFICE.phone })}
            />
          </ul>
        </section>

        {report.status !== 'idle' && (
          <section aria-labelledby="crisis-next" className="rounded-card border border-line p-5">
            <h2
              id="crisis-next"
              className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-ink"
            >
              <Lock aria-hidden="true" className="size-4" />
              {c('nextTitle')}
            </h2>
            <p className="mt-2 text-[15px] text-ink">{c('nextBody')}</p>
            <div className="mt-3">
              <CrisisStatus report={report} lang={lang} />
            </div>
          </section>
        )}

        <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <LinkButton
            to="/check-in"
            variant="outline"
            className="self-start"
            aria-label={c('back')}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            <span>{c('back')}</span>
          </LinkButton>
        </div>
      </Card>
    </div>
  );
}

function ContactRow({ icon: Icon, title, lines, href, action, actionLabel }) {
  return (
    <li className="flex flex-col gap-3 rounded-card border border-line bg-canvas p-4 sm:flex-row sm:items-center">
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-control bg-blush"
      >
        <Icon className="size-5 text-ink" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{title}</p>
        {lines.map((line) => (
          <p key={line} className="text-[14px] text-ink-muted">
            {line}
          </p>
        ))}
      </div>
      <a
        href={href}
        aria-label={actionLabel}
        className={buttonClasses('primary', 'md', 'max-w-full self-start sm:self-center')}
      >
        <span>{action}</span>
        <ArrowRight aria-hidden="true" className="size-4" />
      </a>
    </li>
  );
}
```

### Step 9 — Routes

`/check-in` and `/crisis` now point at the real screens. Everything else is unchanged.

**`src/routes.jsx`**

```jsx
// The route table from 00 Section 7. Later phases replace <PhasePlaceholder> elements with their screens.
import { Navigate, Route, Routes } from 'react-router';
import {
  RequireGuest,
  RequireStaff,
  RequireStaffSession,
  RequireStudent,
} from './lib/auth/guards.jsx';
import { PublicLayout } from './components/layout/PublicLayout.jsx';
import { PublicOrStudentLayout } from './components/layout/PublicOrStudentLayout.jsx';
import { StudentLayout } from './components/layout/StudentLayout.jsx';
import { BareLayout } from './components/layout/BareLayout.jsx';
import { PortalLayout } from './components/layout/PortalLayout.jsx';
import { StaffLayout } from './components/layout/StaffLayout.jsx';
import { AdminLayout } from './components/layout/AdminLayout.jsx';
import { RegisterPage } from './features/auth/RegisterPage.jsx';
import { LoginPage } from './features/auth/LoginPage.jsx';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage.jsx';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage.jsx';
import { EmailConfirmedPage } from './features/auth/EmailConfirmedPage.jsx';
import { StaffLoginPage } from './features/auth/StaffLoginPage.jsx';
import { StaffVerifyPage } from './features/auth/StaffVerifyPage.jsx';
import { StaffSetupPage } from './features/auth/StaffSetupPage.jsx';
import { NotFoundPage } from './features/auth/NotFoundPage.jsx';
import { PhasePlaceholder } from './features/placeholder/PhasePlaceholder.jsx';
import { LandingPage } from './features/public/LandingPage.jsx';
import { GuidesPage } from './features/public/GuidesPage.jsx';
import { HelpPage } from './features/public/HelpPage.jsx';
import { AssentPage } from './features/assent/AssentPage.jsx';
import { WaitingForConsentPage } from './features/assent/WaitingForConsentPage.jsx';
import { CheckInPage } from './features/checkin/CheckInPage.jsx';
import { CrisisPage } from './features/crisis/CrisisPage.jsx';

export function AppRoutes() {
  return (
    <Routes>
      {/* Tier 1: public pages; a signed-in student keeps the student header */}
      <Route element={<PublicOrStudentLayout width="wide" />}>
        <Route index element={<LandingPage />} />
      </Route>
      <Route element={<PublicOrStudentLayout />}>
        <Route path="guides" element={<GuidesPage />} />
        <Route path="help" element={<HelpPage />} />
      </Route>

      {/* Student account pages */}
      <Route element={<PublicLayout />}>
        <Route element={<RequireGuest />}>
          <Route path="register" element={<RegisterPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
        </Route>
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="auth/confirmed" element={<EmailConfirmedPage />} />
      </Route>

      {/* Signed-in students, any consent state */}
      <Route element={<RequireStudent />}>
        <Route element={<BareLayout />}>
          <Route path="welcome" element={<AssentPage />} />
          <Route path="waiting-for-consent" element={<WaitingForConsentPage />} />
          <Route path="crisis" element={<CrisisPage />} />
        </Route>
      </Route>

      {/* Tier 2 and Tier 3 students */}
      <Route element={<RequireStudent tier2 />}>
        <Route element={<StudentLayout />}>
          <Route path="check-in" element={<CheckInPage />} />
          <Route path="trends" element={<PhasePlaceholder phase="06" />} />
          <Route path="resources" element={<PhasePlaceholder phase="06" />} />
          <Route path="request" element={<PhasePlaceholder phase="07" />} />
          <Route path="request/sent" element={<PhasePlaceholder phase="07" />} />
        </Route>
      </Route>

      {/* Staff portal: sign in, second factor, first-time setup */}
      <Route path="staff" element={<PortalLayout />}>
        <Route index element={<Navigate to="/staff/login" replace />} />
        <Route element={<RequireGuest />}>
          <Route path="login" element={<StaffLoginPage />} />
        </Route>
        <Route element={<RequireStaffSession />}>
          <Route path="verify" element={<StaffVerifyPage />} />
          <Route path="setup" element={<StaffSetupPage />} />
        </Route>
      </Route>

      {/* Guidance (aal2) */}
      <Route element={<RequireStaff role="guidance" />}>
        <Route element={<StaffLayout />}>
          <Route path="staff/queue" element={<PhasePlaceholder phase="08" />} />
          <Route path="staff/requests/:id" element={<PhasePlaceholder phase="08" />} />
          <Route path="staff/requests/:id/tag" element={<PhasePlaceholder phase="08" />} />
          <Route path="staff/crisis" element={<PhasePlaceholder phase="08" />} />
          <Route path="staff/referrals" element={<PhasePlaceholder phase="08" />} />
        </Route>
      </Route>

      {/* Administrator (aal2) */}
      <Route element={<RequireStaff role="administrator" />}>
        <Route element={<AdminLayout />}>
          <Route path="admin" element={<Navigate to="/admin/accounts" replace />} />
          <Route path="admin/accounts" element={<PhasePlaceholder phase="09" />} />
          <Route path="admin/consent" element={<PhasePlaceholder phase="09" />} />
          <Route path="admin/reference" element={<PhasePlaceholder phase="09" />} />
          <Route path="admin/resources" element={<PhasePlaceholder phase="09" />} />
          <Route path="admin/resources/new" element={<PhasePlaceholder phase="09" />} />
          <Route path="admin/resources/:id" element={<PhasePlaceholder phase="09" />} />
          <Route path="admin/audit" element={<PhasePlaceholder phase="09" />} />
        </Route>
      </Route>

      <Route element={<PublicLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
```

### Step 10 — Tests

**`src/features/checkin/checkin.test.jsx`**

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { renderWithAuth, fakeAuth, STUDENT_T2 } from '../../test/renderWithAuth.jsx';
import { createMockSupabase, queryResult } from '../../test/mockSupabase.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { CheckInPage } = await import('./CheckInPage.jsx');
const { clearDraft } = await import('./checkinDraft.js');
const { resetCrisisReport } = await import('../crisis/crisisReport.js');

const UID = '11111111-1111-1111-1111-111111111111';
const CHECKIN_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const ITEMS = [
  { id: 'aaaaaaa1-0000-4000-8000-000000000001', label: '[[GUIDANCE:crisis_item_1]]' },
  { id: 'aaaaaaa1-0000-4000-8000-000000000002', label: '[[GUIDANCE:crisis_item_2]]' },
];
const auth = () =>
  fakeAuth({ account: STUDENT_T2, session: { user: { id: UID, email: 'x@example.test' } } });

let queries;
function setupClient({
  checkin = { data: { id: CHECKIN_ID }, error: null },
  prompt = null,
  fnError = null,
  items = { data: ITEMS, error: null },
} = {}) {
  queries = { checkins: [], prompt_events: [], crisis_events: [], crisis_items: [] };
  const client = createMockSupabase();
  client.from.mockImplementation((table) => {
    const result =
      table === 'checkins'
        ? checkin
        : table === 'crisis_items'
          ? items
          : { data: null, error: null };
    const q = queryResult(result);
    queries[table].push(q);
    return q;
  });
  client.functions.invoke.mockResolvedValue(
    fnError ? { data: null, error: fnError } : { data: { prompt }, error: null },
  );
  mock.client = client;
  return client;
}

function renderPage(path = '/check-in') {
  return renderWithAuth(
    [
      <Route key="c" path="/check-in" element={<CheckInPage />} />,
      <Route key="x" path="/crisis" element={<p>crisis screen</p>} />,
      <Route key="r" path="/request" element={<RequestProbe />} />,
    ],
    { path, auth: auth() },
  );
}

function RequestProbe() {
  return <p>request screen</p>;
}

async function answerAll(
  user,
  picks = ['Not at all', 'Not at all', 'Not at all', 'Very much', 'Okay', 'A little'],
) {
  const groups = screen.getAllByRole('radiogroup');
  for (let i = 0; i < 6; i += 1) {
    await user.click(within(groups[i]).getByRole('radio', { name: picks[i] }));
  }
}

beforeEach(() => {
  clearDraft();
  resetCrisisReport();
});

describe('CheckInPage (Fig 11; 2.1.5.1.3)', () => {
  it('shows the six questions in order, the note, and the explicit crisis items from the database', async () => {
    setupClient();
    renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: 'How have things been?' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Private to your account • Staff cannot browse your check-ins'),
    ).toBeInTheDocument();
    const legends = screen.getAllByRole('radiogroup').map((g) => g.getAttribute('aria-labelledby'));
    expect(legends.map((id) => document.getElementById(id).textContent)).toEqual([
      '1. School work and academic pressure has been affecting me.',
      '2. Things at home, family, or money have been affecting me.',
      '3. Worries about graduating, college, or my future have been affecting me.',
      '4. I have been able to manage what I am carrying.',
      '5. How has your mood been today?',
      '6. How stressed have you felt today?',
    ]);
    expect(screen.getByText('Answer honestly. There is no right answer here.')).toBeInTheDocument();
    expect(screen.getByLabelText('Optional note')).toBeInTheDocument();
    expect(
      screen.getByText('This is stored as you write it. Nothing reads it or analyses it.'),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText('[[GUIDANCE:crisis_item_1]]')).not.toBeChecked();
    expect(queries.crisis_items[0].calls).toEqual([
      ['select', 'id, label'],
      ['eq', 'is_active', true],
      ['order', 'label', { ascending: true }],
    ]);
  });

  it('keeps Save disabled until all six are answered', async () => {
    setupClient();
    const user = userEvent.setup();
    renderPage();
    const save = screen.getByRole('button', { name: 'Save check-in' });
    expect(save).toBeDisabled();
    expect(
      screen.getByText('Answer questions 1 to 6 to save. The note is optional.'),
    ).toBeInTheDocument();
    await answerAll(user);
    expect(save).toBeEnabled();
  });

  it('writes stored values (C4 reversed), a null note when blank, then asks only for the prompt type', async () => {
    const client = setupClient({ prompt: null });
    const user = userEvent.setup();
    renderPage();
    await answerAll(user);
    await user.click(screen.getByRole('button', { name: 'Save check-in' }));
    expect(
      await screen.findByRole('heading', { name: 'Your check-in is saved' }),
    ).toBeInTheDocument();
    expect(queries.checkins[0].calls).toEqual([
      ['insert', { student_id: UID, note: null, c1: 1, c2: 1, c3: 1, c4: 1, mood: 3, stress: 2 }],
      ['select', 'id'],
      ['single'],
    ]);
    expect(client.functions.invoke).toHaveBeenCalledWith('evaluate-checkin', {
      body: { checkin_id: CHECKIN_ID },
    });
    expect(
      screen.getByText('Only you can see it. Nothing was sent to the guidance office.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stores the note exactly as written', async () => {
    setupClient();
    const user = userEvent.setup();
    renderPage();
    await answerAll(user);
    await user.type(screen.getByLabelText('Optional note'), '  my own words  ');
    await user.click(screen.getByRole('button', { name: 'Save check-in' }));
    await screen.findByRole('heading', { name: 'Your check-in is saved' });
    expect(queries.checkins[0].calls[0][1].note).toBe('  my own words  ');
  });

  it('on a failed save says so, shows no success, and keeps the answers', async () => {
    setupClient({ checkin: { data: null, error: { message: 'x' } } });
    const user = userEvent.setup();
    renderPage();
    await answerAll(user);
    await user.click(screen.getByRole('button', { name: 'Save check-in' }));
    expect(
      await screen.findByText(
        'Your check-in was not saved. Check your connection and try again. Your answers are still here.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Your check-in is saved')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Okay' })).toHaveAttribute('aria-checked', 'true');
    expect(mock.client.functions.invoke).not.toHaveBeenCalled();
  });

  it('shows the saved state (no prompt) when the prompt check cannot run', async () => {
    setupClient({ fnError: { message: 'down' } });
    const user = userEvent.setup();
    renderPage();
    await answerAll(user);
    await user.click(screen.getByRole('button', { name: 'Save check-in' }));
    expect(
      await screen.findByRole('heading', { name: 'Your check-in is saved' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Ask the guidance office for support' }),
    ).toHaveAttribute('href', '/request');
  });
});

describe('Prompt dialog (Fig 15; 2.1.5.1.7; D-13)', () => {
  it('asks with two equal buttons and cannot be closed any other way', async () => {
    setupClient({ prompt: 'max_sev' });
    const user = userEvent.setup();
    renderPage();
    await answerAll(user);
    await user.click(screen.getByRole('button', { name: 'Save check-in' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Would you like to send this to the guidance office?',
    });
    expect(
      within(dialog).getByRole('button', { name: 'Continue to send a request' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Not now' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'If you choose Not now, nobody is told. Only you can see that you chose it.',
      ),
    ).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(dialog.textContent).not.toMatch(/score|priority|max_sev|gray/i);
  });

  it('Not now records an owner-only dismissal, then shows the saved state', async () => {
    setupClient({ prompt: 'gray_zone' });
    const user = userEvent.setup();
    renderPage();
    await answerAll(user);
    await user.click(screen.getByRole('button', { name: 'Save check-in' }));
    await user.click(await screen.findByRole('button', { name: 'Not now' }));
    expect(
      await screen.findByRole('heading', { name: 'Your check-in is saved' }),
    ).toBeInTheDocument();
    expect(queries.prompt_events[0].calls).toEqual([
      [
        'insert',
        { student_id: UID, checkin_id: CHECKIN_ID, type: 'gray_zone', outcome: 'dismissed' },
      ],
    ]);
  });

  it('Continue opens the request screen and sends nothing by itself', async () => {
    setupClient({ prompt: 'max_sev' });
    const user = userEvent.setup();
    renderPage();
    await answerAll(user);
    await user.click(screen.getByRole('button', { name: 'Save check-in' }));
    await user.click(await screen.findByRole('button', { name: 'Continue to send a request' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/request');
    expect(queries.prompt_events).toHaveLength(0);
  });
});

describe('Crisis items (2.1.6.1.6; Table 11)', () => {
  it('opens the crisis screen at once and sends only student_id and trigger_item_id', async () => {
    setupClient();
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByLabelText('[[GUIDANCE:crisis_item_2]]'));
    expect(screen.getByTestId('location')).toHaveTextContent('/crisis');
    await waitFor(() => expect(queries.crisis_events).toHaveLength(1));
    expect(queries.crisis_events[0].calls).toEqual([
      ['insert', { student_id: UID, trigger_item_id: ITEMS[1].id }],
    ]);
  });

  it('keeps the answers and the ticked item when the student comes back', async () => {
    setupClient();
    const user = userEvent.setup();
    const first = renderPage();
    await user.click(
      within(screen.getAllByRole('radiogroup')[1]).getByRole('radio', { name: 'Quite a lot' }),
    );
    await user.type(screen.getByLabelText('Optional note'), 'draft');
    await user.click(await screen.findByLabelText('[[GUIDANCE:crisis_item_1]]'));
    first.unmount();
    renderPage();
    expect(
      within(screen.getAllByRole('radiogroup')[1]).getByRole('radio', { name: 'Quite a lot' }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText('Optional note')).toHaveValue('draft');
    const box = await screen.findByLabelText('[[GUIDANCE:crisis_item_1]]');
    expect(box).toBeChecked();
    expect(box).toBeDisabled();
  });

  it('when the items cannot load, points to Where to get help', async () => {
    setupClient({ items: { data: null, error: { message: 'x' } } });
    renderPage();
    expect(await screen.findByText('These could not load.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Where to get help' })).toHaveAttribute(
      'href',
      '/help',
    );
  });
});
```

**`src/features/crisis/crisis.test.jsx`**

```jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { renderWithAuth, fakeAuth, STUDENT_T2 } from '../../test/renderWithAuth.jsx';
import { createMockSupabase, queryResult } from '../../test/mockSupabase.js';
import { crisisCopy } from '../../copy/en/checkin.js';
import { ceb } from '../../copy/ceb.js';
import { tl } from '../../copy/tl.js';
import { HOTLINES, GUIDANCE_OFFICE, emergencyHotline } from '../../content/directory.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { CrisisPage } = await import('./CrisisPage.jsx');
const report = await import('./crisisReport.js');

const UID = '11111111-1111-1111-1111-111111111111';
const ITEM = 'aaaaaaa1-0000-4000-8000-000000000001';
const auth = () =>
  fakeAuth({ account: STUDENT_T2, session: { user: { id: UID, email: 'x@example.test' } } });
const renderCrisis = () =>
  renderWithAuth(<Route path="/crisis" element={<CrisisPage />} />, {
    path: '/crisis',
    auth: auth(),
  });

let inserts;
function client(results) {
  inserts = [];
  const c = createMockSupabase();
  c.from.mockImplementation(() => {
    const q = queryResult(results.length > 1 ? results.shift() : results[0]);
    inserts.push(q);
    return q;
  });
  mock.client = c;
  return c;
}

beforeEach(() => {
  report.resetCrisisReport();
});

describe('translation files: crisis keys (00 Section 10.2)', () => {
  it('ceb and tl have exactly the English crisis keys, all as team placeholders', () => {
    const keys = Object.keys(crisisCopy).sort();
    expect(Object.keys(ceb.crisis).sort()).toEqual(keys);
    expect(Object.keys(tl.crisis).sort()).toEqual(keys);
    for (const k of keys) {
      expect(ceb.crisis[k]).toBe(`[[TEAM:CEB:crisis.${k}]]`);
      expect(tl.crisis[k]).toBe(`[[TEAM:TL:crisis.${k}]]`);
    }
  });
});

describe('CrisisPage (Fig 18; 2.1.6.1.6; 2.1.6.4.6)', () => {
  it('renders hotlines, the office, and the notice from the bundle with no server call', () => {
    const c = client([{ data: null, error: null }]);
    renderCrisis();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Help is available right now' }),
    ).toHaveFocus();
    expect(screen.getByText(/This service is not for emergencies/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: emergencyHotline().number })).toHaveAttribute(
      'href',
      `tel:${emergencyHotline().dial}`,
    );
    for (const h of HOTLINES) {
      expect(screen.getByRole('link', { name: `Call ${h.name} at ${h.number}` })).toHaveAttribute(
        'href',
        `tel:${h.dial}`,
      );
    }
    expect(
      screen.getByRole('link', { name: `Call the guidance office at ${GUIDANCE_OFFICE.phone}` }),
    ).toHaveAttribute('href', `tel:${GUIDANCE_OFFICE.dial}`);
    expect(screen.getByRole('link', { name: 'Back to my check-in' })).toHaveAttribute(
      'href',
      '/check-in',
    );
    expect(c.from).not.toHaveBeenCalled();
    expect(c.rpc).not.toHaveBeenCalled();
    // Opened directly (nothing ticked in this page session): no claim that the office was told.
    expect(screen.queryByText('What happens next')).not.toBeInTheDocument();
  });

  it('switches every crisis text to Bisaya or Tagalog (team placeholders until filled)', async () => {
    client([{ data: null, error: null }]);
    const user = userEvent.setup();
    const { container } = renderCrisis();
    await user.click(screen.getByRole('radio', { name: 'Bisaya' }));
    expect(
      screen.getByRole('heading', { level: 1, name: '[[TEAM:CEB:crisis.title]]' }),
    ).toBeInTheDocument();
    expect(container.querySelector('[lang="ceb"]')).not.toBeNull();
    await user.click(screen.getByRole('radio', { name: 'Tagalog' }));
    expect(screen.getByText('[[TEAM:TL:crisis.lead]]')).toBeInTheDocument();
  });

  it('after a tick, says what happens next and when the office has been told', async () => {
    client([{ data: null, error: null }]);
    renderCrisis();
    await act(async () => report.reportCrisisItem(UID, ITEM));
    expect(screen.getByText('What happens next')).toBeInTheDocument();
    expect(await screen.findByText('The guidance office has been told.')).toBeInTheDocument();
  });
});

describe('crisisReport (Table 11; 2.1.6.4.7)', () => {
  afterEach(() => vi.useRealTimers());

  it('inserts once per item with only student_id and trigger_item_id', async () => {
    client([{ data: null, error: null }]);
    report.reportCrisisItem(UID, ITEM);
    report.reportCrisisItem(UID, ITEM);
    await vi.waitFor(() => expect(report.getCrisisReport().status).toBe('sent'));
    expect(inserts).toHaveLength(1);
    expect(inserts[0].calls).toEqual([['insert', { student_id: UID, trigger_item_id: ITEM }]]);
  });

  it('retries a temporary failure until it is saved', async () => {
    vi.useFakeTimers();
    client([
      { data: null, error: { code: '', message: 'Failed to fetch' } },
      { data: null, error: null },
    ]);
    report.reportCrisisItem(UID, ITEM);
    await vi.waitFor(() => expect(report.getCrisisReport().status).toBe('retrying'));
    await vi.advanceTimersByTimeAsync(report.RETRY_DELAYS[0]);
    await vi.waitFor(() => expect(report.getCrisisReport().status).toBe('sent'));
    expect(inserts).toHaveLength(2);
  });

  it('waits for the network to come back when offline', async () => {
    client([
      { data: null, error: { code: '', message: 'Failed to fetch' } },
      { data: null, error: null },
    ]);
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    report.reportCrisisItem(UID, ITEM);
    await vi.waitFor(() => expect(report.getCrisisReport().status).toBe('offline'));
    online.mockReturnValue(true);
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(report.getCrisisReport().status).toBe('sent'));
    online.mockRestore();
  });

  it('stops and says so when the item can never be saved (retired item)', async () => {
    client([{ data: null, error: { code: '23514', message: 'retired' } }]);
    report.reportCrisisItem(UID, ITEM);
    await vi.waitFor(() => expect(report.getCrisisReport().status).toBe('failed'));
    expect(inserts).toHaveLength(1);
  });

  it('never shows one student the report of another', () => {
    client([{ data: null, error: null }]);
    report.reportCrisisItem(UID, ITEM);
    expect(report.getCrisisReport().owner).toBe(UID);
    report.reportCrisisItem('22222222-2222-2222-2222-222222222222', ITEM);
    expect(report.getCrisisReport().owner).toBe('22222222-2222-2222-2222-222222222222');
    expect(report.getCrisisReport().sent).toEqual([]);
  });
});
```

**`e2e/phase-05/checkin-crisis.spec.js`**

```js
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { studentLogin } from '../helpers/auth.js';

// Needs the local stack AND the Edge Functions: run `npx supabase functions serve` in a second
// terminal first. These tests add check-ins and crisis events for student.full, so they run once
// (desktop project only).
test.describe.configure({ mode: 'serial' });
test.beforeEach(() => {
  test.skip(test.info().project.name !== 'desktop', 'adds rows; runs once');
});

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function answer(page, picks) {
  const groups = page.getByRole('radiogroup');
  for (let i = 0; i < picks.length; i += 1) {
    await groups.nth(i).getByRole('radio', { name: picks[i], exact: true }).click();
  }
}

test.describe('Phase 05 · check-in, prompt, crisis (Figs 11, 15, 18)', () => {
  test('check-in page is accessible and shows the explicit crisis items', async ({ page }) => {
    await studentLogin(page, 'student.full@example.test');
    await expect(page).toHaveURL(/\/check-in$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'How have things been?' }),
    ).toBeVisible();
    await expect(page.getByLabel('[[GUIDANCE:crisis_item_1]]')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });

  test('a calm check-in saves with no prompt', async ({ page }) => {
    await studentLogin(page, 'student.full@example.test');
    await answer(page, ['Not at all', 'Not at all', 'Not at all', 'Very much', 'Good', 'A little']);
    const saved = page.waitForResponse(
      (r) => r.url().includes('/rest/v1/checkins') && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Save check-in' }).click();
    expect((await saved).status()).toBe(201);
    await expect(page.getByRole('heading', { name: 'Your check-in is saved' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('a "Very much" answer asks; Not now records a private dismissal', async ({ page }) => {
    await studentLogin(page, 'student.full@example.test');
    await answer(page, ['Very much', 'Not at all', 'Not at all', 'Somewhat', 'Low', 'Quite a lot']);
    const evaluated = page.waitForResponse((r) =>
      r.url().includes('/functions/v1/evaluate-checkin'),
    );
    await page.getByRole('button', { name: 'Save check-in' }).click();
    const body = await (await evaluated).json();
    expect(body).toEqual({ prompt: 'max_sev' }); // nothing but the prompt type
    const dialog = page.getByRole('dialog', {
      name: 'Would you like to send this to the guidance office?',
    });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
    const dismissed = page.waitForResponse(
      (r) => r.url().includes('/rest/v1/prompt_events') && r.request().method() === 'POST',
    );
    await dialog.getByRole('button', { name: 'Not now' }).click();
    expect((await dismissed).status()).toBe(201);
    await expect(page.getByRole('heading', { name: 'Your check-in is saved' })).toBeVisible();
  });

  test('Continue opens the request screen', async ({ page }) => {
    await studentLogin(page, 'student.full@example.test');
    await answer(page, ['Not at all', 'Very much', 'Not at all', 'Somewhat', 'Okay', 'Somewhat']);
    await page.getByRole('button', { name: 'Save check-in' }).click();
    await page.getByRole('button', { name: 'Continue to send a request' }).click();
    await expect(page).toHaveURL(/\/request$/);
  });

  test('a crisis item shows help at once and records the event', async ({ page }) => {
    await studentLogin(page, 'student.full@example.test');
    await expect(page.getByLabel('[[GUIDANCE:crisis_item_1]]')).toBeVisible();
    const raised = page.waitForResponse(
      (r) => r.url().includes('/rest/v1/crisis_events') && r.request().method() === 'POST',
    );
    await page.getByLabel('[[GUIDANCE:crisis_item_1]]').click();
    await expect(page).toHaveURL(/\/crisis$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Help is available right now' }),
    ).toBeVisible();
    expect((await raised).status()).toBe(201);
    await expect(page.getByText('The guidance office has been told.')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
    await page.getByRole('link', { name: 'Back to my check-in' }).click();
    await expect(page.getByLabel('[[GUIDANCE:crisis_item_1]]')).toBeChecked();
  });

  test('offline: hotlines still show and the event is sent when the network returns', async ({
    page,
    context,
  }) => {
    await studentLogin(page, 'student.full@example.test');
    await expect(page.getByLabel('[[GUIDANCE:crisis_item_2]]')).toBeVisible();
    await context.setOffline(true);
    await page.getByLabel('[[GUIDANCE:crisis_item_2]]').click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Help is available right now' }),
    ).toBeVisible();
    await expect(page.getByText(/You're offline\. We will tell the guidance office/)).toBeVisible();
    const raised = page.waitForResponse(
      (r) => r.url().includes('/rest/v1/crisis_events') && r.request().method() === 'POST',
    );
    await context.setOffline(false);
    expect((await raised).status()).toBe(201);
    await expect(page.getByText('The guidance office has been told.')).toBeVisible();
  });
});
```

Run:

```bash
npm run verify
npx supabase db reset && node scripts/dev-enrol-totp.js
# terminal 2: npx supabase functions serve --env-file supabase/functions/.env
npm run test:e2e -- e2e/phase-05
```

### Step 11 — Hosted project (Jared, in the Supabase dashboard; do this after local acceptance)

1. Deploy the two functions: `npx supabase functions deploy evaluate-checkin notify-crisis`.
2. Set secrets: `npx supabase secrets set WEBHOOK_SECRET=<a new long random string> ALLOWED_ORIGIN=https://<your Vercel domain>`. Leave the three SMS secrets unset until the Capstone 2 gateway exists (P05-D9).
3. Dashboard → **Database → Webhooks → Create a new hook**: name `notify_crisis`; table `public.crisis_events`; events **Insert** only; type **Supabase Edge Functions**; function `notify-crisis`; method POST; timeout 5000 ms; add HTTP header `x-hingaweb-webhook-secret` = the same `WEBHOOK_SECRET`. Save.
4. The webhook sends the new row to the function server to server. The row includes the `disclosed` copy; the function never logs it and never puts it in the text message.
5. Check: log in as a test student on the hosted site (a test account, never a real student), tick a crisis item, then Dashboard → Edge Functions → `notify-crisis` → Logs shows one 200 call. Its response is `sms_not_configured` until the gateway secrets are set. No app role can edit or delete a crisis event, so do this only before real students are invited, and tell the guidance office the test row exists.

---

## 7. Must never (this phase)

1. Never wait for the server before showing `/crisis`, and never fetch anything on `/crisis`. Hotlines come from the bundle.
2. Never `await` the crisis insert before navigating, and never chain `.select()` on it.
3. Never return, log, store, or show S, a band, a guardrail, or the prompt type to the student. `evaluate-checkin` returns `{ prompt }` and nothing else.
4. Never send or route a check-in because of the prompt. Only the student's own action continues (2.1.5.1.7).
5. Never make "Not now" smaller, lighter, or further away than "Continue to send a request" (Fig 15 caption: equal weight). Never pre-focus or pre-select either.
6. Never read, search, measure, trim, or log the note's content. The only thing done with it: stored as typed (blank → `null`).
7. Never put the draft, the note, a ticked item, or the crisis queue in `localStorage`, `sessionStorage`, IndexedDB, or the service worker.
8. Never put a student's name, grade, section, adviser, or crisis item in the text message.
9. Never let `notify-crisis` accept a call without the right `x-hingaweb-webhook-secret`, and never let its failure affect the saved crisis event.
10. Never show a crisis item that is not active, never hard-code a crisis item, and never let the student untick an item after the event is sent.
11. Never add a confirm step between ticking and the crisis screen (D-24).
12. Never write Cebuano or Tagalog text, a hotline number, or a protocol step.
13. Never use red, amber, or any warning colour on the safety box or the crisis screen; use the dark border and ink.
14. When Phase 10 splits the bundle, `CrisisPage`, `crisisReport`, `src/content/directory.js`, and the copy files stay in the **main** chunk so `/crisis` never waits for a download.

---

## 8. Acceptance checklist

Record `phase-05: acceptance passed (checks 1–14)` in the commit message.

| # | Check | How to test | Pass when |
|---|---|---|---|
| 1 | Repository checks | `npm run verify` | 155 tests pass; lint, copy, colours OK; build OK (Vite's "chunk larger than 500 kB" warning is expected until Phase 10) |
| 2 | Phase 04 spec fixed | `npm run test:e2e -- e2e/phase-04 --project=mobile` | 5 skipped, none crash |
| 3 | Placeholders | `npm run check:placeholders` | `docs/placeholders.md` lists 51 `TEAM:CEB` and 51 `TEAM:TL` entries |
| 4 | Pilot build blocked | `node scripts/check-placeholders.js --strict; echo $?` | lists the check-in items reason ("CHECKIN_ITEMS_STATUS is not 'final'") among the others; prints `1` |
| 5 | End to end | `db reset`, enrol TOTP, functions serving, `npm run test:e2e -- e2e/phase-05` | 6 pass on desktop; 6 skipped on mobile |
| 6 | Stored values | as `student.full@example.test`: answer 1 "A little", 2 "Not at all", 3 "Somewhat", 4 "Very much", 5 "Good", 6 "A little", note "test note", Save. Studio → `checkins`, newest row | `c1=2, c2=1, c3=3, c4=1, mood=4, stress=2, note='test note'`; the table has no score column |
| 7 | Prompt only when asked | same student: one check-in with all "Not at all" (item 4 "Very much"); one with item 1 "Very much" | first: saved screen, no dialog; second: the Fig 15 dialog. DevTools → Network → `evaluate-checkin` response is exactly `{"prompt":null}` then `{"prompt":"max_sev"}` |
| 8 | Dialog behaviour | in the dialog press Escape, Tab around, press "Not now" | Escape does nothing; focus stays inside; two equal buttons; after "Not now" Studio → `prompt_events` has one row `type=max_sev, outcome=dismissed` |
| 9 | Crisis screen with no backend | DevTools → Network → **Offline**; tick an item | `/crisis` appears at once with every hotline, the guidance office row, and "You're offline. We will tell…" |
| 10 | Event saved after reconnect | set Network back to **No throttling** | status changes to "The guidance office has been told."; Studio → `crisis_events` has exactly one new row with `disclosed` = name, grade, section, adviser and `protocol_ref` copied from the item |
| 11 | Draft kept | tick an item after answering 3 questions and typing a note; press "Back to my check-in" | answers and note still there; the item is ticked and disabled. Reload the page: everything is empty (memory only) |
| 12 | Languages | on `/crisis` choose Bisaya, then Tagalog | every crisis text changes to its `[[TEAM:…]]` placeholder; the emergency number link and hotline numbers still show |
| 13 | `notify-crisis` locally | `curl -s -X POST http://127.0.0.1:54321/functions/v1/notify-crisis -H 'x-hingaweb-webhook-secret: local-dev-webhook-secret-change-me' -d '{"type":"INSERT","table":"crisis_events","record":{"id":"7c9e6679-7425-40de-944b-e07fc1f90ae7"}}'`; then the same without the header | first `{"sent":false,"reason":"sms_not_configured"}`; second `{"error":"unauthorized"}` |
| 14 | Mobile, keyboard, zoom (2.1.6.3.4) | 390 px wide; Tab through `/check-in` using arrow keys inside each question; browser zoom 200 % on `/check-in` and `/crisis` | no horizontal scroll; every control reachable with a visible focus ring; nothing cut off at 200 % |

**Handoff to Phase 07:** `/request` receives `location.state = { promptCheckinId, promptType }` when it is opened from the prompt. Phase 07 writes `prompt_events { outcome: 'request_sent' }` for that check-in only after the request is saved.
