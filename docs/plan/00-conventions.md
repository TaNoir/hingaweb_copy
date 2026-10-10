# HingaWeb Implementation Plan — 00 · Conventions

> **Read this whole file before starting any phase.** Every phase file (01 to 10) assumes everything here. If a phase file and this file disagree, this file wins. If something you need is not written in this file or the phase file, **stop and write the question in `docs/questions.md`** — do not guess, do not invent.

Plan version: 1.3 (D-02 decided: no referral notes; D-34 to D-37 added with Phase 02) · Written 10 October 2026 · Source: final manuscript PDF (25 pages), dbdiagram code, prototype Figures 7–33.

---

## 0. How the AI IDE must work with these files

1. Do the phases in order: 00 → 01 → 02 → … → 10. Never start a phase until the previous phase's acceptance checklist passes completely.
2. Inside a phase, build in the order the phase file lists. Do not build ahead into a later phase.
3. Copy every piece of on-screen text **exactly** as written (including punctuation and capital letters). Never reword, shorten, or "improve" copy.
4. Never add a feature, field, column, screen, button, or message that is not written in the plan. "Nice to have" additions are forbidden.
5. Never remove or rename a placeholder (Section 11). Placeholders are filled by the team, not by you.
6. Never translate anything into Cebuano or Tagalog. Never write a hotline number, phone number, address, office hour, or crisis item. Use the placeholders.
7. When a rule in this file blocks what a phase seems to ask, the rule wins. Record the conflict in `docs/questions.md`.
8. After finishing each phase, run `npm run verify` (Section 13) and every step of the phase acceptance checklist, then commit.

---

## 1. Sources of truth and precedence

| Rank | Source | Notes |
|---|---|---|
| 1 | Manuscript text (requirements 2.1.3–2.1.6, Sections 1.2, 1.4, 2.2.2, 2.2.4–2.2.6, Tables 5–20) | Final. Wins over everything below. |
| 2 | dbdiagram code | Identical to Tables 8–20. Zone prefixes `STU_`, `XING_`, `STF_` are labels only and are **not** part of table names. |
| 3 | Figure captions (the text under each figure in the manuscript) | Manuscript text. |
| 4 | Prototype figure images (Figures 7–33) | Used for layout and copy **only where they do not contradict ranks 1–3**. |

Every disagreement found is listed in **Section 15 (Disagreement register)** with its ruling. Phases cite the register by ID (for example, "see D-10").

---

## 2. Fixed vocabulary

Use these names everywhere: database values, code constants, and labels. Do not invent synonyms.

### 2.1 Roles

| Code value | Who | Display label |
|---|---|---|
| `student` | Senior High School student, self-registered | Student |
| `guidance` | Guidance counselor or guidance associate (Section 1.2) | Guidance |
| `administrator` | Proponents during pilot; school representative later (2.1.5.3) | Administrator |

A user is a **student** if they have a row in `students`. A user is **staff** if they have a row in `staff_accounts` (role `guidance` or `administrator`). No user ever has both.

### 2.2 Student access tiers (2.1.5.1.2)

| Tier | What it gives | Gate |
|---|---|---|
| Tier 1 | Public guides, referral directory, 24/7 hotlines | None. No account, no personal data. |
| Tier 2 | Private check-ins, trends, ranked resources | Signed in **and** both a granted `parental` and a granted `assent` consent record that are not withdrawn (D-27). |
| Tier 3 | Sending a support request | Tier 2. |

### 2.3 Tables (exactly 13)

`students`, `checkins`, `prompt_events`, `resource_views`, `consent_records`, `crisis_events`, `support_requests`, `triage_decisions`, `crisis_items`, `office_tags`, `staff_access_audit`, `resources`, `staff_accounts`.
There is no `referral_notes` table (team decision, D-02).

All tables live in the `public` schema. Never add a prefix.

### 2.4 Check-in criteria and areas

| Column | Staff-facing label (Table 6) | Student-facing label (Figs 11–13, 32) | Resource attribute key |
|---|---|---|---|
| `c1` | Academic pressure | School work | `school_work` |
| `c2` | Family / financial / home concerns | Home and family | `home_family` |
| `c3` | Future / career transition concerns | Future | `future` |
| `c4` | Manageability / coping capacity | Managing | `managing` |

All four are stored on a 1–5 scale where **higher = more urgent** (2.2.2.1). See D-09 for how the C4 item is coded.

### 2.5 Check-in answer scale (Fig 11)

| Stored value | Button label |
|---|---|
| 1 | Not at all |
| 2 | A little |
| 3 | Somewhat |
| 4 | Quite a lot |
| 5 | Very much |

### 2.6 Mood and stress (Table 8, 2.1.5.1.4; see D-08)

| Column | Question | Stored 1 → 5 labels |
|---|---|---|
| `mood` | How has your mood been today? | 1 Very low · 2 Low · 3 Okay · 4 Good · 5 Very good |
| `stress` | How stressed have you felt today? | 1 Not at all · 2 A little · 3 Somewhat · 4 Quite a lot · 5 Very much |

Mood and stress are never used by SAW, never used by content-based filtering, and never copied to staff.

### 2.7 Workflow states (2.1.3.2, 2.1.5.2.1)

| Code value | Display label |
|---|---|
| `pending` | Pending |
| `reviewed` | Reviewed |
| `referred` | Referred |
| `resolved` | Resolved |

"Open request" means status is `pending`, `reviewed`, or `referred`.

### 2.8 Triage bands (Table 5, 2.1.6.2.6)

| Code value (`triage_decisions.band`) | Display label | Meaning shown to staff |
|---|---|---|
| `P1` | P1 | See first |
| `P2` | P2 | See within the standard response window |
| `P3` | P3 | See after P1 and P2, within three school days |
| `FR` | For Review | Counselor decides |

Crisis is **not** a band. It lives only in `crisis_events`.

### 2.9 Concern types (Table 9; see D-28)

| Code value | Student-facing label |
|---|---|
| `academic` | School work |
| `peer` | Friends and classmates |
| `family` | Home and family |
| `wellness` | Something else about how I'm doing |

### 2.10 Office tags (Table 13)

| Code value | Display label |
|---|---|
| `green` | Green |
| `yellow` | Yellow |
| `red` | Red |

These words may appear **only** in the files listed in Section 10.4.

### 2.11 Prompt event types and outcomes (Table 19)

`type`: `max_sev`, `gray_zone`. `outcome`: `dismissed`, `request_sent`.

### 2.12 Audit actions (Table 17; see D-05)

`staff_access_audit.action` uses only these values:

| Code value | Display label (Fig 33) | Needs |
|---|---|---|
| `view_request` | Opened support request | `request_id` |
| `state_change` | Changed status (to `pending`, `reviewed`, or `resolved`) | `request_id` |
| `referral` | Marked as referred (status changed to `referred`) | `request_id` |
| `tag` | Assigned office tag | `request_id` |
| `follow_up` | Set follow-up date | `request_id` |
| `view_crisis` | Opened crisis event | `crisis_event_id` |
| `crisis_acknowledged` | Acknowledged crisis event | `crisis_event_id` |
| `crisis_resolved` | Resolved crisis event | `crisis_event_id` |

---

## 3. Stack and exact versions

Install with `npm install --save-exact`. Commit `package-lock.json`. Never upgrade a version during the build. These versions were installed, built, linted, and tested together on 10 October 2026.

### 3.1 Runtime

| Item | Version | File |
|---|---|---|
| Node.js | 24.21.0 | `.nvmrc` contains `24.21.0`; `package.json` `"engines": { "node": ">=24.15.0 <25" }` |
| npm | the one bundled with Node 24.21.0 | — |
| Deno (Edge Functions) | major 2, set by Supabase CLI | `supabase/config.toml` `deno_version = 2` |
| Docker Desktop | any current version | needed only for `supabase start` (local database) |

### 3.2 `dependencies`

| Package | Version | Used for |
|---|---|---|
| react | 19.3.0 | UI |
| react-dom | 19.3.0 | UI |
| react-router | 7.18.4 | Routing (declarative mode: `BrowserRouter`, `Routes`, `Route`). Do not use v8. |
| @supabase/supabase-js | 2.117.3 | Database, Auth, Realtime |
| lucide-react | 1.54.0 | Icons |
| zod | 4.6.5 | Form and response validation |
| date-fns | 4.4.0 | Date formatting |
| @date-fns/tz | 1.5.0 | Asia/Manila time zone |
| @fontsource-variable/inter | 5.3.0 | Self-hosted Inter font |
| workbox-window | 7.4.1 | Service worker registration (offline hotlines) |

### 3.3 `devDependencies`

| Package | Version |
|---|---|
| vite | 8.3.4 |
| @vitejs/plugin-react | 6.1.2 |
| tailwindcss | 4.3.3 |
| @tailwindcss/vite | 4.3.3 |
| vite-plugin-pwa | 2.0.0 |
| vitest | 5.0.3 |
| jsdom | 30.1.2 |
| @testing-library/react | 16.3.3 |
| @testing-library/jest-dom | 7.0.1 |
| @testing-library/user-event | 14.6.7 |
| @playwright/test | 1.64.0 |
| @axe-core/playwright | 4.13.0 |
| eslint | 10.12.0 |
| @eslint/js | 10.0.1 |
| globals | 17.13.0 |
| eslint-plugin-react-hooks | 7.1.1 |
| eslint-plugin-react-refresh | 0.5.7 |
| prettier | 3.9.9 |
| supabase (CLI) | 2.120.0 |

### 3.4 Edge Function imports

Inside `supabase/functions/**`, import supabase-js only as `npm:@supabase/supabase-js@2.117.3`. No other third-party imports in Edge Functions.

### 3.5 Language

**JavaScript, not TypeScript** (manuscript Table 3). Files are `.js` and `.jsx`. Use JSDoc comments for types on exported functions. Use zod for runtime validation at every boundary (form input, Edge Function input, Edge Function output).

### 3.6 Not allowed

No chart library (trends are hand-drawn SVG, Phase 06). No UI kit (MUI, Chakra, shadcn, Headless UI). No state library (Redux, Zustand). No date library other than the two above. No analytics, tracking, error-reporting, or font CDN scripts of any kind. No Google Fonts link.

---

## 4. Repository layout

The repo root is `hingaweb/`. Phases add files only inside this layout. A phase file names every file it creates or changes.

```
hingaweb/
├─ .github/workflows/          # CI, keep-alive, backup (Phase 10)
├─ .nvmrc
├─ .env.example
├─ .prettierrc.json
├─ eslint.config.js
├─ index.html
├─ package.json
├─ package-lock.json
├─ vercel.json                 # Phase 10
├─ vite.config.js
├─ docs/
│  ├─ plan/                    # these 11 plan files, unchanged
│  ├─ questions.md             # AI IDE writes open questions here
│  └─ placeholders.md          # generated by scripts/check-placeholders.js
├─ e2e/                        # Playwright specs, one folder per phase
├─ public/
│  └─ favicon.svg
├─ scripts/
│  ├─ check-placeholders.js    # Section 11
│  ├─ check-copy.js            # Section 10.3
│  ├─ check-colour-words.js    # Section 10.4
│  └─ ahp.js                   # Phase 07
├─ src/
│  ├─ main.jsx
│  ├─ App.jsx
│  ├─ routes.jsx               # the route table in Section 7
│  ├─ index.css                # Tailwind + design tokens (Section 8)
│  ├─ config/
│  │  ├─ site.js               # school name, time zone, hours, holidays
│  │  ├─ checkin-items.js      # item text and coding (Phase 05)
│  │  └─ vocabulary.js         # every table in Section 2 as frozen objects
│  ├─ content/
│  │  └─ directory.js          # hotlines and referral targets (static, D-03)
│  ├─ copy/
│  │  ├─ en.js                 # all English UI text, by key
│  │  ├─ ceb.js                # Cebuano: assent + crisis keys only, placeholders
│  │  ├─ tl.js                 # Tagalog: assent + crisis keys only, placeholders
│  │  ├─ allowlist.js          # exact sentences exempt from Section 10.3
│  │  └─ index.js              # t(key, lang) helper
│  ├─ lib/
│  │  ├─ supabase.js           # the single Supabase client
│  │  ├─ auth/                 # AuthProvider, useAuth, idle timer (Phase 02)
│  │  ├─ time.js               # Manila time, school days (Phase 07/08)
│  │  └─ format.js             # date and reference formatting
│  ├─ components/
│  │  ├─ ui/                   # primitives (Section 8.6)
│  │  └─ layout/               # PublicLayout, StudentLayout, StaffLayout, AdminLayout
│  ├─ features/
│  │  ├─ public/               # Phase 03
│  │  ├─ auth/                 # Phase 02
│  │  ├─ assent/               # Phase 04
│  │  ├─ checkin/              # Phase 05
│  │  ├─ crisis/               # Phase 05
│  │  ├─ trends/               # Phase 06
│  │  ├─ resources/            # Phase 06
│  │  ├─ requests/             # Phase 07
│  │  ├─ guidance/             # Phase 08
│  │  └─ admin/                # Phase 09
│  └─ test/
│     └─ setupTests.js
└─ supabase/
   ├─ config.toml
   ├─ seed.sql                 # local development only, fictional people
   ├─ migrations/              # Phase 01 onward; never edit a migration after commit
   ├─ tests/                   # pgTAP RLS tests (*.test.sql)
   └─ functions/
      ├─ _shared/
      │  ├─ scoring-config.js  # THE ONE scoring config file (Section 6.1)
      │  ├─ saw.js             # Equation 1 + guardrails + gray zone (Phase 07)
      │  ├─ cbf.js             # Equation 2 (Phase 06)
      │  ├─ clients.js         # makeUserClient / makeServiceClient
      │  └─ http.js            # CORS + JSON response helpers
      ├─ evaluate-checkin/index.js        # Phase 05
      ├─ rank-resources/index.js          # Phase 06
      ├─ submit-support-request/index.js  # Phase 07
      ├─ notify-crisis/index.js           # Phase 05
      └─ admin-accounts/index.js          # Phase 09
```

Every Edge Function sets `entrypoint = "./functions/<name>/index.js"` in `supabase/config.toml`.

---

## 5. Where code runs (architecture rules)

The manuscript makes row-level security the **single enforcement point** for privacy (2.2.6). The UI never enforces privacy on its own; it only reflects what RLS allows.

### 5.1 Three ways to touch data

| Way | When | Key used |
|---|---|---|
| Browser → Supabase directly (supabase-js) | Plain reads and writes that RLS fully governs | Publishable (anon) key + the user's session |
| Browser → Edge Function | Anything that runs an algorithm or needs a privileged write | User's session JWT, forwarded |
| Database trigger / SQL function | Copying `disclosed` data, filling server timestamps, blocking forged fields | Runs inside Postgres |

### 5.2 Edge Function pattern

Every Edge Function:
1. Reads the caller's JWT from the `Authorization` header. Rejects with 401 if missing.
2. Creates a **user client** with that JWT (`_shared/clients.js → makeUserClient`). **All reads use the user client**, so RLS decides what the function can see. This satisfies "both algorithm modules … read only data their role can already access" (2.2.6).
3. Uses the **service client** (`makeServiceClient`) only for the specific writes the phase file names. Never for reads of student data.
4. Validates input and output with zod.
5. Returns JSON only. Never returns a SAW score, band, or similarity number to a student caller.

### 5.3 What never goes through the browser

- `SUPABASE_SERVICE_ROLE_KEY` (or secret key) exists only in Edge Function secrets. Never in any `VITE_` variable, never in `src/`.
- The `disclosed` copies in `support_requests` and `crisis_events` are built **inside the database** from `students` and `checkins`, never from values the browser sends (Phase 01, Phase 05, Phase 07).
- SAW and cosine similarity are never computed in the browser. `src/` never imports anything from `supabase/functions/`.

---

## 6. Configuration files

### 6.1 `supabase/functions/_shared/scoring-config.js` — the only place scoring numbers live

All values from 2.2.2 are **placeholders** until the scoring session. They are written once here and imported everywhere else (`saw.js`, tests, `scripts/ahp.js`). No other file may contain a weight, threshold, or gray-zone number.

```js
// supabase/functions/_shared/scoring-config.js
// PROVISIONAL VALUES — manuscript 2.2.2.2 and 2.2.2.3 worked examples.
// Replace after the scoring session with the two raters. Then set PROVISIONAL = false.
export const PROVISIONAL = true;

export const SCORING_SOURCE =
  'Manuscript 2.2.2.2 illustrative AHP weights and 2.2.2.3 provisional thresholds';

// Criterion weights, order c1..c4. Must sum to 1 (tolerance 0.0005).
export const WEIGHTS = Object.freeze({ c1: 0.2616, c2: 0.4531, c3: 0.1182, c4: 0.1671 });

// Band thresholds on S (2.2.2.3 worked exhibit):
//   S < P2_MIN            -> P3
//   P2_MIN <= S < P1_MIN  -> P2
//   S >= P1_MIN           -> P1
export const THRESHOLDS = Object.freeze({ P2_MIN: 2.25, P1_MIN: 3.5 });

// Half-width of the gray zone around each threshold. The manuscript gives no value
// ("provisional width, pending the 625-profile enumeration"). 0.10 is a proponent placeholder.
// A score S is in the gray zone when |S - P2_MIN| < GRAY_ZONE_HALF_WIDTH
// or |S - P1_MIN| < GRAY_ZONE_HALF_WIDTH. Set to 0 to disable.
export const GRAY_ZONE_HALF_WIDTH = 0.10;

// Guardrail floors (2.2.2.3). Both floors stop at P2.
export const GUARDRAILS = Object.freeze({
  anySingleAtMax: { enabled: true, anchor: 5, floor: 'P2' },          // rule (a)
  twoOrMoreHigh: { enabled: true, minAnchor: 4, minCount: 2, floor: 'P2' }, // rule (b)
  c4MaxFloorP1: { enabled: false },  // pending rater decision (2.2.2.3); stays false until decided
});

// Student-mediated prompt (2.1.5.1.7). "Maximum-severity" is not defined numerically in the
// manuscript; placeholder rule: any of c1..c4 equals 5.
export const MAX_SEV_RULE = Object.freeze({ anyCriterionEquals: 5 });
```

`npm run build:pilot` fails while `PROVISIONAL === true` (Section 11.3).

### 6.2 `src/config/site.js`

```js
export const SITE = Object.freeze({
  appName: 'HingaWeb',
  tagline: 'SENIOR HIGH GUIDANCE',
  schoolName: 'Rizal Memorial Colleges, Inc.',
  footerLine: 'Rizal Memorial Colleges, Inc. senior high school guidance office.',
  timeZone: 'Asia/Manila',
  schoolDays: [1, 2, 3, 4, 5],               // Monday..Friday (ISO weekday)
  officeOpens: '[[GUIDANCE:office_opens_hhmm]]',   // e.g. 08:00, from the guidance office
  officeCloses: '[[GUIDANCE:office_closes_hhmm]]',
  holidays: ['[[GUIDANCE:holiday_dates_iso]]'],    // list of YYYY-MM-DD the office is closed
  officeLocation: '[[GUIDANCE:office_room_and_building]]',
  officeHoursText: '[[GUIDANCE:office_hours_text]]',
  staffSupportContact: '[[SCHOOL:it_contact_for_lost_authenticator]]',
});
```

### 6.3 `src/config/checkin-items.js` (filled in Phase 05)

Holds the four criterion item texts, the mood and stress items, and a `reverseCoded` flag per item. It also exports `CHECKIN_ITEMS_STATUS = 'provisional'` because 2.1.5.1.3 says items are co-designed with the validator panel before the form is final. `npm run build:pilot` fails while it is `'provisional'`.

### 6.4 `src/content/directory.js` (filled in Phase 03; see D-03)

Static content for the referral directory and hotlines, served from the bundle and the service-worker cache so it works with no backend (2.1.6.4.6). Every number, name, address, and hour in it is a `[[GUIDANCE:…]]` placeholder. The four referral targets are fixed by 1.4: the RMC guidance office, IPBM, external mental health professionals, and crisis hotlines.

### 6.5 Environment variables

`.env.example` (committed) lists only:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Edge Function secrets (set with `supabase secrets set`, never committed): `SMS_GATEWAY_URL`, `SMS_GATEWAY_TOKEN`, `ONCALL_CONTACT_NUMBER` (Phase 05; all optional until Capstone 2 gateway exists). `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically by the Edge runtime.

---

## 7. Route table (all phases follow this)

| Path | Screen | Who can open | Figure / requirement | Phase |
|---|---|---|---|---|
| `/` | Public landing | Everyone | Fig 7 | 03 |
| `/guides` | Public guide list (unranked) | Everyone | Fig 7 "Read something helpful", Tier 1 | 03 |
| `/help` | Where to get help (directory + hotlines) | Everyone | Fig 14, 2.1.5.1.8 | 03 |
| `/register` | Create account | Signed-out only | Fig 8, 2.1.5.1.1 | 02 |
| `/login` | Student log in | Signed-out only | Fig 9 | 02 |
| `/forgot-password` | Request reset link | Signed-out only | Fig 9 link | 02 |
| `/reset-password` | Set new password from email link | Holder of reset link | — | 02 |
| `/auth/confirmed` | Email confirmed notice | Everyone | — | 02 |
| `/welcome` | Layered assent walkthrough | Student without assent | Fig 10, 2.1.5.1.1 | 04 |
| `/waiting-for-consent` | Parental consent not yet recorded | Student with assent, no parental consent | 2.1.6.2.3 | 04 |
| `/check-in` | Private check-in (+ prompt dialog Fig 15) | Tier 2 student | Fig 11, Fig 15 | 05 |
| `/crisis` | Crisis screen | Any signed-in student (reached by item selection) | Fig 18 | 05 |
| `/trends` | Mood and stress over time | Tier 2 student | Fig 12 | 06 |
| `/resources` | Ranked resources | Tier 2 student | Fig 13 | 06 |
| `/request` | Ask the guidance office (+ failure state Fig 17) | Tier 3 student | Fig 16, Fig 17 | 07 |
| `/request/sent` | Request sent confirmation | Tier 3 student | 2.1.6.4.7 | 07 |
| `/staff/login` | Staff sign in (guidance and administrator) | Signed-out | Fig 19 | 02 |
| `/staff/verify` | TOTP code | Staff at aal1 | Fig 20 | 02 |
| `/staff/setup` | First sign-in: set password + enrol authenticator | Invited staff | Fig 28 note | 02 |
| `/staff/queue` | Support requests | Guidance at aal2 | Fig 21 | 08 |
| `/staff/requests/:id` | Request detail | Guidance at aal2 | Fig 23 | 08 |
| `/staff/requests/:id/tag` | Assign office tag | Guidance at aal2 | Fig 25 | 08 |
| `/staff/crisis` | Crisis channel | Guidance at aal2 | Fig 24 | 08 |
| `/staff/referrals` | Partner directory (no notes, D-02) | Guidance at aal2 | Fig 26 directory panel, 2.1.5.2.4 | 08 |
| `/admin/accounts` | Accounts and roles (+ create dialog Fig 28) | Administrator at aal2 | Figs 27–28 | 09 |
| `/admin/consent` | Consent register | Administrator at aal2 | Fig 29 | 09 |
| `/admin/reference` | Crisis item set | Administrator at aal2 | Fig 30 | 09 |
| `/admin/resources` | Resource library | Administrator at aal2 | Fig 31 | 09 |
| `/admin/resources/new` and `/admin/resources/:id` | Edit resource | Administrator at aal2 | Fig 32 | 09 |
| `/admin/audit` | Audit trail | Administrator at aal2 | Fig 33 | 09 |
| `*` | Not found | Everyone | — | 02 |

The session timeout overlay (Fig 22) is a component on every `/staff/*` and `/admin/*` screen, not a route.

"About Guidance" (Figs 7–8 nav) is not built. The manuscript defines no content for it (D-21).

---

## 8. Visual design system

The figures show one look: soft pink canvas, white cards, near-black primary buttons with pink text, Inter. Build exactly this and nothing else.

### 8.1 Tailwind setup

`src/index.css` starts with:

```css
@import "tailwindcss";
@import "@fontsource-variable/inter";

@theme {
  --color-*: initial;            /* removes Tailwind's default palette (no red-500, green-600, etc.) */
  --color-canvas: #FFF1F4;       /* page background (pink) */
  --color-canvas-alt: #F8F6F4;   /* footer band, public landing background */
  --color-surface: #FFFFFF;      /* cards */
  --color-surface-muted: #F5F2F2;/* inner grey panels (Fig 10, Fig 23) */
  --color-blush: #FDE4EA;        /* chips, soft badges, info panels */
  --color-blush-strong: #F9CCD7; /* step badges, selected chips */
  --color-line: #F0DCE1;         /* borders, dividers */
  --color-ink: #1E1E1E;          /* main text */
  --color-ink-muted: #5C5C5C;    /* secondary text (6.1:1 on canvas) */
  --color-action: #2A2A2A;       /* primary button background */
  --color-action-ink: #F6B3C4;   /* primary button text (8.3:1 on action) */
  --color-white: #FFFFFF;
  --color-transparent: transparent;
  --font-sans: "Inter Variable", system-ui, -apple-system, "Segoe UI", sans-serif;
  --radius-card: 16px;
  --radius-control: 12px;
}
```

Office tag swatches are defined in Phase 08 in a separate file (`src/features/guidance/office-tag.css`) and nowhere else.

### 8.2 Typography

| Use | Size / line height | Weight |
|---|---|---|
| Page title (h1) | 28/36 on mobile, 32/40 from `md` | 600 |
| Section title (h2) | 20/28 | 600 |
| Card title (h3) | 17/24 | 600 |
| Body | 16/24 | 400 |
| Small | 14/20 | 400 |
| Caption | 13/18 (never smaller) | 400 |

### 8.3 Spacing, shape, and layout

- Page max width: 768px for student and public reading pages, 1200px for staff and admin tables.
- Page side padding: 16px on mobile, 24px from `md`.
- Cards: `bg-surface rounded-card border border-line p-5 md:p-6`, shadow `0 1px 2px rgb(0 0 0 / 0.04)`.
- Buttons and inputs: `rounded-control`, minimum height 44px, minimum width 44px (2.1.6.3.4).
- Chips: `rounded-full bg-blush px-3 py-1 text-[13px]`.
- Mobile first. Breakpoints are Tailwind's defaults (`sm` 640, `md` 768, `lg` 1024).

### 8.4 Focus and motion

- Every interactive element shows a visible focus ring: `outline: 2px solid var(--color-ink); outline-offset: 2px`.
- Respect `prefers-reduced-motion`: no transitions longer than 150ms, none when reduced motion is on.

### 8.5 Header and footer per role

| Layout | Header contents (left → right) | Mobile (< 768px) |
|---|---|---|
| `PublicLayout` | Logo · "Guides" · "Where to get help" · "Log in" (outline button) · "Create account" (primary button) | Logo + "Menu" button opening a sheet with the same items |
| `StudentLayout` | Logo · "Home" · "Check-in" · "My Trends" · "Resources" · "Where to get help" · account button (menu: "Log out") | Logo + "Menu" sheet |
| `StaffLayout` | Logo · "Queue" · "Crisis" (with count badge when active events exist) · "Referrals" · display name · account button (menu: "Sign out") | Logo + "Menu" sheet |
| `AdminLayout` | Logo · chip "ADMIN CONSOLE" · "Accounts" · "Consent" · "Reference data" · "Resources" · "Audit" · display name · account button (menu: "Sign out") | Logo + "Menu" sheet |

Logo: the text "**Hinga**Web" (Hinga 600 weight, Web 400) with the caption "SENIOR HIGH GUIDANCE" below in 10px letter-spaced caps, and a small rounded blush square icon containing the lucide `Waves` icon. The logo links to `/` (public, student), `/staff/queue` (guidance), `/admin/accounts` (administrator).

Footer on every page: `SITE.footerLine` ("Rizal Memorial Colleges, Inc. senior high school guidance office."), centered, caption size, `text-ink-muted`.

The current nav item has `aria-current="page"` and the dark pill style from the figures (`bg-action text-action-ink rounded-full px-4`).

### 8.6 UI primitives (built in Phase 02, used by all later phases)

All in `src/components/ui/`. Each primitive has a test in the same folder.

| Component | Props | Notes |
|---|---|---|
| `Button` | `variant: 'primary' \| 'outline' \| 'ghost'`, `size: 'md' \| 'lg'`, `loading`, `disabled`, `type`, `onClick`, `children`, `iconLeft`, `iconRight` | `loading` shows a spinner and sets `aria-busy`; disabled while loading |
| `LinkButton` | same look as `Button`, `to` | wraps react-router `Link` |
| `Card` | `as`, `className`, `children` | |
| `Chip` | `children`, `tone: 'blush' \| 'strong' \| 'ink'` | |
| `Field` | `id`, `label`, `hint`, `error`, `children` | links `aria-describedby` to hint and error |
| `TextInput` | standard input props + `invalid` | |
| `PasswordInput` | as `TextInput` + show/hide toggle button labelled "Show password" / "Hide password" | |
| `Textarea` | standard props + `maxLength` | shows nothing about analysis |
| `Select` | `options: {value,label}[]`, `placeholder` | native `<select>` |
| `Checkbox` | `id`, `label`, `checked`, `onChange` | 44px hit area |
| `ScaleButtons` | `name`, `legend`, `options: {value,label}[]`, `value`, `onChange` | radio group (`role="radiogroup"`), arrow-key navigation |
| `SegmentedControl` | `options`, `value`, `onChange`, `label` | radio group |
| `Dialog` | `open`, `onClose`, `title`, `children`, `dismissible` | focus trap, `aria-modal`, returns focus to opener |
| `Banner` | `tone: 'info' \| 'attention'`, `title`, `children`, `action` | attention = dark border + ink, never a traffic-light colour |
| `PageHeader` | `eyebrow` (chip text), `title`, `lead` | |
| `EmptyState` | `title`, `body`, `action` | |
| `ErrorState` | `title`, `body`, `onRetry` | default copy in Section 9 |
| `Skeleton` | `lines` | for loading |
| `OfflineBanner` | — | listens to `online`/`offline` events |
| `Table` | `columns`, `rows`, `caption`, `getRowKey` | real `<table>` with `<caption class="sr-only">`; on mobile each row becomes a stacked card |

---

## 9. Screen states (applies to every screen)

Every screen that loads data must implement these states. Phase files give screen-specific copy; when a phase gives none, use these defaults (keys in `src/copy/en.js` under `common.*`).

| State | What shows | Default copy |
|---|---|---|
| Loading | `Skeleton` in the shape of the content; screen reader text | `common.loading` = "Loading…" |
| Empty | `EmptyState` | Always screen-specific (phase file gives it) |
| Error | `ErrorState` with a "Try again" button that re-runs the load | `common.error.title` = "Something went wrong." · `common.error.body` = "This page could not load. Your information has not changed." · `common.error.retry` = "Try again" |
| Offline | `OfflineBanner` at the top of the page; data already on screen stays | `common.offline` = "You're offline. Hotlines and crisis information still work. Everything else will load when you're back online." |
| Success after a write | Only after the database confirms the write (2.1.6.4.7) | Screen-specific |
| Session expired (staff) | Fig 22 overlay | Phase 02 |
| Not allowed | Redirect, never a blank page | Phase 02 |

Rules:
- Never show a success message before the write is confirmed.
- Never show an error that blames the student.
- Never show a raw error message, stack trace, table name, or HTTP code on screen. Log it to `console.error` in development only.

---

## 10. Copy rules

### 10.1 Where copy lives

All visible text lives in `src/copy/en.js` as a nested object of keys. Components call `t('checkin.title')`. No visible English string literal in JSX except punctuation and the brand name "HingaWeb". This makes Sections 10.3 and 10.4 checkable.

### 10.2 Languages

- Every screen is English.
- The assent walkthrough (Phase 04) and the crisis screen (Phase 05) also offer Cebuano and Tagalog (2.1.6.3.1). The switch labels are "English", "Bisaya", "Tagalog" (Fig 10; D-31).
- `src/copy/ceb.js` and `src/copy/tl.js` contain **only** the assent and crisis keys, and every value is a placeholder such as `'[[TEAM:CEB:assent.card1.title]]'`. The team writes these; the AI IDE must never write Cebuano or Tagalog words.
- If a Cebuano or Tagalog value is still a placeholder, the screen shows the placeholder text as-is in development. In `build:pilot` this fails the build (Section 11.3).

### 10.3 No diagnostic or clinical language (1.4, 2.1.5.3.4)

`scripts/check-copy.js` scans `src/copy/en.js` and fails if any value contains these words (case-insensitive, whole word or prefix as shown), unless the full sentence is in `src/copy/allowlist.js`:

- Student-facing keys (everything except `staff.*` and `admin.*`): `diagnos*`, `disorder`, `depress*`, `anxiety`, `anxious`, `symptom*`, `patient`, `clinical`, `clinician`, `therapy`, `treatment`, `screening`, `assessment`, `risk`, `severity`, `score`, `priority`, `triage`, `P1`, `P2`, `P3`, `For Review`, `label`, `flag*`.
- Staff and admin keys: `diagnos*`, `disorder`, `depress*`, `anxiety`, `symptom*`, `patient`, `risk score`, `risk level`, `at-risk`, `screening`, `severity`.

Allowlisted sentences (exactly these, added in the phase that uses them):
1. "It is not a diagnosis and it is not a replacement for talking to someone." (Phase 03, Fig 7)
2. "Priorities are computed from the student's submitted request. They indicate how soon a request should be seen. They are not an assessment of the student and carry no clinical meaning." (Phase 08, Fig 21)
3. "Raised when a student selects an explicit high-risk item on their check-in. These events are never given a priority number and never queue behind ordinary requests." (Phase 08, Fig 24)

### 10.4 No traffic-light colours for system output (2.1.6.2.6)

`scripts/check-colour-words.js` scans `src/**`, `supabase/functions/**`, and `supabase/migrations/**` for the whole words `green`, `yellow`, `red`, `amber`, `emerald`, `lime`, `crimson`, `scarlet` (case-insensitive) and fails on any match outside these files:

- `supabase/migrations/*_office_tags*.sql` (the CHECK constraint)
- `src/config/vocabulary.js` and `src/copy/en.js`, but **only between** the marker comments `// office-tags:start` and `// office-tags:end` (wrap the `OFFICE_TAGS` object and the `staff.officeTag` copy in these markers)
- `src/features/guidance/OfficeTag*.jsx` and `src/features/guidance/office-tag.css`
- the three check scripts themselves and `docs/**`

Band badges (P1, P2, P3, For Review) use only `bg-blush`, `bg-blush-strong`, `bg-action`, and ink text. Crisis UI uses ink and the dark border (Figs 21, 24), never a red tone.

### 10.5 Tone

Plain, calm, second person for students ("you"). Short sentences. No exclamation marks. No emojis. No "we've detected", "we noticed", "your results", "you seem". Never tell a student how they are doing; only show what they entered.

---

## 11. Placeholders

### 11.1 Format

`[[OWNER:KEY]]` where OWNER is one of:

| OWNER | Who fills it | Examples |
|---|---|---|
| `GUIDANCE` | RMC guidance office (Ma'am Mariz) | hotline numbers, office hours, location, crisis items, crisis protocol steps, holidays |
| `TEAM` | HingaWeb proponents | Cebuano and Tagalog text |
| `SCHOOL` | RMC administration | IT contact, designated data-protection person |

Regex: `\[\[(GUIDANCE|TEAM|SCHOOL):[A-Za-z0-9_.:\-]+\]\]` (the key may contain colons, as in `[[TEAM:CEB:assent.card1.title]]`).

Scoring numbers are not text placeholders; they are governed by `PROVISIONAL` in Section 6.1. Check-in item wording is governed by `CHECKIN_ITEMS_STATUS` in Section 6.3.

### 11.2 Rules

- A placeholder is rendered on screen exactly as written. Never hide it, style it away, or replace it with "TBD", "N/A", an example number, or a guess.
- Never put an example value in a comment next to a placeholder that someone could copy (no "// e.g. 1553").
- Crisis item labels live in the `crisis_items` table, not in code. Local `seed.sql` seeds them as `[[GUIDANCE:crisis_item_1]]`, `[[GUIDANCE:crisis_item_2]]`, `[[GUIDANCE:crisis_item_3]]`.

### 11.3 Scripts

- `npm run check:placeholders` lists every placeholder in `src/` and `supabase/seed.sql` into `docs/placeholders.md` (file, line, owner, key). Always exits 0.
- `npm run build:pilot` runs `check:placeholders --strict`, which exits 1 if any placeholder remains in `src/`, if `PROVISIONAL === true`, or if `CHECKIN_ITEMS_STATUS !== 'final'`; then runs `vite build`.
- `npm run build` (development and preview deployments) never fails on placeholders.

---

## 12. Global "must never" list

These apply in every phase. Each phase adds its own list on top.

1. Staff never see a student's check-ins, mood, stress, check-in notes, prompt events, resource views, consent records, or `students` row. Staff see student identity only through `support_requests.disclosed` (name, grade, section, adviser, c1–c4) and `crisis_events.disclosed` (name, grade, section, adviser).
2. Never send a support request without the student first seeing exactly what will be shared and ticking the acknowledgement (2.1.5.1.6).
3. Never make the crisis screen wait for the server. Hotlines render from the bundle on selection (2.1.6.1.6).
4. Never show a score, priority, band, similarity number, or any computed value to a student.
5. Never compute, suggest, pre-select, default, or infer an office tag. Only a staff click writes `office_tags`.
6. Never analyse free text: no keyword search, no sentiment, no length checks that trigger anything, no AI calls, no logging of note contents (2.1.6.2.7).
7. Never surface a prompt event or a dismissal to staff in any form: no list, count, badge, chart, or export (Table 19).
8. No peer-to-peer features: no messaging, comments, likes, shared feeds, leaderboards, or "students like you".
9. No diagnostic or clinical language (Section 10.3).
10. Never put a scoring number anywhere except `scoring-config.js`.
11. Never translate into Cebuano or Tagalog. Never write a hotline number, crisis item, protocol step, office hour, or address.
12. Never build a list, count, or view of students who have not sent a support request (2.1.5.3.4).
13. No analytics, tracking pixels, third-party scripts, or external font or icon CDNs.
14. Never store a check-in note, request note, or any student text in `localStorage`, `sessionStorage`, IndexedDB, or the service-worker cache (D-23).
15. Never use the service role key in the browser.
16. Never show a success state before the database confirms the write.
17. Never use red, yellow, green, or equivalent colours for any system output (Section 10.4).
18. Never add a table, column, enum value, or route that this plan does not list.

---

## 13. Commands, testing, and how acceptance is checked

### 13.1 `package.json` scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:pilot": "node scripts/check-placeholders.js --strict && vite build",
    "preview": "vite preview --port 4173",
    "lint": "eslint .",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:db": "supabase test db",
    "test:e2e": "playwright test",
    "check:placeholders": "node scripts/check-placeholders.js",
    "check:copy": "node scripts/check-copy.js",
    "check:colours": "node scripts/check-colour-words.js",
    "verify": "npm run lint && npm run check:copy && npm run check:colours && npm run test && npm run build"
  }
}
```

### 13.2 Test layers

| Layer | Tool | Location | Runs against |
|---|---|---|---|
| Unit (pure logic: SAW, CBF, time, format, vocabulary) | Vitest | next to the file, `*.test.js` | Node |
| Component | Vitest + Testing Library + jsdom | next to the component, `*.test.jsx` | jsdom |
| Row-level security | pgTAP via `supabase test db` | `supabase/tests/*.test.sql` | local Supabase (Docker) |
| End to end + accessibility | Playwright + axe | `e2e/phase-NN/*.spec.js` | `vite preview` + local Supabase |

`vite.config.js` sets `test: { environment: 'jsdom', setupFiles: ['./src/test/setupTests.js'] }`. `src/test/setupTests.js` imports `@testing-library/jest-dom/vitest` and runs Testing Library's `cleanup()` after each test (Phase 02).

### 13.3 Local stack

1. `nvm use` (reads `.nvmrc`).
2. `npm ci`.
3. `npx supabase start` (needs Docker), then `npx supabase db reset` (applies migrations and `seed.sql`).
4. Copy the local URL and publishable key printed by `supabase start` into `.env.local`.
5. `npm run dev`.

### 13.4 Seed users (local only)

`supabase/seed.sql` creates fictional accounts with password `LocalOnly-Pass-2026` (local only, never in a hosted project):

| Email | Role | State |
|---|---|---|
| `student.full@example.test` | student | parental + assent granted |
| `student.noassent@example.test` | student | nothing recorded |
| `student.noparent@example.test` | student | assent granted, parental not recorded |
| `student.withdrawn@example.test` | student | both granted, parental withdrawn |
| `guidance.one@example.test` | guidance | active, TOTP enrolled with a fixed test secret given in Phase 02 |
| `admin.one@example.test` | administrator | active, TOTP enrolled with a fixed test secret given in Phase 02 |

Names use fictional people only. Never seed into a hosted (pilot) project.

### 13.5 How an acceptance checklist is run

Each phase ends with numbered checks. Each check says **how** to test it: a command, a Playwright spec name, a pgTAP file, or manual steps. A phase passes only when every check passes. Record the result in the commit message: `phase-NN: acceptance passed (checks 1–N)`.

### 13.6 Git

One branch per phase: `phase-01-database`, `phase-02-shell-auth`, and so on. Merge to `main` only after acceptance passes. Never commit `.env.local`, secrets, or real student data.

---

## 14. Hosted project settings (set by Jared in the dashboard; checked in Phase 02 and Phase 10)

| Setting | Value | Why |
|---|---|---|
| Supabase region | Southeast Asia (Singapore) | Nearest region to Davao; latency for 2.1.6.1 |
| Supabase plan | Free | 2.1.7.2 |
| Auth → Email → Confirm email | On | Students register with a school email |
| Auth → Minimum password length | 12 | 2.1.6.2.9; one global setting (D-22) |
| Auth → MFA → TOTP | Enabled (free on all plans) | 2.1.6.2.9 |
| Auth → JWT expiry | 3600 seconds (default) | Inactivity timeout is enforced in the app (Phase 02), because Supabase's server-side inactivity timeout is Pro-only |
| Vercel plan | Hobby | 2.1.7.2 |
| Vercel Node version | 24.x | Section 3.1 |

---

## 15. Disagreement register

Format: **What the manuscript says** · **What the figure or other source shows** · **Ruling** · **Phases affected**. "Manuscript fix" means the team should also correct the manuscript so the paper and the build match.

### Manuscript-internal contradictions (need the team's attention)

**D-01 · Registration fields.** Fig 8 caption: registration collects "only the name, school email address, grade level, and password." Table 18: `section` and `class_adviser` are "entered at registration"; 2.1.3.7 needs section and adviser on the request list. · **Ruling:** registration also collects Section and Class adviser (Table 18 and 2.1.3.7 win). · **Manuscript fix:** Fig 8 caption. · Phase 02.

**D-02 · No table for referral notes. — Team decision (10 Oct 2026): do not add a table.** 2.1.3.9, 2.1.5.2.4, and Fig 26 require staff to record referral notes ("append-only", with a "Referred to" destination). None of the 13 tables can hold them. · **Ruling:** referral notes are not built. Staff mark a request as referred by changing its status to `referred` (audited as `referral`), and open the partner directory (static, D-03). Fig 26 is built as the directory panel only, with no note form and no "Previous notes" list. · **Consequence:** the "record referral notes" half of 2.1.3.9 and 2.1.5.2.4 is not met. · **Manuscript fix:** remove referral notes from 2.1.3.9, 2.1.5.2.4, 2.1.5.2.7 ("or referral note"), and the Fig 26 caption. · Phases 01, 08.

**D-03 · No table for the referral directory and hotlines.** 2.1.5.3.2 says the administrator maintains "the referral directory and crisis hotline entries"; no table exists for them. 2.1.6.4.6 says hotlines are "served from static, cached content." · **Ruling:** directory and hotlines are a static content file (`src/content/directory.js`), changed by the administrator (the proponents during the pilot) through a reviewed code change. No admin screen for them. · **Manuscript fix:** 2.1.5.3.2 wording. · Phases 03, 08, 09.

**D-04 · Audit trail cannot hold admin actions.** Table 17 requires `request_id` or `crisis_event_id` on every row (CHECK). But Section 1.2 ("every staff-facing action audit-logged"), Fig 27 ("Every role change and deactivation is written to the audit trail"), Fig 28 ("Account creation is written to the audit trail"), Fig 32 ("The change is written to the audit trail"), and Fig 33 (rows for sign-in, role change, resource publish, consent withdrawal, crisis-set publish) all claim admin actions are audited. · **Ruling:** Table 17 wins; it matches 2.1.6.2.8's scope (staff access to requests and crisis events). Admin screens do not claim auditing. Fig 33 shows only request and crisis actions. · **Manuscript fix:** Section 1.2 sentence and the four figure captions/screens. · Phases 01, 09.

**D-05 · Crisis acknowledgement and resolution have no columns.** Fig 24 shows active/resolved status, time acknowledged, acknowledged by, action logged, and "resolution documentation"; Table 11 has none of these. · **Ruling:** state is derived from `staff_access_audit` rows (`crisis_acknowledged`, `crisis_resolved`). No resolution-notes field. · Phases 01, 08.

**D-06 · Office tag note.** Fig 25 has "Note, optional"; Table 13 has no note column. · **Ruling:** no note field. · Phase 08.

**D-07 · Resource summary, read time, format, and Draft/Published status.** Figs 7, 13, 31, 32 show a summary, "4 min read", a format ("Self-guided practice"), and a Draft/Published status. Table 16 has only title, url, attributes, verified_by, verified_at. · **Ruling:** published means `verified_by` and `verified_at` are both set; unpublished means both are null. No summary, read time, or format is shown. Cards show title, the chip for the resource's highest attribute, and a "Read" link. · Phases 03, 06, 09.

**D-08 · Mood and stress are never collected or shown in the figures.** 2.1.5.1.4 ("track mood and stress over time") and Table 8 (`mood`, `stress`) require them. Fig 11 has no mood or stress item; Fig 12 and its caption chart only the four criteria. · **Ruling:** the check-in adds the two items in Section 2.6; the trends view shows mood and stress plus the four areas. · **Manuscript fix:** Figs 11–12 and the Fig 12 caption. · Phases 05, 06.

**D-09 · C4 is worded the opposite way.** 2.2.2.1: every criterion is "higher = more urgent." Fig 11 item 4, "I have been able to manage what I am carrying," makes "Very much" mean coping well. · **Ruling:** keep the Fig 11 wording until co-design, with `reverseCoded: true`; the stored `c4 = 6 − selected button value`. The trends chart for "Managing" shows what the student tapped, not the stored value. **Recommendation for co-design:** reword C4 so higher means harder (then set `reverseCoded: false`). · Phases 05, 06, 07.

**D-10 · The support request screen hides part of what is shared.** Table 9 copies name, grade, section, adviser, and c1–c4 on submission. Fig 16 lists only "Your name and grade level", "That you asked for support", "Anything you write below", and its checkbox mentions only the name. 2.1.5.1.6 says the screen must say what reaches staff. · **Ruling:** the screen lists all six items and the acknowledgement names them. · Phase 07.

**D-11 · Concern type is never asked.** Table 9: `concern_type` is "chosen by student." Fig 16 has no selector. · **Ruling:** add a required selector (Section 2.9). · Phase 07.

**D-12 · Out-of-hours notice is missing.** 2.1.7.3: a request sent outside school hours, on a weekend, or during a break "waits for the next school day, and the student is told so at submission." Fig 16 has no such notice. · **Ruling:** add it. · Phase 07.

**D-13 · The prompt sends directly.** Fig 15's "Send to guidance office" implies sending from the prompt. 2.1.5.1.6 requires the disclosure screen first. · **Ruling:** the button opens `/request` (Fig 16 screen). Fig 15 also says "this choice is not recorded against you," but Table 19 records dismissals (owner-only). Copy is changed to say only the student can see it. · Phases 05, 07.

### Figure vs manuscript

**D-14 · Dashboard list columns and queue.** 2.1.3.7 / 2.1.5.2.1: the list shows name and section, class adviser, time submitted, kind of concern, and whether the student already has an open request. 2.1.5.2.2: For Review requests "sit in their own queue." 2.1.5.2.7: overdue requests are marked. Fig 21 shows "Grade and strand", no adviser, no concern type, no open-request marker, no overdue marker, and mixes FR rows into the priority list. · **Ruling:** manuscript. · Phase 08.

**D-15 · Figure numbers for weights and bands.** Fig 23 shows weights 0.34 / 0.28 / 0.21 / 0.17; 2.2.2.2 gives 0.2616 / 0.4531 / 0.1182 / 0.1671. Fig 21 lists the 08:14 request as P1; Fig 23 shows the same request as P2. · **Ruling:** only `scoring-config.js` values are used; figure numbers are ignored. · Phases 07, 08.

**D-16 · Human-readable IDs.** Figs 23, 24, 33 show "SR-2024-089", "CE-2024-014", "Student ID: 2024-SHS-0418". No such columns exist; no student ID is in any `disclosed` copy. · **Ruling:** show "Ref " + the first 8 characters of the row's uuid. Never show a student ID. · Phases 08, 09.

**D-17 · "Grade and strand".** Figs 21, 23, 24, 26, 29 show a strand (HUMSS, ABM-A). The schema stores `section`. · **Ruling:** show "Grade {grade_level} · {section}". · Phases 08, 09.

**D-18 · Hard-coded contact details.** Figs 7, 14, 17, 18, 24, 26 contain hotline numbers, "Luzon/Mindanao", "2nd Floor of the Administration Building", "Room 204, Guidance Hall", and office hours. · **Ruling:** all are `[[GUIDANCE:…]]` placeholders. · Phases 03, 05, 07, 08.

**D-19 · Landing-page "30-second silent check-in" demo.** Fig 7 has a demo item ("How does your chest or shoulders feel right now?"), a free-text box, and a Standard/Focus mode switch. It traces to no requirement, its item is not criterion-linked (2.1.5.1.3), and Tier 1 collects no personal data (2.1.5.1.2). · **Ruling:** not built. · Phase 03.

**D-20 · Copy that promises scheduling or claims credentials.** "Request a confidential one-on-one session" (Fig 7), "Scheduled on your time" (Fig 12), "discuss … in a private session" (Fig 13), "Guidance consultations are scheduled privately" (Fig 16), "an accredited counselor can reach out to me" (Fig 17), "Guides written by guidance professionals", "Updated monthly by RMC guidance office", "Aligned with DepEd & RMC values" (Fig 7). The system only takes support requests (1.4) and no source supports the claims. · **Ruling:** rewritten in the phase files. · Phases 03, 06, 07.

**D-21 · Navigation differs across figures.** Fig 7–8: Home, About Guidance; Fig 9: Guides; student pages: Home, Check-in, My Trends, Resources, Where to get help. · **Ruling:** one header per role (Section 8.5). "About Guidance" is not built. · Phase 02.

**D-22 · Password length.** Fig 8: students "at least 8 characters." 2.1.6.2.9: staff at least 12. Supabase has one global minimum. · **Ruling:** 12 for everyone, enforced by Supabase. · Phase 02.

**D-23 · Draft saved "on this device".** Fig 17: "Draft safe locally", "Unsent text draft is safe on this device." 2.1.6.4.5 only requires the note to be preserved; storing mental-health text on a possibly shared phone is a privacy risk. · **Ruling:** the note stays in page memory only and survives the retry; copy says so. · Phase 07.

**D-24 · Crisis "confirmation".** Fig 24: "routed immediately upon student confirmation." Fig 18 caption and 2.1.6.1.6: raised "the moment an explicit high-risk item is selected." · **Ruling:** no confirm step; copy says "selection". (Team note: raise accidental taps with the guidance office at co-design.) · Phases 05, 08.

**D-25 · Trend summaries are computed interpretations.** Fig 12 shows "Heavier recently", "Holding steady", "Feeling lighter this week", "About the same as last month". Fig 12 caption: "descriptive only, carrying no computed value, forecast, or projection." · **Ruling:** removed. · Phase 06.

**D-26 · No way to record consent.** Fig 29 shows only "Record withdrawal." 2.1.5.3.2: the administrator keeps the consent register. · **Ruling:** add "Record parental consent". Student assent is recorded when the student completes the walkthrough (2.1.5.1.1, Fig 10), with `instrument_version` = the assent copy version. (Team note: confirm that in-app assent is acceptable to the ethics board; if paper assent is required, the administrator records it instead.) · Phases 04, 09.

**D-27 · What unlocks Tier 2.** 2.1.6.2.3: "against a recorded consent". Fig 29 caption: "Parental consent and student assent must both be recorded." · **Ruling:** both, each granted and not withdrawn. · Phases 01, 04.

**D-28 · No "future" concern type.** Table 9 CHECK has academic, peer, family, wellness, while C3 is future/career. · **Ruling:** keep the CHECK as written; `wellness` is labelled "Something else about how I'm doing". (Team note: consider adding `future` in the manuscript.) · Phase 07.

**D-29 · Fig 21 status filter and Fig 23 status control.** Not a contradiction; recorded so the AI IDE does not invent rules: any of the four states may be chosen at any time, and each change is audited (`state_change`). · Phase 08.

**D-30 · Resource topic chips on the landing page.** Fig 7 uses "Academics & Stress", "Home & Family", "Daily Routine", "Emotional Health"; Figs 13 and 32 use the four areas. · **Ruling:** the four areas only (Section 2.4). · Phase 03.

**D-31 · Language names.** 2.1.6.3.1 says Cebuano; Fig 10 says Bisaya. · **Ruling:** button label "Bisaya", language code `ceb`. · Phases 04, 05.

**D-32 · Assent step numbering.** Fig 8 "Step 1 of 2"; Fig 10 "Step 2 of 3". · **Ruling:** two steps: "Step 1 of 2" (create account) and "Step 2 of 2" (assent). · Phases 02, 04.

**D-33 · Fig 25 tag options are blank.** · **Ruling:** three options from Section 2.10, none pre-selected. · Phase 08.

**D-34 · Who the staff sign-in serves.** Fig 19 card says "Authorized senior high school guidance personnel." and Fig 22 says "Re-authentication required to view queue". The administrator signs in at the same portal and has no queue (1.2, 2.1.5.3). · **Ruling:** "Authorized guidance personnel and administrators." and "Restricted access · Sign in again to continue". · Phase 02.

**D-35 · "All staff access is recorded."** Figs 19–20 obligation text says all staff access is recorded. Table 17 records only actions on support requests and crisis events (D-04). · **Ruling:** "Every opening of a support request or crisis event is recorded in an audit trail." · Phase 02.

**D-36 · Six code boxes.** Fig 20 shows six separate digit boxes. · **Ruling:** one input that accepts 6 digits (`autocomplete="one-time-code"`), styled wide and spaced. Same function; works with phone autofill and screen readers. Layout only. · Phase 02.

**D-37 · School email example.** Fig 8 shows the placeholder "student@rmc.edu.ph". The school's email domain is not confirmed anywhere in the manuscript. · **Ruling:** placeholder text "Your school email"; no domain restriction on sign-up. · Phase 02.

### Design notes (not contradictions, but the AI IDE would otherwise guess)

**N-01 · Scoring a private check-in.** The prompt (2.1.5.1.7) needs Equation 1 on a private check-in, but `checkins` may hold no derived-score column (2.1.6.2.1). · The `evaluate-checkin` function computes it in memory under the student's own JWT and returns only `{ prompt: 'max_sev' | 'gray_zone' | null }`. Nothing is stored except the `prompt_events` row the student's answer creates. · Phase 05.

**N-02 · Who writes `disclosed`.** Database triggers fill `disclosed` from `students` and `checkins`; the browser cannot supply it. · Phases 01, 05, 07.

**N-03 · Staff inactivity timeout on the Free plan.** Supabase's server-side inactivity timeout is Pro-only. The 15-minute rule (2.1.6.2.9) is enforced by the app: an idle timer plus a last-activity check on page load. Stated as a limitation in Phase 02. · Phase 02.

**N-04 · AHP worked example rounding.** Recomputing Table 7 gives per-row ratios 4.0475, 4.0439, 4.0917, 4.1004; the manuscript prints 4.0472, 4.0437, 4.0912, 4.1013. λmax (4.0709), CI (0.0236), CR (0.0262 at RI 0.90; 0.0265 at 0.89), the weights, the three worked scores (1.4728, 3.8588, 3.1876), and the 625-profile counts (179 / 326 / 120 before guardrails, 179 / 356 / 90 after) all match exactly. · **Manuscript fix (minor):** the four ratios. · Phase 07 uses these as unit tests.

**N-06 · Where the scoring rule set is kept with each decision.** Fig 23 shows the weights next to each criterion, and Table 10 says a decision must stay "reproducible by hand from the stored score and the rule set." `src/` may not import `scoring-config.js`. · `triage_decisions.guardrails` stores `{ "fired": [...], "weights": {...}, "thresholds": {...}, "grayZoneHalfWidth": n, "provisional": bool }` at the moment of scoring; the request detail reads it from there. · Phases 07, 08.

**N-05 · KII Round 2 summary (INTERVIEW.pdf) was not among the files received.** The plan relies on the manuscript's own quotations of KII Round 2, which rank above the summary anyway.
