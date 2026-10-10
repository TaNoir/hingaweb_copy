# HingaWeb Implementation Plan — 03 · Public Pages, Directory, and Offline Hotlines

> Upload order: `00-conventions.md` (v1.3), `01`, `02`, then this file. Phase 02 acceptance must have passed.
> Every file in this phase is given **in full**. Create or replace each file with exactly this content.

**What was verified when this plan was written:** `npm run verify` passes (lint 0 warnings, copy and colour checks, **88 unit and component tests**, build). In Chromium against a production build, all **24 Playwright checks for this phase passed** (desktop and mobile): the public pages, no horizontal scroll, axe with 0 WCAG 2.1 A/AA violations on `/`, `/guides`, `/help`, and **the hotlines and directory still showing with the network switched off**. These tests do not need the database, except the guide cards, which were checked with unit tests and a stubbed list.

---

## 1. Goal

Build Tier 1, everything a student can use **without an account and without the backend**:

1. The public landing page (Fig 7) with the hotline card.
2. The guide list (`/guides`), the public, unranked list of verified resources.
3. Where to get help (`/help`, Fig 14): the four referral targets from Section 1.4 and the 24/7 hotlines.
4. The static directory file (D-03) and a service worker so hotlines and the not-for-emergencies notice show with no network (2.1.6.4.6).

### 1.1 Prerequisites

Phase 02 acceptance passed. Local stack running with the seed loaded (4 published guides, 1 draft).

### 1.2 Not in this phase

No ranked resources or resource-view tracking (Phase 06). No crisis screen (Phase 05; it **reuses** `HotlineList` and `EmergencyNotice` from this phase). No installable app manifest (the manuscript says no app install).

### 1.3 Requirements and figures covered

| Piece | Figure | Requirement |
|---|---|---|
| Landing page | Fig 7 | 2.1.5.1.2 (Tier 1); D-18, D-19, D-20, D-30 |
| Guide list | Fig 7 "Read something helpful" | 2.1.5.1.2; D-07 |
| Where to get help | Fig 14 | 2.1.5.1.8; 1.4 (four referral targets); D-03, D-18 |
| Hotlines + not-for-emergencies notice, offline | Figs 7, 14 | 2.1.6.4.6, 2.1.6.4.4 |
| Core view size | — | 2.1.6.1.2 (`/help` is a core view) |

### 1.4 Disagreements found in this phase (00 is locked; they live here)

| ID | Manuscript / rule | Figure shows | Ruling |
|---|---|---|---|
| P03-D1 | No clinical words in student copy (1.4, 00 §10.3) | Fig 7 strip "Confidential • Free • Non-Clinical" | "Free · Private check-ins · No app to install" |
| P03-D2 | Confidentiality may be breached when someone is in danger (KII Round 1; 2.1.5.1.1) | Fig 14 "Strictly confidential / Protected counseling record" | "Confidential" + "If someone may be in danger, the office must act to keep them safe." |
| P03-D3 | No unverified claims about outside services | Fig 14 chip "Toll-free & Confidential"; Fig 7 "Free & Confidential" chip | Chips removed; the guidance office supplies each hotline's own description (`[[GUIDANCE:hotline_N_short_description]]`) |
| P03-D4 | Walk-in is an office channel (KII Round 1); times are not stated anywhere | Fig 14 "Drop in during free periods"; Fig 7 "Students may walk in freely during breaks or free periods" | "You can visit the office in person, or send a support request." |
| P03-D5 | Four referral targets (1.4): guidance office, IPBM, external professionals, hotlines | Fig 14 "[Second referral partner to be confirmed]" | A card for "External professionals" with placeholders |
| P03-D6 | Hotline numbers come from the guidance office | Figs 7, 14 hard-code numbers | Placeholders only (D-18) |
| P03-D7 | — (layout) | Fig 7 is a two-column page | The landing page uses the wide 1200px width; every other public page keeps the 768px reading width |

---

## 2. Files in this phase

New: `src/content/directory.js` (+test), `src/copy/en/index.js`, `src/copy/en/public.js`, `src/features/public/` (`primaryArea.js` +test, `HotlineList.jsx`, `EmergencyNotice.jsx`, `NeedHelpCard.jsx`, `ResourceCard.jsx`, `usePublishedResources.js`, `LandingPage.jsx`, `GuidesPage.jsx`, `HelpPage.jsx`, `public.test.jsx`), `e2e/phase-03/` (3 specs).

Changed (replace the whole file): `vite.config.js` (service worker), `src/main.jsx`, `src/lib/supabase.js`, `src/copy/en.js`, `src/copy/allowlist.js`, `src/index.css`, `src/routes.jsx`, `src/components/layout/PublicLayout.jsx`, `StudentLayout.jsx`, `PublicOrStudentLayout.jsx`, `src/test/mockSupabase.js`, `eslint.config.js`.

**Important fix to a Phase 02 file:** the Phase 02 `src/lib/supabase.js` threw an error at import time when `.env.local` was missing. The bundler then dropped the whole app from any build made without the env file (for example on CI), and the build still "succeeded". The Phase 03 version never throws; `main.jsx` shows a configuration message instead.

**Copy files from now on:** `src/copy/en.js` keeps the Phase 02 keys and spreads `sections` from `src/copy/en/index.js`. Each later phase adds one file in `src/copy/en/` and replaces `src/copy/en/index.js` (a few lines). `en.js` itself does not change again.

---

## 3. Screens

### 3.1 Landing — `/`
- Figure / requirement: Fig 7; 2.1.5.1.2. Guard: none. Layout: `PublicOrStudentLayout` at **wide** width (a signed-in student keeps the student header).
- Sections, top to bottom: blush strip; hero (chip, h1, lead with the allowlisted sentence, "Explore how it works" → `#how`, "Read guide articles" → `/guides`, listen note); **Need help right now?** card (`NeedHelpCard`: hotlines + not-for-emergencies notice); How HingaWeb works (3 cards); Read something helpful (up to 4 published guides, "See all guides"); office card (hours and location placeholders).
- Not built (D-19): the "30-second silent check-in" demo, its text box, and the Standard/Focus switch.
- Data: `resources` read `id, title, url, attributes` where published, ordered by title (anon RLS). No other data. Nothing is written.
- States: guides loading (skeleton); guides error (`ErrorState` with Try again; **the hotline card still shows**); no guides (`public.guides.emptyTitle/emptyBody`); ready; offline (banner; hotlines still show).
- Copy keys: `public.landing.*`, `public.hotlines.*`, `public.emergency.notice`, `public.guides.*`.

### 3.2 Guides — `/guides`
- Source: Fig 7 "Read something helpful"; 2.1.5.1.2. Guard: none. Layout: `PublicOrStudentLayout` (reading width).
- Area filter: All, School work, Home and family, Future, Managing. A guide belongs to the area of its **highest** attribute (`primaryArea`; ties go to the earlier area).
- Each card (`ResourceCard`): area chip, title, "Free access", "Read guide" link opening the `url` in a new tab with `rel="noopener noreferrer"`. No summary, read time, or format (D-07).
- A signed-in Tier 2 student also sees a link to `/resources` (built in Phase 06).
- Data: same read as 3.1. Nothing written. **No tracking** of which guide was opened on this page (Tier 1 collects no personal data).
- States: loading; error; no guides at all; no guides in the chosen area; ready; offline.
- Copy keys: `public.guides.*`.

### 3.3 Where to get help — `/help`
- Figure / requirement: Fig 14; 2.1.5.1.8; 1.4. Guard: none. Layout: `PublicOrStudentLayout`.
- Content, all from `src/content/directory.js` (static, no network): guidance office card (person, role, location, hours, privacy with P03-D2 wording, "Send a support request" → `/request`, "Call the guidance office" → `tel:`); Specialist services (IPBM, External professionals); Crisis hotlines (24 hours) with `tel:` links; not-for-emergencies notice; closing line.
- "Send a support request": a signed-out visitor is sent to `/login`; a student without Tier 2 to the consent pages; a Tier 2 student to `/request` (Phase 07).
- Data: **none**. The page makes no network call (tested).
- States: ready; offline (banner; everything still shows). There is no loading or error state because nothing loads.
- Copy keys: `public.help.*`, `public.hotlines.*`, `public.emergency.notice`.

### 3.4 Offline behaviour (2.1.6.4.6, 2.1.6.4.4)
- `vite-plugin-pwa` precaches the built app (JS, CSS, HTML, fonts). Hotlines and the directory are inside the JS bundle, so they show with no network, and also when the Supabase backend is down.
- **Nothing from Supabase is ever cached** (`runtimeCaching: []`). Student data never enters the service-worker cache (00 must-never 14).
- No web app manifest (not installable).
- 2.1.6.4.4 (suppress images at the design floor): these pages have no content images, only small inline SVG icons, so nothing needs suppressing.

---

## 4. Who can see or do what

| Page | Signed out | Student | Guidance / Administrator |
|---|---|---|---|
| `/`, `/guides`, `/help` | yes | yes (student header) | yes (public header) |

Data: `resources` SELECT of published rows only (anon and authenticated RLS from Phase 01). Nothing written.

---

## 5. Build steps

### Step 1 — Static directory (D-03)

Every name, number, address, and hour is a `[[GUIDANCE:…]]` placeholder. Exactly one hotline has `emergency: true` (used in the not-for-emergencies sentence).

**`src/content/directory.js`**

```js
// Static referral directory and hotlines (00 Section 6.4; D-03; 2.1.5.1.8; 2.1.6.4.6).
// Served from the bundle and the service-worker cache, so it shows with NO backend.
// Every name, number, address, and hour is a placeholder the guidance office fills in.
// The four referral targets are fixed by manuscript Section 1.4.
import { SITE } from '../config/site.js';

/**
 * 24/7 crisis hotlines. `dial` is digits only and becomes a tel: link.
 * `emergency: true` marks the line used in "If you are in immediate danger, call …".
 * Exactly one entry must have emergency: true.
 */
export const HOTLINES = Object.freeze([
  Object.freeze({
    id: 'hotline_mental_health',
    name: '[[GUIDANCE:hotline_1_name]]',
    number: '[[GUIDANCE:hotline_1_number]]',
    dial: '[[GUIDANCE:hotline_1_dial_digits]]',
    note: '[[GUIDANCE:hotline_1_short_description]]',
    emergency: false,
  }),
  Object.freeze({
    id: 'hotline_emergency',
    name: '[[GUIDANCE:hotline_2_name]]',
    number: '[[GUIDANCE:hotline_2_number]]',
    dial: '[[GUIDANCE:hotline_2_dial_digits]]',
    note: '[[GUIDANCE:hotline_2_short_description]]',
    emergency: true,
  }),
]);

/** The RMC guidance office (referral target 1). */
export const GUIDANCE_OFFICE = Object.freeze({
  id: 'guidance_office',
  personInCharge: '[[GUIDANCE:guidance_person_name]]',
  roleTitle: '[[GUIDANCE:guidance_person_role_title]]',
  location: SITE.officeLocation,
  hours: SITE.officeHoursText,
  phone: '[[GUIDANCE:guidance_office_phone]]',
  dial: '[[GUIDANCE:guidance_office_dial_digits]]',
});

/** Specialist services (referral targets 2 and 3). IPBM is named in KII Round 1. */
export const SPECIALISTS = Object.freeze([
  Object.freeze({
    id: 'ipbm',
    kind: 'partner',
    name: 'Institute of Psychiatric and Behavioral Medicine',
    description: '[[GUIDANCE:ipbm_description]]',
    phone: '[[GUIDANCE:ipbm_contact_number]]',
    email: '[[GUIDANCE:ipbm_email]]',
  }),
  Object.freeze({
    id: 'external_professionals',
    kind: 'external',
    name: '[[GUIDANCE:external_professional_name]]',
    description: '[[GUIDANCE:external_professional_description]]',
    phone: '[[GUIDANCE:external_professional_contact]]',
    email: '[[GUIDANCE:external_professional_email]]',
  }),
]);

/** The hotline used in the not-for-emergencies sentence. */
export function emergencyHotline() {
  return HOTLINES.find((h) => h.emergency);
}
```

**`src/content/directory.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { HOTLINES, GUIDANCE_OFFICE, SPECIALISTS, emergencyHotline } from './directory.js';

describe('static directory (D-03, 1.4)', () => {
  it('has the four referral targets: guidance office, IPBM, external professionals, hotlines', () => {
    expect(GUIDANCE_OFFICE.id).toBe('guidance_office');
    expect(SPECIALISTS.map((s) => s.id)).toEqual(['ipbm', 'external_professionals']);
    expect(HOTLINES.length).toBeGreaterThanOrEqual(1);
  });
  it('marks exactly one hotline as the emergency line', () => {
    expect(HOTLINES.filter((h) => h.emergency)).toHaveLength(1);
    expect(emergencyHotline()).toBeDefined();
  });
  it('gives every hotline a name, number, and dial value', () => {
    for (const h of HOTLINES) {
      expect(h.name && h.number && h.dial).toBeTruthy();
    }
  });
});
```

### Step 2 — Copy

Replace `src/copy/en.js` with this version (Phase 02 keys unchanged, plus `dev.missingConfig` and the `sections` spread), then add the two new files.

**`src/copy/en.js`**

```js
// All English UI text (00 Section 10.1). Components call t('key.path').
// Phase 02 keys live in this file. From Phase 03 on, each phase adds ONE file in src/copy/en/
// and registers it in src/copy/en/index.js. Never change a key another phase owns.
// Colour words are allowed only between the office-tags markers (00 Section 10.4).
import { SITE } from '../config/site.js';
import { sections } from './en/index.js';

export const en = {
  common: {
    loading: 'Loading…',
    error: {
      title: 'Something went wrong.',
      body: 'This page could not load. Your information has not changed.',
      retry: 'Try again',
    },
    offline:
      "You're offline. Hotlines and crisis information still work. Everything else will load when you're back online.",
    close: 'Close',
    menu: 'Menu',
    footer: SITE.footerLine,
    skipToContent: 'Skip to main content',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    required: 'Required',
  },

  nav: {
    public: {
      label: 'Main',
      guides: 'Guides',
      help: 'Where to get help',
      login: 'Log in',
      register: 'Create account',
      needHelp: 'Need help right now?',
    },
    student: {
      label: 'Student',
      home: 'Home',
      checkin: 'Check-in',
      trends: 'My Trends',
      resources: 'Resources',
      help: 'Where to get help',
      account: 'Account',
      logout: 'Log out',
    },
    staff: {
      label: 'Guidance',
      queue: 'Queue',
      crisis: 'Crisis',
      crisisBadge: '{count} active crisis events',
      referrals: 'Referrals',
      account: 'Account',
      signOut: 'Sign out',
    },
    admin: {
      label: 'Administrator',
      console: 'ADMIN CONSOLE',
      accounts: 'Accounts',
      consent: 'Consent',
      reference: 'Reference data',
      resources: 'Resources',
      audit: 'Audit',
      account: 'Account',
      signOut: 'Sign out',
    },
  },

  auth: {
    register: {
      step: 'Step 1 of 2 · Student Registration',
      backToLogin: 'Back to Log in',
      title: 'Create your account',
      lead: 'A calm, private space for senior high students at Rizal Memorial Colleges.',
      fullName: 'Full name',
      fullNamePlaceholder: 'Juan dela Cruz',
      email: 'School email address',
      emailPlaceholder: 'Your school email',
      gradeLevel: 'Grade level',
      gradePlaceholder: 'Select grade level',
      grade11: 'Grade 11',
      grade12: 'Grade 12',
      section: 'Section',
      adviser: 'Class adviser',
      adviserHint: "Your class adviser's full name.",
      password: 'Password',
      passwordHint: 'Use at least 12 characters.',
      confirmPassword: 'Confirm password',
      submit: 'Continue',
      next: 'Next you will read what HingaWeb keeps private and what it cannot, before you write anything.',
      haveAccount: 'Already have an account?',
      login: 'Log in',
      trust: 'No social logins · No public profile · Encrypted student data',
      sentTitle: 'Check your email',
      sentBody:
        'We sent a link to {email}. Open it to confirm your account. Then come back and log in.',
      sentNote: 'If you do not see it in a few minutes, check your spam folder.',
    },
    login: {
      chip: 'Private to you',
      backHome: 'Back to home',
      title: 'Welcome back',
      lead: 'Take a slow breath. Your thoughts remain your own.',
      email: 'School email address',
      password: 'Password',
      forgot: 'Forgot password?',
      submit: 'Log in',
      newHere: 'New here?',
      create: 'Create an account',
      needHelp: 'Need help right now?',
    },
    forgot: {
      title: 'Reset your password',
      lead: 'Enter your school email. If an account uses it, we will send a link to set a new password.',
      email: 'School email address',
      submit: 'Send link',
      sentTitle: 'Check your email',
      sentBody: 'If an account uses that email, a link to set a new password is on its way.',
      backToLogin: 'Back to Log in',
    },
    reset: {
      title: 'Set a new password',
      password: 'New password',
      passwordHint: 'Use at least 12 characters.',
      confirmPassword: 'Confirm new password',
      submit: 'Save password',
      doneTitle: 'Your password is saved',
      continue: 'Continue',
      invalidTitle: 'This link has expired',
      invalidBody: 'Ask for a new link to reset your password.',
      invalidAction: 'Request a new link',
    },
    confirmed: {
      title: 'Your email is confirmed',
      bodySignedIn: 'Your account is ready.',
      bodySignedOut: 'You can now log in.',
      continue: 'Continue',
      login: 'Log in',
    },
    errors: {
      fullName: 'Enter your full name.',
      email: 'Enter a valid email address.',
      gradeLevel: 'Choose your grade level.',
      section: 'Enter your section.',
      adviser: "Enter your class adviser's name.",
      passwordShort: 'Use at least 12 characters.',
      passwordMatch: 'The passwords do not match.',
      invalidCredentials: 'That email and password do not match. Try again.',
      emailNotConfirmed:
        'Confirm your email first. Open the link we sent when you created your account.',
      rateLimited: 'Too many attempts. Wait a minute, then try again.',
      staffOnStudentPage: 'This is the student log in. Staff sign in through the staff portal.',
      staffPortalLink: 'Go to the staff portal',
      notStudent: 'This account is not set up as a student account. Contact the guidance office.',
      generic: 'We could not finish that right now. Try again.',
    },
  },

  staff: {
    portal: {
      label: 'STAFF PORTAL',
    },
    login: {
      title: 'Guidance office sign in',
      lead: 'Access to student identity records and triage queues requires multi-factor authentication.',
      badge: 'Staff access',
      cardTitle: 'Guidance office sign in',
      cardLead: 'Authorized guidance personnel and administrators.',
      email: 'Work email address',
      password: 'Password',
      passwordHint: 'Staff passwords are at least 12 characters.',
      submit: 'Continue',
      provisioned:
        'Staff accounts are created by the system administrator. Self-registration is disabled.',
      timeoutNote: 'Sessions end automatically after 15 minutes of inactivity.',
      obligationTitle: 'CONFIDENTIALITY OBLIGATION',
      obligationBody:
        'Student names disclosed through support requests are confidential. Every opening of a support request or crisis event is recorded in an audit trail.',
    },
    verify: {
      badge: 'Security verification',
      title: 'Enter your verification code',
      lead: 'Open your authenticator app and enter the current code.',
      codeLabel: 'Security verification code',
      submit: 'Verify',
      back: 'Back to sign in',
      lost: 'Lost access to your authenticator? Contact {contact}.',
    },
    setup: {
      title: 'Set up your staff account',
      step1: 'Step 1 of 2 · Choose a password',
      step2: 'Step 2 of 2 · Add your authenticator app',
      password: 'New password',
      passwordHint: 'Use at least 12 characters.',
      confirmPassword: 'Confirm password',
      savePassword: 'Save password',
      scan: 'Scan this code with your authenticator app.',
      qrAlt: 'QR code for your authenticator app',
      manual: "Can't scan it? Enter this key in the app instead:",
      showKey: 'Show key',
      hideKey: 'Hide key',
      codeLabel: 'Enter the 6-digit code your app shows',
      finish: 'Finish setup',
      noSession: 'This setup link is not valid. Ask the administrator to send a new invitation.',
    },
    timeout: {
      title: 'Your session has ended',
      body: 'You were signed out after 15 minutes without activity. This protects the student information on this screen.',
      action: 'Sign in again',
      note: 'Restricted access · Sign in again to continue',
    },
    errors: {
      invalidCredentials: 'That email and password do not match. Try again.',
      notStaff: 'This account is not a staff account. Students log in on the student page.',
      inactive: 'This account is not active. Contact the administrator.',
      invalidCode: 'That code did not work. Check your app and enter the newest code.',
      codeFormat: 'Enter the 6 digits from your app.',
      rateLimited: 'Too many attempts. Wait a minute, then try again.',
      generic: 'We could not finish that right now. Try again.',
    },
  },

  notFound: {
    title: 'Page not found',
    body: 'This page does not exist.',
    action: 'Go to the home page',
  },

  dev: {
    placeholder: 'This screen is built in Phase {phase}.',
    missingConfig:
      'HingaWeb is not configured. Copy .env.example to .env.local, fill both values, then restart.',
  },

  ...sections,
};
```

**`src/copy/en/index.js`**

```js
// Copy sections added by Phases 03 onward. Each phase replaces this file with one more line.
import { publicCopy } from './public.js';

export const sections = {
  public: publicCopy,
};
```

**`src/copy/en/public.js`**

```js
// Phase 03 copy: landing (Fig 7), guides, where to get help (Fig 14), hotlines, emergency notice.
export const publicCopy = {
  landing: {
    strip: 'RIZAL MEMORIAL COLLEGES GUIDANCE SERVICES',
    stripDept: 'Senior High School Department (SHS)',
    stripRight: 'Free · Private check-ins · No app to install',
    chip: 'SENIOR HIGH GUIDANCE PLATFORM',
    title: 'A private place to check in with yourself.',
    lead: "HingaWeb helps you notice how you are doing and connects you to your school's guidance office when you want support.",
    leadNot: 'It is not a diagnosis and it is not a replacement for talking to someone.',
    explore: 'Explore how it works',
    readGuides: 'Read guide articles',
    listenNote: 'Your school guidance counselors are here to listen without judgment.',
    how: {
      eyebrow: 'HOW HINGAWEB WORKS',
      title: 'Designed for student peace of mind',
      side: 'No public profile · You decide what to share',
      step1Title: '1. Notice your feelings',
      step1Body: 'Private reflections you control. No one sees your raw notes.',
      step1Foot: 'Stored securely on your account',
      step2Title: '2. Optional guidance referral',
      step2Body: "Send a support request to your school's guidance office whenever you are ready.",
      step2Foot: 'Goes to the SHS guidance office',
      step3Title: '3. Safe and campus-based',
      step3Body: 'Built specifically for senior high school students of Rizal Memorial Colleges.',
      step3Foot: 'Made for RMC senior high',
    },
    guides: {
      chip: 'Free to read without an account',
      title: 'Read something helpful',
      lead: 'Short guides for high school life. Free to read anytime without creating an account.',
      seeAll: 'See all guides',
    },
    office: {
      title: 'Rizal Memorial Colleges, Inc. senior high school guidance office.',
      hours: 'Guidance office hours: {hours} · {location}',
      visit: 'You can also visit the office in person.',
    },
  },

  guides: {
    chip: 'Free to read without an account',
    title: 'Guides',
    lead: 'Short guides for high school life. Free to read anytime without creating an account.',
    filterLabel: 'Filter guides by area',
    all: 'All',
    freeAccess: 'Free access',
    read: 'Read guide',
    opensNewTab: '(opens in a new tab)',
    emptyTitle: 'No guides yet',
    emptyBody: 'The guidance office has not published any guides yet. Please check again later.',
    emptyFilterTitle: 'No guides in this area yet',
    emptyFilterBody: 'Choose another area or All.',
    matchedNote: 'Signed in? See guides matched to your check-in on the Resources page.',
    matchedLink: 'Go to Resources',
  },

  help: {
    chip: 'Free to use · No account needed',
    title: 'Where to get help',
    lead: 'A directory of people and organizations ready to support you, inside school and out. Reaching out is always your choice.',
    office: {
      eyebrow: 'CAMPUS ANCHOR',
      title: 'Your school guidance office',
      personLabel: 'Counselor in charge',
      locationLabel: 'Location',
      hoursLabel: 'Office hours',
      phoneLabel: 'Phone',
      privacyLabel: 'Student privacy',
      privacyValue: 'Confidential',
      privacyNote: 'If someone may be in danger, the office must act to keep them safe.',
      visit: 'You can visit the office in person, or send a support request.',
      send: 'Send a support request',
      sendNote: 'Your name and class details are shared only when you send a request.',
      call: 'Call the guidance office',
    },
    specialists: {
      title: 'Specialist services',
      lead: 'Organizations outside school that offer specialized support for young people.',
      partner: 'Partner organization',
      external: 'External professionals',
      phoneLabel: 'Phone',
      emailLabel: 'Email',
    },
    hotlines: {
      eyebrow: 'ALWAYS ON STANDBY',
      title: 'Crisis hotlines, available 24 hours',
    },
    closing:
      'Take things one breath at a time. Asking for guidance is a quiet act of courage, not a sign of weakness.',
  },

  hotlines: {
    cardTitle: 'Need help right now?',
    cardChip: 'Immediate support',
    cardLead:
      'If you or someone you know is in immediate distress, free and confidential support is ready 24/7.',
    call: 'Call {number}',
    callLabel: 'Call {name} at {number}',
  },

  emergency: {
    notice: 'HingaWeb is not for emergencies. If you are in immediate danger, call {number} now.',
  },
};
```

**`src/copy/allowlist.js`** — adds allowlisted sentence 1 (00 §10.3)

```js
// 00 Section 10.3. Exact sentences exempt from scripts/check-copy.js.
// Add a sentence ONLY in the phase that the plan names for it.
export const ALLOWLIST = [
  // Phase 03 · Fig 7 hero (allowlisted sentence 1)
  'It is not a diagnosis and it is not a replacement for talking to someone.',
];
```

### Step 3 — Supabase client fix and service worker

**`src/lib/supabase.js`**

```js
// The single Supabase client (00 Section 4). Never create another client in src/.
// Phase 03 change: this module no longer throws when the env values are missing. A throw at import
// time let the bundler drop the whole app from builds made without .env.local. main.jsx now shows a
// configuration message instead.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** False when .env.local (or the hosting environment) does not provide both values. */
export const supabaseConfigured = Boolean(url && key);

export const supabase = createClient(
  url || 'http://127.0.0.1:54321',
  key || 'missing-publishable-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // reads the session from email confirmation, reset, and invite links
    },
  },
);
```

**`src/main.jsx`**

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App.jsx';
import { supabaseConfigured } from './lib/supabase.js';
import { t } from './copy/index.js';

// Phase 03 · 2.1.6.4.6: precache the app so hotlines and the directory show with no network.
registerSW({ immediate: true });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {supabaseConfigured ? <App /> : <p style={{ padding: 24 }}>{t('dev.missingConfig')}</p>}
  </StrictMode>,
);
```

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
    include: ['src/**/*.test.{js,jsx}', 'supabase/functions/_shared/**/*.test.js', 'scripts/**/*.test.js'],
  },
});
```

### Step 4 — Public components and pages

**`src/features/public/primaryArea.js`**

```js
import { CRITERIA } from '../../config/vocabulary.js';

/**
 * The area a resource is mostly about: its highest attribute value.
 * Ties go to the earlier area in CRITERIA order (School work, Home and family, Future, Managing).
 * @param {Record<string, number>} attributes  e.g. { school_work: 5, home_family: 1, future: 1, managing: 2 }
 * @returns {{ attribute: string, label: string }}
 */
export function primaryArea(attributes) {
  let best = CRITERIA[0];
  for (const c of CRITERIA) {
    if ((attributes?.[c.attribute] ?? 0) > (attributes?.[best.attribute] ?? 0)) best = c;
  }
  return { attribute: best.attribute, label: best.studentLabel };
}
```

**`src/features/public/primaryArea.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { primaryArea } from './primaryArea.js';

describe('primaryArea', () => {
  it('picks the highest attribute', () => {
    expect(primaryArea({ school_work: 1, home_family: 1, future: 5, managing: 0 })).toEqual({
      attribute: 'future',
      label: 'Future',
    });
  });
  it('breaks ties in criteria order', () => {
    expect(primaryArea({ school_work: 3, home_family: 3, future: 0, managing: 3 }).label).toBe(
      'School work',
    );
  });
});
```

**`src/features/public/HotlineList.jsx`**

```jsx
// 24/7 hotlines from the static directory (2.1.5.1.2, 2.1.6.4.6). No network needed.
import { Phone } from 'lucide-react';
import { t } from '../../copy/index.js';
import { HOTLINES } from '../../content/directory.js';
import { buttonClasses } from '../../components/ui/index.js';

export function HotlineList({ lang = 'en' }) {
  return (
    <ul className="flex flex-col gap-3">
      {HOTLINES.map((h) => (
        <li
          key={h.id}
          className="flex flex-col gap-3 rounded-card border border-line bg-surface-muted p-4"
        >
          <div>
            <p className="font-semibold text-ink">{h.name}</p>
            <p className="text-[14px] text-ink-muted">{h.note}</p>
            <p className="mt-1 font-mono text-[15px] text-ink">{h.number}</p>
          </div>
          <a
            href={`tel:${h.dial}`}
            aria-label={t('public.hotlines.callLabel', { name: h.name, number: h.number }, lang)}
            className={buttonClasses('primary', 'md', 'max-w-full self-start text-left')}
          >
            <Phone aria-hidden="true" className="size-4" />
            <span>{t('public.hotlines.call', { number: h.number }, lang)}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
```

**`src/features/public/EmergencyNotice.jsx`**

```jsx
// "Not for emergencies" notice (2.1.5.1.8, 2.1.6.4.6). Static; never needs the backend.
import { Info } from 'lucide-react';
import { t } from '../../copy/index.js';
import { emergencyHotline } from '../../content/directory.js';

export function EmergencyNotice({ lang = 'en' }) {
  return (
    <p className="flex items-start gap-2 text-[14px] text-ink">
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{t('public.emergency.notice', { number: emergencyHotline().number }, lang)}</span>
    </p>
  );
}
```

**`src/features/public/NeedHelpCard.jsx`**

```jsx
// Fig 7 right-hand card: hotlines on the landing page, visible without an account.
import { t } from '../../copy/index.js';
import { Card, Chip } from '../../components/ui/index.js';
import { HotlineList } from './HotlineList.jsx';
import { EmergencyNotice } from './EmergencyNotice.jsx';

export function NeedHelpCard() {
  return (
    <Card as="aside" aria-labelledby="need-help-title" className="flex flex-col gap-4">
      <Chip>{t('public.hotlines.cardChip')}</Chip>
      <h2 id="need-help-title" className="text-[20px] font-semibold text-ink">
        {t('public.hotlines.cardTitle')}
      </h2>
      <p className="text-[14px] text-ink-muted">{t('public.hotlines.cardLead')}</p>
      <HotlineList />
      <EmergencyNotice />
    </Card>
  );
}
```

**`src/features/public/ResourceCard.jsx`**

```jsx
// One verified resource: area chip, title, and a link that opens the source in a new tab.
// Phase 06 reuses this card and passes onOpen to record a resource view.
import { ArrowRight } from 'lucide-react';
import { t } from '../../copy/index.js';
import { Card, Chip } from '../../components/ui/index.js';
import { primaryArea } from './primaryArea.js';

export function ResourceCard({ resource, onOpen }) {
  const area = primaryArea(resource.attributes);
  return (
    <Card as="article" className="flex flex-col gap-3">
      <Chip className="self-start">{area.label}</Chip>
      <h3 className="text-[17px] font-semibold text-ink">{resource.title}</h3>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="text-[13px] text-ink-muted">{t('public.guides.freeAccess')}</span>
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onOpen?.(resource)}
          className="inline-flex min-h-11 items-center gap-1 rounded-control font-semibold text-ink"
        >
          {t('public.guides.read')}
          <span className="sr-only">
            {' '}
            {resource.title} {t('public.guides.opensNewTab')}
          </span>
          <ArrowRight aria-hidden="true" className="size-4" />
        </a>
      </div>
    </Card>
  );
}
```

**`src/features/public/usePublishedResources.js`**

```js
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';

/**
 * Published resources (Tier 1 public read; RLS returns only rows with verified_at set).
 * @returns {{ status: 'loading'|'error'|'ready', resources: object[], reload: () => void }}
 */
export function usePublishedResources() {
  const [state, setState] = useState({ status: 'loading', resources: [] });
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }));
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let active = true;
    supabase
      .from('resources')
      .select('id, title, url, attributes')
      .not('verified_at', 'is', null)
      .order('title', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        setState(
          error ? { status: 'error', resources: [] } : { status: 'ready', resources: data ?? [] },
        );
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  return { ...state, reload };
}
```

**`src/features/public/LandingPage.jsx`**

```jsx
// Fig 7 · public landing (Tier 1, 2.1.5.1.2). D-18, D-19, D-20, D-30 applied.
import { Link } from 'react-router';
import { ArrowRight, CalendarHeart, GraduationCap, Lock, NotebookPen } from 'lucide-react';
import { t } from '../../copy/index.js';
import {
  Card,
  Chip,
  EmptyState,
  ErrorState,
  LinkButton,
  Skeleton,
  buttonClasses,
} from '../../components/ui/index.js';
import { SITE } from '../../config/site.js';
import { NeedHelpCard } from './NeedHelpCard.jsx';
import { ResourceCard } from './ResourceCard.jsx';
import { usePublishedResources } from './usePublishedResources.js';

const STEPS = [
  { icon: NotebookPen, n: 1 },
  { icon: CalendarHeart, n: 2 },
  { icon: GraduationCap, n: 3 },
];

export function LandingPage() {
  const { status, resources, reload } = usePublishedResources();
  return (
    <div className="flex flex-col gap-12">
      <p className="flex flex-col gap-1 rounded-card bg-blush px-4 py-2 text-[12px] font-semibold tracking-wide text-ink sm:flex-row sm:justify-between">
        <span>
          {t('public.landing.strip')}{' '}
          <span className="font-normal">· {t('public.landing.stripDept')}</span>
        </span>
        <span className="font-normal">{t('public.landing.stripRight')}</span>
      </p>

      <section className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-start">
        <div className="flex flex-col gap-4">
          <Chip className="self-start">{t('public.landing.chip')}</Chip>
          <h1 className="text-[32px] font-semibold leading-10 text-ink md:text-[40px] md:leading-[48px]">
            {t('public.landing.title')}
          </h1>
          <p className="text-base text-ink">
            {t('public.landing.lead')} {t('public.landing.leadNot')}
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#how" className={buttonClasses('primary', 'md')}>
              {t('public.landing.explore')}
              <ArrowRight aria-hidden="true" className="size-4" />
            </a>
            <LinkButton to="/guides" variant="outline">
              {t('public.landing.readGuides')}
            </LinkButton>
          </div>
          <p className="flex items-center gap-2 text-[14px] text-ink-muted">
            <Lock aria-hidden="true" className="size-4 shrink-0" />
            {t('public.landing.listenNote')}
          </p>
        </div>
        <NeedHelpCard />
      </section>

      <section id="how" aria-labelledby="how-title" className="flex flex-col gap-4 scroll-mt-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[12px] font-semibold tracking-[0.14em] text-ink-muted">
              {t('public.landing.how.eyebrow')}
            </p>
            <h2 id="how-title" className="text-[20px] font-semibold text-ink">
              {t('public.landing.how.title')}
            </h2>
          </div>
          <p className="text-[13px] text-ink-muted">{t('public.landing.how.side')}</p>
        </div>
        <ul className="grid gap-4 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, n }) => (
            <li key={n}>
              <Card className="flex h-full flex-col gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-10 items-center justify-center rounded-control bg-blush"
                >
                  <Icon className="size-5 text-ink" />
                </span>
                <h3 className="text-[17px] font-semibold text-ink">
                  {t(`public.landing.how.step${n}Title`)}
                </h3>
                <p className="text-[14px] text-ink-muted">{t(`public.landing.how.step${n}Body`)}</p>
                <p className="mt-auto border-t border-line pt-3 text-[13px] text-ink">
                  {t(`public.landing.how.step${n}Foot`)}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="guides-title" className="flex flex-col gap-4">
        <Chip className="self-start">{t('public.landing.guides.chip')}</Chip>
        <h2 id="guides-title" className="text-[24px] font-semibold text-ink">
          {t('public.landing.guides.title')}
        </h2>
        <p className="text-base text-ink-muted">{t('public.landing.guides.lead')}</p>
        {status === 'loading' && <Skeleton lines={4} />}
        {status === 'error' && <ErrorState onRetry={reload} />}
        {status === 'ready' && resources.length === 0 && (
          <EmptyState title={t('public.guides.emptyTitle')} body={t('public.guides.emptyBody')} />
        )}
        {status === 'ready' && resources.length > 0 && (
          <>
            <ul className="grid gap-4 md:grid-cols-2">
              {resources.slice(0, 4).map((r) => (
                <li key={r.id}>
                  <ResourceCard resource={r} />
                </li>
              ))}
            </ul>
            <Link
              to="/guides"
              className="inline-flex min-h-11 items-center gap-1 self-start font-semibold text-ink underline"
            >
              {t('public.landing.guides.seeAll')}
            </Link>
          </>
        )}
      </section>

      <Card className="text-center">
        <p className="font-semibold text-ink">{t('public.landing.office.title')}</p>
        <p className="mt-1 text-[14px] text-ink-muted">
          {t('public.landing.office.hours', {
            hours: SITE.officeHoursText,
            location: SITE.officeLocation,
          })}
        </p>
        <p className="text-[14px] text-ink-muted">{t('public.landing.office.visit')}</p>
      </Card>
    </div>
  );
}
```

**`src/features/public/GuidesPage.jsx`**

```jsx
// Tier 1 guide list (Fig 7 "Read something helpful"; 2.1.5.1.2). Unranked; no tracking.
import { useState } from 'react';
import { Link } from 'react-router';
import { t } from '../../copy/index.js';
import { CRITERIA } from '../../config/vocabulary.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import {
  EmptyState,
  ErrorState,
  PageHeader,
  SegmentedControl,
  Skeleton,
} from '../../components/ui/index.js';
import { ResourceCard } from './ResourceCard.jsx';
import { primaryArea } from './primaryArea.js';
import { usePublishedResources } from './usePublishedResources.js';

export function GuidesPage() {
  const { account } = useAuth();
  const { status, resources, reload } = usePublishedResources();
  const [area, setArea] = useState('all');
  const options = [
    { value: 'all', label: t('public.guides.all') },
    ...CRITERIA.map((c) => ({ value: c.attribute, label: c.studentLabel })),
  ];
  const shown =
    area === 'all'
      ? resources
      : resources.filter((r) => primaryArea(r.attributes).attribute === area);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t('public.guides.chip')}
        title={t('public.guides.title')}
        lead={t('public.guides.lead')}
      />
      {account.kind === 'student' && account.tier2 && (
        <p className="text-[14px] text-ink">
          {t('public.guides.matchedNote')}{' '}
          <Link to="/resources" className="font-semibold underline">
            {t('public.guides.matchedLink')}
          </Link>
        </p>
      )}
      <SegmentedControl
        label={t('public.guides.filterLabel')}
        options={options}
        value={area}
        onChange={setArea}
      />
      {status === 'loading' && <Skeleton lines={5} />}
      {status === 'error' && <ErrorState onRetry={reload} />}
      {status === 'ready' && resources.length === 0 && (
        <EmptyState title={t('public.guides.emptyTitle')} body={t('public.guides.emptyBody')} />
      )}
      {status === 'ready' && resources.length > 0 && shown.length === 0 && (
        <EmptyState
          title={t('public.guides.emptyFilterTitle')}
          body={t('public.guides.emptyFilterBody')}
        />
      )}
      {status === 'ready' && shown.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2">
          {shown.map((r) => (
            <li key={r.id}>
              <ResourceCard resource={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**`src/features/public/HelpPage.jsx`**

```jsx
// Fig 14 · where to get help (2.1.5.1.8; four referral targets from 1.4). Fully static: works offline.
import {
  Building2,
  Clock,
  HeartHandshake,
  Lock,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { t } from '../../copy/index.js';
import { GUIDANCE_OFFICE, SPECIALISTS } from '../../content/directory.js';
import { Card, Chip, LinkButton, PageHeader, buttonClasses } from '../../components/ui/index.js';
import { HotlineList } from './HotlineList.jsx';
import { EmergencyNotice } from './EmergencyNotice.jsx';

function Detail({ icon: Icon, label, value, note }) {
  return (
    <div className="flex gap-2">
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-muted" />
      <div>
        <p className="text-[12px] text-ink-muted">{label}</p>
        <p className="text-[15px] text-ink">{value}</p>
        {note && <p className="text-[12px] text-ink-muted">{note}</p>}
      </div>
    </div>
  );
}

export function HelpPage() {
  const o = GUIDANCE_OFFICE;
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={t('public.help.chip')}
        title={t('public.help.title')}
        lead={t('public.help.lead')}
      />

      <Card aria-labelledby="office-title" className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-control bg-blush"
          >
            <HeartHandshake className="size-5 text-ink" />
          </span>
          <div>
            <p className="text-[12px] font-semibold tracking-[0.14em] text-ink-muted">
              {t('public.help.office.eyebrow')}
            </p>
            <h2 id="office-title" className="text-[20px] font-semibold text-ink">
              {t('public.help.office.title')}
            </h2>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Detail
            icon={Building2}
            label={t('public.help.office.personLabel')}
            value={o.personInCharge}
            note={o.roleTitle}
          />
          <Detail icon={MapPin} label={t('public.help.office.locationLabel')} value={o.location} />
          <Detail icon={Clock} label={t('public.help.office.hoursLabel')} value={o.hours} />
          <Detail
            icon={Lock}
            label={t('public.help.office.privacyLabel')}
            value={t('public.help.office.privacyValue')}
            note={t('public.help.office.privacyNote')}
          />
        </div>
        <p className="rounded-control bg-surface-muted px-4 py-3 text-[14px] text-ink">
          {t('public.help.office.visit')}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <LinkButton to="/request">
            <Send aria-hidden="true" className="size-4" />
            {t('public.help.office.send')}
          </LinkButton>
          <a href={`tel:${o.dial}`} className={buttonClasses('outline', 'md')}>
            <Phone aria-hidden="true" className="size-4" />
            <span>{t('public.help.office.call')}</span>
          </a>
        </div>
        <p className="text-[13px] text-ink-muted">{t('public.help.office.sendNote')}</p>
      </Card>

      <section aria-labelledby="specialists-title" className="flex flex-col gap-3">
        <h2 id="specialists-title" className="text-[20px] font-semibold text-ink">
          {t('public.help.specialists.title')}
        </h2>
        <p className="text-[14px] text-ink-muted">{t('public.help.specialists.lead')}</p>
        <ul className="grid gap-4 md:grid-cols-2">
          {SPECIALISTS.map((s) => (
            <li key={s.id}>
              <Card className="flex h-full flex-col gap-2">
                <Chip className="self-start">
                  {s.kind === 'partner'
                    ? t('public.help.specialists.partner')
                    : t('public.help.specialists.external')}
                </Chip>
                <h3 className="text-[17px] font-semibold text-ink">{s.name}</h3>
                <p className="text-[14px] text-ink-muted">{s.description}</p>
                <p className="text-[14px] text-ink">
                  {t('public.help.specialists.phoneLabel')}: {s.phone}
                </p>
                <p className="text-[14px] text-ink">
                  {t('public.help.specialists.emailLabel')}: {s.email}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <Card aria-labelledby="hotlines-title" className="flex flex-col gap-4">
        <p className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.14em] text-ink-muted">
          <ShieldCheck aria-hidden="true" className="size-4" />
          {t('public.help.hotlines.eyebrow')}
        </p>
        <h2 id="hotlines-title" className="text-[20px] font-semibold text-ink">
          {t('public.help.hotlines.title')}
        </h2>
        <HotlineList />
        <EmergencyNotice />
      </Card>

      <p className="rounded-card bg-blush px-4 py-4 text-center text-[14px] text-ink">
        {t('public.help.closing')}
      </p>
    </div>
  );
}
```

### Step 5 — Layout width, long-text wrapping, routes

**`src/components/layout/PublicLayout.jsx`**

```jsx
import { Outlet } from 'react-router';
import { t } from '../../copy/index.js';
import { LinkButton } from '../ui/LinkButton.jsx';
import { AppHeader } from './AppHeader.jsx';
import { Footer } from './Footer.jsx';
import { Main } from './Main.jsx';
import { SkipLink } from './SkipLink.jsx';

/** width: 'reading' (768px) or 'wide' (1200px; the landing page). */
export function PublicLayout({ width = 'reading' }) {
  const items = [
    { to: '/guides', label: t('nav.public.guides') },
    { to: '/help', label: t('nav.public.help') },
  ];
  const actions = (
    <>
      <LinkButton to="/login" variant="outline">
        {t('nav.public.login')}
      </LinkButton>
      <LinkButton to="/register">{t('nav.public.register')}</LinkButton>
    </>
  );
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <SkipLink />
      <AppHeader
        logoTo="/"
        navLabel={t('nav.public.label')}
        items={items}
        right={actions}
        mobileExtras={actions}
      />
      <div className="flex-1">
        <Main width={width}>
          <Outlet />
        </Main>
      </div>
      <Footer />
    </div>
  );
}
```

**`src/components/layout/StudentLayout.jsx`**

```jsx
import { Outlet, useNavigate } from 'react-router';
import { t } from '../../copy/index.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import { Button } from '../ui/Button.jsx';
import { AccountMenu } from './AccountMenu.jsx';
import { AppHeader } from './AppHeader.jsx';
import { Footer } from './Footer.jsx';
import { Main } from './Main.jsx';
import { SkipLink } from './SkipLink.jsx';

/** width: 'reading' (768px) or 'wide' (1200px; the landing page). */
export function StudentLayout({ width = 'reading' }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const logOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };
  const items = [
    { to: '/', label: t('nav.student.home'), end: true },
    { to: '/check-in', label: t('nav.student.checkin') },
    { to: '/trends', label: t('nav.student.trends') },
    { to: '/resources', label: t('nav.student.resources') },
    { to: '/help', label: t('nav.student.help') },
  ];
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <SkipLink />
      <AppHeader
        logoTo="/"
        navLabel={t('nav.student.label')}
        items={items}
        right={
          <AccountMenu
            label={t('nav.student.account')}
            itemLabel={t('nav.student.logout')}
            onSelect={logOut}
          />
        }
        mobileExtras={
          <Button variant="outline" onClick={logOut}>
            {t('nav.student.logout')}
          </Button>
        }
      />
      <div className="flex-1">
        <Main width={width}>
          <Outlet />
        </Main>
      </div>
      <Footer />
    </div>
  );
}
```

**`src/components/layout/PublicOrStudentLayout.jsx`**

```jsx
import { useAuth } from '../../lib/auth/useAuth.js';
import { PublicLayout } from './PublicLayout.jsx';
import { StudentLayout } from './StudentLayout.jsx';

/** "/", "/guides", "/help": a signed-in student keeps the student header; everyone else sees the public one. */
export function PublicOrStudentLayout({ width = 'reading' }) {
  const { account } = useAuth();
  return account.kind === 'student' ? (
    <StudentLayout width={width} />
  ) : (
    <PublicLayout width={width} />
  );
}
```

**`src/index.css`**

```css
@import 'tailwindcss';
@import '@fontsource-variable/inter';

/* 00 Section 8.1 — the ONLY colours the app may use. The default palette is removed. */
@theme {
  --color-*: initial;
  --color-canvas: #fff1f4;
  --color-canvas-alt: #f8f6f4;
  --color-surface: #ffffff;
  --color-surface-muted: #f5f2f2;
  --color-blush: #fde4ea;
  --color-blush-strong: #f9ccd7;
  --color-line: #f0dce1;
  --color-ink: #1e1e1e;
  --color-ink-muted: #5c5c5c;
  --color-action: #2a2a2a;
  --color-action-ink: #f6b3c4;
  --color-white: #ffffff;
  --color-transparent: transparent;
  --font-sans: 'Inter Variable', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --radius-card: 16px;
  --radius-control: 12px;
}

@layer base {
  html {
    background-color: var(--color-canvas);
    color: var(--color-ink);
    font-family: var(--font-sans);
    -webkit-text-size-adjust: 100%;
  }
  body {
    margin: 0;
    min-height: 100vh;
    font-size: 16px;
    line-height: 24px;
    /* long emails, links, and names wrap instead of pushing the page sideways (no horizontal scroll) */
    overflow-wrap: anywhere;
  }
  /* 00 Section 8.4: visible focus on every interactive element */
  :focus-visible {
    outline: 2px solid var(--color-ink);
    outline-offset: 2px;
  }
  main:focus {
    outline: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
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
          <Route path="welcome" element={<PhasePlaceholder phase="04" />} />
          <Route path="waiting-for-consent" element={<PhasePlaceholder phase="04" />} />
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

### Step 6 — Tests and config

**`src/test/mockSupabase.js`** — adds `queryResult()` for chained queries

```js
// Test helper: a fake Supabase client. Each test sets the return values it needs.
import { vi } from 'vitest';

/**
 * A chainable, awaitable fake query: supabase.from('x').select(...).eq(...).order(...) resolves to `result`.
 * Records every call in `calls` so tests can assert the exact query.
 */
export function queryResult(result) {
  const calls = [];
  const q = {
    calls,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  for (const m of [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'neq',
    'not',
    'is',
    'in',
    'gte',
    'lte',
    'lt',
    'gt',
    'order',
    'limit',
    'single',
    'maybeSingle',
    'range',
  ]) {
    q[m] = (...args) => {
      calls.push([m, ...args]);
      return q;
    };
  }
  return q;
}

export function createMockSupabase() {
  return {
    rpc: vi.fn(),
    from: vi.fn(),
    functions: { invoke: vi.fn() },
    channel: vi.fn(),
    removeChannel: vi.fn(),
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(async () => ({ error: null })),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      getSession: vi.fn(async () => ({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      mfa: {
        listFactors: vi.fn(),
        enroll: vi.fn(),
        unenroll: vi.fn(),
        challengeAndVerify: vi.fn(),
        getAuthenticatorAssuranceLevel: vi.fn(),
      },
    },
  };
}
```

**`src/features/public/public.test.jsx`**

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { renderWithAuth, fakeAuth, STUDENT_T2 } from '../../test/renderWithAuth.jsx';
import { createMockSupabase, queryResult } from '../../test/mockSupabase.js';
import { HOTLINES } from '../../content/directory.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { LandingPage } = await import('./LandingPage.jsx');
const { GuidesPage } = await import('./GuidesPage.jsx');
const { HelpPage } = await import('./HelpPage.jsx');

const RESOURCES = [
  {
    id: 'r1',
    title: 'Managing exam pressure',
    url: 'https://example.org/a',
    attributes: { school_work: 5, home_family: 1, future: 1, managing: 2 },
  },
  {
    id: 'r2',
    title: 'Talking to family about money worries',
    url: 'https://example.org/b',
    attributes: { school_work: 0, home_family: 5, future: 1, managing: 1 },
  },
  {
    id: 'r3',
    title: 'Thinking about life after senior high',
    url: 'https://example.org/c',
    attributes: { school_work: 1, home_family: 1, future: 5, managing: 0 },
  },
];

describe('LandingPage (Fig 7)', () => {
  beforeEach(() => {
    mock.client = createMockSupabase();
  });

  it('shows the hero, the hotlines, and published guides', async () => {
    const q = queryResult({ data: RESOURCES, error: null });
    mock.client.from.mockReturnValue(q);
    renderWithAuth(<Route path="/" element={<LandingPage />} />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'A private place to check in with yourself.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /It is not a diagnosis and it is not a replacement for talking to someone\./,
      ),
    ).toBeInTheDocument();
    const help = screen.getByRole('complementary', { name: 'Need help right now?' });
    expect(within(help).getAllByRole('link')).toHaveLength(HOTLINES.length);
    expect(
      await screen.findByRole('heading', { name: 'Managing exam pressure' }),
    ).toBeInTheDocument();
    expect(mock.client.from).toHaveBeenCalledWith('resources');
    expect(q.calls[0]).toEqual(['select', 'id, title, url, attributes']);
  });

  it('still shows the hotlines when the guides cannot load', async () => {
    mock.client.from.mockReturnValue(queryResult({ data: null, error: { message: 'offline' } }));
    renderWithAuth(<Route path="/" element={<LandingPage />} />);
    expect(await screen.findByText('Something went wrong.')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Need help right now?' })).toBeInTheDocument();
  });

  it('has no 30-second demo check-in and no free-text box (D-19)', async () => {
    mock.client.from.mockReturnValue(queryResult({ data: [], error: null }));
    renderWithAuth(<Route path="/" element={<LandingPage />} />);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByText(/30-second/i)).toBeNull();
    expect(await screen.findByText('No guides yet')).toBeInTheDocument();
  });
});

describe('GuidesPage', () => {
  beforeEach(() => {
    mock.client = createMockSupabase();
    mock.client.from.mockReturnValue(queryResult({ data: RESOURCES, error: null }));
  });

  it('filters guides by area', async () => {
    renderWithAuth(<Route path="/guides" element={<GuidesPage />} />, { path: '/guides' });
    expect(await screen.findAllByRole('article')).toHaveLength(3);
    await userEvent.click(screen.getByRole('radio', { name: 'Future' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(
      screen.getByRole('heading', { name: 'Thinking about life after senior high' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Managing' }));
    expect(screen.getByText('No guides in this area yet')).toBeInTheDocument();
  });

  it('opens guides in a new tab without sending the referrer', async () => {
    renderWithAuth(<Route path="/guides" element={<GuidesPage />} />, { path: '/guides' });
    const link = (await screen.findAllByRole('link', { name: /Read guide/ }))[0];
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('points a Tier 2 student to their matched resources', async () => {
    renderWithAuth(<Route path="/guides" element={<GuidesPage />} />, {
      path: '/guides',
      auth: fakeAuth({ account: STUDENT_T2 }),
    });
    expect(screen.getByRole('link', { name: 'Go to Resources' })).toHaveAttribute(
      'href',
      '/resources',
    );
  });
});

describe('HelpPage (Fig 14, 2.1.5.1.8)', () => {
  it('shows all four referral targets and the not-for-emergencies notice, with no network call', () => {
    mock.client = createMockSupabase();
    renderWithAuth(<Route path="/help" element={<HelpPage />} />, { path: '/help' });
    expect(
      screen.getByRole('heading', { name: 'Your school guidance office' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Institute of Psychiatric and Behavioral Medicine' }),
    ).toBeInTheDocument();
    expect(screen.getByText('External professionals')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Crisis hotlines, available 24 hours' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/HingaWeb is not for emergencies\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Send a support request/ })).toHaveAttribute(
      'href',
      '/request',
    );
    expect(mock.client.from).not.toHaveBeenCalled();
    expect(mock.client.rpc).not.toHaveBeenCalled();
  });

  it('renders hotline dial links from the static directory', () => {
    mock.client = createMockSupabase();
    renderWithAuth(<Route path="/help" element={<HelpPage />} />, { path: '/help' });
    for (const h of HOTLINES) {
      expect(
        screen.getAllByRole('link', { name: `Call ${h.name} at ${h.number}` })[0],
      ).toHaveAttribute('href', `tel:${h.dial}`);
    }
  });
});
```

**`eslint.config.js`** — Playwright specs may use browser globals inside page.evaluate()

```js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist', 'dev-dist', 'node_modules', 'playwright-report', 'test-results', 'supabase/.temp'] },
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['**/supabase/functions/**'], message: 'src/ must never import Edge Function code (00 Section 5.3).' }],
      }],
      'no-restricted-globals': ['error',
        { name: 'localStorage', message: 'No student text in browser storage (00 must-never 14). Only src/lib/storage.js may touch it (Phase 02).' },
        { name: 'sessionStorage', message: 'No student text in browser storage (00 must-never 14).' },
        { name: 'indexedDB', message: 'No student text in browser storage (00 must-never 14).' }],
    },
  },
  {
    // Tests and test helpers may export helpers next to components.
    files: ['src/**/*.test.{js,jsx}', 'src/test/**/*.{js,jsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // Playwright specs run in Node but page.evaluate() bodies run in the browser.
    files: ['e2e/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
    rules: { ...js.configs.recommended.rules },
  },
  {
    files: ['scripts/**/*.js', 'supabase/functions/**/*.js', '*.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, Deno: 'readonly' },
    },
    rules: { ...js.configs.recommended.rules },
  },
];
```

**`e2e/phase-03/public.spec.js`**

```js
import { test, expect } from '@playwright/test';

test.describe('Phase 03 · public pages (Tier 1)', () => {
  test('landing shows the hero, the hotline card, and the not-for-emergencies notice (Fig 7)', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: 'A private place to check in with yourself.' }),
    ).toBeVisible();
    const card = page.getByRole('complementary', { name: 'Need help right now?' });
    await expect(card).toBeVisible();
    await expect(card.getByText(/HingaWeb is not for emergencies\./)).toBeVisible();
    await expect(page.getByRole('textbox')).toHaveCount(0); // D-19: no demo check-in
  });

  test('where to get help lists the four referral targets (Fig 14, 1.4)', async ({ page }) => {
    await page.goto('/help');
    await expect(page.getByRole('heading', { name: 'Your school guidance office' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Institute of Psychiatric and Behavioral Medicine' }),
    ).toBeVisible();
    await expect(page.getByText('External professionals')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Crisis hotlines, available 24 hours' }),
    ).toBeVisible();
  });

  test('no horizontal scrolling on public pages', async ({ page }) => {
    for (const path of ['/', '/guides', '/help']) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });

  test('sending a request from the directory asks a signed-out visitor to log in', async ({
    page,
  }) => {
    await page.goto('/help');
    await page.getByRole('link', { name: /Send a support request/ }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
```

**`e2e/phase-03/offline.spec.js`**

```js
import { test, expect } from '@playwright/test';

// 2.1.6.4.6: hotlines and the not-for-emergencies notice display when the backend is unreachable.
test('hotlines and the directory still show with no network', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload(); // now controlled by the service worker
  await context.setOffline(true);

  await page.goto('/help');
  await expect(
    page.getByRole('heading', { name: 'Crisis hotlines, available 24 hours' }),
  ).toBeVisible();
  await expect(page.getByText(/HingaWeb is not for emergencies\./)).toBeVisible();

  await page.goto('/');
  await expect(page.getByRole('complementary', { name: 'Need help right now?' })).toBeVisible();
  await context.setOffline(false);
});
```

**`e2e/phase-03/a11y.spec.js`**

```js
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const path of ['/', '/guides', '/help']) {
  test(`no WCAG 2.1 A/AA violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
```

---

## 6. Must never (this phase)

1. Never fetch hotlines, the directory, or the not-for-emergencies notice from the network. They are static.
2. Never let the hotlines depend on the guides loading: a guides error must leave the hotline card on screen.
3. Never cache a Supabase response in the service worker (`runtimeCaching` stays empty).
4. Never add a web app manifest, an install prompt, or a "download the app" message.
5. Never write a hotline number, office hour, room, or phone number. Placeholders only.
6. Never record which guide a visitor opens on `/`, `/guides`, or `/help`.
7. Never show a resource that is not published (RLS already prevents it; do not query drafts).
8. Never add the Fig 7 demo check-in (D-19).
9. Never open a resource link without `rel="noopener noreferrer"`.

---

## 7. Acceptance checklist

Record `phase-03: acceptance passed (checks 1–10)` in the commit message.

| # | Check | How to test | Pass when |
|---|---|---|---|
| 1 | Repository checks | `npm run verify` | 88 tests pass; lint, copy, colours OK; build OK |
| 2 | Build has the app | `npm run build` with **no** `.env.local` present, then search `dist/assets/index-*.js` for `A private place to check in` | the text is found (the Phase 02 problem is fixed) |
| 3 | Config message | `npm run dev` with `.env.local` renamed | the page shows "HingaWeb is not configured…"; rename it back |
| 4 | End to end | `npm run test:e2e -- e2e/phase-03` | 16 tests pass (8 desktop, 8 mobile) |
| 5 | Offline hotlines | DevTools → Network → Offline after one visit, then open `/help` and `/` | hotlines and the notice show |
| 6 | No Supabase caching | DevTools → Application → Cache Storage | only build files (js, css, html, woff2, svg); no `/rest/v1` or `/auth/v1` entries |
| 7 | Seeded guides | open `/guides` with the local stack | 4 guides; "Sleep and routine" (draft) is not shown |
| 8 | Area filter | choose Future, then Managing | Future shows 1 guide; Managing shows "When everything feels like too much" only |
| 9 | Core view size (2.1.6.1.2) | DevTools → Network, hard reload `/help`, read "transferred" | under 500 kB |
| 10 | Placeholders listed | `npm run check:placeholders` | `docs/placeholders.md` lists the directory placeholders (owner GUIDANCE) |
