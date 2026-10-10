# HingaWeb Implementation Plan — 04 · Assent Walkthrough and Consent Gate

> Upload order: `00` (v1.3), `01`, `02`, `03`, then this file. Phase 03 acceptance must have passed.
> Every file in this phase is given **in full**. Create or replace each file with exactly this content.

**What was verified when this plan was written:** `npm run verify` passes (**100 unit and component tests**). With a production build in Chromium and a simulated signed-in student, `/welcome` (desktop, mobile with the details open) and `/waiting-for-consent` (both versions) had **0 axe WCAG 2.1 A/AA violations**, and the screens match Fig 10. The Playwright specs in `e2e/phase-04` sign in through the real local stack; they run for the first time on Jared's machine. If one fails, fix the app until the spec's expected result happens; change only selectors or waits in the spec, and note it in `docs/questions.md`.

---

## 1. Goal

1. The layered assent walkthrough (Fig 10; 2.1.5.1.1): states the limits of confidentiality before any check-in is written, in English with Cebuano (Bisaya) and Tagalog versions (2.1.6.3.1).
2. Recording the student's own assent in `consent_records` (D-26).
3. The waiting page when parental consent is missing or withdrawn (2.1.6.2.3; D-27), keeping Tier 1 open.

### 1.1 Prerequisites

Phase 03 acceptance passed. Seed loaded (`npx supabase db reset`).

### 1.2 Not in this phase

No parental-consent recording screen (Phase 09, administrator). No check-in (Phase 05). No Cebuano or Tagalog text: the team writes it (00 §10.2).

### 1.3 Requirements and figures covered

| Piece | Figure | Requirement |
|---|---|---|
| Assent walkthrough | Fig 10 | 2.1.5.1.1, 2.1.6.3.1, 2.1.6.3.6; D-26, D-31, D-32 |
| Language switch | Fig 10 | 2.1.6.3.1 |
| Tier 2 gate | Fig 29 caption | 2.1.6.2.3; D-27 |
| Waiting / closed page | Fig 29 caption ("keeps access to the public resources and the crisis information") | 2.1.5.1.2, 2.1.6.2.3 |

### 1.4 Disagreements found in this phase

| ID | Manuscript / rule | Figure shows | Ruling |
|---|---|---|---|
| P04-D1 | Check-in, trends, and resources need Tier 2 (2.1.6.2.3) | Fig 10 shows the full student nav (Check-in, My Trends, Resources) during assent | Logo-only header (`BareLayout`); those screens are locked until consent |
| P04-D2 | 2.1.5.1.1 asks for a **layered** assent | Fig 10 shows one layer (three cards) | Layer 1 = the three Fig 10 cards; layer 2 = "Read the details", every line traced to Table 9, Table 11, Table 17, 2.1.6.2.5, 2.1.6.2.7, 2.1.5.3.2 |
| P04-D3 | The crisis items are co-designed and not yet fixed (Table 12) | Fig 10 card 3 names "being harmed or thinking of hurting yourself" | Kept as written. **Team note:** when the crisis items are co-designed, make card 3 and the "automatic exception" detail match them exactly |
| P04-D4 | — | Fig 10 "Not now" has no stated destination | Goes to `/` (the student stays signed in; nothing saved) |
| P04-D5 | Validator panel confirms the assent reading level (2.1.6.3.6) | — | `ASSENT_COPY_STATUS = 'provisional'` in `src/config/consent.js`; `build:pilot` fails until it is `'final'` |

---

## 2. Files in this phase

New: `src/config/consent.js`, `src/copy/en/assent.js`, `src/copy/ceb.js`, `src/copy/tl.js`, `src/features/assent/AssentPage.jsx`, `WaitingForConsentPage.jsx`, `assent.test.jsx`, `e2e/phase-04/assent.spec.js`.

Changed (replace the whole file): `src/copy/en/index.js`, `src/copy/index.js` (now loads `ceb` and `tl`), `src/routes.jsx`, `scripts/check-placeholders.js` (pilot build also checks `ASSENT_COPY_STATUS`).

---

## 3. Screens

### 3.1 Assent walkthrough — `/welcome`
- Figure / requirement: Fig 10; 2.1.5.1.1. Guard: `RequireStudent` (any consent state). Layout: `BareLayout` (P04-D1).
- A student whose latest assent is `granted` is redirected to `homePathFor` (they never see it twice). A student whose assent was **withdrawn** sees it again and may assent again.
- Top: chip "Step 2 of 2" (D-32) and the language switch (English · Bisaya · Tagalog). Switching changes every text on the card. Cebuano and Tagalog text comes only from `src/copy/ceb.js` and `src/copy/tl.js`; until the team fills them, the placeholders show.
- Layer 1: three cards (Fig 10 wording). Layer 2: "Read the details" (closed by default) with eight short sections.
- Checkbox "I have read this and I understand." Continue stays **disabled** until it is ticked. "Not now" → `/` without saving.
- On Continue: insert into `consent_records` `{ student_id: <own id>, type: 'assent', instrument_version: 'assent-v1-<en|ceb|tl>' }`. The database sets `status = 'granted'` and `signed_at`. Then reload the account and go to `homePathFor` (`/waiting-for-consent` until parental consent exists, otherwise `/check-in`).
- Data: writes `consent_records` (own assent only; RLS policy `consent_insert_own_assent`). Reads `my_account()`.
- States: ready; checkbox unticked (Continue disabled); saving (spinner); save error ("We could not save this. Check your connection and try again."; stays on the page); offline (banner).
- No text box anywhere on this screen.
- Copy keys: `assent.*` (English), `ceb.assent.*`, `tl.assent.*`.

### 3.2 Waiting for consent — `/waiting-for-consent`
- Requirement: 2.1.6.2.3; D-27. Guard: `RequireStudent`. Layout: `BareLayout`. Only shown when `homePathFor` says so (assent granted, Tier 2 not met); anyone else is redirected.
- Two versions, chosen from `my_account().parental`:
  - `none`: "One more step before your first check-in" + form explanation + "Check again".
  - `withdrawn`: "Private check-ins are closed" + "talk to the guidance office". **No** "Check again".
- Both: links to `/guides` and `/help`, the not-for-emergencies notice, "Log out".
- "Check again": reloads the account; if Tier 2 is now open → `/check-in`; otherwise shows "Not recorded yet. Please check again later." in a polite live region.
- Data: reads `my_account()`. Writes nothing.
- Copy keys: `waiting.*`.

---

## 4. Who can see or do what

| Action | Student | Guidance / Administrator | Signed out |
|---|---|---|---|
| Open `/welcome`, `/waiting-for-consent` | yes (by consent state) | sent to own home | sent to `/login` |
| Record own assent | yes | no (RLS) | no |
| Record parental consent | **no** (RLS) | administrator only, Phase 09 | no |

---

## 5. Build steps

### Step 1 — Consent settings

**`src/config/consent.js`**

```js
// Phase 04 · consent and assent settings (2.1.5.1.1, 2.1.6.2.3, 2.1.6.3.1, 2.1.6.3.6; D-26, D-27).

/** Version of the assent wording. Change it whenever the assent text changes. */
export const ASSENT_VERSION = 'v1';

/**
 * 2.1.6.3.6: the assent wording must be confirmed by the validator panel for a reading level
 * suitable for minors. Set to 'final' only after that confirmation. build:pilot fails until then.
 */
export const ASSENT_COPY_STATUS = 'provisional';

/** Languages offered on the assent and crisis screens (2.1.6.3.1; D-31). */
export const LANGUAGES = Object.freeze([
  Object.freeze({ value: 'en', label: 'English' }),
  Object.freeze({ value: 'ceb', label: 'Bisaya' }),
  Object.freeze({ value: 'tl', label: 'Tagalog' }),
]);

/** Stored in consent_records.instrument_version, e.g. "assent-v1-ceb". */
export function assentInstrumentVersion(lang) {
  return `assent-${ASSENT_VERSION}-${lang}`;
}
```

### Step 2 — Copy (English, plus Cebuano and Tagalog placeholders)

`ceb.js` and `tl.js` must have **exactly** the same keys as `assent` in `en/assent.js` (tested). Every value stays a `[[TEAM:…]]` placeholder until the team replaces it. Never fill them with machine translation.

**`src/copy/en/assent.js`**

```js
// Phase 04 copy: layered assent walkthrough (Fig 10) and the waiting-for-consent page.
// The `assent` keys are also provided in ceb.js and tl.js (placeholders the team fills in).
export const assentCopy = {
  step: 'Step 2 of 2',
  languageLabel: 'Language',
  title: 'What we keep private, and what we cannot',
  lead: 'Please take a moment to read how HingaWeb protects you before you write your first check-in.',
  card1Title: 'Your check-ins are yours.',
  card1Body:
    'What you write in a check-in can be seen only by you. School staff cannot browse them.',
  card2Title: 'You decide when to ask for help.',
  card2Body: 'Nothing is sent to the guidance office unless you choose to send it.',
  card3Title: 'One thing we must act on.',
  card3Body:
    'If you tell us you are being harmed or are thinking of hurting yourself, the guidance office will be told so someone can help you. This is the one time something is shared automatically.',
  detailsToggle: 'Read the details',
  detailsSaved: 'What is saved',
  detailsSavedBody:
    'Your check-ins: four short questions, how your mood and stress have been, and an optional note. Only you can see them.',
  detailsShared: 'What is shared when you ask for help',
  detailsSharedBody:
    'If you choose to send a support request, the guidance office sees your name, grade, section, class adviser, your answers to the four questions from your latest check-in, and anything you write in the request. They do not see your other check-ins, your mood and stress, or your check-in notes.',
  detailsException: 'The one automatic exception',
  detailsExceptionBody:
    'If you tick one of the safety items on the check-in, the guidance office is told right away so someone can check on you. They see your name, grade, section, class adviser, and the item you ticked. Nothing else is shared.',
  detailsWho: 'Who can see a request',
  detailsWhoBody:
    'Only authorized guidance office staff. Every time they open a request, it is recorded.',
  detailsNot: 'What HingaWeb does not do',
  detailsNotBody:
    'HingaWeb never reads or analyses what you write. It is not a test, and it does not replace talking to someone.',
  detailsParent: 'Your parent or guardian',
  detailsParentBody:
    'Before your first check-in, your school also needs a signed permission form from your parent or guardian.',
  detailsKept: 'How long it is kept',
  detailsKeptBody:
    'Your information is kept only for the pilot. When the pilot ends, it is deleted, unless the school takes over HingaWeb and its own record rules apply.',
  detailsStop: 'Changing your mind',
  detailsStopBody:
    'You can stop at any time. Ask the guidance office to withdraw your permission. You can still read guides and see where to get help.',
  understand: 'I have read this and I understand.',
  notNow: 'Not now',
  continue: 'Continue',
  footer: 'Rizal Memorial Colleges, Inc. senior high school guidance office.',
  saveError: 'We could not save this. Check your connection and try again.',
};

export const waitingCopy = {
  noneTitle: 'One more step before your first check-in',
  noneBody:
    'Your school needs a signed permission form from your parent or guardian before you can use private check-ins.',
  noneNext: 'Ask the guidance office for the form. Once they record it, you can start.',
  withdrawnTitle: 'Private check-ins are closed',
  withdrawnBody:
    "Your parent or guardian's permission was withdrawn, so private check-ins are closed for now.",
  withdrawnNext: 'To ask about this, talk to the guidance office.',
  meanwhile: 'While you wait, you can still:',
  readGuides: 'Read guides',
  getHelp: 'See where to get help',
  checkAgain: 'Check again',
  stillWaiting: 'Not recorded yet. Please check again later.',
  logOut: 'Log out',
};
```

**`src/copy/en/index.js`**

```js
// Copy sections added by Phases 03 onward. Each phase replaces this file with one more line.
import { publicCopy } from './public.js';
import { assentCopy, waitingCopy } from './assent.js';

export const sections = {
  public: publicCopy,
  assent: assentCopy,
  waiting: waitingCopy,
};
```

**`src/copy/ceb.js`**

```js
// Cebuano (Bisaya) text for the assent walkthrough (2.1.6.3.1).
// WRITTEN BY THE HINGAWEB TEAM, NOT BY AI TRANSLATION (00 Section 10.2).
// Replace each placeholder with the team's text. Keep every key. Phase 05 adds the crisis keys.
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
};
```

**`src/copy/tl.js`**

```js
// Tagalog text for the assent walkthrough (2.1.6.3.1).
// WRITTEN BY THE HINGAWEB TEAM, NOT BY AI TRANSLATION (00 Section 10.2).
// Replace each placeholder with the team's text. Keep every key. Phase 05 adds the crisis keys.
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
};
```

**`src/copy/index.js`**

```js
import { en } from './en.js';
import { ceb } from './ceb.js';
import { tl } from './tl.js';

// ceb and tl hold only the assent (Phase 04) and crisis (Phase 05) keys (00 Section 10.2).
const DICTIONARIES = { en, ceb, tl };

function lookup(dict, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict);
}

/**
 * Get UI text by key. Replaces {name} tokens with values from `vars`.
 * Falls back to English when a key is missing in another language.
 * Throws in development when a key does not exist at all, so typos are caught early.
 * @param {string} key
 * @param {Record<string, string|number>} [vars]
 * @param {'en'|'ceb'|'tl'} [lang]
 */
export function t(key, vars = {}, lang = 'en') {
  let value = lookup(DICTIONARIES[lang] ?? {}, key);
  if (typeof value !== 'string') value = lookup(en, key);
  if (typeof value !== 'string') {
    if (import.meta.env.DEV) throw new Error(`Missing copy key: ${key}`);
    return '';
  }
  return value.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}
```

### Step 3 — Screens and routes

**`src/features/assent/AssentPage.jsx`**

```jsx
// Fig 10 · layered assent walkthrough (2.1.5.1.1; 2.1.6.3.1; 2.1.6.3.6; D-26, D-31, D-32, P04-D1).
// Records the student's own assent in consent_records. Parental consent is recorded by the
// administrator (Phase 09). Tier 2 opens only when both exist (D-27).
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { ArrowRight, ChevronDown, Lock, Send, Shield } from 'lucide-react';
import { t } from '../../copy/index.js';
import { LANGUAGES, assentInstrumentVersion } from '../../config/consent.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import { homePathFor } from '../../lib/auth/homePath.js';
import { Button, Card, Checkbox, Chip, SegmentedControl } from '../../components/ui/index.js';
import { FormMessage } from '../auth/AuthCard.jsx';

const CARDS = [
  { icon: Lock, title: 'card1Title', body: 'card1Body', highlight: false },
  { icon: Send, title: 'card2Title', body: 'card2Body', highlight: false },
  { icon: Shield, title: 'card3Title', body: 'card3Body', highlight: true },
];

const DETAILS = [
  ['detailsSaved', 'detailsSavedBody'],
  ['detailsShared', 'detailsSharedBody'],
  ['detailsException', 'detailsExceptionBody'],
  ['detailsWho', 'detailsWhoBody'],
  ['detailsNot', 'detailsNotBody'],
  ['detailsParent', 'detailsParentBody'],
  ['detailsKept', 'detailsKeptBody'],
  ['detailsStop', 'detailsStopBody'],
];

export function AssentPage() {
  const navigate = useNavigate();
  const { account, aal, session, refresh } = useAuth();
  const [lang, setLang] = useState('en');
  const [understood, setUnderstood] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const a = (key) => t(`assent.${key}`, {}, lang);

  // Already assented: this screen is not for them.
  if (account.assent === 'granted') return <Navigate to={homePathFor(account, aal)} replace />;

  const onContinue = async () => {
    setError('');
    setSaving(true);
    const { error: insertError } = await supabase.from('consent_records').insert({
      student_id: session.user.id,
      type: 'assent',
      instrument_version: assentInstrumentVersion(lang),
    });
    if (insertError) {
      setSaving(false);
      setError(a('saveError'));
      return;
    }
    const loaded = await refresh();
    navigate(homePathFor(loaded.account, loaded.aal), { replace: true });
  };

  return (
    <Card className="mx-auto flex max-w-[720px] flex-col gap-6" lang={lang}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Chip tone="strong">
          <Shield aria-hidden="true" className="size-4" />
          {a('step')}
        </Chip>
        <SegmentedControl
          label={a('languageLabel')}
          options={LANGUAGES}
          value={lang}
          onChange={setLang}
        />
      </div>

      <div>
        <h1 className="text-[24px] font-semibold leading-8 text-ink">{a('title')}</h1>
        <p className="mt-2 text-base text-ink-muted">{a('lead')}</p>
      </div>

      <ul className="flex flex-col gap-3">
        {CARDS.map(({ icon: Icon, title, body, highlight }) => (
          <li
            key={title}
            className={`flex gap-4 rounded-card p-4 ${highlight ? 'border border-line bg-canvas' : 'bg-surface-muted'}`}
          >
            <span
              aria-hidden="true"
              className="flex size-11 shrink-0 items-center justify-center rounded-control bg-blush"
            >
              <Icon className="size-5 text-ink" />
            </span>
            <div>
              <h2 className="text-[17px] font-semibold text-ink">{a(title)}</h2>
              <p className="mt-1 text-[15px] text-ink">{a(body)}</p>
            </div>
          </li>
        ))}
      </ul>

      <details className="group rounded-card border border-line p-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-semibold text-ink">
          {a('detailsToggle')}
          <ChevronDown
            aria-hidden="true"
            className="size-5 transition-transform group-open:rotate-180"
          />
        </summary>
        <dl className="mt-3 flex flex-col gap-4">
          {DETAILS.map(([term, body]) => (
            <div key={term}>
              <dt className="font-semibold text-ink">{a(term)}</dt>
              <dd className="mt-1 text-[15px] text-ink">{a(body)}</dd>
            </div>
          ))}
        </dl>
      </details>

      <FormMessage>{error}</FormMessage>
      <Checkbox
        id="understood"
        label={a('understand')}
        checked={understood}
        onChange={setUnderstood}
      />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={() => navigate('/', { replace: true })}>
          {a('notNow')}
        </Button>
        <Button
          size="lg"
          disabled={!understood}
          loading={saving}
          onClick={onContinue}
          iconRight={<ArrowRight aria-hidden="true" className="size-5" />}
        >
          {a('continue')}
        </Button>
      </div>

      <p className="text-center text-[13px] text-ink-muted">{a('footer')}</p>
    </Card>
  );
}
```

**`src/features/assent/WaitingForConsentPage.jsx`**

```jsx
// Shown when the student has assented but Tier 2 is not open (2.1.6.2.3; D-27):
// parental consent not yet recorded, or withdrawn. Tier 1 stays open (Fig 29 caption).
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { t } from '../../copy/index.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import { homePathFor } from '../../lib/auth/homePath.js';
import { Button, Card } from '../../components/ui/index.js';
import { EmergencyNotice } from '../public/EmergencyNotice.jsx';

export function WaitingForConsentPage() {
  const navigate = useNavigate();
  const { account, aal, refresh, signOut } = useAuth();
  const [checking, setChecking] = useState(false);
  const [stillWaiting, setStillWaiting] = useState(false);

  const home = homePathFor(account, aal);
  if (home !== '/waiting-for-consent') return <Navigate to={home} replace />;

  const withdrawn = account.parental === 'withdrawn';
  const prefix = withdrawn ? 'waiting.withdrawn' : 'waiting.none';

  const checkAgain = async () => {
    setChecking(true);
    setStillWaiting(false);
    const loaded = await refresh();
    setChecking(false);
    const next = homePathFor(loaded.account, loaded.aal);
    if (next !== '/waiting-for-consent') navigate(next, { replace: true });
    else setStillWaiting(true);
  };

  const logOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <Card className="mx-auto flex max-w-[640px] flex-col gap-5">
      <h1 className="text-[24px] font-semibold leading-8 text-ink">{t(`${prefix}Title`)}</h1>
      <p className="text-base text-ink">{t(`${prefix}Body`)}</p>
      <p className="text-base text-ink">{t(`${prefix}Next`)}</p>

      <div>
        <p className="font-semibold text-ink">{t('waiting.meanwhile')}</p>
        <ul className="mt-2 flex flex-col gap-1">
          <li>
            <Link
              to="/guides"
              className="inline-flex min-h-11 items-center font-semibold text-ink underline"
            >
              {t('waiting.readGuides')}
            </Link>
          </li>
          <li>
            <Link
              to="/help"
              className="inline-flex min-h-11 items-center font-semibold text-ink underline"
            >
              {t('waiting.getHelp')}
            </Link>
          </li>
        </ul>
      </div>

      <EmergencyNotice />

      <p role="status" aria-live="polite" className="text-[14px] text-ink">
        {stillWaiting ? t('waiting.stillWaiting') : ''}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        {!withdrawn && (
          <Button loading={checking} onClick={checkAgain}>
            {t('waiting.checkAgain')}
          </Button>
        )}
        <Button variant="outline" onClick={logOut}>
          {t('waiting.logOut')}
        </Button>
      </div>
    </Card>
  );
}
```

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
          <Route path="crisis" element={<PhasePlaceholder phase="05" />} />
        </Route>
      </Route>

      {/* Tier 2 and Tier 3 students */}
      <Route element={<RequireStudent tier2 />}>
        <Route element={<StudentLayout />}>
          <Route path="check-in" element={<PhasePlaceholder phase="05" />} />
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

### Step 4 — Pilot build check

**`scripts/check-placeholders.js`** — adds the ASSENT_COPY_STATUS check

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
  const files = [
    ...walk('src', ['.js', '.jsx', '.css', '.html']),
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

### Step 5 — Tests

**`src/features/assent/assent.test.jsx`**

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import {
  renderWithAuth,
  fakeAuth,
  STUDENT_NO_ASSENT,
  STUDENT_NO_PARENT,
  STUDENT_T2,
} from '../../test/renderWithAuth.jsx';
import { createMockSupabase, queryResult } from '../../test/mockSupabase.js';
import { assentCopy } from '../../copy/en/assent.js';
import { ceb } from '../../copy/ceb.js';
import { tl } from '../../copy/tl.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { AssentPage } = await import('./AssentPage.jsx');
const { WaitingForConsentPage } = await import('./WaitingForConsentPage.jsx');

const studentAuth = (account, more = {}) =>
  fakeAuth({
    account,
    session: { user: { id: '22222222-2222-4222-8222-222222222222', email: 'x@example.test' } },
    ...more,
  });

describe('translation files (00 Section 10.2)', () => {
  it('ceb and tl have exactly the English assent keys, all as team placeholders', () => {
    const keys = Object.keys(assentCopy).sort();
    expect(Object.keys(ceb.assent).sort()).toEqual(keys);
    expect(Object.keys(tl.assent).sort()).toEqual(keys);
    for (const k of keys) {
      expect(ceb.assent[k]).toBe(`[[TEAM:CEB:assent.${k}]]`);
      expect(tl.assent[k]).toBe(`[[TEAM:TL:assent.${k}]]`);
    }
  });
});

describe('AssentPage (Fig 10, 2.1.5.1.1)', () => {
  beforeEach(() => {
    mock.client = createMockSupabase();
  });

  it('states the limits of confidentiality before anything is written', () => {
    renderWithAuth(<Route path="/welcome" element={<AssentPage />} />, {
      path: '/welcome',
      auth: studentAuth(STUDENT_NO_ASSENT),
    });
    expect(
      screen.getByRole('heading', { level: 1, name: 'What we keep private, and what we cannot' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your check-ins are yours.' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'You decide when to ask for help.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'One thing we must act on.' })).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('keeps Continue disabled until the student ticks the box', async () => {
    renderWithAuth(<Route path="/welcome" element={<AssentPage />} />, {
      path: '/welcome',
      auth: studentAuth(STUDENT_NO_ASSENT),
    });
    const btn = screen.getByRole('button', { name: 'Continue' });
    expect(btn).toBeDisabled();
    await userEvent.click(screen.getByLabelText('I have read this and I understand.'));
    expect(btn).toBeEnabled();
  });

  it('switches language to the team-written text (placeholders until filled)', async () => {
    renderWithAuth(<Route path="/welcome" element={<AssentPage />} />, {
      path: '/welcome',
      auth: studentAuth(STUDENT_NO_ASSENT),
    });
    await userEvent.click(screen.getByRole('radio', { name: 'Bisaya' }));
    expect(
      screen.getByRole('heading', { level: 1, name: '[[TEAM:CEB:assent.title]]' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Tagalog' }));
    expect(
      screen.getByRole('heading', { level: 1, name: '[[TEAM:TL:assent.title]]' }),
    ).toBeInTheDocument();
  });

  it('records the assent with the language version, then routes by consent state', async () => {
    const q = queryResult({ error: null });
    mock.client.from.mockReturnValue(q);
    const auth = studentAuth(STUDENT_NO_ASSENT);
    auth.refresh = vi.fn(async () => ({
      account: { ...STUDENT_NO_ASSENT, assent: 'granted' },
      aal: null,
    }));
    renderWithAuth(<Route path="/welcome" element={<AssentPage />} />, { path: '/welcome', auth });
    await userEvent.click(screen.getByRole('radio', { name: 'Tagalog' }));
    await userEvent.click(screen.getByLabelText('[[TEAM:TL:assent.understand]]'));
    await userEvent.click(screen.getByRole('button', { name: '[[TEAM:TL:assent.continue]]' }));
    expect(mock.client.from).toHaveBeenCalledWith('consent_records');
    expect(q.calls[0]).toEqual([
      'insert',
      {
        student_id: '22222222-2222-4222-8222-222222222222',
        type: 'assent',
        instrument_version: 'assent-v1-tl',
      },
    ]);
    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe('/waiting-for-consent'),
    );
  });

  it('shows an error and stays when saving fails', async () => {
    mock.client.from.mockReturnValue(queryResult({ error: { code: '42501' } }));
    renderWithAuth(<Route path="/welcome" element={<AssentPage />} />, {
      path: '/welcome',
      auth: studentAuth(STUDENT_NO_ASSENT),
    });
    await userEvent.click(screen.getByLabelText('I have read this and I understand.'));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(
      await screen.findByText('We could not save this. Check your connection and try again.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('location').textContent).toBe('/welcome');
  });

  it('sends a student who already assented away', () => {
    renderWithAuth(<Route path="/welcome" element={<AssentPage />} />, {
      path: '/welcome',
      auth: studentAuth(STUDENT_T2),
    });
    expect(screen.getByTestId('location').textContent).toBe('/check-in');
  });

  it('"Not now" goes to the home page without saving', async () => {
    renderWithAuth(<Route path="/welcome" element={<AssentPage />} />, {
      path: '/welcome',
      auth: studentAuth(STUDENT_NO_ASSENT),
    });
    await userEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.getByTestId('location').textContent).toBe('/');
    expect(mock.client.from).not.toHaveBeenCalled();
  });
});

describe('WaitingForConsentPage (2.1.6.2.3, D-27)', () => {
  it('explains the parental form and keeps Tier 1 open', () => {
    renderWithAuth(<Route path="/waiting-for-consent" element={<WaitingForConsentPage />} />, {
      path: '/waiting-for-consent',
      auth: studentAuth(STUDENT_NO_PARENT),
    });
    expect(
      screen.getByRole('heading', { name: 'One more step before your first check-in' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Read guides' })).toHaveAttribute('href', '/guides');
    expect(screen.getByRole('link', { name: 'See where to get help' })).toHaveAttribute(
      'href',
      '/help',
    );
    expect(screen.getByText(/HingaWeb is not for emergencies\./)).toBeInTheDocument();
  });

  it('shows the closed message when parental consent was withdrawn, with no Check again', () => {
    renderWithAuth(<Route path="/waiting-for-consent" element={<WaitingForConsentPage />} />, {
      path: '/waiting-for-consent',
      auth: studentAuth({ ...STUDENT_NO_PARENT, parental: 'withdrawn' }),
    });
    expect(
      screen.getByRole('heading', { name: 'Private check-ins are closed' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check again' })).toBeNull();
  });

  it('Check again moves on once consent is recorded, or says it is not recorded yet', async () => {
    const auth = studentAuth(STUDENT_NO_PARENT);
    auth.refresh = vi
      .fn()
      .mockResolvedValueOnce({ account: STUDENT_NO_PARENT, aal: null })
      .mockResolvedValueOnce({ account: STUDENT_T2, aal: null });
    renderWithAuth(<Route path="/waiting-for-consent" element={<WaitingForConsentPage />} />, {
      path: '/waiting-for-consent',
      auth,
    });
    await userEvent.click(screen.getByRole('button', { name: 'Check again' }));
    expect(
      await screen.findByText('Not recorded yet. Please check again later.'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Check again' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/check-in'));
  });

  it('redirects a student who does not belong here', () => {
    renderWithAuth(<Route path="/waiting-for-consent" element={<WaitingForConsentPage />} />, {
      path: '/waiting-for-consent',
      auth: studentAuth(STUDENT_NO_ASSENT),
    });
    expect(screen.getByTestId('location').textContent).toBe('/welcome');
  });
});
```

**`e2e/phase-04/assent.spec.js`**

```js
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { studentLogin } from '../helpers/auth.js';

// These tests change seed data (they record an assent), so they run once (desktop project only)
// and in order. Run `npx supabase db reset` before them.
test.describe.configure({ mode: 'serial' });
test.skip(
  ({ browserName }, testInfo) => testInfo.project.name !== 'desktop',
  'changes seed data; runs once',
);

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

`e2e/phase-04` records an assent for `student.noassent@example.test`, so reset first:

```bash
npx supabase db reset && node scripts/dev-enrol-totp.js
npm run test:e2e -- e2e/phase-04
```

---

## 6. Must never (this phase)

1. Never record assent before the box is ticked and Continue is pressed.
2. Never let a student record **parental** consent, or record anything for another student.
3. Never open check-in, trends, or resources before both consents exist (the Phase 02 guard already enforces this; do not bypass it).
4. Never translate the assent into Cebuano or Tagalog with AI or a translation service. Only the team's text goes in `ceb.js` and `tl.js`.
5. Never change the wording of the three cards or the details without changing `ASSENT_VERSION`.
6. Never block Tier 1 for a student waiting for consent: guides, the directory, and hotlines stay reachable.
7. Never store the chosen language in browser storage (00 must-never 14); it lives in page state only.
8. Never put a text box on the assent or waiting screens.

---

## 7. Acceptance checklist

Record `phase-04: acceptance passed (checks 1–10)` in the commit message.

| # | Check | How to test | Pass when |
|---|---|---|---|
| 1 | Repository checks | `npm run verify` | 100 tests pass; lint, copy, colours OK; build OK |
| 2 | Pilot build blocked | `node scripts/check-placeholders.js --strict; echo $?` | lists the assent status reason among the others; prints `1` |
| 3 | Translation placeholders | `npm run check:placeholders` | `docs/placeholders.md` lists 32 `TEAM:CEB` and 32 `TEAM:TL` entries |
| 4 | End to end | `npx supabase db reset && node scripts/dev-enrol-totp.js && npm run test:e2e -- e2e/phase-04` | 5 pass on desktop; 5 skipped on mobile (they change seed data, so they run once) |
| 5 | Assent row | after the E2E run (or by hand as `student.noassent@example.test`), Studio → `consent_records` | one new row: `type = assent`, `status = granted`, `instrument_version = assent-v1-en` |
| 6 | Language version stored | `db reset`, log in as `student.noassent`, switch to Tagalog, tick, Continue | the new row has `instrument_version = assent-v1-tl` |
| 7 | No second walkthrough | as `student.full@example.test` open `/welcome` | redirected to `/check-in` |
| 8 | Withdrawn parental | as `student.withdrawn@example.test` | "Private check-ins are closed", no "Check again", links to guides and help work |
| 9 | Check again | as `student.noparent`, press Check again; then in Studio insert a `parental` row for that student (as the administrator would), press Check again | first: "Not recorded yet…"; second: goes to `/check-in` |
| 10 | Mobile and keyboard | 390 px wide; Tab through `/welcome` | no horizontal scroll; the language switch, details, checkbox, and both buttons reachable in order with a visible focus ring |
