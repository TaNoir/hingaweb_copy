# HingaWeb Implementation Plan — 02 · App Shell, Design System, and Sign-In

> Read `00-conventions.md` (v1.3) first. Phase 01 must be complete and its acceptance checklist passed.
> Every file in this phase is given **in full**. Create each file with exactly this content. Do not reformat, rename, or "improve" anything.

**What was verified when this plan was written (10 October 2026):** `npm run verify` passes (lint with 0 warnings, copy and colour checks, **75 unit and component tests**, production build). With a production build in Chromium, axe found **0 WCAG 2.1 A/AA violations** on `/login`, `/register`, `/forgot-password`, and `/staff/login` (desktop and mobile), and the signed-out redirect test passed. The remaining Playwright specs need the local Supabase stack, which could not be downloaded in the authoring environment; they are written against the exact supabase-js 2.117.3 API and run for the first time in Step 9. If one fails, **fix the app until the spec's expected result happens**. You may change a selector or a wait in a spec, never what it expects. Record any such change in `docs/questions.md`.

---

## 1. Goal

Build everything every later screen stands on:

1. The design system from 00 Section 8: tokens, 20 UI primitives, five layouts, header and footer per role.
2. The copy system from 00 Section 10: `t()`, `en.js`, the allowlist, and the copy check running on real copy.
3. Sign-in for every role: student registration (Fig 8), student log in (Fig 9), password reset, staff sign in (Fig 19), the second factor (Fig 20), first-time staff setup, and the 15-minute staff timeout (Fig 22).
4. The full route table from 00 Section 7, with route guards. Routes built in later phases show a temporary "This screen is built in Phase NN." placeholder.

### 1.1 Prerequisites

| Needed | Check |
|---|---|
| Phase 01 acceptance passed | commit `phase-01: acceptance passed` exists |
| Local stack running | `npx supabase start`; `.env.local` holds the URL and publishable key |
| Seed loaded | `npx supabase db reset` |

### 1.2 Not in this phase

No landing page, guides, or directory content (Phase 03). No assent walkthrough or consent gate screens (Phase 04). No check-in, crisis, trends, resources, requests, dashboard, or admin screens (Phases 05–09). No service worker (Phase 03). No route-level code splitting (Phase 10). Do not create any of these early.

### 1.3 Requirements and figures covered

| Screen / piece | Figure | Requirement |
|---|---|---|
| Create account | Fig 8 | 2.1.5.1.1; D-01, D-22, D-32, D-37 |
| Student log in | Fig 9 | 2.2.6 (Supabase Auth session) |
| Forgot / reset password | Fig 9 link | — (needed for Fig 9's "Forgot password?") |
| Staff sign in | Fig 19 | 2.1.6.2.9; 2.1.5.3.1 (no self-registration); D-34, D-35 |
| Second factor | Fig 20 | 2.1.6.2.9 (TOTP); D-36 |
| First-time staff setup | Fig 28 note | 2.1.6.2.9 ("staff member sets one and registers an authenticator application at first sign in") |
| Session timeout | Fig 22 | 2.1.6.2.9 (15 minutes); N-03 |
| Headers, footer, nav | Figs 7–33 | 00 Section 8.5; D-21 |
| Route guards | — | 2.1.5.1.2 (tiers), 2.1.6.2.3 (consent gate), 2.1.6.2.2 (role-based access) |
| Touch targets, contrast, focus, text scaling | — | 2.1.6.3.4 |

---

## 2. Files in this phase

Changed (replace the whole file): `eslint.config.js`, `scripts/check-copy.js`, `src/main.jsx`, `src/test/setupTests.js`.

New:

```
hingaweb/
├─ playwright.config.js
├─ e2e/
│  ├─ helpers/auth.js
│  └─ phase-02/
│     ├─ student-auth.spec.js
│     ├─ staff-auth.spec.js
│     └─ a11y.spec.js
├─ scripts/
│  ├─ totp.js              # dev/test only
│  ├─ totp.test.js
│  └─ dev-enrol-totp.js    # dev only
└─ src/
   ├─ App.jsx
   ├─ index.css
   ├─ routes.jsx
   ├─ config/   site.js, vocabulary.js
   ├─ copy/     en.js, allowlist.js, index.js, copy.test.js
   ├─ lib/      supabase.js, storage.js, format.js, format.test.js
   ├─ lib/auth/ AuthContext.js, useAuth.js, AuthProvider.jsx, homePath.js(+test), errors.js(+test),
   │            idle.js(+test), useIdleTimeout.js, guards.jsx(+test)
   ├─ components/ui/      cx.js, classes.js, 20 primitives, index.js, primitives.test.jsx
   ├─ components/layout/  Logo, Footer, SkipLink, NavItems, AccountMenu, AppHeader, Main,
   │                      PublicLayout, PublicOrStudentLayout, StudentLayout, BareLayout, PortalLayout,
   │                      SessionTimeoutOverlay, StaffShell, StaffLayout, AdminLayout, layouts.test.jsx
   ├─ features/auth/      schemas.js(+test), useForm.js, AuthCard.jsx, RegisterPage(+test), LoginPage(+test),
   │                      ForgotPasswordPage, ResetPasswordPage, EmailConfirmedPage, StaffPortalNotes,
   │                      StaffLoginPage, completeStaffSignIn.js, StaffVerifyPage(+test), StaffSetupPage, NotFoundPage
   ├─ features/placeholder/PhasePlaceholder.jsx
   └─ test/     setupTests.js (changed), renderWithAuth.jsx, mockSupabase.js
```

`.dev-totp.json` (created by `scripts/dev-enrol-totp.js`) is already in `.gitignore` from Phase 01. Never commit it.

---

## 3. Screens

Every screen lists: route, guard, layout, who can open it, data touched, states, and the copy keys it uses. **The exact text of every key is in `src/copy/en.js` (Step 1).** Copy is never written inside a component.

### 3.1 Create account — `/register`
- Figure / requirement: Fig 8; 2.1.5.1.1; D-01 (Section and Class adviser added), D-22 (12 characters), D-32 (Step 1 of 2), D-37.
- Guard / layout: `RequireGuest` / `PublicLayout`. Who: signed-out visitors.
- Data: `supabase.auth.signUp` with `options.data = { account_type: 'student', full_name, grade_level (number), section, class_adviser }` and `emailRedirectTo = <origin>/auth/confirmed`. The Phase 01 trigger `on_auth_user_created` creates the `students` row from exactly these keys. Tables written: `auth.users` → `students` (by trigger). Nothing else.
- Fields, in order: Full name · School email address · Grade level (Grade 11 / Grade 12) · Section · Class adviser · Password · Confirm password.
- States: **idle**; **validation error** (each field shows its own message, nothing is sent); **submitting** (button spinner, disabled); **server error** (`FormMessage` with the mapped message); **sent** ("Check your email" card; shown even when the email already has an account, so the page never reveals who is registered); **offline** (`OfflineBanner`).
- Copy keys: `auth.register.*`, `auth.errors.fullName|email|gradeLevel|section|adviser|passwordShort|passwordMatch|generic|rateLimited`.

### 3.2 Student log in — `/login`
- Figure: Fig 9. Guard / layout: `RequireGuest` / `PublicLayout`. Who: signed-out visitors.
- Data: `signInWithPassword`, then `rpc('my_account')`. Reads: `staff_accounts` or `students` + `consent_records` (inside the RPC, own rows only).
- Behaviour: while checking, `setAuthBusy(true)` stops the guard from redirecting. Student → `homePathFor` (or the page they were sent from). Staff → signed out, message `auth.errors.staffOnStudentPage` + link "Go to the staff portal". Account with no profile (`kind: 'none'`) → signed out, `auth.errors.notStudent`.
- States: idle; validation error; submitting; wrong credentials (`auth.errors.invalidCredentials`); email not confirmed (`auth.errors.emailNotConfirmed`); rate limited; generic; offline.
- Copy keys: `auth.login.*`, `auth.errors.*`.

### 3.3 Forgot password — `/forgot-password`
- Guard / layout: `RequireGuest` / `PublicLayout`. Data: `resetPasswordForEmail(email, { redirectTo: <origin>/reset-password })`.
- States: idle; validation error; submitting; **sent** (always the same message whether or not the email exists); rate limited (the only error shown).
- Copy keys: `auth.forgot.*`.

### 3.4 Reset password — `/reset-password`
- Guard / layout: none (the email link signs the user in) / `PublicLayout`. Data: `updateUser({ password })`.
- States: loading (session being read from the link); **invalid or expired link** (no session: `auth.reset.invalid*` with "Request a new link"); idle; validation error; submitting; server error; **done** ("Your password is saved" + Continue → `homePathFor`). Staff who reset a password land on `/staff/verify` (second factor still needed).
- Copy keys: `auth.reset.*`.

### 3.5 Email confirmed — `/auth/confirmed`
- Guard / layout: none / `PublicLayout`. Target of the confirmation email.
- States: loading; signed in by the link ("Your account is ready." + Continue → `homePathFor`, which is `/welcome` for a new student); not signed in ("You can now log in." + Log in).
- Copy keys: `auth.confirmed.*`.

### 3.6 Staff sign in — `/staff/login`
- Figure: Fig 19; D-34, D-35. Guard / layout: `RequireGuest` / `PortalLayout`. Who: signed-out visitors (guidance and administrators).
- Data: `signInWithPassword`, `rpc('my_account')`. Student account → signed out, `staff.errors.notStaff`. Inactive staff → signed out, `staff.errors.inactive`. Active staff → `homePathFor` → `/staff/verify` (factor enrolled) or `/staff/setup` (no factor yet, opened at step 2 because the password is already set).
- States: idle; validation error; submitting; wrong credentials; not staff; inactive; rate limited; generic; offline.
- Copy keys: `staff.login.*`, `staff.errors.*`, `staff.portal.label`.

### 3.7 Second factor — `/staff/verify`
- Figure: Fig 20; D-36. Guard / layout: `RequireStaffSession` / `PortalLayout`. Who: an active staff member signed in at `aal1`.
- Data: `mfa.listFactors` (no verified TOTP → `/staff/setup`), `mfa.challengeAndVerify({ factorId, code })`. On success: last-activity clock set to now, timeout flag cleared, session refreshed, → `/staff/queue` (guidance) or `/admin/accounts` (administrator).
- States: loading factor; idle; code format error ("Enter the 6 digits from your app."); submitting; wrong or expired code; generic. "Back to sign in" signs out.
- Shows the staff member's display name and email, and `SITE.staffSupportContact` (a `[[SCHOOL:…]]` placeholder).
- Copy keys: `staff.verify.*`, `staff.errors.invalidCode|codeFormat|generic`.

### 3.8 First-time staff setup — `/staff/setup`
- Source: Fig 28 note ("The staff member sets one and registers an authenticator app at first sign in"); 2.1.6.2.9. Guard / layout: `RequireStaffSession` / `PortalLayout`.
- Step 1 (from the invitation link, Phase 09): set a password (12+), `updateUser({ password })`.
- Step 2: removes any half-finished TOTP enrolment, then `mfa.enroll({ factorType: 'totp', friendlyName: 'HingaWeb', issuer: 'HingaWeb' })`; shows the QR code (`data:image/svg+xml;utf-8,` + the returned SVG) and a hidden-by-default key; `challengeAndVerify` with the 6-digit code; then the same success path as 3.7. A staff member who already has a verified factor is sent to `/staff/verify`.
- States: step 1 idle / validation / submitting / error; step 2 loading / load error / ready / code error / submitting.
- Copy keys: `staff.setup.*`.

### 3.9 Session ended — overlay on every `/staff/*` and `/admin/*` screen
- Figure: Fig 22; 2.1.6.2.9; N-03; D-34.
- Rule: 15 minutes (`STAFF_IDLE_TIMEOUT_MS` in `src/config/site.js`) with no pointer, key, wheel, or touch activity → sign out locally, **unmount the screen content**, show the overlay. The last-activity time is kept in `localStorage` through `src/lib/storage.js` (the only file allowed to touch browser storage), so a tab reopened after a break is signed out on load. "Sign in again" → `/staff/login`.
- Limitation to record in the manuscript's limitations if asked: on Supabase's Free plan the inactivity rule is enforced by the app, not by the auth server (server-side inactivity timeout is a Pro feature).
- Copy keys: `staff.timeout.*`.

### 3.10 Not found — `*`
- Layout: `PublicLayout`. Copy keys: `notFound.*`.

### 3.11 Placeholder routes
Every route in 00 Section 7 that a later phase builds renders `<PhasePlaceholder phase="NN" />` inside its final guard and layout, so navigation and guards can be tested now. Each later phase replaces only its own placeholders.

---

## 4. Where each kind of user is sent (`homePathFor`)

| Account | Condition | Path |
|---|---|---|
| signed out, or no profile | — | `/login` |
| student | assent not granted | `/welcome` |
| student | assent granted, Tier 2 not met | `/waiting-for-consent` |
| student | Tier 2 | `/check-in` |
| guidance or administrator | inactive | `/staff/login` |
| guidance or administrator | not `aal2`, factor enrolled | `/staff/verify` |
| guidance or administrator | not `aal2`, no factor | `/staff/setup` |
| guidance | `aal2` | `/staff/queue` |
| administrator | `aal2` | `/admin/accounts` |

Guards: `RequireGuest` (signed-out pages), `RequireStudent` (`tier2` optional), `RequireStaff` (`role`, needs `aal2`), `RequireStaffSession` (verify and setup). Guards decide where a user may be; Phase 01 RLS still protects every row.

---

## 5. Who can see or do what in this phase

| Action | Student | Guidance | Administrator | Signed out |
|---|---|---|---|---|
| Register | — | — | — | yes |
| Student log in | yes | refused | refused | yes |
| Staff sign in | refused | yes | yes | yes |
| Second factor / setup | — | yes | yes | — |
| Student screens (placeholders) | yes (by tier) | redirected | redirected | → `/login` |
| `/staff/*` screens | → `/` | yes at `aal2` | → `/admin/accounts` | → `/staff/login` |
| `/admin/*` screens | → `/` | → `/staff/queue` | yes at `aal2` | → `/staff/login` |

Data this phase touches: `auth.users` (sign-up, sign-in, password, MFA factors), `students` (created by the Phase 01 trigger), and `my_account()` (reads own `students`, `consent_records`, `checkins` existence, or `staff_accounts`). No other table.

---

## 6. Build steps

Build in this order. Run `npm run verify` after each step that adds tests.

### Step 1 — Config, vocabulary, and copy

00 Section 2 as code, and every Phase 02 string. Later phases **add** keys to `en.js` in their own section and never change keys owned by another phase.

**`src/config/site.js`**

```js
// 00 Section 6.2. Values in [[...]] are placeholders filled by the guidance office or school.
export const SITE = Object.freeze({
  appName: 'HingaWeb',
  tagline: 'SENIOR HIGH GUIDANCE',
  schoolName: 'Rizal Memorial Colleges, Inc.',
  footerLine: 'Rizal Memorial Colleges, Inc. senior high school guidance office.',
  timeZone: 'Asia/Manila',
  schoolDays: Object.freeze([1, 2, 3, 4, 5]), // Monday..Friday (ISO weekday)
  officeOpens: '[[GUIDANCE:office_opens_hhmm]]',
  officeCloses: '[[GUIDANCE:office_closes_hhmm]]',
  holidays: Object.freeze(['[[GUIDANCE:holiday_dates_iso]]']),
  officeLocation: '[[GUIDANCE:office_room_and_building]]',
  officeHoursText: '[[GUIDANCE:office_hours_text]]',
  staffSupportContact: '[[SCHOOL:it_contact_for_lost_authenticator]]',
});

// Staff inactivity limit (2.1.6.2.9). Not a scoring number; lives here, not in scoring-config.js.
export const STAFF_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
```

**`src/config/vocabulary.js`**

```js
// 00 Section 2. Every fixed value used by the app. Never invent synonyms.

export const ROLES = Object.freeze({
  student: 'student',
  guidance: 'guidance',
  administrator: 'administrator',
});

export const CRITERIA = Object.freeze([
  Object.freeze({
    key: 'c1',
    staffLabel: 'Academic pressure',
    studentLabel: 'School work',
    attribute: 'school_work',
  }),
  Object.freeze({
    key: 'c2',
    staffLabel: 'Family / financial / home concerns',
    studentLabel: 'Home and family',
    attribute: 'home_family',
  }),
  Object.freeze({
    key: 'c3',
    staffLabel: 'Future / career transition concerns',
    studentLabel: 'Future',
    attribute: 'future',
  }),
  Object.freeze({
    key: 'c4',
    staffLabel: 'Manageability / coping capacity',
    studentLabel: 'Managing',
    attribute: 'managing',
  }),
]);

export const ANSWER_SCALE = Object.freeze([
  Object.freeze({ value: 1, label: 'Not at all' }),
  Object.freeze({ value: 2, label: 'A little' }),
  Object.freeze({ value: 3, label: 'Somewhat' }),
  Object.freeze({ value: 4, label: 'Quite a lot' }),
  Object.freeze({ value: 5, label: 'Very much' }),
]);

export const MOOD_SCALE = Object.freeze([
  Object.freeze({ value: 1, label: 'Very low' }),
  Object.freeze({ value: 2, label: 'Low' }),
  Object.freeze({ value: 3, label: 'Okay' }),
  Object.freeze({ value: 4, label: 'Good' }),
  Object.freeze({ value: 5, label: 'Very good' }),
]);

export const STRESS_SCALE = ANSWER_SCALE;

export const WORKFLOW_STATES = Object.freeze([
  Object.freeze({ value: 'pending', label: 'Pending' }),
  Object.freeze({ value: 'reviewed', label: 'Reviewed' }),
  Object.freeze({ value: 'referred', label: 'Referred' }),
  Object.freeze({ value: 'resolved', label: 'Resolved' }),
]);
export const OPEN_STATES = Object.freeze(['pending', 'reviewed', 'referred']);

export const BANDS = Object.freeze([
  Object.freeze({ value: 'P1', label: 'P1', meaning: 'See first' }),
  Object.freeze({ value: 'P2', label: 'P2', meaning: 'See within the standard response window' }),
  Object.freeze({
    value: 'P3',
    label: 'P3',
    meaning: 'See after P1 and P2, within three school days',
  }),
  Object.freeze({ value: 'FR', label: 'For Review', meaning: 'Counselor decides' }),
]);

export const CONCERN_TYPES = Object.freeze([
  Object.freeze({ value: 'academic', label: 'School work' }),
  Object.freeze({ value: 'peer', label: 'Friends and classmates' }),
  Object.freeze({ value: 'family', label: 'Home and family' }),
  Object.freeze({ value: 'wellness', label: "Something else about how I'm doing" }),
]);

// office-tags:start
export const OFFICE_TAGS = Object.freeze([
  Object.freeze({ value: 'green', label: 'Green' }),
  Object.freeze({ value: 'yellow', label: 'Yellow' }),
  Object.freeze({ value: 'red', label: 'Red' }),
]);
// office-tags:end

export const PROMPT_TYPES = Object.freeze(['max_sev', 'gray_zone']);
export const PROMPT_OUTCOMES = Object.freeze(['dismissed', 'request_sent']);

export const AUDIT_ACTIONS = Object.freeze([
  Object.freeze({ value: 'view_request', label: 'Opened support request' }),
  Object.freeze({ value: 'state_change', label: 'Changed status' }),
  Object.freeze({ value: 'referral', label: 'Marked as referred' }),
  Object.freeze({ value: 'tag', label: 'Assigned office tag' }),
  Object.freeze({ value: 'follow_up', label: 'Set follow-up date' }),
  Object.freeze({ value: 'view_crisis', label: 'Opened crisis event' }),
  Object.freeze({ value: 'crisis_acknowledged', label: 'Acknowledged crisis event' }),
  Object.freeze({ value: 'crisis_resolved', label: 'Resolved crisis event' }),
]);

/** Look up the display label for a value in one of the lists above. */
export function labelFor(list, value) {
  const hit = list.find((x) => x.value === value);
  return hit ? hit.label : value;
}
```

**`src/copy/en.js`**

```js
// All English UI text (00 Section 10.1). Components call t('key.path').
// Each later phase ADDS keys under its own section; never change a key another phase owns.
// Colour words are allowed only between the office-tags markers (00 Section 10.4).
import { SITE } from '../config/site.js';

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
  },
};
```

**`src/copy/allowlist.js`**

```js
// 00 Section 10.3. Exact sentences exempt from scripts/check-copy.js.
// Add a sentence ONLY in the phase that the plan names for it.
export const ALLOWLIST = [];
```

**`src/copy/index.js`**

```js
import { en } from './en.js';

const DICTIONARIES = { en };

/**
 * Register another language dictionary (Phase 04 registers 'ceb' and 'tl').
 * @param {string} lang
 * @param {object} dict
 */
export function registerLanguage(lang, dict) {
  DICTIONARIES[lang] = dict;
}

function lookup(dict, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict);
}

/**
 * Get UI text by key. Replaces {name} tokens with values from `vars`.
 * Falls back to English when a key is missing in another language.
 * Throws in development when a key does not exist at all, so typos are caught early.
 * @param {string} key
 * @param {Record<string, string|number>} [vars]
 * @param {string} [lang]
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

**`src/copy/copy.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { t } from './index.js';
import { en } from './en.js';
import { findViolations } from '../../scripts/check-copy.js';
import { ALLOWLIST } from './allowlist.js';

describe('t()', () => {
  it('returns text and fills {tokens}', () => {
    expect(t('auth.register.sentBody', { email: 'a@b.test' })).toBe(
      'We sent a link to a@b.test. Open it to confirm your account. Then come back and log in.',
    );
  });
  it('throws on a missing key during development and tests', () => {
    expect(() => t('no.such.key')).toThrow('Missing copy key: no.such.key');
  });
});

describe('copy rules (00 Section 10.3)', () => {
  it('en.js has no banned words', () => {
    expect(findViolations(en, ALLOWLIST)).toEqual([]);
  });
});
```

### Step 2 — Supabase client, storage, and formatting

**`src/lib/supabase.js`**

```js
// The single Supabase client (00 Section 4). Never create another client in src/.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill both.',
  );
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // reads the session from email confirmation, reset, and invite links
  },
});
```

**`src/lib/storage.js`**

```js
/* eslint-disable no-restricted-globals */
// The ONLY file allowed to touch browser storage (00 must-never 14).
// It stores one non-student value: the staff member's last-activity time, used by the
// 15-minute inactivity rule (2.1.6.2.9, N-03). Never add student text here.

const LAST_ACTIVITY_KEY = 'hw.staff.lastActivity';

/** @returns {number|null} epoch milliseconds, or null when unknown */
export function getLastActivity() {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    const n = raw == null ? NaN : Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** @param {number} ms epoch milliseconds */
export function setLastActivity(ms) {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(ms));
  } catch {
    // storage unavailable (private mode): the in-memory timer still applies
  }
}

export function clearLastActivity() {
  try {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {
    // ignore
  }
}
```

**`src/lib/format.js`**

```js
// Display formatting. All times are shown in Asia/Manila (00 Section 6.2).
import { format } from 'date-fns';
import { TZDate } from '@date-fns/tz';
import { SITE } from '../config/site.js';

/** "12 Oct 2026, 8:14 AM" in Manila time. */
export function formatDateTime(value) {
  return format(new TZDate(new Date(value).getTime(), SITE.timeZone), 'd MMM yyyy, h:mm a');
}

/** "12 Oct 2026" in Manila time. */
export function formatDate(value) {
  return format(new TZDate(new Date(value).getTime(), SITE.timeZone), 'd MMM yyyy');
}

/** "Ref 1a2b3c4d" — the only way a row id is ever shown (D-16). */
export function shortRef(uuid) {
  return `Ref ${String(uuid).slice(0, 8)}`;
}
```

**`src/lib/format.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { formatDateTime, formatDate, shortRef } from './format.js';

describe('format', () => {
  it('shows times in Manila (UTC+8)', () => {
    expect(formatDateTime('2026-10-12T00:14:00Z')).toBe('12 Oct 2026, 8:14 AM');
  });
  it('rolls the date over at Manila midnight', () => {
    expect(formatDate('2026-10-12T16:30:00Z')).toBe('13 Oct 2026');
  });
  it('shortens ids to a reference', () => {
    expect(shortRef('1a2b3c4d-0000-4000-8000-000000000000')).toBe('Ref 1a2b3c4d');
  });
});
```

### Step 3 — Auth core: context, provider, routing rules, idle timeout, guards

Notes:
- `AuthProvider` never awaits a Supabase call inside `onAuthStateChange`; it defers with `setTimeout(…, 0)` (supabase-js can deadlock otherwise).
- `authBusy` lets a sign-in page check *who* signed in before a guard redirects.

**`src/lib/auth/AuthContext.js`**

```js
import { createContext } from 'react';

/**
 * Value shape:
 * {
 *   status: 'loading' | 'ready',
 *   session: object | null,
 *   account: { kind: 'anonymous'|'none'|'student'|'guidance'|'administrator', ... },
 *   aal: { current: string|null, next: string|null } | null,
 *   loadError: boolean,
 *   refresh: () => Promise<{ account, aal }>,
 *   signOut: () => Promise<void>,
 *   authBusy: boolean,               // true while a sign-in page checks the account kind
 *   setAuthBusy: (busy: boolean) => void,
 * }
 */
export const AuthContext = createContext(null);
```

**`src/lib/auth/useAuth.js`**

```js
import { useContext } from 'react';
import { AuthContext } from './AuthContext.js';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
```

**`src/lib/auth/AuthProvider.jsx`**

```jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../supabase.js';
import { AuthContext } from './AuthContext.js';

const ANONYMOUS = Object.freeze({ kind: 'anonymous' });

/** Loads my_account() and the assurance level for a session. */
async function loadFor(session) {
  if (!session) return { account: ANONYMOUS, aal: null, loadError: false };
  const [acc, lvl] = await Promise.all([
    supabase.rpc('my_account'),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if (acc.error || lvl.error) return { account: ANONYMOUS, aal: null, loadError: true };
  return {
    account: acc.data,
    aal: { current: lvl.data.currentLevel, next: lvl.data.nextLevel },
    loadError: false,
  };
}

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    status: 'loading',
    session: null,
    account: ANONYMOUS,
    aal: null,
    loadError: false,
  });
  const seq = useRef(0);
  // While a sign-in page is checking WHO signed in, guards must not redirect (see RequireGuest).
  const [authBusy, setAuthBusy] = useState(false);

  const apply = useCallback(async (session) => {
    const mine = ++seq.current;
    const loaded = await loadFor(session);
    if (mine === seq.current) setState({ status: 'ready', session, ...loaded });
    return loaded;
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) apply(data.session);
    });
    // Never await Supabase calls inside this callback (supabase-js can deadlock); defer instead.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return; // handled by getSession above
      setTimeout(() => {
        if (active) apply(session);
      }, 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [apply]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return apply(data.session);
  }, [apply]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'local' });
    seq.current += 1;
    setState({ status: 'ready', session: null, account: ANONYMOUS, aal: null, loadError: false });
  }, []);

  const value = useMemo(
    () => ({ ...state, refresh, signOut, authBusy, setAuthBusy }),
    [state, refresh, signOut, authBusy],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

**`src/lib/auth/homePath.js`**

```js
// Where each kind of user belongs (00 Section 7). Pure function; tested in homePath.test.js.

/**
 * @param {object} account  result of my_account(): { kind, ... }
 * @param {{ current: string|null, next: string|null }|null} aal
 * @returns {string} path
 */
export function homePathFor(account, aal) {
  const kind = account?.kind ?? 'anonymous';
  if (kind === 'student') {
    if (account.assent !== 'granted') return '/welcome';
    if (!account.tier2) return '/waiting-for-consent';
    return '/check-in';
  }
  if (kind === 'guidance' || kind === 'administrator') {
    if (!account.is_active) return '/staff/login';
    if (aal?.current !== 'aal2') return aal?.next === 'aal2' ? '/staff/verify' : '/staff/setup';
    return kind === 'guidance' ? '/staff/queue' : '/admin/accounts';
  }
  return '/login';
}

export function isStaffKind(kind) {
  return kind === 'guidance' || kind === 'administrator';
}
```

**`src/lib/auth/homePath.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { homePathFor } from './homePath.js';

const aal2 = { current: 'aal2', next: 'aal2' };
const aal1WithFactor = { current: 'aal1', next: 'aal2' };
const aal1NoFactor = { current: 'aal1', next: 'aal1' };

describe('homePathFor', () => {
  it('sends anonymous users to log in', () => {
    expect(homePathFor({ kind: 'anonymous' }, null)).toBe('/login');
    expect(homePathFor(null, null)).toBe('/login');
  });
  it('sends a student without assent to the walkthrough', () => {
    expect(homePathFor({ kind: 'student', assent: 'none', tier2: false }, null)).toBe('/welcome');
    expect(homePathFor({ kind: 'student', assent: 'withdrawn', tier2: false }, null)).toBe(
      '/welcome',
    );
  });
  it('sends a student with assent but no parental consent to the waiting page', () => {
    expect(homePathFor({ kind: 'student', assent: 'granted', tier2: false }, null)).toBe(
      '/waiting-for-consent',
    );
  });
  it('sends a Tier 2 student to the check-in', () => {
    expect(homePathFor({ kind: 'student', assent: 'granted', tier2: true }, null)).toBe(
      '/check-in',
    );
  });
  it('sends staff without the second factor to verify or set up', () => {
    expect(homePathFor({ kind: 'guidance', is_active: true }, aal1WithFactor)).toBe(
      '/staff/verify',
    );
    expect(homePathFor({ kind: 'administrator', is_active: true }, aal1NoFactor)).toBe(
      '/staff/setup',
    );
  });
  it('sends verified staff to their home', () => {
    expect(homePathFor({ kind: 'guidance', is_active: true }, aal2)).toBe('/staff/queue');
    expect(homePathFor({ kind: 'administrator', is_active: true }, aal2)).toBe('/admin/accounts');
  });
  it('sends inactive staff back to sign in', () => {
    expect(homePathFor({ kind: 'guidance', is_active: false }, aal2)).toBe('/staff/login');
  });
  it('treats an account with no profile as signed out', () => {
    expect(homePathFor({ kind: 'none' }, null)).toBe('/login');
  });
});
```

**`src/lib/auth/errors.js`**

```js
// Maps Supabase Auth errors to copy keys. Never show raw error text (00 Section 9).

/**
 * @param {{ code?: string, status?: number, message?: string }|null} error
 * @param {'student'|'staff'} area
 * @returns {string} copy key
 */
export function authErrorKey(error, area = 'student') {
  const base = area === 'staff' ? 'staff.errors' : 'auth.errors';
  const code = error?.code ?? '';
  if (code === 'invalid_credentials') return `${base}.invalidCredentials`;
  if (code === 'email_not_confirmed' && area === 'student') return 'auth.errors.emailNotConfirmed';
  if (code === 'mfa_verification_failed' || code === 'mfa_challenge_expired')
    return 'staff.errors.invalidCode';
  if (code === 'weak_password') return 'auth.errors.passwordShort';
  if (code.startsWith('over_') || error?.status === 429) return `${base}.rateLimited`;
  return `${base}.generic`;
}
```

**`src/lib/auth/errors.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { authErrorKey } from './errors.js';

describe('authErrorKey', () => {
  it('maps known codes', () => {
    expect(authErrorKey({ code: 'invalid_credentials' })).toBe('auth.errors.invalidCredentials');
    expect(authErrorKey({ code: 'invalid_credentials' }, 'staff')).toBe(
      'staff.errors.invalidCredentials',
    );
    expect(authErrorKey({ code: 'email_not_confirmed' })).toBe('auth.errors.emailNotConfirmed');
    expect(authErrorKey({ code: 'mfa_verification_failed' }, 'staff')).toBe(
      'staff.errors.invalidCode',
    );
    expect(authErrorKey({ code: 'weak_password' })).toBe('auth.errors.passwordShort');
    expect(authErrorKey({ code: 'over_request_rate_limit' })).toBe('auth.errors.rateLimited');
    expect(authErrorKey({ status: 429 }, 'staff')).toBe('staff.errors.rateLimited');
  });
  it('falls back to a generic message', () => {
    expect(authErrorKey({ code: 'something_new' })).toBe('auth.errors.generic');
    expect(authErrorKey(null, 'staff')).toBe('staff.errors.generic');
  });
});
```

**`src/lib/auth/idle.js`**

```js
// Staff inactivity rule (2.1.6.2.9; N-03). Pure helpers + a tiny shared flag.

/** True when more than timeoutMs has passed since lastActivity. Unknown last activity is not expired. */
export function isExpired(lastActivity, now, timeoutMs) {
  if (lastActivity == null) return false;
  return now - lastActivity >= timeoutMs;
}

// Remembers that the last sign-out was a timeout, so the guard shows Fig 22 instead of
// silently redirecting. In memory only: a page reload simply shows the sign-in screen.
let timedOut = false;
export const timeoutFlag = {
  get: () => timedOut,
  set: () => {
    timedOut = true;
  },
  clear: () => {
    timedOut = false;
  },
};
```

**`src/lib/auth/idle.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { isExpired, timeoutFlag } from './idle.js';

const MIN = 60 * 1000;

describe('isExpired', () => {
  it('is false before 15 minutes', () => {
    expect(isExpired(0, 14 * MIN + 59_000, 15 * MIN)).toBe(false);
  });
  it('is true at exactly 15 minutes and after', () => {
    expect(isExpired(0, 15 * MIN, 15 * MIN)).toBe(true);
    expect(isExpired(0, 60 * MIN, 15 * MIN)).toBe(true);
  });
  it('is false when last activity is unknown', () => {
    expect(isExpired(null, 99 * MIN, 15 * MIN)).toBe(false);
  });
});

describe('timeoutFlag', () => {
  it('sets and clears', () => {
    timeoutFlag.set();
    expect(timeoutFlag.get()).toBe(true);
    timeoutFlag.clear();
    expect(timeoutFlag.get()).toBe(false);
  });
});
```

**`src/lib/auth/useIdleTimeout.js`**

```js
import { useEffect, useRef } from 'react';
import { getLastActivity, setLastActivity } from '../storage.js';
import { isExpired } from './idle.js';

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
const WRITE_EVERY_MS = 15 * 1000;
const CHECK_EVERY_MS = 15 * 1000;

/**
 * Calls onTimeout once after timeoutMs without activity. Also fires immediately on mount
 * if the stored last activity is already too old (a tab reopened after a break).
 * @param {{ timeoutMs: number, onTimeout: () => void, enabled?: boolean }} opts
 */
export function useIdleTimeout({ timeoutMs, onTimeout, enabled = true }) {
  const fired = useRef(false);
  const lastWrite = useRef(0);
  const cb = useRef(onTimeout);
  useEffect(() => {
    cb.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!enabled) return undefined;
    fired.current = false;

    const fire = () => {
      if (fired.current) return;
      fired.current = true;
      cb.current();
    };
    const check = () => {
      if (isExpired(getLastActivity(), Date.now(), timeoutMs)) fire();
    };
    const touch = () => {
      if (fired.current) return;
      const now = Date.now();
      if (isExpired(getLastActivity(), now, timeoutMs)) return fire();
      if (now - lastWrite.current >= WRITE_EVERY_MS) {
        lastWrite.current = now;
        setLastActivity(now);
      }
      return undefined;
    };

    check();
    if (!fired.current && getLastActivity() == null) setLastActivity(Date.now());
    const timer = setInterval(check, CHECK_EVERY_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, touch));
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, timeoutMs]);
}
```

**`src/lib/auth/guards.jsx`**

```jsx
// Route guards (00 Section 7). They decide where a user may be; RLS still protects all data.
import { Navigate, Outlet, useLocation } from 'react-router';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { SessionTimeoutOverlay } from '../../components/layout/SessionTimeoutOverlay.jsx';
import { useAuth } from './useAuth.js';
import { homePathFor, isStaffKind } from './homePath.js';
import { timeoutFlag } from './idle.js';

function FullPageLoading() {
  return (
    <div className="mx-auto max-w-[768px] px-4 py-16">
      <Skeleton lines={4} />
    </div>
  );
}

/** Only for signed-out visitors (register, log in, forgot password, staff log in). */
export function RequireGuest() {
  const { status, account, aal, authBusy } = useAuth();
  if (authBusy) return <Outlet />;
  if (status === 'loading') return <FullPageLoading />;
  if (account.kind === 'anonymous' || account.kind === 'none') return <Outlet />;
  if (isStaffKind(account.kind) && !account.is_active) return <Outlet />;
  return <Navigate to={homePathFor(account, aal)} replace />;
}

/**
 * Students only. tier2=true also requires both consents (D-27).
 * Staff who land here are sent to their own home.
 */
export function RequireStudent({ tier2 = false }) {
  const { status, account, aal } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageLoading />;
  if (account.kind === 'anonymous' || account.kind === 'none') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (account.kind !== 'student') return <Navigate to={homePathFor(account, aal)} replace />;
  if (tier2 && !account.tier2) return <Navigate to={homePathFor(account, aal)} replace />;
  return <Outlet />;
}

/**
 * Staff screens. role: 'guidance' | 'administrator'. Requires an active account at aal2.
 * After an inactivity sign-out, shows Fig 22 instead of redirecting.
 */
export function RequireStaff({ role }) {
  const { status, account, aal } = useAuth();
  if (status === 'loading') return <FullPageLoading />;
  if (account.kind === 'anonymous' || account.kind === 'none') {
    if (timeoutFlag.get()) return <SessionTimeoutOverlay />;
    return <Navigate to="/staff/login" replace />;
  }
  if (!isStaffKind(account.kind)) return <Navigate to="/" replace />;
  if (!account.is_active) return <Navigate to="/staff/login" replace />;
  if (aal?.current !== 'aal2') return <Navigate to={homePathFor(account, aal)} replace />;
  if (account.kind !== role) return <Navigate to={homePathFor(account, aal)} replace />;
  return <Outlet />;
}

/** /staff/verify and /staff/setup: a signed-in, active staff member who is not yet at aal2. */
export function RequireStaffSession() {
  const { status, account, aal } = useAuth();
  if (status === 'loading') return <FullPageLoading />;
  if (!isStaffKind(account.kind)) return <Navigate to="/staff/login" replace />;
  if (!account.is_active) return <Navigate to="/staff/login" replace />;
  if (aal?.current === 'aal2') return <Navigate to={homePathFor(account, aal)} replace />;
  return <Outlet />;
}
```

**`src/lib/auth/guards.test.jsx`**

```jsx
import { describe, it, expect, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Route } from 'react-router';
import { RequireGuest, RequireStaff, RequireStudent } from './guards.jsx';
import { timeoutFlag } from './idle.js';
import {
  renderWithAuth,
  fakeAuth,
  STUDENT_T2,
  STUDENT_NO_PARENT,
  GUIDANCE,
  ADMIN,
  AAL2,
  AAL1_FACTOR,
} from '../../test/renderWithAuth.jsx';

const studentRoutes = (
  <Route element={<RequireStudent tier2 />}>
    <Route path="/check-in" element={<p>check-in screen</p>} />
  </Route>
);
const guidanceRoutes = (
  <Route element={<RequireStaff role="guidance" />}>
    <Route path="/staff/queue" element={<p>queue screen</p>} />
  </Route>
);

afterEach(() => timeoutFlag.clear());

describe('RequireStudent', () => {
  it('lets a Tier 2 student in', () => {
    renderWithAuth(studentRoutes, { path: '/check-in', auth: fakeAuth({ account: STUDENT_T2 }) });
    expect(screen.getByText('check-in screen')).toBeInTheDocument();
  });
  it('sends a student without parental consent to the waiting page', () => {
    renderWithAuth(studentRoutes, {
      path: '/check-in',
      auth: fakeAuth({ account: STUDENT_NO_PARENT }),
    });
    expect(screen.getByTestId('location').textContent).toBe('/waiting-for-consent');
  });
  it('sends an anonymous visitor to log in', () => {
    renderWithAuth(studentRoutes, { path: '/check-in' });
    expect(screen.getByTestId('location').textContent).toBe('/login');
  });
  it('sends staff away from student screens', () => {
    renderWithAuth(studentRoutes, {
      path: '/check-in',
      auth: fakeAuth({ account: GUIDANCE, aal: AAL2 }),
    });
    expect(screen.getByTestId('location').textContent).toBe('/staff/queue');
  });
});

describe('RequireStaff', () => {
  it('lets verified guidance in', () => {
    renderWithAuth(guidanceRoutes, {
      path: '/staff/queue',
      auth: fakeAuth({ account: GUIDANCE, aal: AAL2 }),
    });
    expect(screen.getByText('queue screen')).toBeInTheDocument();
  });
  it('sends guidance without the second factor to verify', () => {
    renderWithAuth(guidanceRoutes, {
      path: '/staff/queue',
      auth: fakeAuth({ account: GUIDANCE, aal: AAL1_FACTOR }),
    });
    expect(screen.getByTestId('location').textContent).toBe('/staff/verify');
  });
  it('sends an administrator to the admin home, not the guidance queue', () => {
    renderWithAuth(guidanceRoutes, {
      path: '/staff/queue',
      auth: fakeAuth({ account: ADMIN, aal: AAL2 }),
    });
    expect(screen.getByTestId('location').textContent).toBe('/admin/accounts');
  });
  it('sends students to the home page', () => {
    renderWithAuth(guidanceRoutes, {
      path: '/staff/queue',
      auth: fakeAuth({ account: STUDENT_T2 }),
    });
    expect(screen.getByTestId('location').textContent).toBe('/');
  });
  it('shows the session-ended screen after an inactivity sign-out (Fig 22)', () => {
    timeoutFlag.set();
    renderWithAuth(guidanceRoutes, { path: '/staff/queue' });
    expect(screen.getByRole('heading', { name: 'Your session has ended' })).toBeInTheDocument();
    expect(screen.queryByText('queue screen')).toBeNull();
  });
});

describe('RequireGuest', () => {
  const guestRoutes = (
    <Route element={<RequireGuest />}>
      <Route path="/login" element={<p>login screen</p>} />
    </Route>
  );
  it('redirects a signed-in student to their home', () => {
    renderWithAuth(guestRoutes, { path: '/login', auth: fakeAuth({ account: STUDENT_T2 }) });
    expect(screen.getByTestId('location').textContent).toBe('/check-in');
  });
  it('stays put while a sign-in page is checking the account', () => {
    renderWithAuth(guestRoutes, {
      path: '/login',
      auth: fakeAuth({ account: GUIDANCE, aal: AAL2, authBusy: true }),
    });
    expect(screen.getByText('login screen')).toBeInTheDocument();
  });
});
```

### Step 4 — UI primitives (00 Section 8.6)

Only design tokens from `index.css` are used. There is no red, yellow, or green anywhere (00 Section 10.4); "attention" states use a dark border and ink.

**`src/components/ui/cx.js`**

```js
/** Join class names, skipping falsy values. */
export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}
```

**`src/components/ui/classes.js`**

```js
// Shared class builders (kept out of component files so Fast Refresh works).
import { cx } from './cx.js';

const VARIANTS = {
  primary: 'bg-action text-action-ink border border-action hover:opacity-90',
  outline: 'bg-surface text-ink border border-ink hover:bg-canvas',
  ghost: 'bg-transparent text-ink border border-transparent hover:bg-blush',
};
const SIZES = {
  md: 'min-h-11 px-4 text-[15px]',
  lg: 'min-h-12 px-6 text-base',
};

export const buttonClasses = (variant = 'primary', size = 'md', extra = '') =>
  cx(
    'inline-flex min-w-11 items-center justify-center gap-2 rounded-control font-semibold',
    'disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    extra,
  );

export const inputClasses = (invalid) =>
  cx(
    'min-h-11 w-full rounded-control border bg-surface px-4 text-base text-ink placeholder:text-ink-muted',
    invalid ? 'border-ink border-2' : 'border-line',
  );
```

**`src/components/ui/Button.jsx`**

```jsx
import { Loader2 } from 'lucide-react';
import { buttonClasses } from './classes.js';

/**
 * @param {{ variant?: 'primary'|'outline'|'ghost', size?: 'md'|'lg', loading?: boolean,
 *   iconLeft?: import('react').ReactNode, iconRight?: import('react').ReactNode,
 *   className?: string } & import('react').ButtonHTMLAttributes<HTMLButtonElement>} props
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  iconLeft = null,
  iconRight = null,
  className = '',
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, className)}
      {...rest}
    >
      {loading ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : iconLeft}
      <span>{children}</span>
      {!loading && iconRight}
    </button>
  );
}
```

**`src/components/ui/LinkButton.jsx`**

```jsx
import { Link } from 'react-router';
import { buttonClasses } from './classes.js';

export function LinkButton({
  to,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}) {
  return (
    <Link to={to} className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
```

**`src/components/ui/Card.jsx`**

```jsx
import { cx } from './cx.js';

export function Card({ as: Tag = 'section', className = '', children, ...rest }) {
  return (
    <Tag
      className={cx(
        'rounded-card border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] md:p-6',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
```

**`src/components/ui/Chip.jsx`**

```jsx
import { cx } from './cx.js';

const TONES = {
  blush: 'bg-blush text-ink',
  strong: 'bg-blush-strong text-ink',
  ink: 'bg-action text-action-ink',
};

export function Chip({ tone = 'blush', className = '', children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
```

**`src/components/ui/Field.jsx`**

```jsx
import { cloneElement, isValidElement } from 'react';

/**
 * Wraps one form control with its label, hint, and error.
 * The child control receives id, aria-describedby, and aria-invalid automatically.
 */
export function Field({ id, label, hint = '', error = '', children }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        invalid: Boolean(error),
      })
    : children;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[14px] font-semibold text-ink">
        {label}
      </label>
      {control}
      {hint && (
        <p id={hintId} className="text-[13px] text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-[13px] font-semibold text-ink">
          {error}
        </p>
      )}
    </div>
  );
}
```

**`src/components/ui/TextInput.jsx`**

```jsx
import { forwardRef } from 'react';
import { cx } from './cx.js';
import { inputClasses } from './classes.js';

export const TextInput = forwardRef(function TextInput(
  { invalid = false, className = '', ...rest },
  ref,
) {
  return <input ref={ref} className={cx(inputClasses(invalid), className)} {...rest} />;
});
```

**`src/components/ui/PasswordInput.jsx`**

```jsx
import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { t } from '../../copy/index.js';
import { inputClasses } from './classes.js';

export const PasswordInput = forwardRef(function PasswordInput({ invalid = false, ...rest }, ref) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input
        ref={ref}
        type={shown ? 'text' : 'password'}
        className={`${inputClasses(invalid)} pr-14`}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? t('common.hidePassword') : t('common.showPassword')}
        aria-pressed={shown}
        className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center rounded-control"
      >
        {shown ? (
          <EyeOff aria-hidden="true" className="size-5" />
        ) : (
          <Eye aria-hidden="true" className="size-5" />
        )}
      </button>
    </div>
  );
});
```

**`src/components/ui/Textarea.jsx`**

```jsx
import { forwardRef } from 'react';
import { cx } from './cx.js';

// Free text is stored, never analyzed (2.1.6.2.7). This component does nothing with the text
// except show it and report its length.
export const Textarea = forwardRef(function Textarea(
  { invalid = false, rows = 5, maxLength = 2000, className = '', ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      maxLength={maxLength}
      className={cx(
        'w-full rounded-control border bg-surface px-4 py-3 text-base text-ink placeholder:text-ink-muted',
        invalid ? 'border-2 border-ink' : 'border-line',
        className,
      )}
      {...rest}
    />
  );
});
```

**`src/components/ui/Select.jsx`**

```jsx
import { forwardRef } from 'react';
import { inputClasses } from './classes.js';

/** Native select. options: { value, label }[] */
export const Select = forwardRef(function Select(
  { options, placeholder = '', invalid = false, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={`${inputClasses(invalid)} pr-10`} {...rest}>
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
});
```

**`src/components/ui/Checkbox.jsx`**

```jsx
export function Checkbox({ id, label, checked, onChange, disabled = false }) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 size-5 shrink-0 accent-[var(--color-action)]"
      />
      <span className="text-[15px] text-ink">{label}</span>
    </label>
  );
}
```

**`src/components/ui/ScaleButtons.jsx`**

```jsx
import { useRef } from 'react';
import { cx } from './cx.js';

/**
 * A row of answer buttons that behaves as a radio group (arrow keys move the choice).
 * options: { value, label }[]; value: selected value or null.
 */
export function ScaleButtons({ name, legend, hint = '', options, value, onChange }) {
  const refs = useRef([]);
  const index = options.findIndex((o) => o.value === value);
  const focusable = index === -1 ? 0 : index;

  const move = (to) => {
    const i = (to + options.length) % options.length;
    onChange(options[i].value);
    refs.current[i]?.focus();
  };

  const onKeyDown = (e, i) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      move(i + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(i - 1);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={`${name}-legend`}
      aria-describedby={hint ? `${name}-hint` : undefined}
    >
      <p id={`${name}-legend`} className="text-[16px] font-semibold text-ink">
        {legend}
      </p>
      {hint && (
        <p id={`${name}-hint`} className="mt-1 text-[13px] text-ink-muted">
          {hint}
        </p>
      )}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-5">
        {options.map((o, i) => {
          const selected = o.value === value;
          return (
            <button
              key={o.value}
              ref={(el) => (refs.current[i] = el)}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={i === focusable ? 0 : -1}
              onClick={() => onChange(o.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cx(
                'min-h-11 rounded-control border px-2 text-[14px]',
                selected
                  ? 'border-action bg-action font-semibold text-action-ink'
                  : 'border-line bg-blush text-ink',
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

**`src/components/ui/SegmentedControl.jsx`**

```jsx
import { cx } from './cx.js';

/** A small radio group shown as joined buttons. options: { value, label }[] */
export function SegmentedControl({ label, options, value, onChange }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex flex-wrap gap-1 rounded-control bg-blush p-1"
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cx(
              'min-h-11 rounded-control px-4 text-[14px] font-semibold',
              selected ? 'bg-action text-action-ink' : 'bg-transparent text-ink',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
```

**`src/components/ui/Dialog.jsx`**

```jsx
import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { t } from '../../copy/index.js';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog with a focus trap. Focus returns to the element that opened it.
 * dismissible=false hides the close button and ignores Escape (used for Fig 15 and Fig 22 only
 * when the phase file says so).
 */
export function Dialog({ open, onClose, title, children, dismissible = true }) {
  const titleId = useId();
  const panel = useRef(null);
  const opener = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    opener.current = document.activeElement;
    const first = panel.current?.querySelector(FOCUSABLE);
    (first ?? panel.current)?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape' && dismissible) {
        e.preventDefault();
        onClose?.();
      }
      if (e.key === 'Tab' && panel.current) {
        const items = [...panel.current.querySelectorAll(FOCUSABLE)];
        if (items.length === 0) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener.current?.focus?.();
    };
  }, [open, dismissible, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card bg-surface p-6 shadow-xl"
      >
        {dismissible && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-control"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        )}
        <h2 id={titleId} className="pr-10 text-[20px] font-semibold leading-7 text-ink">
          {title}
        </h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
```

**`src/components/ui/Banner.jsx`**

```jsx
import { cx } from './cx.js';

/** tone 'attention' = dark border and ink, never a traffic-light colour (00 Section 10.4). */
export function Banner({ tone = 'info', title = '', icon = null, action = null, children, role }) {
  return (
    <div
      role={role}
      className={cx(
        'flex flex-col gap-3 rounded-card p-4 sm:flex-row sm:items-center',
        tone === 'attention' ? 'border-2 border-ink bg-surface' : 'border border-line bg-blush',
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <div className="flex-1">
        {title && <p className="font-semibold text-ink">{title}</p>}
        {children && <div className="text-[14px] text-ink">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
```

**`src/components/ui/PageHeader.jsx`**

```jsx
import { Chip } from './Chip.jsx';

export function PageHeader({ eyebrow = null, title, lead = '' }) {
  return (
    <header className="flex flex-col gap-3">
      {eyebrow && <Chip>{eyebrow}</Chip>}
      <h1 className="text-[28px] font-semibold leading-9 text-ink md:text-[32px] md:leading-10">
        {title}
      </h1>
      {lead && <p className="max-w-2xl text-base text-ink-muted">{lead}</p>}
    </header>
  );
}
```

**`src/components/ui/EmptyState.jsx`**

```jsx
export function EmptyState({ title, body = '', action = null }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-card border border-dashed border-line bg-surface p-6">
      <p className="text-[17px] font-semibold text-ink">{title}</p>
      {body && <p className="text-[15px] text-ink-muted">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
```

**`src/components/ui/ErrorState.jsx`**

```jsx
import { t } from '../../copy/index.js';
import { Button } from './Button.jsx';

export function ErrorState({
  title = t('common.error.title'),
  body = t('common.error.body'),
  onRetry = null,
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-2 rounded-card border-2 border-ink bg-surface p-6"
    >
      <p className="text-[17px] font-semibold text-ink">{title}</p>
      <p className="text-[15px] text-ink">{body}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-2">
          {t('common.error.retry')}
        </Button>
      )}
    </div>
  );
}
```

**`src/components/ui/Skeleton.jsx`**

```jsx
import { t } from '../../copy/index.js';

export function Skeleton({ lines = 3 }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">{t('common.loading')}</span>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="h-4 animate-pulse rounded bg-blush motion-reduce:animate-none"
          style={{ width: `${90 - i * 12}%` }}
        />
      ))}
    </div>
  );
}
```

**`src/components/ui/OfflineBanner.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { t } from '../../copy/index.js';

export function OfflineBanner() {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' && navigator.onLine === false,
  );
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  if (!offline) return null;
  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-ink bg-surface px-4 py-2 text-[14px] text-ink"
    >
      <WifiOff aria-hidden="true" className="size-4 shrink-0" />
      <span>{t('common.offline')}</span>
    </div>
  );
}
```

**`src/components/ui/Table.jsx`**

```jsx
/**
 * Accessible table. On narrow screens each row becomes a stacked card (labels from data-label).
 * columns: { key, header, render?: (row) => node }[]
 */
export function Table({ columns, rows, caption, getRowKey }) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <table className="w-full border-collapse text-left text-[14px]">
        <caption className="sr-only">{caption}</caption>
        <thead className="hidden bg-canvas md:table-header-group">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className="px-4 py-3 text-[13px] font-semibold uppercase tracking-wide text-ink-muted"
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              className="block border-t border-line px-4 py-3 md:table-row md:p-0"
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  data-label={c.header}
                  className="flex justify-between gap-4 py-1 before:font-semibold before:text-ink-muted before:content-[attr(data-label)] md:table-cell md:px-4 md:py-3 md:before:content-none"
                >
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**`src/components/ui/index.js`**

```js
export { Button } from './Button.jsx';
export { buttonClasses, inputClasses } from './classes.js';
export { LinkButton } from './LinkButton.jsx';
export { Card } from './Card.jsx';
export { Chip } from './Chip.jsx';
export { Field } from './Field.jsx';
export { TextInput } from './TextInput.jsx';
export { PasswordInput } from './PasswordInput.jsx';
export { Textarea } from './Textarea.jsx';
export { Select } from './Select.jsx';
export { Checkbox } from './Checkbox.jsx';
export { ScaleButtons } from './ScaleButtons.jsx';
export { SegmentedControl } from './SegmentedControl.jsx';
export { Dialog } from './Dialog.jsx';
export { Banner } from './Banner.jsx';
export { PageHeader } from './PageHeader.jsx';
export { EmptyState } from './EmptyState.jsx';
export { ErrorState } from './ErrorState.jsx';
export { Skeleton } from './Skeleton.jsx';
export { OfflineBanner } from './OfflineBanner.jsx';
export { Table } from './Table.jsx';
export { cx } from './cx.js';
```

**`src/components/ui/primitives.test.jsx`**

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import {
  Button,
  LinkButton,
  Card,
  Chip,
  Field,
  TextInput,
  PasswordInput,
  Textarea,
  Select,
  Checkbox,
  ScaleButtons,
  SegmentedControl,
  Dialog,
  Banner,
  PageHeader,
  EmptyState,
  ErrorState,
  Skeleton,
  OfflineBanner,
  Table,
} from './index.js';

describe('Button', () => {
  it('runs onClick and is disabled while loading', async () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(
      <Button onClick={onClick} loading>
        Save
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('aria-busy', 'true');
  });
});

describe('LinkButton', () => {
  it('renders a link', () => {
    render(
      <MemoryRouter>
        <LinkButton to="/help">Help</LinkButton>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Help' })).toHaveAttribute('href', '/help');
  });
});

describe('Card, Chip, PageHeader, EmptyState, Banner', () => {
  it('render their content', () => {
    render(
      <>
        <Card>card body</Card>
        <Chip>chip</Chip>
        <PageHeader eyebrow="eyebrow" title="Title" lead="Lead" />
        <EmptyState title="Nothing yet" body="Body" />
        <Banner tone="attention" title="Heads up">
          Text
        </Banner>
      </>,
    );
    expect(screen.getByText('card body')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Title' })).toBeInTheDocument();
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
    expect(screen.getByText('Heads up')).toBeInTheDocument();
  });
});

describe('Field + TextInput', () => {
  it('links label, hint, and error to the control', () => {
    render(
      <Field id="email" label="Email" hint="Your school email" error="Enter a valid email address.">
        <TextInput />
      </Field>,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Your school email Enter a valid email address.');
  });
});

describe('PasswordInput', () => {
  it('toggles visibility', async () => {
    render(
      <Field id="pw" label="Password">
        <PasswordInput />
      </Field>,
    );
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
  });
});

describe('Textarea and Select', () => {
  it('render with limits and options', () => {
    render(
      <>
        <Field id="note" label="Note">
          <Textarea />
        </Field>
        <Field id="grade" label="Grade">
          <Select
            placeholder="Pick"
            options={[{ value: '11', label: 'Grade 11' }]}
            defaultValue=""
          />
        </Field>
      </>,
    );
    expect(screen.getByLabelText('Note')).toHaveAttribute('maxLength', '2000');
    expect(screen.getByRole('option', { name: 'Grade 11' })).toBeInTheDocument();
  });
});

describe('Checkbox', () => {
  it('reports changes', async () => {
    const onChange = vi.fn();
    render(<Checkbox id="ack" label="I understand" checked={false} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('I understand'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('ScaleButtons', () => {
  it('is a radio group with arrow-key movement', async () => {
    const onChange = vi.fn();
    const opts = [
      { value: 1, label: 'Not at all' },
      { value: 2, label: 'A little' },
    ];
    render(
      <ScaleButtons name="c1" legend="School work" options={opts} value={1} onChange={onChange} />,
    );
    expect(screen.getByRole('radiogroup', { name: 'School work' })).toBeInTheDocument();
    const first = screen.getByRole('radio', { name: 'Not at all' });
    expect(first).toHaveAttribute('aria-checked', 'true');
    first.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith(2);
  });
});

describe('SegmentedControl', () => {
  it('selects an option', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Range"
        value="a"
        onChange={onChange}
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('radio', { name: 'B' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});

describe('Dialog', () => {
  it('opens as a modal, closes on Escape when dismissible', async () => {
    const onClose = vi.fn();
    render(
      <Dialog open title="Title" onClose={onClose}>
        <button>Inside</button>
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'Title' })).toHaveAttribute('aria-modal', 'true');
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
  it('ignores Escape and hides the close button when not dismissible', async () => {
    const onClose = vi.fn();
    render(
      <Dialog open dismissible={false} title="Locked" onClose={onClose}>
        <button>Inside</button>
      </Dialog>,
    );
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    await userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('ErrorState and Skeleton', () => {
  it('show default copy and retry', async () => {
    const onRetry = vi.fn();
    render(
      <>
        <ErrorState onRetry={onRetry} />
        <Skeleton />
      </>,
    );
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });
});

describe('OfflineBanner', () => {
  it('appears when the browser goes offline', () => {
    render(<OfflineBanner />);
    expect(screen.queryByRole('status')).toBeNull();
    act(() => window.dispatchEvent(new Event('offline')));
    expect(screen.getByRole('status')).toHaveTextContent("You're offline.");
  });
});

describe('Table', () => {
  it('renders a captioned table', () => {
    render(
      <Table
        caption="Requests"
        columns={[{ key: 'name', header: 'Student' }]}
        rows={[{ id: 1, name: 'Ana' }]}
        getRowKey={(r) => r.id}
      />,
    );
    expect(screen.getByRole('table', { name: 'Requests' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Ana' })).toBeInTheDocument();
  });
});
```

### Step 5 — Layouts and header (00 Section 8.5)

**`src/components/layout/Logo.jsx`**

```jsx
import { Link } from 'react-router';
import { Waves } from 'lucide-react';
import { SITE } from '../../config/site.js';

/** "HingaWeb" wordmark with the SENIOR HIGH GUIDANCE caption (00 Section 8.5). */
export function Logo({ to = '/' }) {
  return (
    <Link
      to={to}
      className="flex min-h-11 items-center gap-2 rounded-control"
      aria-label={`${SITE.appName} home`}
    >
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-[10px] bg-blush"
      >
        <Waves className="size-5 text-ink" />
      </span>
      <span aria-hidden="true" className="flex flex-col leading-none">
        <span className="text-[17px] text-ink">
          <span className="font-semibold">Hinga</span>
          <span className="font-normal">Web</span>
        </span>
        <span className="mt-1 text-[10px] font-medium tracking-[0.14em] text-ink-muted">
          {SITE.tagline}
        </span>
      </span>
    </Link>
  );
}
```

**`src/components/layout/Footer.jsx`**

```jsx
import { t } from '../../copy/index.js';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-canvas-alt px-4 py-6 text-center text-[13px] text-ink-muted">
      {t('common.footer')}
    </footer>
  );
}
```

**`src/components/layout/SkipLink.jsx`**

```jsx
import { t } from '../../copy/index.js';

export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2"
    >
      {t('common.skipToContent')}
    </a>
  );
}
```

**`src/components/layout/NavItems.jsx`**

```jsx
import { NavLink } from 'react-router';
import { cx } from '../ui/cx.js';

/** items: { to, label, badge? }[]. NavLink sets aria-current="page" on the active item. */
export function NavItems({ items, onNavigate, vertical = false }) {
  return (
    <ul className={cx('flex gap-1', vertical ? 'flex-col' : 'flex-row items-center')}>
      {items.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.end ?? false}
            onClick={onNavigate}
            className={({ isActive }) =>
              cx(
                'inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[15px]',
                isActive ? 'bg-action font-semibold text-action-ink' : 'text-ink hover:bg-blush',
              )
            }
          >
            <span>{item.label}</span>
            {item.badge ? (
              <span
                className="rounded-full bg-blush-strong px-2 text-[12px] font-semibold text-ink"
                aria-label={item.badgeLabel}
              >
                {item.badge}
              </span>
            ) : null}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}
```

**`src/components/layout/AccountMenu.jsx`**

```jsx
import { useEffect, useId, useRef, useState } from 'react';
import { CircleUser } from 'lucide-react';

/** Account button with a one-item menu (Log out / Sign out). */
export function AccountMenu({ label, itemLabel, onSelect }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const root = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (root.current && !root.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className="flex size-11 items-center justify-center rounded-full bg-action text-action-ink"
      >
        <CircleUser aria-hidden="true" className="size-5" />
      </button>
      {open && (
        <ul
          id={menuId}
          role="menu"
          className="absolute right-0 z-40 mt-2 min-w-40 rounded-control border border-line bg-surface p-1 shadow-lg"
        >
          <li role="none">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSelect();
              }}
              className="flex min-h-11 w-full items-center rounded-control px-3 text-left text-[15px] text-ink hover:bg-blush"
            >
              {itemLabel}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
```

**`src/components/layout/AppHeader.jsx`**

```jsx
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { t } from '../../copy/index.js';
import { Logo } from './Logo.jsx';
import { NavItems } from './NavItems.jsx';

/**
 * Shared header. Desktop: logo, nav, extras on the right. Mobile (< md): logo + "Menu" sheet.
 * @param {{ logoTo: string, navLabel: string, items: object[], chip?: node, right?: node, mobileExtras?: node }} props
 */
export function AppHeader({
  logoTo,
  navLabel,
  items,
  chip = null,
  right = null,
  mobileExtras = null,
}) {
  const [open, setOpen] = useState(false);
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-2 md:px-6">
        <div className="flex items-center gap-3">
          <Logo to={logoTo} />
          {chip}
        </div>
        <nav aria-label={navLabel} className="hidden md:block">
          <NavItems items={items} />
        </nav>
        <div className="hidden items-center gap-2 md:flex">{right}</div>
        <button
          type="button"
          className="flex min-h-11 items-center gap-2 rounded-control px-3 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? (
            <X aria-hidden="true" className="size-5" />
          ) : (
            <Menu aria-hidden="true" className="size-5" />
          )}
          <span>{t('common.menu')}</span>
        </button>
      </div>
      {open && (
        <div id="mobile-menu" className="border-t border-line px-4 pb-4 md:hidden">
          <nav aria-label={navLabel} className="pt-2">
            <NavItems items={items} vertical onNavigate={() => setOpen(false)} />
          </nav>
          {mobileExtras && <div className="mt-3 flex flex-col gap-2">{mobileExtras}</div>}
        </div>
      )}
    </header>
  );
}
```

**`src/components/layout/Main.jsx`**

```jsx
import { cx } from '../ui/cx.js';
import { OfflineBanner } from '../ui/OfflineBanner.jsx';

/** Page body container. width 'reading' = 768px, 'wide' = 1200px (00 Section 8.3). */
export function Main({ width = 'reading', children }) {
  return (
    <>
      <OfflineBanner />
      <main
        id="main"
        tabIndex={-1}
        className={cx(
          'mx-auto w-full px-4 py-8 md:px-6',
          width === 'wide' ? 'max-w-[1200px]' : 'max-w-[768px]',
        )}
      >
        {children}
      </main>
    </>
  );
}
```

**`src/components/layout/PublicLayout.jsx`**

```jsx
import { Outlet } from 'react-router';
import { t } from '../../copy/index.js';
import { LinkButton } from '../ui/LinkButton.jsx';
import { AppHeader } from './AppHeader.jsx';
import { Footer } from './Footer.jsx';
import { Main } from './Main.jsx';
import { SkipLink } from './SkipLink.jsx';

export function PublicLayout() {
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
        <Main>
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
export function PublicOrStudentLayout() {
  const { account } = useAuth();
  return account.kind === 'student' ? <StudentLayout /> : <PublicLayout />;
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

export function StudentLayout() {
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
        <Main>
          <Outlet />
        </Main>
      </div>
      <Footer />
    </div>
  );
}
```

**`src/components/layout/BareLayout.jsx`**

```jsx
import { Outlet } from 'react-router';
import { Footer } from './Footer.jsx';
import { Logo } from './Logo.jsx';
import { Main } from './Main.jsx';
import { SkipLink } from './SkipLink.jsx';

/** Logo-only frame for registration, log in, password reset, and the assent walkthrough. */
export function BareLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <SkipLink />
      <header className="mx-auto flex w-full max-w-[1200px] items-center px-4 py-3 md:px-6">
        <Logo to="/" />
      </header>
      <div className="flex-1">
        <Main>
          <Outlet />
        </Main>
      </div>
      <Footer />
    </div>
  );
}
```

**`src/components/layout/PortalLayout.jsx`**

```jsx
import { Outlet } from 'react-router';
import { Lock } from 'lucide-react';
import { t } from '../../copy/index.js';
import { Footer } from './Footer.jsx';
import { Logo } from './Logo.jsx';
import { Main } from './Main.jsx';
import { SkipLink } from './SkipLink.jsx';

/** Staff portal frame for sign in, verify, and setup (Figs 19-20). */
export function PortalLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <SkipLink />
      <header className="border-b border-line bg-canvas">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-2 md:px-6">
          <div className="flex items-center gap-4">
            <Logo to="/staff/login" />
            <span className="hidden border-l border-line pl-4 text-[13px] tracking-[0.14em] text-ink-muted sm:inline">
              {t('staff.portal.label')}
            </span>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[13px] tracking-[0.14em] text-ink">
            <Lock aria-hidden="true" className="size-4" />
            {t('staff.portal.label')}
          </span>
        </div>
      </header>
      <div className="flex-1">
        <Main>
          <Outlet />
        </Main>
      </div>
      <Footer />
    </div>
  );
}
```

**`src/components/layout/SessionTimeoutOverlay.jsx`**

```jsx
import { useNavigate } from 'react-router';
import { Lock, LogIn, ShieldCheck } from 'lucide-react';
import { t } from '../../copy/index.js';
import { timeoutFlag } from '../../lib/auth/idle.js';
import { Button } from '../ui/Button.jsx';

/** Fig 22 (2.1.6.2.9). Rendered INSTEAD of the staff screen, so no student data stays on the page. */
export function SessionTimeoutOverlay() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="timeout-title"
        aria-describedby="timeout-body"
        className="w-full max-w-md rounded-card bg-surface p-8 text-center shadow-xl"
      >
        <span
          aria-hidden="true"
          className="mx-auto flex size-14 items-center justify-center rounded-card bg-blush"
        >
          <Lock className="size-6 text-ink" />
        </span>
        <h1 id="timeout-title" className="mt-4 text-[24px] font-semibold text-ink">
          {t('staff.timeout.title')}
        </h1>
        <p id="timeout-body" className="mt-2 text-[15px] text-ink-muted">
          {t('staff.timeout.body')}
        </p>
        <Button
          size="lg"
          className="mt-6 w-full"
          autoFocus
          iconLeft={<LogIn aria-hidden="true" className="size-5" />}
          onClick={() => {
            timeoutFlag.clear();
            navigate('/staff/login', { replace: true });
          }}
        >
          {t('staff.timeout.action')}
        </Button>
        <p className="mt-4 flex items-center justify-center gap-2 text-[13px] text-ink-muted">
          <ShieldCheck aria-hidden="true" className="size-4" />
          {t('staff.timeout.note')}
        </p>
      </div>
    </div>
  );
}
```

**`src/components/layout/StaffShell.jsx`**

```jsx
import { useCallback, useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { STAFF_IDLE_TIMEOUT_MS } from '../../config/site.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import { timeoutFlag } from '../../lib/auth/idle.js';
import { useIdleTimeout } from '../../lib/auth/useIdleTimeout.js';
import { clearLastActivity } from '../../lib/storage.js';
import { AccountMenu } from './AccountMenu.jsx';
import { AppHeader } from './AppHeader.jsx';
import { Footer } from './Footer.jsx';
import { Main } from './Main.jsx';
import { SessionTimeoutOverlay } from './SessionTimeoutOverlay.jsx';
import { SkipLink } from './SkipLink.jsx';
import { Button } from '../ui/Button.jsx';

/**
 * Shared by StaffLayout and AdminLayout: header, 15-minute idle sign-out (Fig 22), footer.
 * When the timer fires, the screen content is unmounted and only the overlay remains.
 */
export function StaffShell({ logoTo, navLabel, items, chip = null, accountLabel, signOutLabel }) {
  const { signOut, account } = useAuth();
  const navigate = useNavigate();
  const [expired, setExpired] = useState(false);

  const onTimeout = useCallback(async () => {
    timeoutFlag.set();
    setExpired(true);
    clearLastActivity();
    await signOut();
  }, [signOut]);

  useIdleTimeout({ timeoutMs: STAFF_IDLE_TIMEOUT_MS, onTimeout, enabled: !expired });

  const manualSignOut = async () => {
    clearLastActivity();
    await signOut();
    navigate('/staff/login', { replace: true });
  };

  if (expired) return <SessionTimeoutOverlay />;

  const right = (
    <>
      <span className="text-[14px] text-ink">{account?.display_name}</span>
      <AccountMenu label={accountLabel} itemLabel={signOutLabel} onSelect={manualSignOut} />
    </>
  );
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <SkipLink />
      <AppHeader
        logoTo={logoTo}
        navLabel={navLabel}
        items={items}
        chip={chip}
        right={right}
        mobileExtras={
          <Button variant="outline" onClick={manualSignOut}>
            {signOutLabel}
          </Button>
        }
      />
      <div className="flex-1">
        <Main width="wide">
          <Outlet />
        </Main>
      </div>
      <Footer />
    </div>
  );
}
```

**`src/components/layout/StaffLayout.jsx`**

```jsx
import { t } from '../../copy/index.js';
import { StaffShell } from './StaffShell.jsx';

/**
 * Guidance header (00 Section 8.5). crisisCount is wired to the crisis channel in Phase 08;
 * until then it stays 0 and no badge shows.
 */
export function StaffLayout({ crisisCount = 0 }) {
  const items = [
    { to: '/staff/queue', label: t('nav.staff.queue') },
    {
      to: '/staff/crisis',
      label: t('nav.staff.crisis'),
      badge: crisisCount > 0 ? String(crisisCount) : null,
      badgeLabel: t('nav.staff.crisisBadge', { count: crisisCount }),
    },
    { to: '/staff/referrals', label: t('nav.staff.referrals') },
  ];
  return (
    <StaffShell
      logoTo="/staff/queue"
      navLabel={t('nav.staff.label')}
      items={items}
      accountLabel={t('nav.staff.account')}
      signOutLabel={t('nav.staff.signOut')}
    />
  );
}
```

**`src/components/layout/AdminLayout.jsx`**

```jsx
import { t } from '../../copy/index.js';
import { Chip } from '../ui/Chip.jsx';
import { StaffShell } from './StaffShell.jsx';

export function AdminLayout() {
  const items = [
    { to: '/admin/accounts', label: t('nav.admin.accounts') },
    { to: '/admin/consent', label: t('nav.admin.consent') },
    { to: '/admin/reference', label: t('nav.admin.reference') },
    { to: '/admin/resources', label: t('nav.admin.resources') },
    { to: '/admin/audit', label: t('nav.admin.audit') },
  ];
  return (
    <StaffShell
      logoTo="/admin/accounts"
      navLabel={t('nav.admin.label')}
      items={items}
      chip={<Chip>{t('nav.admin.console')}</Chip>}
      accountLabel={t('nav.admin.account')}
      signOutLabel={t('nav.admin.signOut')}
    />
  );
}
```

**`src/components/layout/layouts.test.jsx`**

```jsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, act } from '@testing-library/react';
import { Route } from 'react-router';
import {
  renderWithAuth,
  fakeAuth,
  STUDENT_T2,
  GUIDANCE,
  AAL2,
} from '../../test/renderWithAuth.jsx';
import { StudentLayout } from './StudentLayout.jsx';
import { StaffLayout } from './StaffLayout.jsx';
import { AdminLayout } from './AdminLayout.jsx';
import { RequireStaff } from '../../lib/auth/guards.jsx';
import { clearLastActivity } from '../../lib/storage.js';
import { timeoutFlag } from '../../lib/auth/idle.js';

afterEach(() => {
  vi.useRealTimers();
  clearLastActivity();
  timeoutFlag.clear();
});

describe('StudentLayout (00 Section 8.5)', () => {
  it('shows the five student nav items and marks the current one', () => {
    renderWithAuth(
      <Route element={<StudentLayout />}>
        <Route path="/check-in" element={<p>body</p>} />
      </Route>,
      { path: '/check-in', auth: fakeAuth({ account: STUDENT_T2 }) },
    );
    const nav = screen.getByRole('navigation', { name: 'Student' });
    const links = nav.querySelectorAll('a');
    expect([...links].map((a) => a.textContent)).toEqual([
      'Home',
      'Check-in',
      'My Trends',
      'Resources',
      'Where to get help',
    ]);
    expect(screen.getByRole('link', { name: 'Check-in' })).toHaveAttribute('aria-current', 'page');
    expect(
      screen.getByText('Rizal Memorial Colleges, Inc. senior high school guidance office.'),
    ).toBeInTheDocument();
  });
});

describe('AdminLayout', () => {
  it('shows the ADMIN CONSOLE chip and the five admin nav items', () => {
    renderWithAuth(
      <Route element={<AdminLayout />}>
        <Route path="/admin/accounts" element={<p>body</p>} />
      </Route>,
      {
        path: '/admin/accounts',
        auth: fakeAuth({
          account: { kind: 'administrator', is_active: true, display_name: 'Admin' },
          aal: AAL2,
        }),
      },
    );
    expect(screen.getByText('ADMIN CONSOLE')).toBeInTheDocument();
    const links = screen.getByRole('navigation', { name: 'Administrator' }).querySelectorAll('a');
    expect([...links].map((a) => a.textContent)).toEqual([
      'Accounts',
      'Consent',
      'Reference data',
      'Resources',
      'Audit',
    ]);
  });
});

describe('Staff idle timeout (Fig 22, 2.1.6.2.9)', () => {
  it('signs out after 15 minutes without activity and removes the screen content', async () => {
    vi.useFakeTimers({
      toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'],
    });
    const auth = fakeAuth({ account: GUIDANCE, aal: AAL2 });
    renderWithAuth(
      <Route element={<RequireStaff role="guidance" />}>
        <Route element={<StaffLayout />}>
          <Route path="/staff/queue" element={<p>student names here</p>} />
        </Route>
      </Route>,
      { path: '/staff/queue', auth },
    );
    expect(screen.getByText('student names here')).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(14 * 60 * 1000);
    });
    expect(screen.getByText('student names here')).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(60 * 1000 + 15 * 1000);
    });
    expect(screen.getByRole('heading', { name: 'Your session has ended' })).toBeInTheDocument();
    expect(screen.queryByText('student names here')).toBeNull();
    expect(auth.signOut).toHaveBeenCalled();
  });
});
```

### Step 6 — Sign-in screens

**`src/features/auth/schemas.js`**

```js
// Form validation (zod 4). Messages are copy keys; the UI shows t(message).
import { z } from 'zod';

const email = z.string().trim().toLowerCase().pipe(z.email('auth.errors.email'));
const newPassword = z.string().min(12, 'auth.errors.passwordShort').max(72, 'auth.errors.generic');

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'auth.errors.fullName').max(120, 'auth.errors.fullName'),
    email,
    gradeLevel: z.enum(['11', '12'], { error: 'auth.errors.gradeLevel' }),
    section: z.string().trim().min(1, 'auth.errors.section').max(60, 'auth.errors.section'),
    classAdviser: z.string().trim().min(2, 'auth.errors.adviser').max(120, 'auth.errors.adviser'),
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'auth.errors.passwordMatch',
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'auth.errors.invalidCredentials'),
});

export const emailOnlySchema = z.object({ email });

export const newPasswordSchema = z
  .object({ password: newPassword, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'auth.errors.passwordMatch',
  });

export const totpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'staff.errors.codeFormat'),
});

/** Turns a zod error into { fieldName: copyKey } (first issue per field). */
export function fieldErrors(zodError) {
  const out = {};
  for (const issue of zodError.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
```

**`src/features/auth/schemas.test.js`**

```js
import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  newPasswordSchema,
  totpSchema,
  fieldErrors,
} from './schemas.js';

const valid = {
  fullName: 'Ana Reyes',
  email: ' Ana@Example.test ',
  gradeLevel: '12',
  section: 'HUMSS-A',
  classAdviser: 'Mr. Ramon Cruz',
  password: 'a-long-password',
  confirmPassword: 'a-long-password',
};

describe('registerSchema', () => {
  it('accepts a valid form and normalises the email', () => {
    const r = registerSchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.data.email).toBe('ana@example.test');
  });
  it('reports each problem with a copy key', () => {
    const r = registerSchema.safeParse({
      ...valid,
      fullName: 'A',
      email: 'nope',
      gradeLevel: '',
      section: '',
      classAdviser: '',
      password: 'short',
      confirmPassword: 'x',
    });
    expect(fieldErrors(r.error)).toEqual({
      fullName: 'auth.errors.fullName',
      email: 'auth.errors.email',
      gradeLevel: 'auth.errors.gradeLevel',
      section: 'auth.errors.section',
      classAdviser: 'auth.errors.adviser',
      password: 'auth.errors.passwordShort',
    });
  });
  it('requires matching passwords', () => {
    const r = registerSchema.safeParse({ ...valid, confirmPassword: 'different-password' });
    expect(fieldErrors(r.error)).toEqual({ confirmPassword: 'auth.errors.passwordMatch' });
  });
});

describe('other schemas', () => {
  it('validate login, new password, and TOTP code', () => {
    expect(loginSchema.safeParse({ email: 'a@b.test', password: 'x' }).success).toBe(true);
    expect(
      newPasswordSchema.safeParse({ password: '123456789012', confirmPassword: '123456789012' })
        .success,
    ).toBe(true);
    expect(totpSchema.safeParse({ code: '123456' }).success).toBe(true);
    expect(fieldErrors(totpSchema.safeParse({ code: '12a456' }).error)).toEqual({
      code: 'staff.errors.codeFormat',
    });
  });
});
```

**`src/features/auth/useForm.js`**

```js
import { useState } from 'react';
import { fieldErrors } from './schemas.js';

/** Minimal form state: values, per-field errors (copy keys), and a validate() using a zod schema. */
export function useForm(initial) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const bind = (name) => ({
    name,
    value: values[name],
    onChange: (e) => setValues((v) => ({ ...v, [name]: e.target.value })),
  });
  const validate = (schema) => {
    const r = schema.safeParse(values);
    if (r.success) {
      setErrors({});
      return r.data;
    }
    setErrors(fieldErrors(r.error));
    return null;
  };
  return { values, setValues, errors, setErrors, bind, validate };
}
```

**`src/features/auth/AuthCard.jsx`**

```jsx
import { Card } from '../../components/ui/Card.jsx';

/** Centered card used by every sign-in screen. */
export function AuthCard({ children, above = null, below = null }) {
  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col gap-4">
      {above}
      <Card className="p-6 md:p-8">{children}</Card>
      {below}
    </div>
  );
}

export function FormMessage({ children }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="rounded-control border-2 border-ink bg-surface px-4 py-3 text-[14px] text-ink"
    >
      {children}
    </div>
  );
}
```

**`src/features/auth/RegisterPage.jsx`**

```jsx
// Fig 8 · requirement 2.1.5.1.1 · D-01 (section and adviser added) · D-22 (12 characters) · D-32
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Lock } from 'lucide-react';
import { t } from '../../copy/index.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import { authErrorKey } from '../../lib/auth/errors.js';
import {
  Button,
  Chip,
  Field,
  PasswordInput,
  Select,
  TextInput,
} from '../../components/ui/index.js';
import { AuthCard, FormMessage } from './AuthCard.jsx';
import { registerSchema } from './schemas.js';
import { useForm } from './useForm.js';

export function RegisterPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const { bind, errors, validate } = useForm({
    fullName: '',
    email: '',
    gradeLevel: '',
    section: '',
    classAdviser: '',
    password: '',
    confirmPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [sentTo, setSentTo] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const v = validate(registerSchema);
    if (!v) return;
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: v.email,
      password: v.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirmed`,
        data: {
          account_type: 'student',
          full_name: v.fullName,
          grade_level: Number(v.gradeLevel),
          section: v.section,
          class_adviser: v.classAdviser,
        },
      },
    });
    setSubmitting(false);
    if (error) {
      setFormError(t(authErrorKey(error)));
      return;
    }
    if (data.session) {
      // Only when email confirmation is off (never in the pilot): go straight to the walkthrough.
      await refresh();
      navigate('/welcome', { replace: true });
      return;
    }
    // Same message whether or not the email was already registered (no account enumeration).
    setSentTo(v.email);
  };

  if (sentTo) {
    return (
      <AuthCard>
        <h1 className="text-[28px] font-semibold text-ink">{t('auth.register.sentTitle')}</h1>
        <p className="mt-3 text-base text-ink">{t('auth.register.sentBody', { email: sentTo })}</p>
        <p className="mt-2 text-[14px] text-ink-muted">{t('auth.register.sentNote')}</p>
        <Link
          to="/login"
          className="mt-6 inline-flex min-h-11 items-center font-semibold text-ink underline"
        >
          {t('auth.register.login')}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      above={
        <div className="flex justify-end">
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center gap-2 text-[15px] text-ink"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t('auth.register.backToLogin')}
          </Link>
        </div>
      }
      below={
        <p className="flex items-center justify-center gap-2 rounded-card bg-blush px-4 py-3 text-center text-[13px] text-ink">
          <Lock aria-hidden="true" className="size-4 shrink-0" />
          {t('auth.register.trust')}
        </p>
      }
    >
      <Chip tone="strong">{t('auth.register.step')}</Chip>
      <h1 className="mt-4 text-[28px] font-semibold leading-9 text-ink">
        {t('auth.register.title')}
      </h1>
      <p className="mt-2 text-base text-ink-muted">{t('auth.register.lead')}</p>
      <form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <FormMessage>{formError}</FormMessage>
        <Field
          id="fullName"
          label={t('auth.register.fullName')}
          error={errors.fullName && t(errors.fullName)}
        >
          <TextInput
            autoComplete="name"
            placeholder={t('auth.register.fullNamePlaceholder')}
            {...bind('fullName')}
          />
        </Field>
        <Field id="email" label={t('auth.register.email')} error={errors.email && t(errors.email)}>
          <TextInput
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={t('auth.register.emailPlaceholder')}
            {...bind('email')}
          />
        </Field>
        <Field
          id="gradeLevel"
          label={t('auth.register.gradeLevel')}
          error={errors.gradeLevel && t(errors.gradeLevel)}
        >
          <Select
            placeholder={t('auth.register.gradePlaceholder')}
            options={[
              { value: '11', label: t('auth.register.grade11') },
              { value: '12', label: t('auth.register.grade12') },
            ]}
            {...bind('gradeLevel')}
          />
        </Field>
        <Field
          id="section"
          label={t('auth.register.section')}
          error={errors.section && t(errors.section)}
        >
          <TextInput autoComplete="off" {...bind('section')} />
        </Field>
        <Field
          id="classAdviser"
          label={t('auth.register.adviser')}
          hint={t('auth.register.adviserHint')}
          error={errors.classAdviser && t(errors.classAdviser)}
        >
          <TextInput autoComplete="off" {...bind('classAdviser')} />
        </Field>
        <Field
          id="password"
          label={t('auth.register.password')}
          hint={t('auth.register.passwordHint')}
          error={errors.password && t(errors.password)}
        >
          <PasswordInput autoComplete="new-password" {...bind('password')} />
        </Field>
        <Field
          id="confirmPassword"
          label={t('auth.register.confirmPassword')}
          error={errors.confirmPassword && t(errors.confirmPassword)}
        >
          <PasswordInput autoComplete="new-password" {...bind('confirmPassword')} />
        </Field>
        <Button type="submit" size="lg" loading={submitting} className="mt-2 w-full">
          {t('auth.register.submit')}
        </Button>
        <p className="text-center text-[14px] text-ink-muted">{t('auth.register.next')}</p>
      </form>
      <p className="mt-6 text-center text-[15px] text-ink">
        {t('auth.register.haveAccount')}{' '}
        <Link to="/login" className="font-semibold underline">
          {t('auth.register.login')}
        </Link>
      </p>
    </AuthCard>
  );
}
```

**`src/features/auth/RegisterPage.test.jsx`**

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { renderWithAuth } from '../../test/renderWithAuth.jsx';
import { createMockSupabase } from '../../test/mockSupabase.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { RegisterPage } = await import('./RegisterPage.jsx');

describe('RegisterPage (Fig 8, 2.1.5.1.1, D-01)', () => {
  beforeEach(() => {
    mock.client = createMockSupabase();
  });

  it('shows every field, including section and class adviser', () => {
    renderWithAuth(<Route path="/register" element={<RegisterPage />} />, { path: '/register' });
    for (const label of [
      'Full name',
      'School email address',
      'Grade level',
      'Section',
      'Class adviser',
      'Password',
      'Confirm password',
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByText('Step 1 of 2 · Student Registration')).toBeInTheDocument();
  });

  it('blocks submission and explains each missing field', async () => {
    renderWithAuth(<Route path="/register" element={<RegisterPage />} />, { path: '/register' });
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Enter your full name.')).toBeInTheDocument();
    expect(screen.getByText('Choose your grade level.')).toBeInTheDocument();
    expect(
      screen.getByText('Use at least 12 characters.', { selector: '[role=alert]' }),
    ).toBeInTheDocument();
    expect(mock.client.auth.signUp).not.toHaveBeenCalled();
  });

  it('signs up with exactly the student metadata the database trigger reads', async () => {
    mock.client.auth.signUp.mockResolvedValue({ data: { session: null, user: {} }, error: null });
    renderWithAuth(<Route path="/register" element={<RegisterPage />} />, { path: '/register' });
    await userEvent.type(screen.getByLabelText('Full name'), 'Ana Reyes');
    await userEvent.type(screen.getByLabelText('School email address'), 'Ana@Example.test');
    await userEvent.selectOptions(screen.getByLabelText('Grade level'), '12');
    await userEvent.type(screen.getByLabelText('Section'), 'HUMSS-A');
    await userEvent.type(screen.getByLabelText('Class adviser'), 'Mr. Ramon Cruz');
    await userEvent.type(screen.getByLabelText('Password'), 'a-long-password');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'a-long-password');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(mock.client.auth.signUp).toHaveBeenCalledWith({
      email: 'ana@example.test',
      password: 'a-long-password',
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirmed`,
        data: {
          account_type: 'student',
          full_name: 'Ana Reyes',
          grade_level: 12,
          section: 'HUMSS-A',
          class_adviser: 'Mr. Ramon Cruz',
        },
      },
    });
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
  });
});
```

**`src/features/auth/LoginPage.jsx`**

```jsx
// Fig 9 · student log in. Staff accounts are refused here and pointed to the staff portal.
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ArrowLeft, Shield } from 'lucide-react';
import { t } from '../../copy/index.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import { authErrorKey } from '../../lib/auth/errors.js';
import { homePathFor } from '../../lib/auth/homePath.js';
import { Button, Chip, Field, PasswordInput, TextInput } from '../../components/ui/index.js';
import { AuthCard, FormMessage } from './AuthCard.jsx';
import { loginSchema } from './schemas.js';
import { useForm } from './useForm.js';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh, signOut, setAuthBusy } = useAuth();
  const { bind, errors, validate } = useForm({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    const v = validate(loginSchema);
    if (!v) return;
    setSubmitting(true);
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: v.email,
        password: v.password,
      });
      if (error) {
        setFormError({ key: authErrorKey(error) });
        return;
      }
      const { data: account, error: accError } = await supabase.rpc('my_account');
      if (accError) {
        await signOut();
        setFormError({ key: 'auth.errors.generic' });
        return;
      }
      if (account.kind === 'guidance' || account.kind === 'administrator') {
        await signOut();
        setFormError({ key: 'auth.errors.staffOnStudentPage', staffLink: true });
        return;
      }
      if (account.kind !== 'student') {
        await signOut();
        setFormError({ key: 'auth.errors.notStudent' });
        return;
      }
      const loaded = await refresh();
      navigate(location.state?.from ?? homePathFor(loaded.account, loaded.aal), { replace: true });
    } finally {
      setSubmitting(false);
      setAuthBusy(false);
    }
  };

  return (
    <AuthCard
      above={
        <div className="flex items-center justify-between">
          <Chip>
            <span aria-hidden="true" className="size-2 rounded-full bg-ink" />
            {t('auth.login.chip')}
          </Chip>
          <Link to="/" className="inline-flex min-h-11 items-center gap-1 text-[14px] text-ink">
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t('auth.login.backHome')}
          </Link>
        </div>
      }
      below={
        <Link
          to="/help"
          className="mx-auto inline-flex min-h-11 items-center gap-2 text-[15px] text-ink"
        >
          <Shield aria-hidden="true" className="size-4" />
          {t('auth.login.needHelp')}
        </Link>
      }
    >
      <h1 className="text-[28px] font-semibold leading-9 text-ink">{t('auth.login.title')}</h1>
      <p className="mt-2 text-base text-ink-muted">{t('auth.login.lead')}</p>
      <form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <FormMessage>
          {formError && (
            <>
              {t(formError.key)}
              {formError.staffLink && (
                <>
                  {' '}
                  <Link to="/staff/login" className="font-semibold underline">
                    {t('auth.errors.staffPortalLink')}
                  </Link>
                </>
              )}
            </>
          )}
        </FormMessage>
        <Field id="email" label={t('auth.login.email')} error={errors.email && t(errors.email)}>
          <TextInput type="email" autoComplete="email" inputMode="email" {...bind('email')} />
        </Field>
        <Field
          id="password"
          label={t('auth.login.password')}
          error={errors.password && t(errors.password)}
        >
          <PasswordInput autoComplete="current-password" {...bind('password')} />
        </Field>
        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="inline-flex min-h-11 items-center text-[14px] text-ink underline"
          >
            {t('auth.login.forgot')}
          </Link>
        </div>
        <Button type="submit" size="lg" loading={submitting} className="w-full">
          {t('auth.login.submit')}
        </Button>
      </form>
      <hr className="my-6 border-line" />
      <p className="text-center text-[15px] text-ink-muted">
        {t('auth.login.newHere')}{' '}
        <Link to="/register" className="font-semibold text-ink underline">
          {t('auth.login.create')}
        </Link>
      </p>
    </AuthCard>
  );
}
```

**`src/features/auth/LoginPage.test.jsx`**

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { renderWithAuth, fakeAuth, STUDENT_T2, GUIDANCE } from '../../test/renderWithAuth.jsx';
import { createMockSupabase } from '../../test/mockSupabase.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { LoginPage } = await import('./LoginPage.jsx');

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText('School email address'), 'ana@example.test');
  await userEvent.type(screen.getByLabelText('Password'), 'LocalOnly-Pass-2026');
  await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
}

describe('LoginPage (Fig 9)', () => {
  beforeEach(() => {
    mock.client = createMockSupabase();
  });

  it('shows the exact Fig 9 copy', () => {
    renderWithAuth(<Route path="/login" element={<LoginPage />} />, { path: '/login' });
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(
      screen.getByText('Take a slow breath. Your thoughts remain your own.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  it('signs a Tier 2 student in and goes to the check-in', async () => {
    mock.client.auth.signInWithPassword.mockResolvedValue({ error: null });
    mock.client.rpc.mockResolvedValue({ data: STUDENT_T2, error: null });
    const auth = fakeAuth();
    auth.refresh = vi.fn(async () => ({ account: STUDENT_T2, aal: null }));
    renderWithAuth(<Route path="/login" element={<LoginPage />} />, { path: '/login', auth });
    await fillAndSubmit();
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/check-in'));
    expect(auth.setAuthBusy).toHaveBeenCalledWith(true);
    expect(auth.setAuthBusy).toHaveBeenLastCalledWith(false);
  });

  it('refuses a staff account and points to the staff portal', async () => {
    mock.client.auth.signInWithPassword.mockResolvedValue({ error: null });
    mock.client.rpc.mockResolvedValue({ data: GUIDANCE, error: null });
    const { auth } = renderWithAuth(<Route path="/login" element={<LoginPage />} />, {
      path: '/login',
    });
    await fillAndSubmit();
    expect(await screen.findByText(/This is the student log in\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the staff portal' })).toHaveAttribute(
      'href',
      '/staff/login',
    );
    expect(auth.signOut).toHaveBeenCalled();
  });

  it('shows a plain message for wrong credentials', async () => {
    mock.client.auth.signInWithPassword.mockResolvedValue({
      error: { code: 'invalid_credentials' },
    });
    renderWithAuth(<Route path="/login" element={<LoginPage />} />, { path: '/login' });
    await fillAndSubmit();
    expect(
      await screen.findByText('That email and password do not match. Try again.'),
    ).toBeInTheDocument();
    expect(mock.client.rpc).not.toHaveBeenCalled();
  });
});
```

**`src/features/auth/ForgotPasswordPage.jsx`**

```jsx
// Linked from Fig 9 ("Forgot password?"). Same reply whether or not the email exists.
import { useState } from 'react';
import { Link } from 'react-router';
import { t } from '../../copy/index.js';
import { supabase } from '../../lib/supabase.js';
import { authErrorKey } from '../../lib/auth/errors.js';
import { Button, Field, TextInput } from '../../components/ui/index.js';
import { AuthCard, FormMessage } from './AuthCard.jsx';
import { emailOnlySchema } from './schemas.js';
import { useForm } from './useForm.js';

export function ForgotPasswordPage() {
  const { bind, errors, validate } = useForm({ email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const v = validate(emailOnlySchema);
    if (!v) return;
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(v.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    const key = error ? authErrorKey(error) : null;
    if (key === 'auth.errors.rateLimited') {
      setFormError(t(key));
      return;
    }
    setSent(true);
  };

  return (
    <AuthCard>
      {sent ? (
        <>
          <h1 className="text-[28px] font-semibold text-ink">{t('auth.forgot.sentTitle')}</h1>
          <p className="mt-3 text-base text-ink">{t('auth.forgot.sentBody')}</p>
        </>
      ) : (
        <>
          <h1 className="text-[28px] font-semibold text-ink">{t('auth.forgot.title')}</h1>
          <p className="mt-2 text-base text-ink-muted">{t('auth.forgot.lead')}</p>
          <form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
            <FormMessage>{formError}</FormMessage>
            <Field
              id="email"
              label={t('auth.forgot.email')}
              error={errors.email && t(errors.email)}
            >
              <TextInput type="email" autoComplete="email" inputMode="email" {...bind('email')} />
            </Field>
            <Button type="submit" size="lg" loading={submitting} className="w-full">
              {t('auth.forgot.submit')}
            </Button>
          </form>
        </>
      )}
      <Link
        to="/login"
        className="mt-6 inline-flex min-h-11 items-center text-[15px] font-semibold text-ink underline"
      >
        {t('auth.forgot.backToLogin')}
      </Link>
    </AuthCard>
  );
}
```

**`src/features/auth/ResetPasswordPage.jsx`**

```jsx
// Opened from the reset email. The link signs the user in (detectSessionInUrl); they set a new password.
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { t } from '../../copy/index.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import { authErrorKey } from '../../lib/auth/errors.js';
import { homePathFor } from '../../lib/auth/homePath.js';
import { Button, Field, LinkButton, PasswordInput, Skeleton } from '../../components/ui/index.js';
import { AuthCard, FormMessage } from './AuthCard.jsx';
import { newPasswordSchema } from './schemas.js';
import { useForm } from './useForm.js';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { status, session, refresh } = useAuth();
  const { bind, errors, validate } = useForm({ password: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(false);

  if (status === 'loading')
    return (
      <AuthCard>
        <Skeleton lines={3} />
      </AuthCard>
    );

  if (!session) {
    return (
      <AuthCard>
        <h1 className="text-[28px] font-semibold text-ink">{t('auth.reset.invalidTitle')}</h1>
        <p className="mt-3 text-base text-ink">{t('auth.reset.invalidBody')}</p>
        <LinkButton to="/forgot-password" className="mt-6">
          {t('auth.reset.invalidAction')}
        </LinkButton>
      </AuthCard>
    );
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const v = validate(newPasswordSchema);
    if (!v) return;
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: v.password });
    setSubmitting(false);
    if (error) {
      setFormError(t(authErrorKey(error)));
      return;
    }
    setDone(true);
  };

  const onContinue = async () => {
    const loaded = await refresh();
    navigate(homePathFor(loaded.account, loaded.aal), { replace: true });
  };

  if (done) {
    return (
      <AuthCard>
        <h1 className="text-[28px] font-semibold text-ink">{t('auth.reset.doneTitle')}</h1>
        <Button size="lg" className="mt-6 w-full" onClick={onContinue}>
          {t('auth.reset.continue')}
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <h1 className="text-[28px] font-semibold text-ink">{t('auth.reset.title')}</h1>
      <form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <FormMessage>{formError}</FormMessage>
        <Field
          id="password"
          label={t('auth.reset.password')}
          hint={t('auth.reset.passwordHint')}
          error={errors.password && t(errors.password)}
        >
          <PasswordInput autoComplete="new-password" {...bind('password')} />
        </Field>
        <Field
          id="confirmPassword"
          label={t('auth.reset.confirmPassword')}
          error={errors.confirmPassword && t(errors.confirmPassword)}
        >
          <PasswordInput autoComplete="new-password" {...bind('confirmPassword')} />
        </Field>
        <Button type="submit" size="lg" loading={submitting} className="w-full">
          {t('auth.reset.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
```

**`src/features/auth/EmailConfirmedPage.jsx`**

```jsx
// Target of the confirmation email link (emailRedirectTo). The link may or may not sign the user in.
import { useNavigate } from 'react-router';
import { t } from '../../copy/index.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import { homePathFor } from '../../lib/auth/homePath.js';
import { Button, LinkButton, Skeleton } from '../../components/ui/index.js';
import { AuthCard } from './AuthCard.jsx';

export function EmailConfirmedPage() {
  const navigate = useNavigate();
  const { status, session, account, aal } = useAuth();
  if (status === 'loading')
    return (
      <AuthCard>
        <Skeleton lines={2} />
      </AuthCard>
    );
  return (
    <AuthCard>
      <h1 className="text-[28px] font-semibold text-ink">{t('auth.confirmed.title')}</h1>
      {session ? (
        <>
          <p className="mt-3 text-base text-ink">{t('auth.confirmed.bodySignedIn')}</p>
          <Button
            size="lg"
            className="mt-6 w-full"
            onClick={() => navigate(homePathFor(account, aal), { replace: true })}
          >
            {t('auth.confirmed.continue')}
          </Button>
        </>
      ) : (
        <>
          <p className="mt-3 text-base text-ink">{t('auth.confirmed.bodySignedOut')}</p>
          <LinkButton to="/login" size="lg" className="mt-6 w-full">
            {t('auth.confirmed.login')}
          </LinkButton>
        </>
      )}
    </AuthCard>
  );
}
```

**`src/features/auth/StaffPortalNotes.jsx`**

```jsx
import { ShieldCheck } from 'lucide-react';
import { t } from '../../copy/index.js';

/** The two notes under the staff sign-in card (Figs 19-20). */
export function StaffPortalNotes() {
  return (
    <>
      <p className="text-center text-[14px] text-ink-muted">{t('staff.login.timeoutNote')}</p>
      <div className="rounded-card border border-line bg-surface p-5 text-center">
        <p className="flex items-center justify-center gap-2 text-[13px] font-semibold tracking-[0.12em] text-ink">
          <ShieldCheck aria-hidden="true" className="size-4" />
          {t('staff.login.obligationTitle')}
        </p>
        <p className="mt-2 text-[14px] text-ink">{t('staff.login.obligationBody')}</p>
      </div>
    </>
  );
}

export function StaffPortalHeading() {
  return (
    <div className="mb-2 text-center">
      <h1 className="text-[28px] font-semibold leading-9 text-ink md:text-[36px] md:leading-[44px]">
        {t('staff.login.title')}
      </h1>
      <p className="mx-auto mt-2 max-w-md text-base text-ink-muted">{t('staff.login.lead')}</p>
    </div>
  );
}
```

**`src/features/auth/StaffLoginPage.jsx`**

```jsx
// Fig 19 · requirement 2.1.6.2.9 · staff accounts are provisioned by the administrator.
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, Info } from 'lucide-react';
import { t } from '../../copy/index.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import { authErrorKey } from '../../lib/auth/errors.js';
import { homePathFor } from '../../lib/auth/homePath.js';
import { Button, Chip, Field, PasswordInput, TextInput } from '../../components/ui/index.js';
import { AuthCard, FormMessage } from './AuthCard.jsx';
import { StaffPortalHeading, StaffPortalNotes } from './StaffPortalNotes.jsx';
import { loginSchema } from './schemas.js';
import { useForm } from './useForm.js';

export function StaffLoginPage() {
  const navigate = useNavigate();
  const { refresh, signOut, setAuthBusy } = useAuth();
  const { bind, errors, validate } = useForm({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const v = validate(loginSchema);
    if (!v) return;
    setSubmitting(true);
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: v.email,
        password: v.password,
      });
      if (error) {
        setFormError(t(authErrorKey(error, 'staff')));
        return;
      }
      const { data: account, error: accError } = await supabase.rpc('my_account');
      if (accError) {
        await signOut();
        setFormError(t('staff.errors.generic'));
        return;
      }
      if (account.kind !== 'guidance' && account.kind !== 'administrator') {
        await signOut();
        setFormError(t('staff.errors.notStaff'));
        return;
      }
      if (!account.is_active) {
        await signOut();
        setFormError(t('staff.errors.inactive'));
        return;
      }
      const loaded = await refresh();
      navigate(homePathFor(loaded.account, loaded.aal), {
        replace: true,
        state: { fromLogin: true },
      });
    } finally {
      setSubmitting(false);
      setAuthBusy(false);
    }
  };

  return (
    <AuthCard
      above={
        <>
          <StaffPortalHeading />
          <div className="flex justify-center">
            <Chip tone="ink">{t('staff.login.badge')}</Chip>
          </div>
        </>
      }
      below={<StaffPortalNotes />}
    >
      <h2 className="text-[22px] font-semibold text-ink">{t('staff.login.cardTitle')}</h2>
      <p className="mt-1 text-[15px] text-ink-muted">{t('staff.login.cardLead')}</p>
      <form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <FormMessage>{formError}</FormMessage>
        <Field id="email" label={t('staff.login.email')} error={errors.email && t(errors.email)}>
          <TextInput type="email" autoComplete="username" inputMode="email" {...bind('email')} />
        </Field>
        <Field
          id="password"
          label={t('staff.login.password')}
          hint={t('staff.login.passwordHint')}
          error={errors.password && t(errors.password)}
        >
          <PasswordInput autoComplete="current-password" {...bind('password')} />
        </Field>
        <Button
          type="submit"
          size="lg"
          loading={submitting}
          className="w-full"
          iconRight={<ArrowRight aria-hidden="true" className="size-5" />}
        >
          {t('staff.login.submit')}
        </Button>
      </form>
      <hr className="my-6 border-line" />
      <p className="flex items-start gap-2 text-[14px] text-ink-muted">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {t('staff.login.provisioned')}
      </p>
    </AuthCard>
  );
}
```

**`src/features/auth/completeStaffSignIn.js`**

```js
import { setLastActivity } from '../../lib/storage.js';
import { timeoutFlag } from '../../lib/auth/idle.js';
import { homePathFor } from '../../lib/auth/homePath.js';

/** After the second factor succeeds: start the idle clock fresh, reload the account, go home. */
export async function completeStaffSignIn({ refresh, navigate }) {
  setLastActivity(Date.now());
  timeoutFlag.clear();
  const loaded = await refresh();
  navigate(homePathFor(loaded.account, loaded.aal), { replace: true });
}
```

**`src/features/auth/StaffVerifyPage.jsx`**

```jsx
// Fig 20 · requirement 2.1.6.2.9 (TOTP second factor).
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { t } from '../../copy/index.js';
import { SITE } from '../../config/site.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import { authErrorKey } from '../../lib/auth/errors.js';
import { Button, Chip, Field, Skeleton, TextInput } from '../../components/ui/index.js';
import { AuthCard, FormMessage } from './AuthCard.jsx';
import { StaffPortalHeading, StaffPortalNotes } from './StaffPortalNotes.jsx';
import { totpSchema } from './schemas.js';
import { useForm } from './useForm.js';
import { completeStaffSignIn } from './completeStaffSignIn.js';

export function StaffVerifyPage() {
  const navigate = useNavigate();
  const { account, session, refresh, signOut } = useAuth();
  const { bind, errors, validate } = useForm({ code: '' });
  const [factorId, setFactorId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let active = true;
    supabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (!active) return;
      const factor = !error ? data?.totp?.[0] : null; // data.totp holds verified TOTP factors only
      if (factor) setFactorId(factor.id);
      else navigate('/staff/setup', { replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const v = validate(totpSchema);
    if (!v) return;
    setSubmitting(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: v.code });
    if (error) {
      setSubmitting(false);
      setFormError(t(authErrorKey(error, 'staff')));
      return;
    }
    await completeStaffSignIn({ refresh, navigate });
  };

  const backToSignIn = async () => {
    await signOut();
    navigate('/staff/login', { replace: true });
  };

  return (
    <AuthCard above={<StaffPortalHeading />} below={<StaffPortalNotes />}>
      <Chip tone="ink">{t('staff.verify.badge')}</Chip>
      <h2 className="mt-4 text-[22px] font-semibold text-ink">{t('staff.verify.title')}</h2>
      <p className="mt-1 text-[15px] text-ink-muted">{t('staff.verify.lead')}</p>
      <p className="mt-4 flex flex-wrap items-center gap-2 rounded-control bg-blush px-4 py-3 text-[14px] text-ink">
        <span aria-hidden="true" className="size-2 rounded-full bg-ink" />
        <span className="font-semibold">{account?.display_name}</span>
        <span className="font-mono text-[13px]">{session?.user?.email}</span>
      </p>
      {!factorId ? (
        <div className="mt-6">
          <Skeleton lines={2} />
        </div>
      ) : (
        <form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <FormMessage>{formError}</FormMessage>
          <Field
            id="code"
            label={t('staff.verify.codeLabel')}
            error={errors.code && t(errors.code)}
          >
            <TextInput
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              className="text-center font-mono text-[24px] tracking-[0.5em]"
              {...bind('code')}
            />
          </Field>
          <Button type="submit" size="lg" loading={submitting} className="w-full">
            {t('staff.verify.submit')}
          </Button>
          <Button variant="outline" size="lg" className="w-full" onClick={backToSignIn}>
            {t('staff.verify.back')}
          </Button>
        </form>
      )}
      <hr className="my-6 border-line" />
      <p className="text-center text-[14px] text-ink-muted">
        {t('staff.verify.lost', { contact: SITE.staffSupportContact })}
      </p>
    </AuthCard>
  );
}
```

**`src/features/auth/StaffVerifyPage.test.jsx`**

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import {
  renderWithAuth,
  fakeAuth,
  GUIDANCE,
  AAL1_FACTOR,
  AAL2,
} from '../../test/renderWithAuth.jsx';
import { createMockSupabase } from '../../test/mockSupabase.js';
import { getLastActivity, clearLastActivity } from '../../lib/storage.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { StaffVerifyPage } = await import('./StaffVerifyPage.jsx');

describe('StaffVerifyPage (Fig 20, 2.1.6.2.9)', () => {
  beforeEach(() => {
    mock.client = createMockSupabase();
    clearLastActivity();
  });

  it('sends staff without a verified authenticator to setup', async () => {
    mock.client.auth.mfa.listFactors.mockResolvedValue({
      data: { all: [], totp: [] },
      error: null,
    });
    renderWithAuth(<Route path="/staff/verify" element={<StaffVerifyPage />} />, {
      path: '/staff/verify',
      auth: fakeAuth({ account: GUIDANCE, aal: AAL1_FACTOR }),
    });
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/staff/setup'));
  });

  it('rejects a wrong code with a plain message', async () => {
    mock.client.auth.mfa.listFactors.mockResolvedValue({
      data: { all: [], totp: [{ id: 'f1' }] },
      error: null,
    });
    mock.client.auth.mfa.challengeAndVerify.mockResolvedValue({
      error: { code: 'mfa_verification_failed' },
    });
    renderWithAuth(<Route path="/staff/verify" element={<StaffVerifyPage />} />, {
      path: '/staff/verify',
      auth: fakeAuth({ account: GUIDANCE, aal: AAL1_FACTOR }),
    });
    await userEvent.type(await screen.findByLabelText('Security verification code'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }));
    expect(
      await screen.findByText('That code did not work. Check your app and enter the newest code.'),
    ).toBeInTheDocument();
  });

  it('on success starts the idle clock and goes to the queue', async () => {
    mock.client.auth.mfa.listFactors.mockResolvedValue({
      data: { all: [], totp: [{ id: 'f1' }] },
      error: null,
    });
    mock.client.auth.mfa.challengeAndVerify.mockResolvedValue({ data: {}, error: null });
    const auth = fakeAuth({ account: GUIDANCE, aal: AAL1_FACTOR });
    auth.refresh = vi.fn(async () => ({ account: GUIDANCE, aal: AAL2 }));
    renderWithAuth(<Route path="/staff/verify" element={<StaffVerifyPage />} />, {
      path: '/staff/verify',
      auth,
    });
    await userEvent.type(await screen.findByLabelText('Security verification code'), '654321');
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/staff/queue'));
    expect(mock.client.auth.mfa.challengeAndVerify).toHaveBeenCalledWith({
      factorId: 'f1',
      code: '654321',
    });
    expect(getLastActivity()).not.toBeNull();
  });
});
```

**`src/features/auth/StaffSetupPage.jsx`**

```jsx
// First sign-in for invited staff (Fig 28 note): set a password, then enrol a TOTP authenticator.
// Staff arriving from the sign-in page (password already set) start at step 2.
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { t } from '../../copy/index.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import { authErrorKey } from '../../lib/auth/errors.js';
import {
  Button,
  Chip,
  Field,
  PasswordInput,
  Skeleton,
  TextInput,
} from '../../components/ui/index.js';
import { AuthCard, FormMessage } from './AuthCard.jsx';
import { StaffPortalNotes } from './StaffPortalNotes.jsx';
import { newPasswordSchema, totpSchema } from './schemas.js';
import { useForm } from './useForm.js';
import { completeStaffSignIn } from './completeStaffSignIn.js';

function PasswordStep({ onDone }) {
  const { bind, errors, validate } = useForm({ password: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const v = validate(newPasswordSchema);
    if (!v) return;
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: v.password });
    setSubmitting(false);
    if (error && error.code !== 'same_password') {
      setFormError(t(authErrorKey(error, 'staff')));
      return;
    }
    onDone();
  };
  return (
    <form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
      <FormMessage>{formError}</FormMessage>
      <Field
        id="password"
        label={t('staff.setup.password')}
        hint={t('staff.setup.passwordHint')}
        error={errors.password && t(errors.password)}
      >
        <PasswordInput autoComplete="new-password" {...bind('password')} />
      </Field>
      <Field
        id="confirmPassword"
        label={t('staff.setup.confirmPassword')}
        error={errors.confirmPassword && t(errors.confirmPassword)}
      >
        <PasswordInput autoComplete="new-password" {...bind('confirmPassword')} />
      </Field>
      <Button type="submit" size="lg" loading={submitting} className="w-full">
        {t('staff.setup.savePassword')}
      </Button>
    </form>
  );
}

function AuthenticatorStep() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const { bind, errors, validate } = useForm({ code: '' });
  const [enrolment, setEnrolment] = useState(null); // { id, qr, secret }
  const [loadError, setLoadError] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: list, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) return active && setLoadError(true);
      if (list.totp.length > 0) return navigate('/staff/verify', { replace: true });
      // Remove half-finished enrolments so a fresh one can start.
      for (const f of list.all.filter(
        (x) => x.factor_type === 'totp' && x.status === 'unverified',
      )) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'HingaWeb',
        issuer: 'HingaWeb',
      });
      if (!active) return undefined;
      if (error) return setLoadError(true);
      setEnrolment({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
      return undefined;
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const v = validate(totpSchema);
    if (!v) return;
    setSubmitting(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrolment.id,
      code: v.code,
    });
    if (error) {
      setSubmitting(false);
      setFormError(t(authErrorKey(error, 'staff')));
      return;
    }
    await completeStaffSignIn({ refresh, navigate });
  };

  if (loadError) return <FormMessage>{t('staff.errors.generic')}</FormMessage>;
  if (!enrolment)
    return (
      <div className="mt-6">
        <Skeleton lines={4} />
      </div>
    );
  return (
    <div className="mt-6 flex flex-col gap-4">
      <p className="text-[15px] text-ink">{t('staff.setup.scan')}</p>
      <img
        src={`data:image/svg+xml;utf-8,${encodeURIComponent(enrolment.qr)}`}
        alt={t('staff.setup.qrAlt')}
        className="mx-auto size-48 rounded-control border border-line bg-white p-2"
      />
      <p className="text-[14px] text-ink-muted">{t('staff.setup.manual')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded-control bg-surface-muted px-3 py-2 font-mono text-[14px]">
          {showKey ? enrolment.secret : '•'.repeat(16)}
        </code>
        <Button variant="ghost" onClick={() => setShowKey((s) => !s)}>
          {showKey ? t('staff.setup.hideKey') : t('staff.setup.showKey')}
        </Button>
      </div>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormMessage>{formError}</FormMessage>
        <Field id="code" label={t('staff.setup.codeLabel')} error={errors.code && t(errors.code)}>
          <TextInput
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            className="text-center font-mono text-[24px] tracking-[0.5em]"
            {...bind('code')}
          />
        </Field>
        <Button type="submit" size="lg" loading={submitting} className="w-full">
          {t('staff.setup.finish')}
        </Button>
      </form>
    </div>
  );
}

export function StaffSetupPage() {
  const location = useLocation();
  const [step, setStep] = useState(location.state?.fromLogin ? 2 : 1);
  return (
    <AuthCard below={<StaffPortalNotes />}>
      <Chip tone="strong">{step === 1 ? t('staff.setup.step1') : t('staff.setup.step2')}</Chip>
      <h1 className="mt-4 text-[26px] font-semibold text-ink">{t('staff.setup.title')}</h1>
      {step === 1 ? <PasswordStep onDone={() => setStep(2)} /> : <AuthenticatorStep />}
    </AuthCard>
  );
}
```

**`src/features/auth/NotFoundPage.jsx`**

```jsx
import { t } from '../../copy/index.js';
import { LinkButton } from '../../components/ui/index.js';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-[28px] font-semibold text-ink">{t('notFound.title')}</h1>
      <p className="text-base text-ink-muted">{t('notFound.body')}</p>
      <LinkButton to="/" variant="outline">
        {t('notFound.action')}
      </LinkButton>
    </div>
  );
}
```

**`src/features/placeholder/PhasePlaceholder.jsx`**

```jsx
// Temporary screen for routes built in later phases. Each later phase replaces its own
// <PhasePlaceholder> route element. Delete this file in Phase 10 once no route uses it.
import { t } from '../../copy/index.js';

export function PhasePlaceholder({ phase }) {
  return <p className="text-base text-ink-muted">{t('dev.placeholder', { phase })}</p>;
}
```

### Step 7 — Routes, app, entry point, styles

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

export function AppRoutes() {
  return (
    <Routes>
      {/* Tier 1: public pages; a signed-in student keeps the student header */}
      <Route element={<PublicOrStudentLayout />}>
        <Route index element={<PhasePlaceholder phase="03" />} />
        <Route path="guides" element={<PhasePlaceholder phase="03" />} />
        <Route path="help" element={<PhasePlaceholder phase="03" />} />
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

**`src/App.jsx`**

```jsx
import { BrowserRouter } from 'react-router';
import { AuthProvider } from './lib/auth/AuthProvider.jsx';
import { AppRoutes } from './routes.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
```

**`src/main.jsx`**

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
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

### Step 8 — Test setup, helpers, and changed config

`setupTests.js` now also runs Testing Library's cleanup (Vitest runs without globals). `eslint.config.js` turns off the Fast Refresh rule for test files only. `scripts/check-copy.js` now treats `nav.staff.*` and `nav.admin.*` keys as staff copy (one line changed).

**`src/test/setupTests.js`**

```js
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Vitest runs without globals, so Testing Library cannot register its own cleanup.
afterEach(() => cleanup());
```

**`src/test/renderWithAuth.jsx`**

```jsx
// Test helper: render a route tree with a fake auth context (no Supabase needed).
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { vi } from 'vitest';
import { AuthContext } from '../lib/auth/AuthContext.js';

export const STUDENT_T2 = {
  kind: 'student',
  full_name: 'Ana Reyes',
  grade_level: 12,
  section: 'HUMSS-A',
  class_adviser: 'Mr. Ramon Cruz',
  assent: 'granted',
  parental: 'granted',
  tier2: true,
  has_checkin: false,
};
export const STUDENT_NO_PARENT = { ...STUDENT_T2, parental: 'none', tier2: false };
export const STUDENT_NO_ASSENT = { ...STUDENT_T2, assent: 'none', parental: 'none', tier2: false };
export const GUIDANCE = {
  kind: 'guidance',
  is_active: true,
  display_name: 'Guidance Associate (dev)',
};
export const ADMIN = {
  kind: 'administrator',
  is_active: true,
  display_name: 'Administrator (dev)',
};
export const AAL2 = { current: 'aal2', next: 'aal2' };
export const AAL1_FACTOR = { current: 'aal1', next: 'aal2' };

export function fakeAuth(overrides = {}) {
  return {
    status: 'ready',
    session:
      overrides.account && overrides.account.kind !== 'anonymous'
        ? { user: { email: 'x@example.test' } }
        : null,
    account: { kind: 'anonymous' },
    aal: null,
    loadError: false,
    refresh: vi.fn(async () => ({
      account: overrides.account ?? { kind: 'anonymous' },
      aal: overrides.aal ?? null,
    })),
    signOut: vi.fn(async () => {}),
    authBusy: false,
    setAuthBusy: vi.fn(),
    ...overrides,
  };
}

/** Shows the current path so tests can assert redirects. */
export function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname}</div>;
}

/**
 * @param {import('react').ReactNode} routes  <Route> elements under test
 * @param {{ auth?: object, path?: string, state?: object }} opts
 */
export function renderWithAuth(routes, { auth = fakeAuth(), path = '/', state } = {}) {
  const utils = render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[{ pathname: path, state }]}>
        <LocationProbe />
        <Routes>
          {routes}
          <Route path="*" element={<p>other page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
  return { ...utils, auth };
}
```

**`src/test/mockSupabase.js`**

```js
// Test helper: a fake Supabase client. Each test sets the return values it needs.
import { vi } from 'vitest';

export function createMockSupabase() {
  return {
    rpc: vi.fn(),
    from: vi.fn(),
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

**`eslint.config.js`**

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
    files: ['scripts/**/*.js', 'supabase/functions/**/*.js', 'e2e/**/*.js', '*.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, Deno: 'readonly' },
    },
    rules: { ...js.configs.recommended.rules },
  },
];
```

**`scripts/check-copy.js`**

```js
// 00 Section 10.3. Fails if UI copy contains diagnostic, clinical, or scoring words.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, flatten } from './lib.js';

export const STUDENT_BANNED = [
  /\bdiagnos\w*/i,
  /\bdisorders?\b/i,
  /\bdepress\w*/i,
  /\banxiety\b/i,
  /\banxious\b/i,
  /\bsymptoms?\b/i,
  /\bpatients?\b/i,
  /\bclinical\b/i,
  /\bclinicians?\b/i,
  /\btherapy\b/i,
  /\btreatments?\b/i,
  /\bscreening\b/i,
  /\bassessments?\b/i,
  /\brisks?\b/i,
  /\bseverity\b/i,
  /\bscor(e|es|ed|ing)\b/i,
  /\bpriorit(y|ies)\b/i,
  /\btriage\b/i,
  /\bP[123]\b/,
  /\bFor Review\b/i,
  /\blabels?\b/i,
  /\bflag\w*/i,
];
export const STAFF_BANNED = [
  /\bdiagnos\w*/i,
  /\bdisorders?\b/i,
  /\bdepress\w*/i,
  /\banxiety\b/i,
  /\bsymptoms?\b/i,
  /\bpatients?\b/i,
  /\brisk scores?\b/i,
  /\brisk levels?\b/i,
  /\bat-risk\b/i,
  /\bscreening\b/i,
  /\bseverity\b/i,
];

/** Returns a list of { key, value, pattern } violations. */
export function findViolations(copy, allowlist) {
  const out = [];
  for (const [key, value] of flatten(copy)) {
    if (allowlist.includes(value)) continue;
    const staff = ['staff.', 'admin.', 'nav.staff.', 'nav.admin.'].some((p) => key.startsWith(p));
    for (const re of staff ? STAFF_BANNED : STUDENT_BANNED) {
      if (re.test(value)) out.push({ key, value, pattern: String(re) });
    }
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('check-copy.js')) {
  const enPath = join(ROOT, 'src/copy/en.js');
  const allowPath = join(ROOT, 'src/copy/allowlist.js');
  if (!existsSync(enPath)) {
    console.log('check:copy: src/copy/en.js not created yet (Phase 02) — nothing to check');
  } else {
    const { en } = await import(pathToFileURL(enPath).href);
    const allowlist = existsSync(allowPath)
      ? (await import(pathToFileURL(allowPath).href)).ALLOWLIST
      : [];
    const v = findViolations(en, allowlist);
    if (v.length) {
      for (const x of v) console.error(`check:copy: ${x.key} matches ${x.pattern}: "${x.value}"`);
      process.exit(1);
    }
    console.log('check:copy: OK');
  }
}
```

### Step 9 — Local TOTP tools, Playwright, and end-to-end specs

`scripts/totp.js` is checked against the RFC 6238 test vectors. It is used **only** by the dev script and the E2E tests; the app never computes codes.

**`scripts/totp.js`**

```js
// RFC 6238 TOTP (SHA-1, 30 s, 6 digits) for LOCAL DEVELOPMENT AND TESTS ONLY.
// The app itself never computes codes; staff use a real authenticator app.
import { createHmac } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Decode an RFC 4648 base32 string (the format Supabase returns as totp.secret). */
export function base32Decode(input) {
  const clean = input.replace(/=+$/, '').replace(/\s+/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid base32 character: ${ch}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** @param {string} secretBase32 @param {number} [atMs] @param {number} [digits] */
export function totp(secretBase32, atMs = Date.now(), digits = 6) {
  const counter = Math.floor(atMs / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', base32Decode(secretBase32)).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits;
  return String(code).padStart(digits, '0');
}
```

**`scripts/totp.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { totp, base32Decode } from './totp.js';

// RFC 6238 Appendix B, SHA-1 seed "12345678901234567890" (base32 below).
const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('totp (RFC 6238 test vectors)', () => {
  it('decodes base32', () => {
    expect(base32Decode(SECRET).toString('ascii')).toBe('12345678901234567890');
  });
  it.each([
    [59, '94287082'],
    [1111111109, '07081804'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
  ])('at %i seconds gives %s', (seconds, expected) => {
    expect(totp(SECRET, seconds * 1000, 8)).toBe(expected);
  });
});
```

**`scripts/dev-enrol-totp.js`**

```js
// LOCAL DEVELOPMENT ONLY. Enrols a TOTP factor for the two seed staff accounts and saves each
// secret to .dev-totp.json (git-ignored) so Playwright can compute codes.
// Usage: npx supabase db reset && node scripts/dev-enrol-totp.js
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { totp } from './totp.js';

const STAFF = ['guidance.one@example.test', 'admin.one@example.test'];
const PASSWORD = 'LocalOnly-Pass-2026';
const OUT = '.dev-totp.json';

function readEnv() {
  if (!existsSync('.env.local')) throw new Error('.env.local is missing (see Phase 01 Step 5).');
  const env = {};
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
  if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(env.VITE_SUPABASE_URL ?? '')) {
    throw new Error('Refusing to run: VITE_SUPABASE_URL is not a local address.');
  }
  return env;
}

const env = readEnv();
const saved = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};

for (const email of STAFF) {
  const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await sb.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInError) throw new Error(`${email}: sign-in failed (${signInError.message})`);
  const { data: list } = await sb.auth.mfa.listFactors();
  if (list.totp.length > 0) {
    if (!saved[email])
      throw new Error(
        `${email} already has a factor but no saved secret. Run: npx supabase db reset`,
      );
    console.log(`${email}: already enrolled`);
    continue;
  }
  for (const f of list.all.filter((x) => x.factor_type === 'totp'))
    await sb.auth.mfa.unenroll({ factorId: f.id });
  const { data, error } = await sb.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'HingaWeb',
    issuer: 'HingaWeb',
  });
  if (error) throw new Error(`${email}: enroll failed (${error.message})`);
  const { error: vErr } = await sb.auth.mfa.challengeAndVerify({
    factorId: data.id,
    code: totp(data.totp.secret),
  });
  if (vErr) throw new Error(`${email}: verify failed (${vErr.message})`);
  saved[email] = data.totp.secret;
  console.log(`${email}: enrolled`);
}
writeFileSync(OUT, JSON.stringify(saved, null, 2));
console.log(`Saved ${OUT}`);
```

**`playwright.config.js`**

```js
import { defineConfig, devices } from '@playwright/test';

// E2E runs against `vite preview` (production build) and the LOCAL Supabase stack.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

**`e2e/helpers/auth.js`**

```js
// Playwright helpers. LOCAL stack only (seed accounts from 00 Section 13.4).
import { readFileSync } from 'node:fs';
import { expect } from '@playwright/test';
import { totp } from '../../scripts/totp.js';

export const PASSWORD = 'LocalOnly-Pass-2026';

export function staffSecret(email) {
  const saved = JSON.parse(readFileSync('.dev-totp.json', 'utf8'));
  if (!saved[email])
    throw new Error(`No TOTP secret for ${email}. Run: node scripts/dev-enrol-totp.js`);
  return saved[email];
}

export async function studentLogin(page, email) {
  await page.goto('/login');
  await page.getByLabel('School email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
}

export async function staffLogin(page, email) {
  await page.goto('/staff/login');
  await page.getByLabel('Work email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/staff\/verify$/);
  await page.getByLabel('Security verification code').fill(totp(staffSecret(email)));
  await page.getByRole('button', { name: 'Verify' }).click();
}

/** Latest email sent to `to` through the local Mailpit (port 54324). Returns the first auth link. */
export async function latestAuthLink(to) {
  const base = 'http://127.0.0.1:54324/api/v1';
  for (let i = 0; i < 20; i += 1) {
    const res = await fetch(`${base}/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const body = await res.json();
    if (body.messages?.length) {
      const msg = await (await fetch(`${base}/message/${body.messages[0].ID}`)).json();
      const link = (msg.Text || msg.HTML).match(/https?:\/\/[^\s"<>]+\/auth\/v1\/verify[^\s"<>]+/);
      if (link) return link[0].replace(/&amp;/g, '&');
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No auth email found for ${to}`);
}
```

**`e2e/phase-02/student-auth.spec.js`**

```js
import { test, expect } from '@playwright/test';
import { studentLogin, latestAuthLink, PASSWORD } from '../helpers/auth.js';

test.describe('Phase 02 · student accounts', () => {
  test('a new student registers, confirms the email, and lands on the walkthrough (Fig 8, D-01)', async ({
    page,
  }) => {
    const email = `e2e.${Date.now()}@example.test`;
    await page.goto('/register');
    await page.getByLabel('Full name').fill('Test Student');
    await page.getByLabel('School email address').fill(email);
    await page.getByLabel('Grade level').selectOption('11');
    await page.getByLabel('Section').fill('STEM-A');
    await page.getByLabel('Class adviser').fill('Ms. Test Adviser');
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByLabel('Confirm password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();

    await page.goto(await latestAuthLink(email));
    await expect(page).toHaveURL(/\/auth\/confirmed/);
    await expect(page.getByRole('heading', { name: 'Your email is confirmed' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/\/welcome$/);
  });

  test('routes each seed student by consent state', async ({ page }) => {
    await studentLogin(page, 'student.full@example.test');
    await expect(page).toHaveURL(/\/check-in$/);
    await page
      .getByRole('button', { name: 'Account' })
      .or(page.getByRole('button', { name: 'Menu' }))
      .first()
      .click();
    await page
      .getByRole('menuitem', { name: 'Log out' })
      .or(page.getByRole('button', { name: 'Log out' }))
      .first()
      .click();
    await studentLogin(page, 'student.noparent@example.test');
    await expect(page).toHaveURL(/\/waiting-for-consent$/);
  });

  test('refuses staff credentials on the student page', async ({ page }) => {
    await studentLogin(page, 'guidance.one@example.test');
    await expect(
      page.getByText('This is the student log in. Staff sign in through the staff portal.'),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('shows a plain message for a wrong password', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('School email address').fill('student.full@example.test');
    await page.getByLabel('Password', { exact: true }).fill('wrong-password-123');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByText('That email and password do not match. Try again.')).toBeVisible();
  });

  test('a signed-out visitor cannot open student screens', async ({ page }) => {
    await page.goto('/check-in');
    await expect(page).toHaveURL(/\/login$/);
  });
});
```

**`e2e/phase-02/staff-auth.spec.js`**

```js
import { test, expect } from '@playwright/test';
import { staffLogin, PASSWORD } from '../helpers/auth.js';

test.describe('Phase 02 · staff portal (Figs 19-20, 22; 2.1.6.2.9)', () => {
  test('guidance signs in with the second factor and lands on the queue', async ({ page }) => {
    await staffLogin(page, 'guidance.one@example.test');
    await expect(page).toHaveURL(/\/staff\/queue$/);
  });

  test('administrator lands on accounts and cannot open the guidance queue', async ({ page }) => {
    await staffLogin(page, 'admin.one@example.test');
    await expect(page).toHaveURL(/\/admin\/accounts$/);
    await page.goto('/staff/queue');
    await expect(page).toHaveURL(/\/admin\/accounts$/);
  });

  test('staff without the second factor cannot reach staff screens', async ({ page }) => {
    await page.goto('/staff/login');
    await page.getByLabel('Work email address').fill('guidance.one@example.test');
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/\/staff\/verify$/);
    await page.goto('/staff/queue');
    await expect(page).toHaveURL(/\/staff\/verify$/);
  });

  test('student credentials are refused at the staff portal', async ({ page }) => {
    await page.goto('/staff/login');
    await page.getByLabel('Work email address').fill('student.full@example.test');
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(
      page.getByText('This account is not a staff account. Students log in on the student page.'),
    ).toBeVisible();
  });

  test('15 minutes without activity ends the session (Fig 22)', async ({ page }) => {
    await page.clock.install();
    await staffLogin(page, 'guidance.one@example.test');
    await expect(page).toHaveURL(/\/staff\/queue$/);
    await page.clock.fastForward('15:30');
    await expect(page.getByRole('heading', { name: 'Your session has ended' })).toBeVisible();
    await page.getByRole('button', { name: 'Sign in again' }).click();
    await expect(page).toHaveURL(/\/staff\/login$/);
  });
});
```

**`e2e/phase-02/a11y.spec.js`**

```js
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const path of ['/login', '/register', '/forgot-password', '/staff/login']) {
  test(`no WCAG 2.1 A/AA violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
```

Run them:

```bash
npx playwright install chromium          # once
npx supabase db reset                    # fresh seed (staff have no factor yet)
node scripts/dev-enrol-totp.js           # enrols TOTP for the two seed staff, writes .dev-totp.json
npm run test:e2e -- e2e/phase-02
```

Local emails (registration and password reset) appear in Mailpit at `http://127.0.0.1:54324`.

---

## 7. Must never (this phase)

1. Never show a raw Supabase error message, error code, or stack trace. Map it with `authErrorKey`.
2. Never reveal whether an email has an account (registration and forgot-password always show the same "check your email" result).
3. Never let a staff account use the student log in, or a student account use the staff portal.
4. Never let a staff member reach `/staff/*` or `/admin/*` below `aal2`.
5. Never store anything in browser storage except the staff last-activity time in `src/lib/storage.js`. Never put student text there.
6. Never keep staff screen content mounted after the 15-minute timeout; the overlay replaces it.
7. Never log the TOTP secret or QR code to the console. Never show the secret until "Show key" is pressed.
8. Never write UI text inside a component; always `t('key')`.
9. Never use a Tailwind default colour class (they do not exist: `--color-*: initial`), an inline colour, or a traffic-light word.
10. Never add social login, magic link, phone sign-in, or "remember me".
11. Never add a sign-up path for staff. Staff accounts come only from Phase 09.
12. Never add an email-domain restriction (D-37) unless the team supplies the domain.

---

## 8. Acceptance checklist

Record the result in the commit message `phase-02: acceptance passed (checks 1–16)`.

| # | Check | How to test | Pass when |
|---|---|---|---|
| 1 | Repository checks | `npm run verify` | lint 0 errors 0 warnings; `check:copy: OK`; `check:colours: OK`; 75 tests pass; build succeeds |
| 2 | Bundle budget (2.1.6.1.2) | `npm run build` | the main `index-*.js` gzip size is under 500 kB (about 175 kB when this plan was written) |
| 3 | Placeholders listed | `npm run check:placeholders` | `docs/placeholders.md` now also lists the `SITE` placeholders from `src/config/site.js` |
| 4 | TOTP tools | `node scripts/dev-enrol-totp.js` after `db reset` | prints "enrolled" twice and writes `.dev-totp.json` |
| 5 | End-to-end | `npm run test:e2e -- e2e/phase-02` | 28 tests pass (14 desktop, 14 mobile) |
| 6 | Registration copies the right metadata | register any new email, then Studio → `students` | the new row has the full name, grade, section, and adviser typed in |
| 7 | Email confirmation | open the link from Mailpit | `/auth/confirmed` → Continue → `/welcome` placeholder |
| 8 | Consent routing | log in as each seed student | full → `/check-in`; noassent → `/welcome`; noparent → `/waiting-for-consent`; withdrawn → `/waiting-for-consent` |
| 9 | Staff kept out of student log in | log in at `/login` as `guidance.one@example.test` | message + "Go to the staff portal" link; still signed out |
| 10 | Second factor enforced | sign in at `/staff/login`, then type `/staff/queue` in the address bar before verifying | stays on `/staff/verify` |
| 11 | First-time setup | `npx supabase db reset` (no factors), sign in at `/staff/login` as `guidance.one@example.test` | lands on `/staff/setup` step 2; scanning the QR with a phone authenticator and entering its code lands on `/staff/queue`. Afterwards run `npx supabase db reset && node scripts/dev-enrol-totp.js` to restore the E2E state |
| 12 | Roles separated | as administrator open `/staff/queue`; as guidance open `/admin/accounts` | each is sent to their own home |
| 13 | 15-minute timeout | E2E `staff-auth.spec.js` › "15 minutes…"; and manually: sign in, close the tab, wait 16 minutes, reopen `/staff/queue` | "Your session has ended", no student data behind it |
| 14 | Mobile layout | browser at 390 px wide on every Phase 02 screen | no horizontal scroll; "Menu" opens the nav; all buttons at least 44 px tall |
| 15 | Keyboard and focus | Tab through `/register` and `/staff/login` | every control reachable in order; a visible ink focus ring on each |
| 16 | 200 % text | browser zoom 200 % on `/login` and `/register` | nothing cut off or overlapping (2.1.6.3.4) |
