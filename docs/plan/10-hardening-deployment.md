# HingaWeb Implementation Plan — 10 · Hardening and Deployment

> Upload order: `00` (v1.3), `01` … `09`, then this file. Phase 09 acceptance must have passed.
> Every file in this phase is given **in full**. This is the last phase.

**What was verified when this plan was written:** `npm run verify` passes (**292 unit and component tests**), now ending with `check:bundle`: check-in 251.9 KB, resource list 253.3 KB, where to get help 251.9 KB, guidance request list 264.4 KB (all compressed, budget 500 KB), no crisis or check-in code split off, no secret in the built files. `npm run build:pilot` correctly **refuses** to build today, listing the 127 placeholders in `src/`, `PROVISIONAL`, `CHECKIN_ITEMS_STATUS`, and `ASSENT_COPY_STATUS`. With the real scoring values simulated, the test suite still passes (the manuscript-number tests skip themselves). The production build was served with the exact `vercel.json` headers: `/`, `/help`, `/guides`, `/check-in`, `/crisis`, `/trends`, `/staff/login`, and every admin screen loaded with **no Content-Security-Policy violation** and 0 axe violations. On the 1 Mbps / 0.5 Mbps / 400 ms profile, `/help` reached first contentful paint at a **median of 2.68 s** (usable 2.83 s) from a compressed static server. Against the Phase 01 schema in Postgres 16 with 2,000 students, 2,000 requests, and 4,000 audit rows, the guidance request-list query took **17–22 ms**; before the new index and fresh statistics it took 0.25–2.6 s. The backup file format round-trips (encrypt, decrypt, wrong passphrase refused). Not run here, because they need real accounts: the performance spec against a Vercel deployment, `supabase db dump` against the hosted project, and the GitHub workflows. Jared runs those in Steps 9–11.

---

## 1. Goal

1. **Smaller first load** (2.1.6.1.2): staff, admin, and secondary student screens load on demand; the crisis screen, check-in, help page, and directory never do (Phase 05 must-never 14).
2. **Budget and secret check** (2.1.6.1.2; 00 §5.3): `check:bundle` measures each core view and scans the build for server secrets, in `verify` and in `build:pilot`.
3. **Performance spec** (2.1.6.1.1): median of five runs per core view on the throttled profile, against a deployed site.
4. **Request list at pilot scale** (2.1.6.1.3): one index and a database test that times the queue query with 2,000 students and 2,000 requests.
5. **Deployment** (2.1.6.2.4; 00 §14): Vercel with security headers; production deployments build only through `build:pilot`.
6. **CI and keep-alive** (2.1.6.4.2): every push runs `verify`; a daily query keeps the free tier awake.
7. **Encrypted backups, restore tests, and the runbook** (2.1.6.4.1, 2.1.6.4.3, 2.1.6.2.5).
8. **Tests that survive real values**: tests that pinned the manuscript's example numbers or placeholder text now adapt once the team fills them in.
9. **Pilot checklist** (§7): everything that must be true before real students are invited.

### 1.1 Prerequisites

Phase 09 acceptance passed. The repository is on GitHub. Jared has a Vercel account (Hobby) linked to GitHub. The custodian's computer has Node 24, Docker Desktop, and this repository.

### 1.2 Not in this phase

The SMS gateway (Capstone 2; runbook §5). Cebuano and Tagalog text (TEAM). Hotlines, protocol steps, crisis items, office hours (GUIDANCE). Scoring values (scoring session). Usability testing and the Capstone 2 load test with real enrolment figures. Choosing an uptime monitor product (any external monitor that checks every 5 minutes will do; runbook §4).

### 1.3 Requirements covered

| Piece | Requirement | Where |
|---|---|---|
| Code splitting | 2.1.6.1.2; Phase 05 must-never 14 | `src/routes.jsx`, `LazyPage.jsx`, `lazyNamed.js` |
| Bundle budget, secret scan | 2.1.6.1.2; 00 §5.3, must-never 15 | `scripts/check-bundle.js` |
| First paint ≤ 3 s, usable ≤ 5 s | 2.1.6.1.1 | `e2e/phase-10/performance.spec.js` |
| Request list ≤ 1 s at 2,000 / 2,000 | 2.1.6.1.3 | migration `…0800_queue_index.sql`, `supabase/tests/08_queue_load.test.sql` |
| TLS, headers | 2.1.6.2.4; 00 must-never 13 | `vercel.json` |
| Pilot build gate | 00 §11.3 | `scripts/vercel-build.js`, `build:pilot` |
| Availability report | 2.1.6.4.1 | runbook §4 |
| Daily keep-alive | 2.1.6.4.2 | `.github/workflows/keep-alive.yml`, runbook §1 |
| Weekly encrypted backup, termly restore | 2.1.6.4.3 | `scripts/backup.js`, runbook §2–3 |
| End-of-pilot deletion | 2.1.6.2.5 | runbook §8 |

### 1.4 Disagreements found in this phase

| ID | Manuscript / rule | Other source | Ruling |
|---|---|---|---|
| P10-D1 | 2.1.6.4.3 (Section 2.2.5): "The resource library's files are … restored by re-uploading them from the source URLs … Verified copies of the files are kept alongside the library record" | Table 16 stores a link (`url`), not a file; HingaWeb uses no Storage bucket | No file copies are made. Restoring the database restores the library. A broken link is fixed by the administrator editing the resource (or setting it to Draft) and re-verifying it. **Manuscript fix:** that paragraph |
| P10-D2 | 00 §2 tree: `.github/workflows/ # CI, keep-alive, backup` | 2.1.6.4.3: export "store it off-site in storage the school controls", custodian = the proponent with the administrator role | **No backup workflow.** The custodian runs `npm run backup` on their own computer, so the plain dump never passes through GitHub's runners or artifacts and the database password is never stored as a GitHub secret. The file is encrypted (AES-256-GCM, scrypt key) before it reaches the school folder |
| P10-D3 | 2.1.6.1.1 "become interactive within 5 seconds" | No definition of interactive | "Usable" = the view's main element is on screen: `/help` its heading; `/check-in` the "Save check-in" button; `/resources` the "Suggested for you" heading; `/staff/queue` the "Support requests" heading. Measured from navigation start |
| P10-D4 | 2.1.6.1.1 profile "1 Mbps down, 0.5 Mbps up, 400 ms round-trip" | Chrome's network emulation takes bytes per second | 125,000 B/s down, 62,500 B/s up, 400 ms latency; cache disabled, service worker blocked, five fresh runs, median. Runs against a Vercel deployment only (it compresses files; `vite preview` does not) |
| P10-D5 | 2.1.6.1.2 "500 KB … compressed transfer size on first load, per core view" | Vercel picks Brotli or gzip per browser | `check:bundle` counts the gzip size of every JS and CSS file the view loads on a first visit, plus the Latin Inter font. Brotli is smaller, so gzip is a safe upper bound. The four core views are the ones 2.1.6.1.2 names |
| P10-D6 | 2.1.6.1.3 "will be tested in Capstone 2" | — | A database test already times the query at the stated ceiling (2,000 / 2,000) so a slow change is caught now. Capstone 2 repeats it on the hosted project if the registrar's figure is higher |
| P10-D7 | 2.1.6.4.2 "a lightweight database query" once a day | GitHub turns off scheduled workflows after 60 days without repository activity | Daily workflow at 09:17 Manila reading one resource id with the publishable key; a failed run emails the repository owner. Runbook §1 adds a monthly check that the workflow is still enabled |
| P10-D8 | 00 §11.3: `build:pilot` blocks a pilot build with placeholders | Vercel builds both previews and production | `build:vercel` runs `build:pilot` when `VERCEL_ENV=production`, the normal build otherwise. Previews always build; **production fails until every placeholder and provisional value is final** |
| P10-D9 | 00 §5.2: each Edge Function answers only `ALLOWED_ORIGIN` | Previews live on other domains, and there is no production deployment until §7.1 is done | Before go-live, set `ALLOWED_ORIGIN` (and the Auth redirect URLs) to one stable preview address, the `staging` branch alias. At go-live switch them to the production domain. Other previews show every screen but cannot save a check-in, rank resources, send a request, or invite staff |
| P10-D10 | 2.1.6.2.9 / P09-D5: staff accounts are invited, never given a password by someone else | The first administrator cannot be invited (nobody can open the accounts screen yet) | The custodian creates their **own** administrator account once in the Supabase dashboard (§7.2). Every later staff account is invited from `/admin/accounts` |

---

## 2. Files in this phase

**New:**
- `src/lib/lazyNamed.js`, `src/components/layout/LazyPage.jsx`
- `scripts/check-bundle.js`, `scripts/check-bundle.test.js`, `scripts/vercel-build.js`, `scripts/backup.js`, `scripts/backup.test.js`
- `vercel.json`, `.github/workflows/ci.yml`, `.github/workflows/keep-alive.yml`
- `supabase/migrations/20261010000800_queue_index.sql`, `supabase/tests/08_queue_load.test.sql`
- `docs/runbook.md`
- `e2e/phase-10/performance.spec.js`

**Changed (replace the whole file):** `package.json`, `vite.config.js`, `src/routes.jsx`, and eight test files that pinned example values: `scripts/ahp.test.js`, `src/config/checkin-items.test.js`, `src/features/assent/assent.test.jsx`, `src/features/crisis/crisis.test.jsx`, `src/lib/time.test.js`, `supabase/functions/_shared/saw.test.js`, `supabase/functions/evaluate-checkin/handler.test.js`, `supabase/functions/submit-support-request/handler.test.js`.

**Deleted:** `src/features/placeholder/PhasePlaceholder.jsx` (no route uses it). Leave the `dev.placeholder` copy key in `src/copy/en.js`; it is harmless.

**Regenerated (do not edit):** `docs/placeholders.md`, by `npm run check:placeholders`.

---

## 3. What changes on screen

No new screens and no new copy. Two behaviours change:

- **Lazy screens.** Every staff screen, every admin screen, `/trends`, `/resources`, `/request`, `/request/sent`, and the staff sign-in, verify, and setup pages download their code on first visit. While it downloads: a skeleton with a hidden "Loading…" for screen readers. If the download fails (offline, or a newer version was deployed and the old file is gone): `ErrorState` with "Something went wrong." / "This page could not load. Your information has not changed." and "Try again", which reloads the page.
- **Never lazy** (checked by `check:bundle`): `CrisisPage`, `CheckInPage`, `HelpPage`, `src/content/directory.js`, and everything they import, including all copy files. The landing page, guides, assent walkthrough, and student sign-in also stay in the main bundle.

---

## 4. Build steps

### Step 1 — Lazy routes

**`src/lib/lazyNamed.js`**

```js
// Phase 10 · code splitting (2.1.6.1.2). Loads a named export as a lazy React component.
import { lazy } from 'react';

/** lazyNamed(() => import('./X.jsx'), 'X') */
export function lazyNamed(loader, name) {
  return lazy(() => loader().then((m) => ({ default: m[name] })));
}
```

**`src/components/layout/LazyPage.jsx`**

```jsx
// Phase 10 · wraps a lazily loaded screen: a skeleton while its code downloads, and a plain
// message with a reload button if the download fails (offline, or a new version was deployed).
// The crisis screen, check-in, hotlines, and directory are NOT lazy (Phase 05 must-never 14).
import { Component, Suspense } from 'react';
import { t } from '../../copy/index.js';
import { ErrorState } from '../ui/ErrorState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';

class ChunkBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <ErrorState
          title={t('common.error.title')}
          body={t('common.error.body')}
          onRetry={() => window.location.reload()}
        />
      );
    }
    return this.props.children;
  }
}

export function LazyPage({ children }) {
  return (
    <ChunkBoundary>
      <Suspense
        fallback={
          <div>
            <p className="sr-only">{t('common.loading')}</p>
            <Skeleton lines={6} />
          </div>
        }
      >
        {children}
      </Suspense>
    </ChunkBoundary>
  );
}
```

**`src/routes.jsx`**

```jsx
// The route table from 00 Section 7. Every route has its real screen; staff, admin, trends,
// resources, and request screens load on first visit (Phase 10).
import { Navigate, Route, Routes } from 'react-router';
import {
  RequireGuest,
  RequireStaff,
  RequireStaffSession,
  RequireStudent,
} from './lib/auth/guards.jsx';
import { lazyNamed } from './lib/lazyNamed.js';
import { LazyPage } from './components/layout/LazyPage.jsx';
import { PublicLayout } from './components/layout/PublicLayout.jsx';
import { PublicOrStudentLayout } from './components/layout/PublicOrStudentLayout.jsx';
import { StudentLayout } from './components/layout/StudentLayout.jsx';
import { BareLayout } from './components/layout/BareLayout.jsx';
import { PortalLayout } from './components/layout/PortalLayout.jsx';
import { AdminLayout } from './components/layout/AdminLayout.jsx';
import { RegisterPage } from './features/auth/RegisterPage.jsx';
import { LoginPage } from './features/auth/LoginPage.jsx';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage.jsx';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage.jsx';
import { EmailConfirmedPage } from './features/auth/EmailConfirmedPage.jsx';
import { NotFoundPage } from './features/auth/NotFoundPage.jsx';
import { LandingPage } from './features/public/LandingPage.jsx';
import { GuidesPage } from './features/public/GuidesPage.jsx';
import { HelpPage } from './features/public/HelpPage.jsx';
import { AssentPage } from './features/assent/AssentPage.jsx';
import { WaitingForConsentPage } from './features/assent/WaitingForConsentPage.jsx';
import { CheckInPage } from './features/checkin/CheckInPage.jsx';
import { CrisisPage } from './features/crisis/CrisisPage.jsx';

// Phase 10 · loaded on first visit (2.1.6.1.2). Student core screens, the crisis screen, and the
// hotlines stay in the main bundle so they never wait for a download.
const StaffLoginPage = lazyNamed(
  () => import('./features/auth/StaffLoginPage.jsx'),
  'StaffLoginPage',
);
const StaffVerifyPage = lazyNamed(
  () => import('./features/auth/StaffVerifyPage.jsx'),
  'StaffVerifyPage',
);
const StaffSetupPage = lazyNamed(
  () => import('./features/auth/StaffSetupPage.jsx'),
  'StaffSetupPage',
);
const TrendsPage = lazyNamed(() => import('./features/trends/TrendsPage.jsx'), 'TrendsPage');
const ResourcesPage = lazyNamed(
  () => import('./features/resources/ResourcesPage.jsx'),
  'ResourcesPage',
);
const RequestPage = lazyNamed(() => import('./features/requests/RequestPage.jsx'), 'RequestPage');
const RequestSentPage = lazyNamed(
  () => import('./features/requests/RequestSentPage.jsx'),
  'RequestSentPage',
);
const GuidanceLayout = lazyNamed(
  () => import('./features/guidance/GuidanceLayout.jsx'),
  'GuidanceLayout',
);
const QueuePage = lazyNamed(() => import('./features/guidance/QueuePage.jsx'), 'QueuePage');
const RequestDetailPage = lazyNamed(
  () => import('./features/guidance/RequestDetailPage.jsx'),
  'RequestDetailPage',
);
const OfficeTagPage = lazyNamed(
  () => import('./features/guidance/OfficeTagPage.jsx'),
  'OfficeTagPage',
);
const CrisisChannelPage = lazyNamed(
  () => import('./features/guidance/CrisisChannelPage.jsx'),
  'CrisisChannelPage',
);
const ReferralsPage = lazyNamed(
  () => import('./features/guidance/ReferralsPage.jsx'),
  'ReferralsPage',
);
const AccountsPage = lazyNamed(() => import('./features/admin/AccountsPage.jsx'), 'AccountsPage');
const ConsentPage = lazyNamed(() => import('./features/admin/ConsentPage.jsx'), 'ConsentPage');
const ReferencePage = lazyNamed(
  () => import('./features/admin/ReferencePage.jsx'),
  'ReferencePage',
);
const ResourceLibraryPage = lazyNamed(
  () => import('./features/admin/ResourceLibraryPage.jsx'),
  'ResourceLibraryPage',
);
const ResourceEditPage = lazyNamed(
  () => import('./features/admin/ResourceEditPage.jsx'),
  'ResourceEditPage',
);
const AuditPage = lazyNamed(() => import('./features/admin/AuditPage.jsx'), 'AuditPage');

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
          <Route
            path="trends"
            element={
              <LazyPage>
                <TrendsPage />
              </LazyPage>
            }
          />
          <Route
            path="resources"
            element={
              <LazyPage>
                <ResourcesPage />
              </LazyPage>
            }
          />
          <Route
            path="request"
            element={
              <LazyPage>
                <RequestPage />
              </LazyPage>
            }
          />
          <Route
            path="request/sent"
            element={
              <LazyPage>
                <RequestSentPage />
              </LazyPage>
            }
          />
        </Route>
      </Route>

      {/* Staff portal: sign in, second factor, first-time setup */}
      <Route path="staff" element={<PortalLayout />}>
        <Route index element={<Navigate to="/staff/login" replace />} />
        <Route element={<RequireGuest />}>
          <Route
            path="login"
            element={
              <LazyPage>
                <StaffLoginPage />
              </LazyPage>
            }
          />
        </Route>
        <Route element={<RequireStaffSession />}>
          <Route
            path="verify"
            element={
              <LazyPage>
                <StaffVerifyPage />
              </LazyPage>
            }
          />
          <Route
            path="setup"
            element={
              <LazyPage>
                <StaffSetupPage />
              </LazyPage>
            }
          />
        </Route>
      </Route>

      {/* Guidance (aal2) */}
      <Route element={<RequireStaff role="guidance" />}>
        <Route
          element={
            <LazyPage>
              <GuidanceLayout />
            </LazyPage>
          }
        >
          <Route
            path="staff/queue"
            element={
              <LazyPage>
                <QueuePage />
              </LazyPage>
            }
          />
          <Route
            path="staff/requests/:id"
            element={
              <LazyPage>
                <RequestDetailPage />
              </LazyPage>
            }
          />
          <Route
            path="staff/requests/:id/tag"
            element={
              <LazyPage>
                <OfficeTagPage />
              </LazyPage>
            }
          />
          <Route
            path="staff/crisis"
            element={
              <LazyPage>
                <CrisisChannelPage />
              </LazyPage>
            }
          />
          <Route
            path="staff/referrals"
            element={
              <LazyPage>
                <ReferralsPage />
              </LazyPage>
            }
          />
        </Route>
      </Route>

      {/* Administrator (aal2) */}
      <Route element={<RequireStaff role="administrator" />}>
        <Route element={<AdminLayout />}>
          <Route path="admin" element={<Navigate to="/admin/accounts" replace />} />
          <Route
            path="admin/accounts"
            element={
              <LazyPage>
                <AccountsPage />
              </LazyPage>
            }
          />
          <Route
            path="admin/consent"
            element={
              <LazyPage>
                <ConsentPage />
              </LazyPage>
            }
          />
          <Route
            path="admin/reference"
            element={
              <LazyPage>
                <ReferencePage />
              </LazyPage>
            }
          />
          <Route
            path="admin/resources"
            element={
              <LazyPage>
                <ResourceLibraryPage />
              </LazyPage>
            }
          />
          <Route
            path="admin/resources/new"
            element={
              <LazyPage>
                <ResourceEditPage />
              </LazyPage>
            }
          />
          <Route
            path="admin/resources/:id"
            element={
              <LazyPage>
                <ResourceEditPage />
              </LazyPage>
            }
          />
          <Route
            path="admin/audit"
            element={
              <LazyPage>
                <AuditPage />
              </LazyPage>
            }
          />
        </Route>
      </Route>

      <Route element={<PublicLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
```

Then delete `src/features/placeholder/PhasePlaceholder.jsx`.

### Step 2 — Build settings and scripts

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
  build: {
    // Phase 10 · scripts/check-bundle.js reads this manifest to measure each core view's first
    // load. The real budget (2.1.6.1.2) is 500 KB COMPRESSED and is enforced there; this raw-size
    // warning limit only keeps the build log quiet about the uncompressed main chunk.
    manifest: true,
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setupTests.js'],
    include: ['src/**/*.test.{js,jsx}', 'supabase/functions/**/*.test.js', 'scripts/**/*.test.js'],
  },
});
```

**`package.json`** — only the scripts changed; dependencies are unchanged

```json
{
  "name": "hingaweb",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24.15.0 <25"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:pilot": "node scripts/check-placeholders.js --strict && vite build && node scripts/check-bundle.js",
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
    "verify": "npm run lint && npm run check:copy && npm run check:colours && npm run test && npm run build && npm run check:bundle",
    "check:bundle": "node scripts/check-bundle.js",
    "backup": "node scripts/backup.js",
    "ahp": "node scripts/ahp.js",
    "build:vercel": "node scripts/vercel-build.js"
  },
  "dependencies": {
    "@date-fns/tz": "1.5.0",
    "@fontsource-variable/inter": "5.3.0",
    "@supabase/supabase-js": "2.117.3",
    "date-fns": "4.4.0",
    "lucide-react": "1.54.0",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "react-router": "7.18.4",
    "workbox-window": "7.4.1",
    "zod": "4.6.5"
  },
  "devDependencies": {
    "@axe-core/playwright": "4.13.0",
    "@eslint/js": "10.0.1",
    "@playwright/test": "1.64.0",
    "@tailwindcss/vite": "4.3.3",
    "@testing-library/jest-dom": "7.0.1",
    "@testing-library/react": "16.3.3",
    "@testing-library/user-event": "14.6.7",
    "@vitejs/plugin-react": "6.1.2",
    "eslint": "10.12.0",
    "eslint-plugin-react-hooks": "7.1.1",
    "eslint-plugin-react-refresh": "0.5.7",
    "globals": "17.13.0",
    "jsdom": "30.1.2",
    "prettier": "3.9.9",
    "supabase": "2.120.0",
    "tailwindcss": "4.3.3",
    "vite": "8.3.4",
    "vite-plugin-pwa": "2.0.0",
    "vitest": "5.0.3"
  }
}
```

### Step 3 — Bundle budget and secret scan

**`scripts/check-bundle.js`**

```js
// Phase 10 · 2.1.6.1.2: each core view must load in at most 500 KB COMPRESSED on first load.
// Core views: the student check-in, the resource list, the referral and hotline view, and the
// guidance request list. Run after `vite build` (it reads dist/.vite/manifest.json).
// Also fails if:
//   - the crisis screen, check-in, or help page were split into a lazy chunk (Phase 05 must-never 14)
//   - any server secret appears in the built files (00 Section 5.3).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { ROOT } from './lib.js';

export const BUDGET_BYTES = 500 * 1000;

/** The modules each core view needs beyond the main entry (dynamic entries in the manifest). */
export const CORE_VIEWS = {
  'Check-in (/check-in)': [],
  'Resource list (/resources)': ['src/features/resources/ResourcesPage.jsx'],
  'Where to get help (/help)': [],
  'Guidance request list (/staff/queue)': [
    'src/features/guidance/GuidanceLayout.jsx',
    'src/features/guidance/QueuePage.jsx',
  ],
};

/** Must stay in the main entry, never lazy. */
export const MUST_BE_EAGER = [
  'src/features/crisis/CrisisPage.jsx',
  'src/features/checkin/CheckInPage.jsx',
  'src/features/public/HelpPage.jsx',
  'src/content/directory.js',
];

// A real secret key, or a JWT whose payload says service_role (base64 of "service_role" at its three
// possible alignments). The bare prefix "sb_secret_" appears inside supabase-js itself, so a key is
// matched only with its random tail.
export const SECRET_PATTERNS = [
  /sb_secret_[A-Za-z0-9_-]{16,}/,
  /c2VydmljZV9yb2xl|NlcnZpY2Vfcm9sZ|zZXJ2aWNlX3JvbG/,
  /service_role/i,
  /SUPABASE_SERVICE_ROLE_KEY|WEBHOOK_SECRET|SMS_GATEWAY_TOKEN/,
];

/** All files (JS and CSS) a manifest key loads statically, including itself. */
export function closure(manifest, key, seen = new Set()) {
  if (seen.has(key) || !manifest[key]) return seen;
  seen.add(key);
  for (const imp of manifest[key].imports ?? []) closure(manifest, imp, seen);
  return seen;
}

export function filesFor(manifest, keys) {
  const all = new Set();
  for (const k of ['index.html', ...keys]) for (const c of closure(manifest, k)) all.add(c);
  const files = new Set();
  for (const k of all) {
    files.add(manifest[k].file);
    for (const css of manifest[k].css ?? []) files.add(css);
  }
  return [...files];
}

export function lazyViolations(manifest) {
  return MUST_BE_EAGER.filter((src) => manifest[src]?.isDynamicEntry);
}

if (process.argv[1] && process.argv[1].endsWith('check-bundle.js')) {
  const dist = join(ROOT, 'dist');
  const manifestPath = join(dist, '.vite/manifest.json');
  if (!existsSync(manifestPath)) {
    console.error('check:bundle: run `npm run build` first (dist/.vite/manifest.json is missing)');
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const gz = (file) => gzipSync(readFileSync(join(dist, file))).length;
  // The browser downloads only the Latin subset of Inter for this app's text.
  const fonts = readdirSync(join(dist, 'assets')).filter((f) =>
    /^inter-latin-wght-normal-.*\.woff2$/.test(f),
  );
  const problems = [];

  for (const [view, keys] of Object.entries(CORE_VIEWS)) {
    const missing = keys.filter((k) => !manifest[k]);
    if (missing.length) problems.push(`${view}: not found in manifest: ${missing.join(', ')}`);
    const files = filesFor(manifest, keys);
    const bytes =
      files.reduce((s, f) => s + gz(f), 0) +
      fonts.reduce((s, f) => s + readFileSync(join(dist, 'assets', f)).length, 0);
    const kb = (bytes / 1000).toFixed(1);
    console.log(`check:bundle: ${view}: ${kb} KB compressed (${files.length} files + font)`);
    if (bytes > BUDGET_BYTES) problems.push(`${view} is ${kb} KB, over the 500 KB budget`);
  }

  for (const src of lazyViolations(manifest)) problems.push(`${src} must stay in the main bundle`);

  const builtFiles = readdirSync(join(dist, 'assets')).filter((f) => /\.(js|css|html)$/.test(f));
  for (const f of [...builtFiles.map((x) => `assets/${x}`), 'index.html']) {
    const text = readFileSync(join(dist, f), 'utf8');
    for (const re of SECRET_PATTERNS) if (re.test(text)) problems.push(`${f} contains ${re}`);
  }

  if (problems.length) {
    console.error('check:bundle failed:\n- ' + problems.join('\n- '));
    process.exit(1);
  }
  console.log('check:bundle: OK');
}
```

**`scripts/check-bundle.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { SECRET_PATTERNS, closure, filesFor, lazyViolations } from './check-bundle.js';

const manifest = {
  'index.html': {
    file: 'assets/index.js',
    isEntry: true,
    imports: ['_ui.js'],
    css: ['assets/index.css'],
  },
  '_ui.js': { file: 'assets/ui.js', imports: ['_vocab.js'] },
  '_vocab.js': { file: 'assets/vocab.js' },
  'src/features/resources/ResourcesPage.jsx': {
    file: 'assets/ResourcesPage.js',
    isDynamicEntry: true,
    imports: ['_ui.js', 'index.html'],
  },
  'src/features/crisis/CrisisPage.jsx': { file: 'assets/Crisis.js', isDynamicEntry: true },
};

describe('check-bundle (2.1.6.1.2)', () => {
  it('follows static imports once each', () => {
    expect([...closure(manifest, 'index.html')]).toEqual(['index.html', '_ui.js', '_vocab.js']);
  });

  it('counts the main entry plus the view chunk and their CSS', () => {
    expect(filesFor(manifest, ['src/features/resources/ResourcesPage.jsx']).sort()).toEqual([
      'assets/ResourcesPage.js',
      'assets/index.css',
      'assets/index.js',
      'assets/ui.js',
      'assets/vocab.js',
    ]);
  });

  it('flags a crisis screen that was made lazy', () => {
    expect(lazyViolations(manifest)).toEqual(['src/features/crisis/CrisisPage.jsx']);
  });

  it('catches a service-role JWT or a secret key, but not the supabase-js prefix check', () => {
    const hit = (text) => SECRET_PATTERNS.some((re) => re.test(text));
    for (const pre of ['', 'a', 'ab']) {
      const payload = Buffer.from(`{"iss":"supabase","${pre}x":1,"role":"service_role"}`).toString(
        'base64url',
      );
      expect(hit(`const k = "eyJhbGciOiJIUzI1NiJ9.${payload}.sig"`)).toBe(true);
    }
    expect(hit('const k = "sb_secret_AbCdEfGhIjKlMnOpQrSt"')).toBe(true);
    expect(hit('e.startsWith(`sb_secret_`)')).toBe(false);
    expect(hit('const k = "sb_publishable_AbCdEfGhIjKlMnOpQrSt"')).toBe(false);
  });
});
```

### Step 4 — Request list at pilot scale

**`supabase/migrations/20261010000800_queue_index.sql`**

```sql
-- Phase 10 · 2.1.6.1.3: the guidance request list must return within 1 second at pilot scale.
-- support_queue checks, for every request, whether the same student has another open request.
-- Without this index, and before the planner's statistics catch up with new rows, that check can
-- scan every open request once per row (measured 0.25 to 2.6 s at 2,000 requests); with it, the
-- check is one index lookup (about 20 ms). supabase/tests/08_queue_load.test.sql measures it.
create index support_requests_student_status_idx
  on public.support_requests (student_id, status);
```

**`supabase/tests/08_queue_load.test.sql`** — runs with the other database tests; rolls back

```sql
-- Phase 10 · 2.1.6.1.3: the guidance request-list query returns within 1 second at pilot scale
-- (2,000 student accounts and 2,000 support requests), measured server-side.
-- Fictional rows only; the transaction rolls back, so nothing is kept.
begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

-- 2,000 fictional students (the on_auth_user_created trigger creates their students rows)
insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
                        created_at, updated_at, confirmation_token, email_change,
                        email_change_token_new, recovery_token)
select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       'load.' || g || '@example.test', '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('account_type', 'student', 'full_name', 'Load Student ' || g,
                          'grade_level', 11 + g % 2, 'section', 'LOAD-' || (g % 40),
                          'class_adviser', 'Adviser ' || (g % 40)),
       now(), now(), '', '', '', ''
from generate_series(1, 2000) g;

-- 2,000 support requests over the last 120 days, in every status, one per load student
insert into public.support_requests (student_id, disclosed, status, concern_type, follow_up_at, created_at)
select s.id,
       jsonb_build_object('full_name', s.full_name, 'grade_level', s.grade_level,
                          'section', s.section, 'class_adviser', s.class_adviser,
                          'c1', 3, 'c2', 3, 'c3', 3, 'c4', 3),
       (array['pending', 'reviewed', 'referred', 'resolved'])[1 + (row_number() over () % 4)::int],
       (array['academic', 'peer', 'family', 'wellness'])[1 + (row_number() over () % 4)::int],
       case when row_number() over () % 5 = 0 then now() - interval '1 day' end,
       now() - (row_number() over () % 120) * interval '1 day'
from public.students s
where s.full_name like 'Load Student %';

insert into public.triage_decisions (request_id, score, band)
select x.id, case when x.band = 'FR' then null else 2.5 end, x.band
from (
  select r.id, (array['P1', 'P2', 'P3', 'FR'])[1 + (row_number() over () % 4)::int] as band
  from public.support_requests r
  join public.students s on s.id = r.student_id
  where s.full_name like 'Load Student %'
) x;

-- Two audit rows per request (an opening and a status change), as the dashboard leaves them
insert into public.staff_access_audit (actor_id, request_id, action, created_at)
select '55555555-5555-4555-8555-555555555555', r.id, a.action, r.created_at + interval '1 hour'
from public.support_requests r
join public.students s on s.id = r.student_id
cross join (values ('view_request'), ('state_change')) a(action)
where s.full_name like 'Load Student %';

analyze public.students, public.support_requests, public.triage_decisions, public.staff_access_audit;

-- The query the queue screen runs (useSupportQueue QUEUE_COLUMNS), as guidance at aal2
set local request.jwt.claims = '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated","aal":"aal2"}';
set local role authenticated;

select is((select count(*)::int from public.support_queue where full_name like 'Load Student %'),
          2000, 'guidance sees all 2,000 load requests');

do $$
declare
  t0 timestamptz := clock_timestamp();
  n bigint;
begin
  -- sum over the whole row so that every column, including the subqueries, is computed
  select sum(length(row(q.*)::text)) into n
  from (
    select id, created_at, status, concern_type, follow_up_at, full_name, grade_level, section,
           class_adviser, band, has_other_open_request, first_contact_at, is_overdue
    from public.support_queue
  ) q;
  perform set_config('hw.queue_ms',
                     round(extract(epoch from clock_timestamp() - t0) * 1000)::text, true);
end $$;

select diag('support_queue at pilot scale: ' || current_setting('hw.queue_ms') || ' ms');
select cmp_ok(current_setting('hw.queue_ms')::int, '<', 1000,
              'request list returns within 1 second at pilot scale (2.1.6.1.3)');
reset role;

select * from finish();
rollback;
```

```bash
npx supabase migration up   # applies the new migration to the local database
npm run test:db             # all eight database test files pass; 08 prints the measured time
```

### Step 5 — Tests that survive real values

When the team fills in the scoring values, the check-in items, the assent wording, and the translations, the old tests that pinned the manuscript's example numbers or the placeholder strings would fail. These versions check the example numbers only while `PROVISIONAL` is true, compare against the config instead of fixed numbers, and check that every Cebuano and Tagalog key exists and is filled (a value that is still a placeholder must name its own key).

**`scripts/ahp.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { analyse, combine, parseEntry, toMatrix, weightsFrom, weightsLine } from './ahp.js';
import { PROVISIONAL, WEIGHTS } from '../supabase/functions/_shared/scoring-config.js';

const example = JSON.parse(readFileSync('scripts/ahp.example.json', 'utf8'));

describe('scripts/ahp.js (2.2.2.2; N-04)', () => {
  it('reproduces the Table 7 worked example', () => {
    const { raters, combined } = analyse(example);
    const r = raters[0];
    expect(r.weights).toEqual([0.2616, 0.4531, 0.1182, 0.1671]);
    expect(r.lambdaMax).toBe(4.0709);
    expect(r.ci).toBe(0.0236);
    expect(r.cr).toBe(0.0262);
    expect(r.acceptable).toBe(true);
    // N-04: the recomputed ratios (the manuscript prints 4.0472, 4.0437, 4.0912, 4.1013)
    expect(r.ratios).toEqual([4.0475, 4.0439, 4.0917, 4.1004]);
    expect(combined).toEqual(r.weights);
  });

  // Only while scoring-config.js still holds the Table 7 placeholder weights (Phase 10).
  it.runIf(PROVISIONAL === true)('matches the provisional weights in scoring-config.js', () => {
    expect(analyse(example).combined).toEqual([WEIGHTS.c1, WEIGHTS.c2, WEIGHTS.c3, WEIGHTS.c4]);
  });

  it('gives CR 0.0265 with RI 0.89', () => {
    expect(analyse(example, 0.89).raters[0].cr).toBe(0.0265);
  });

  it('combining two raters equals the geometric mean of their judgments', () => {
    const a = toMatrix(example.raters[0].matrix);
    const b = toMatrix([
      [1, 1, 3, 2],
      [1, 1, 2, 2],
      ['1/3', '1/2', 1, 1],
      ['1/2', '1/2', 1, 1],
    ]);
    const c = combine([a, b]);
    expect(c[0][1]).toBeCloseTo(Math.sqrt(0.5 * 1), 12);
    expect(c[1][0] * c[0][1]).toBeCloseTo(1, 12);
    const w = weightsFrom(c);
    expect(w.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 12);
  });

  it('rejects a matrix that is not reciprocal or not 4x4', () => {
    expect(() =>
      toMatrix([
        [1, 2],
        [0.5, 1],
      ]),
    ).toThrow(/4 rows/);
    expect(() =>
      toMatrix([
        [1, 2, 1, 1],
        [2, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 1, 1, 1],
      ]),
    ).toThrow(/reciprocals/);
    expect(() => parseEntry('two')).toThrow();
  });

  it('flags a rater whose CR is 0.10 or more', () => {
    const bad = analyse({
      raters: [
        {
          name: 'inconsistent',
          matrix: [
            [1, 9, '1/9', 9],
            ['1/9', 1, 9, '1/9'],
            [9, '1/9', 1, 9],
            ['1/9', 9, '1/9', 1],
          ],
        },
      ],
    });
    expect(bad.raters[0].acceptable).toBe(false);
  });

  it('prints a WEIGHTS line in the scoring-config.js shape', () => {
    expect(weightsLine([0.2616, 0.4531, 0.1182, 0.1671])).toBe(
      'export const WEIGHTS = Object.freeze({ c1: 0.2616, c2: 0.4531, c3: 0.1182, c4: 0.1671 });',
    );
  });
});
```

**`src/config/checkin-items.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { CHECKIN_ITEMS, CHECKIN_ITEMS_STATUS, storedValue, tappedValue } from './checkin-items.js';
import { checkinCopy } from '../copy/en/checkin.js';

describe('check-in items (00 Section 6.3; D-08, D-09)', () => {
  it('has the six columns in screen order and a known status', () => {
    expect(CHECKIN_ITEMS.map((i) => i.column)).toEqual(['c1', 'c2', 'c3', 'c4', 'mood', 'stress']);
    // 'final' only after co-design (2.1.5.1.3); build:pilot checks it (Phase 10: test accepts both).
    expect(['provisional', 'final']).toContain(CHECKIN_ITEMS_STATUS);
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
  it('ceb and tl have exactly the English assent keys, all as team text or its placeholder', () => {
    const keys = Object.keys(assentCopy).sort();
    expect(Object.keys(ceb.assent).sort()).toEqual(keys);
    expect(Object.keys(tl.assent).sort()).toEqual(keys);
    for (const k of keys) {
      // Each value is the team's text, or (until filled) the placeholder for exactly this key.
      for (const [dict, code] of [
        [ceb, 'CEB'],
        [tl, 'TL'],
      ]) {
        const value = dict.assent[k];
        expect(typeof value === 'string' && value.trim().length > 0).toBe(true);
        if (value.startsWith('[[')) expect(value).toBe(`[[TEAM:${code}:assent.${k}]]`);
      }
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
    expect(screen.getByRole('heading', { level: 1, name: ceb.assent.title })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Tagalog' }));
    expect(screen.getByRole('heading', { level: 1, name: tl.assent.title })).toBeInTheDocument();
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
    await userEvent.click(screen.getByLabelText(tl.assent.understand));
    await userEvent.click(screen.getByRole('button', { name: tl.assent.continue }));
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
  it('ceb and tl have exactly the English crisis keys, all as team text or its placeholder', () => {
    const keys = Object.keys(crisisCopy).sort();
    expect(Object.keys(ceb.crisis).sort()).toEqual(keys);
    expect(Object.keys(tl.crisis).sort()).toEqual(keys);
    for (const k of keys) {
      // Each value is the team's text, or (until filled) the placeholder for exactly this key.
      for (const [dict, code] of [
        [ceb, 'CEB'],
        [tl, 'TL'],
      ]) {
        const value = dict.crisis[k];
        expect(typeof value === 'string' && value.trim().length > 0).toBe(true);
        if (value.startsWith('[[')) expect(value).toBe(`[[TEAM:${code}:crisis.${k}]]`);
      }
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
    expect(screen.getByRole('heading', { level: 1, name: ceb.crisis.title })).toBeInTheDocument();
    expect(container.querySelector('[lang="ceb"]')).not.toBeNull();
    await user.click(screen.getByRole('radio', { name: 'Tagalog' }));
    expect(screen.getByText(tl.crisis.lead)).toBeInTheDocument();
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

**`src/lib/time.test.js`**

```js
import { describe, it, expect } from 'vitest';
import {
  firstContactDueDate,
  firstSchoolDayFor,
  formatSchoolDate,
  holidaysConfigured,
  isFirstContactLate,
  isSchoolDay,
  manilaDate,
  nextSchoolDay,
  officeStatus,
  parseHHMM,
} from './time.js';
import { SITE } from '../config/site.js';

// 12 Oct 2026 is a Monday. Manila is UTC+8.
const site = {
  ...SITE,
  officeOpens: '08:00',
  officeCloses: '17:00',
  holidays: ['2026-10-14'],
};
// The office's values before the guidance office fills them in (kept here so this test still
// passes after src/config/site.js has real hours and holidays).
const unfilled = {
  ...SITE,
  officeOpens: '[[GUIDANCE:office_opens_hhmm]]',
  officeCloses: '[[GUIDANCE:office_closes_hhmm]]',
  holidays: ['[[GUIDANCE:holiday_dates_iso]]'],
};
const manila = (date, hhmm) => new Date(`${date}T${hhmm}:00+08:00`);

describe('time.js (2.1.7.3; 2.1.3.8)', () => {
  it('reads HH:MM and ignores placeholders', () => {
    expect(parseHHMM('08:30')).toBe(510);
    expect(parseHHMM('[[GUIDANCE:office_opens_hhmm]]')).toBeNull();
    expect(holidaysConfigured(unfilled)).toBe(false);
    expect(holidaysConfigured(site)).toBe(true);
  });

  it('uses the Manila calendar date', () => {
    expect(manilaDate('2026-10-11T17:00:00Z')).toBe('2026-10-12'); // 1 AM Monday in Manila
  });

  it('knows school days, weekends, and holidays', () => {
    expect(isSchoolDay('2026-10-12', site)).toBe(true);
    expect(isSchoolDay('2026-10-17', site)).toBe(false); // Saturday
    expect(isSchoolDay('2026-10-14', site)).toBe(false); // holiday
    expect(nextSchoolDay('2026-10-16', site)).toBe('2026-10-19'); // Friday -> Monday
    expect(nextSchoolDay('2026-10-13', site)).toBe('2026-10-15'); // skips the holiday
  });

  it('says open, closed, or unknown', () => {
    expect(officeStatus(manila('2026-10-12', '09:00'), site)).toBe('open');
    expect(officeStatus(manila('2026-10-12', '18:30'), site)).toBe('closed');
    expect(officeStatus(manila('2026-10-17', '09:00'), site)).toBe('closed');
    expect(officeStatus(manila('2026-10-12', '09:00'), unfilled)).toBe('unknown');
    expect(officeStatus(manila('2026-10-17', '09:00'), unfilled)).toBe('closed');
  });

  it('starts the clock on the next school day after hours, weekends, and holidays', () => {
    expect(firstSchoolDayFor(manila('2026-10-12', '10:00'), site)).toBe('2026-10-12');
    expect(firstSchoolDayFor(manila('2026-10-12', '17:30'), site)).toBe('2026-10-13');
    expect(firstSchoolDayFor(manila('2026-10-17', '10:00'), site)).toBe('2026-10-19');
    expect(firstSchoolDayFor(manila('2026-10-12', '17:30'), unfilled)).toBe('2026-10-12'); // hours unknown
  });

  it('first contact is due by the third school day', () => {
    expect(firstContactDueDate(manila('2026-10-12', '10:00'), site)).toBe('2026-10-15'); // Mon, Tue, (holiday), Thu
    expect(firstContactDueDate(manila('2026-10-16', '10:00'), site)).toBe('2026-10-20'); // Fri, Mon, Tue
  });

  it('is late only after the due day ends and only with no first contact', () => {
    const at = manila('2026-10-16', '10:00');
    expect(isFirstContactLate(at, null, manila('2026-10-20', '16:00'), site)).toBe(false);
    expect(isFirstContactLate(at, null, manila('2026-10-21', '08:00'), site)).toBe(true);
    expect(
      isFirstContactLate(at, '2026-10-16T05:00:00Z', manila('2026-10-30', '08:00'), site),
    ).toBe(false);
  });

  it('formats a school date', () => {
    expect(formatSchoolDate('2026-10-19')).toBe('Monday, 19 October 2026');
  });
});
```

**`supabase/functions/_shared/saw.test.js`**

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
  it('the weights sum to 1 and thresholds are ordered', () => {
    expect(() => validateConfig(CONFIG)).not.toThrow();
  });
});

// The manuscript's worked examples use the PLACEHOLDER weights and thresholds. They run while
// scoring-config.js is still provisional and are skipped after the scoring session replaces the
// values (Phase 10), so changing the config never breaks the build.
const PLACEHOLDER = CONFIG.PROVISIONAL === true;

describe.runIf(PLACEHOLDER)('Equation 1 — manuscript 2.2.2.3 worked examples', () => {
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

describe.runIf(PLACEHOLDER)('625-profile enumeration (manuscript 2.2.2.3, gray zone off)', () => {
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
  it.runIf(PLACEHOLDER)('a score near a threshold goes to For Review, never auto-labelled', () => {
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
  it.runIf(PLACEHOLDER)('the C4 floor to P1 is off until the raters decide', () => {
    expect(firedGuardrails(r(1, 1, 1, 5), CONFIG.GUARDRAILS)).toEqual(['anySingleAtMax']);
  });
});

describe('check-in prompt (2.1.5.1.7; N-01)', () => {
  it('max_sev when any criterion is 5', () => {
    expect(checkinPrompt(r(1, 1, 1, 5), CONFIG)).toBe('max_sev');
  });
  it.runIf(PLACEHOLDER)('gray_zone when the score sits near a threshold', () => {
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

**`supabase/functions/evaluate-checkin/handler.test.js`**

```js
import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import * as config from '../_shared/scoring-config.js';
import { makeEvaluateCheckin } from './handler.js';
import { checkinPrompt } from '../_shared/saw.js';

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
    { c1: 1, c2: 1, c3: 1, c4: 5 },
    { c1: 2, c2: 2, c3: 2, c4: 3 },
    { c1: 1, c2: 1, c3: 1, c4: 1 },
    { c1: 4, c2: 3, c3: 2, c4: 2 },
  ])('ratings %j give exactly the prompt saw.js decides, and nothing else', async (row) => {
    const { handler } = setup({ data: row, error: null });
    const res = await handler(post({ checkin_id: ID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ prompt: checkinPrompt(row, config) });
    expect(Object.keys(body)).toEqual(['prompt']); // never a score, band, or rule
  });

  // With the placeholder values (Phase 10: skipped once the scoring session sets real ones).
  it.runIf(config.PROVISIONAL === true)(
    'placeholder values: max_sev, gray_zone, null',
    async () => {
      for (const [row, prompt] of [
        [{ c1: 1, c2: 1, c3: 1, c4: 5 }, 'max_sev'],
        [{ c1: 2, c2: 2, c3: 2, c4: 3 }, 'gray_zone'],
        [{ c1: 1, c2: 1, c3: 1, c4: 1 }, null],
      ]) {
        const { handler } = setup({ data: row, error: null });
        expect(await (await handler(post({ checkin_id: ID }))).json()).toEqual({ prompt });
      }
    },
  );
});
```

**`supabase/functions/submit-support-request/handler.test.js`**

```js
import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import * as config from '../_shared/scoring-config.js';
import { makeSubmitSupportRequest } from './handler.js';
import { triage } from '../_shared/saw.js';

const UID = '11111111-1111-4111-8111-111111111111';
const CID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const RID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

function setup({
  user = { data: { user: { id: UID } }, error: null },
  latest = { data: { id: CID, c1: 5, c2: 5, c3: 1, c4: 1 }, error: null },
  rpc = { data: { request_id: RID, created_at: '2026-10-12T01:00:00Z' }, error: null },
} = {}) {
  const calls = [];
  const q = {
    select: (...a) => (calls.push(['select', ...a]), q),
    order: (...a) => (calls.push(['order', ...a]), q),
    limit: (...a) => (calls.push(['limit', ...a]), q),
    maybeSingle: async () => latest,
  };
  const userClient = {
    auth: { getUser: vi.fn(async () => user) },
    from: (t) => (calls.push(['from', t]), q),
  };
  const service = { rpc: vi.fn(async () => rpc) };
  const makeUserClient = vi.fn(() => userClient);
  const makeServiceClient = vi.fn(() => service);
  const handler = makeSubmitSupportRequest({ z, makeUserClient, makeServiceClient, config });
  return { handler, calls, service, makeServiceClient, userClient };
}

const post = (body, auth = 'Bearer student-jwt') =>
  new Request('http://local/submit-support-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
    body: JSON.stringify(body),
  });
const BODY = { checkin_id: CID, concern_type: 'academic', note: 'my own words' };

describe('submit-support-request (2.1.5.1.6; 2.1.6.1.4)', () => {
  it('needs a JWT and an exact body', async () => {
    const { handler, makeServiceClient } = setup();
    expect((await handler(post(BODY, null))).status).toBe(401);
    expect((await handler(post({ ...BODY, band: 'P1' }))).status).toBe(400);
    expect((await handler(post({ ...BODY, concern_type: 'future' }))).status).toBe(400);
    expect((await handler(post({ ...BODY, note: 'x'.repeat(2001) }))).status).toBe(400);
    expect(makeServiceClient).not.toHaveBeenCalled();
  });

  it('reads the latest check-in as the student', async () => {
    const { handler, calls, userClient } = setup();
    await handler(post(BODY));
    expect(userClient.auth.getUser).toHaveBeenCalledWith('student-jwt');
    expect(calls).toEqual([
      ['from', 'checkins'],
      ['select', 'id, c1, c2, c3, c4'],
      ['order', 'created_at', { ascending: false }],
      ['limit', 1],
    ]);
  });

  it('refuses when the student was shown a different check-in than the latest', async () => {
    const { handler, service } = setup();
    const res = await handler(post({ ...BODY, checkin_id: null }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'stale_checkin' });
    expect(service.rpc).not.toHaveBeenCalled();
  });

  it('saves the SAW decision server-side and returns only the reference', async () => {
    const { handler, service } = setup();
    const res = await handler(post(BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ request_id: RID, created_at: '2026-10-12T01:00:00Z' });
    const [name, args] = service.rpc.mock.calls[0];
    expect(name).toBe('create_support_request');
    const decision = triage({ c1: 5, c2: 5, c3: 1, c4: 1 }, config);
    expect(args).toEqual({
      p_student_id: UID,
      p_checkin_id: CID,
      p_note: 'my own words',
      p_concern_type: 'academic',
      p_score: decision.score,
      p_band: decision.band,
      p_guardrails: decision.guardrails,
    });
    if (config.PROVISIONAL === true) {
      // Manuscript worked example (5, 5, 1, 1) with the placeholder values.
      expect([args.p_score, args.p_band]).toEqual([3.8588, 'P1']);
      expect(args.p_guardrails.fired).toEqual(['anySingleAtMax', 'twoOrMoreHigh']);
    }
  });

  it('with no check-in, sends For Review with no score', async () => {
    const { handler, service } = setup({ latest: { data: null, error: null } });
    const res = await handler(post({ ...BODY, checkin_id: null, note: null }));
    expect(res.status).toBe(200);
    expect(service.rpc.mock.calls[0][1]).toMatchObject({
      p_checkin_id: null,
      p_score: null,
      p_band: 'FR',
      p_note: null,
    });
  });

  it.each([
    ['40001', 409, 'stale_checkin'],
    ['42501', 403, 'not_allowed'],
    ['P0002', 403, 'not_allowed'],
    ['XX000', 500, 'save_failed'],
  ])('maps database error %s to %i %s, never a raw message', async (code, status, error) => {
    const { handler } = setup({ rpc: { data: null, error: { code, message: 'secret detail' } } });
    const res = await handler(post(BODY));
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ error });
  });
});
```

### Step 6 — Vercel build and headers

**`scripts/vercel-build.js`**

```js
// Phase 10 · the build Vercel runs. Production deployments (the pilot) use build:pilot, which
// refuses to build while any placeholder, provisional scoring value, provisional check-in item,
// or provisional assent wording remains (00 Section 11.3). Preview deployments use the normal
// build so the team can test before those are final.
import { execSync } from 'node:child_process';

const production = process.env.VERCEL_ENV === 'production';
console.log(`vercel-build: ${production ? 'production -> build:pilot' : 'preview -> build'}`);
try {
  execSync(production ? 'npm run build:pilot' : 'npm run build', { stdio: 'inherit' });
} catch {
  console.error('vercel-build: build failed (see the messages above)');
  process.exit(1);
}
```

**`vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build:vercel",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Referrer-Policy",
          "value": "no-referrer"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()"
        },
        {
          "key": "Cross-Origin-Opener-Policy",
          "value": "same-origin"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(sw.js|index.html)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache"
        }
      ]
    }
  ]
}
```

What the headers do: the Content-Security-Policy allows scripts, styles, fonts, and images only from the site itself (inline styles are allowed because React sets `style` attributes) and network calls only to the site and `*.supabase.co` (HTTPS and secure WebSocket for Realtime). There are no third-party scripts to allow (00 must-never 13). HSTS and `upgrade-insecure-requests` keep every request on HTTPS (2.1.6.2.4). `frame-ancestors 'none'` and `X-Frame-Options: DENY` stop other sites from framing HingaWeb. `Referrer-Policy: no-referrer` keeps page addresses (which contain request ids) out of other sites' logs. Built files are cached for a year because their names change on every build; `index.html` and `sw.js` are never cached, so a new deployment is picked up at once.

### Step 7 — CI and keep-alive

**`.github/workflows/ci.yml`** — uses no secrets

```yaml
# Phase 10 · runs every check on each push and pull request. No secrets are used or needed.
name: CI
on:
  push:
    branches: [main]
  pull_request:
permissions:
  contents: read
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run verify
```

**`.github/workflows/keep-alive.yml`**

```yaml
# Phase 10 · 2.1.6.4.2: one lightweight database query a day, so the Supabase free tier never
# pauses for inactivity. It reads one published resource id with the PUBLISHABLE key (the same
# public read Tier 1 visitors make). If the query fails, the run fails and GitHub emails the repo
# owner: that is the pause monitoring. Secrets: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY.
name: Keep-alive
on:
  schedule:
    - cron: '17 1 * * *' # 09:17 Manila, every day
  workflow_dispatch:
permissions:
  contents: read
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Query the database once
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_PUBLISHABLE_KEY: ${{ secrets.SUPABASE_PUBLISHABLE_KEY }}
        run: |
          test -n "$SUPABASE_URL" && test -n "$SUPABASE_PUBLISHABLE_KEY"
          curl --fail --silent --show-error --max-time 30 \
            "$SUPABASE_URL/rest/v1/resources?select=id&limit=1" \
            -H "apikey: $SUPABASE_PUBLISHABLE_KEY" -o /dev/null
          echo "Database answered at $(date -u +%FT%TZ)"
```

### Step 8 — Backup script, runbook, performance spec

**`scripts/backup.js`**

```js
// Phase 10 · 2.1.6.4.3 weekly backup, run by the custodian (the proponent who holds the
// administrator role) on their own computer. The dump never passes through GitHub or any
// third-party service: it goes straight from Supabase to an encrypted file in the folder you name,
// which must be storage the school controls.
//
//   Back up:  SUPABASE_DB_URL=... BACKUP_PASSPHRASE=... node scripts/backup.js --out "<school folder>"
//   Decrypt:  BACKUP_PASSPHRASE=... node scripts/backup.js --decrypt <file.hwbak> --out <empty folder>
//
// The backup is three `supabase db dump` files (roles, schema, data) bundled and encrypted with
// AES-256-GCM. The key comes from the passphrase through scrypt. `supabase db dump` runs pg_dump in a
// Docker container, so Docker Desktop must be running. Plain dumps are written only to
// a private temporary folder and deleted at the end, even on failure.
// Storage files are not included (2.1.6.4.3): HingaWeb stores no student files.
import { execFileSync } from 'node:child_process';
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const MAGIC = Buffer.from('HWB1');
const FILES = ['roles.sql', 'schema.sql', 'data.sql'];
export const MIN_PASSPHRASE = 16;

function keyFrom(passphrase, salt) {
  return scryptSync(passphrase, salt, 32, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
}

/** files: { name: string contents } -> encrypted Buffer (MAGIC | salt16 | iv12 | tag16 | ciphertext). */
export function encryptBundle(files, passphrase) {
  if (!passphrase || passphrase.length < MIN_PASSPHRASE) {
    throw new Error(`BACKUP_PASSPHRASE must be at least ${MIN_PASSPHRASE} characters`);
  }
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFrom(passphrase, salt), iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify({ version: 1, files }), 'utf8'),
    cipher.final(),
  ]);
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), body]);
}

/** Encrypted Buffer -> { name: contents }. Throws on a wrong passphrase or a damaged file. */
export function decryptBundle(buf, passphrase) {
  if (!buf.subarray(0, 4).equals(MAGIC)) throw new Error('Not a HingaWeb backup file');
  const salt = buf.subarray(4, 20);
  const iv = buf.subarray(20, 32);
  const tag = buf.subarray(32, 48);
  const decipher = createDecipheriv('aes-256-gcm', keyFrom(passphrase, salt), iv);
  decipher.setAuthTag(tag);
  const text = Buffer.concat([decipher.update(buf.subarray(48)), decipher.final()]).toString(
    'utf8',
  );
  return JSON.parse(text).files;
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}

function run() {
  const passphrase = process.env.BACKUP_PASSPHRASE;
  const out = arg('--out');
  if (!out) throw new Error('Give --out <folder>');

  const encrypted = arg('--decrypt');
  if (encrypted) {
    mkdirSync(out, { recursive: true });
    if (readdirSync(out).length) throw new Error(`${out} must be empty`);
    const files = decryptBundle(readFileSync(encrypted), passphrase);
    for (const [name, text] of Object.entries(files))
      writeFileSync(join(out, name), text, { mode: 0o600 });
    console.log(`backup: decrypted ${Object.keys(files).join(', ')} into ${out}`);
    return;
  }

  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl)
    throw new Error('Set SUPABASE_DB_URL (Supabase → Connect → Session pooler connection string)');
  if (!passphrase || passphrase.length < MIN_PASSPHRASE) {
    throw new Error(`Set BACKUP_PASSPHRASE (at least ${MIN_PASSPHRASE} characters)`);
  }
  if (!existsSync(out)) throw new Error(`${out} does not exist`);

  const work = mkdtempSync(join(tmpdir(), 'hingaweb-backup-'));
  try {
    const dump = (file, extra) =>
      execFileSync(
        'npx',
        ['supabase', 'db', 'dump', '--db-url', dbUrl, '-f', join(work, file), ...extra],
        {
          stdio: ['ignore', 'inherit', 'inherit'],
          shell: process.platform === 'win32',
        },
      );
    dump('roles.sql', ['--role-only']);
    dump('schema.sql', []);
    dump('data.sql', ['--use-copy', '--data-only']);
    const files = Object.fromEntries(FILES.map((f) => [f, readFileSync(join(work, f), 'utf8')]));
    const stamp = new Date().toISOString().slice(0, 10);
    const target = join(out, `hingaweb-${stamp}.hwbak`);
    const buf = encryptBundle(files, passphrase);
    writeFileSync(target, buf, { mode: 0o600 });
    const sha = createHash('sha256').update(buf).digest('hex');
    console.log(`backup: wrote ${target}`);
    console.log(`backup: sha256 ${sha}`);
    console.log(
      `backup: data.sql has auth.users rows: ${/COPY "?auth"?\."?users"?/i.test(files['data.sql']) ? 'yes' : 'NO - see the runbook'}`,
    );
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

if (process.argv[1] && process.argv[1].endsWith('backup.js')) {
  try {
    run();
  } catch (e) {
    console.error(`backup: ${e.message}`);
    process.exit(1);
  }
}
```

**`scripts/backup.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { decryptBundle, encryptBundle } from './backup.js';

const FILES = {
  'roles.sql': '-- roles',
  'schema.sql': 'create table x();',
  'data.sql': 'COPY "auth"."users" ...',
};
const PASS = 'correct horse battery staple';

describe('scripts/backup.js (2.1.6.4.3)', () => {
  it('round-trips the three dump files', () => {
    const buf = encryptBundle(FILES, PASS);
    expect(buf.subarray(0, 4).toString()).toBe('HWB1');
    expect(buf.toString('utf8')).not.toContain('create table');
    expect(decryptBundle(buf, PASS)).toEqual(FILES);
  });

  it('uses a fresh salt and IV each time', () => {
    expect(encryptBundle(FILES, PASS).equals(encryptBundle(FILES, PASS))).toBe(false);
  });

  it('refuses a short passphrase, a wrong passphrase, and a damaged file', () => {
    expect(() => encryptBundle(FILES, 'short')).toThrow(/at least 16/);
    const buf = encryptBundle(FILES, PASS);
    expect(() => decryptBundle(buf, 'wrong passphrase here!')).toThrow();
    const damaged = Buffer.from(buf);
    damaged[damaged.length - 1] ^= 1;
    expect(() => decryptBundle(damaged, PASS)).toThrow();
    expect(() => decryptBundle(Buffer.from('nope'), PASS)).toThrow(/Not a HingaWeb backup/);
  });
});
```

**`docs/runbook.md`**

````markdown
# HingaWeb pilot runbook

For the proponent who holds the administrator role (the custodian, 2.1.6.4.3), under the research
adviser's supervision. Every task here is manual unless it says "automatic".

## 1. Every day — keep-alive (automatic, 2.1.6.4.2)

- `.github/workflows/keep-alive.yml` runs once a day and reads one published resource id.
- GitHub → repository → Settings → Secrets and variables → Actions → add `SUPABASE_URL` and
  `SUPABASE_PUBLISHABLE_KEY` (the same two values Vercel uses).
- If a run fails, GitHub emails the repository owner. Open the Supabase dashboard: if the project
  says **Paused**, press **Restore**, then re-run the workflow (Actions → Keep-alive → Run workflow).
  Write the date in `docs/questions.md` under "Pause events".
- **Monthly:** GitHub turns off scheduled workflows after 60 days with no repository activity.
  Open Actions → Keep-alive and make sure it is enabled and its last run is green.

## 2. Every week — encrypted backup (2.1.6.4.3)

Needs: Node 24, this repository, **Docker Desktop running** (`supabase db dump` runs `pg_dump` inside
a container, the same Docker you use for the local stack), and a folder that the **school** controls
(for example a synced school drive folder): `[[SCHOOL:backup_storage_location]]`.

1. Supabase → **Connect** → copy the **Session pooler** connection string (includes the database
   password). Never commit it, never paste it in chat.
2. Choose a passphrase of at least 16 characters. Keep it in the school's password store, not in a
   file next to the backups. Without it no backup can be read.
3. Run (one line, in a terminal):

   ```bash
   SUPABASE_DB_URL='<connection string>' BACKUP_PASSPHRASE='<passphrase>' npm run backup -- --out '<school folder>'
   ```

   On Windows PowerShell set the two values with `$env:SUPABASE_DB_URL='...'` and
   `$env:BACKUP_PASSPHRASE='...'`, then run `npm run backup -- --out '<school folder>'`.

4. Check the output: a file `hingaweb-YYYY-MM-DD.hwbak`, its sha256, and
   `data.sql has auth.users rows: yes`. If it says **NO**, the student accounts were not exported:
   stop and raise it in `docs/questions.md` before relying on the backups.
5. Write the date, file name, and sha256 in the backup log the adviser keeps.
6. Keep exports only as long as the pilot needs them (2.1.6.2.5):
   `[[SCHOOL:backup_retention_rule]]`. Delete older files from the school folder.

The plain SQL never touches your disk outside a private temporary folder, and that folder is
deleted when the script ends. Storage files are not included; HingaWeb stores no student files.

## 3. Once per term — restore test (2.1.6.4.3)

Never restore into the live project. Use a throw-away project.

1. Supabase → **New project** → name `hingaweb-restore-test`, same region. Copy its Session pooler
   connection string.
2. Decrypt the newest backup into an **empty** folder outside the repository:

   ```bash
   BACKUP_PASSPHRASE='<passphrase>' npm run backup -- --decrypt '<file.hwbak>' --out '<empty folder>'
   ```

3. Restore with `psql` (PostgreSQL client tools):

   ```bash
   psql --single-transaction --variable ON_ERROR_STOP=1 \
     --file roles.sql --file schema.sql \
     --command 'SET session_replication_role = replica' \
     --file data.sql \
     --dbname '<restore-test connection string>'
   ```

4. In the restore project's SQL editor compare counts with the live project:
   `select (select count(*) from public.students) as students, (select count(*) from public.support_requests) as requests, (select count(*) from public.staff_access_audit) as audit;`
   They must match the live counts taken at the backup time (small differences only from activity after it).
5. Record the result in the backup log. **Delete the restore-test project** and the decrypted folder.

## 4. Every month — availability report (2.1.6.4.1)

- Set up any external uptime monitor that checks every 5 minutes:
  - the site: `https://<your domain>/help`
  - the database: `https://<project>.supabase.co/rest/v1/resources?select=id&limit=1` with header
    `apikey: <publishable key>`
- Each month record the uptime % of both. Record outages caused by Vercel or Supabase separately
  (do not leave them out). Target: 99.0 % each, excluding announced maintenance.

## 5. Crisis text-message channel (Capstone 2, 2.1.6.1.6)

When the SMS gateway exists: `npx supabase secrets set SMS_GATEWAY_URL=... SMS_GATEWAY_TOKEN=... ONCALL_CONTACT_NUMBER=...`.
Test with a TEST student account on a preview deployment: tick a crisis item and confirm the on-duty
phone receives "HingaWeb: a crisis event was raised (Ref ...). Open the crisis channel now."

## 6. Scoring session (2.2.2.2–2.2.2.3)

1. Put each rater's 4×4 matrix in a JSON file shaped like `scripts/ahp.example.json` (keep it out of
   the repository if your ethics rules require).
2. `npm run ahp -- <file.json>`; re-elicit any rater whose CR is 0.10 or more.
3. Paste the printed `WEIGHTS` line into `supabase/functions/_shared/scoring-config.js`; set the
   agreed `THRESHOLDS`, `GRAY_ZONE_HALF_WIDTH`, guardrails, and `MAX_SEV_RULE`; set
   `PROVISIONAL = false`; update `SCORING_SOURCE`.
4. `npm run verify` (the manuscript's placeholder-number tests skip themselves once
   `PROVISIONAL` is false), then deploy the functions:
   `npx supabase functions deploy evaluate-checkin submit-support-request`.
   Requests saved earlier keep the rule set they were scored with (N-06).

## 7. Going live (production deployment)

Vercel runs `npm run build:vercel`. Preview deployments build normally. **Production runs
`build:pilot`**, which refuses to build until every placeholder is filled, `PROVISIONAL` is false,
`CHECKIN_ITEMS_STATUS` is `'final'`, and `ASSENT_COPY_STATUS` is `'final'`. See the Phase 10
pilot checklist.

## 8. End of the pilot (2.1.6.2.5)

Unless the school takes over the system:

1. Take a final backup only if the adviser asks for one for the study record.
2. Supabase → Project settings → **Delete project** (removes the database, auth users, and
   Supabase's own backups).
3. Delete every `.hwbak` file from the school folder, and the backup passphrase.
4. Vercel → project → Settings → **Delete project**. Remove the GitHub Actions secrets.
5. Record the dates in the study log. Data-protection questions go to the person the school names:
   `[[SCHOOL:data_protection_officer]]`.
````

**`e2e/phase-10/performance.spec.js`**

```js
import { test, expect } from '@playwright/test';
import { totp } from '../../scripts/totp.js';

// Phase 10 · 2.1.6.1.1: core views reach first contentful paint within 3 s and become usable within
// 5 s on 1 Mbps down / 0.5 Mbps up / 400 ms round trip; median of five runs per view.
// Runs ONLY against a deployed site (Vercel compresses files; `vite preview` does not), e.g.:
//   PERF_BASE_URL=https://<preview>.vercel.app \
//   PERF_STUDENT_EMAIL=... PERF_STUDENT_PASSWORD=... \
//   PERF_STAFF_EMAIL=... PERF_STAFF_PASSWORD=... PERF_STAFF_TOTP_SECRET=... \
//   npx playwright test e2e/phase-10/performance.spec.js --project=desktop
// Use TEST accounts on a preview deployment, never a real student's account.
const BASE = process.env.PERF_BASE_URL;
test.skip(!BASE, 'set PERF_BASE_URL to a deployed preview to run the performance check');
test.describe.configure({ mode: 'serial', timeout: 180_000 });
test.use({ serviceWorkers: 'block' }); // measure a first visit, not the offline cache

const PROFILE = {
  offline: false,
  latency: 400,
  downloadThroughput: 125_000,
  uploadThroughput: 62_500,
};
const RUNS = 5;
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function measure(context, path, ready) {
  const fcps = [];
  const usable = [];
  for (let i = 0; i < RUNS; i += 1) {
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', PROFILE);
    const start = Date.now();
    await page.goto(new URL(path, BASE).href, { waitUntil: 'commit' });
    await ready(page);
    usable.push(Date.now() - start);
    fcps.push(
      await page.evaluate(
        () => performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? Infinity,
      ),
    );
    await page.close();
  }
  return { fcp: median(fcps), usable: median(usable), fcps, usables: usable };
}

function report(name, r) {
  console.log(`${name}: FCP median ${Math.round(r.fcp)} ms, usable median ${r.usable} ms`, r);
  expect(r.fcp).toBeLessThanOrEqual(3000);
  expect(r.usable).toBeLessThanOrEqual(5000);
}

test('Where to get help (public)', async ({ context }) => {
  report(
    'help',
    await measure(context, '/help', (p) => p.getByRole('heading', { level: 1 }).waitFor()),
  );
});

test('Check-in and resource list (student)', async ({ context, page }) => {
  test.skip(!process.env.PERF_STUDENT_EMAIL, 'set PERF_STUDENT_EMAIL and PERF_STUDENT_PASSWORD');
  await page.goto(new URL('/login', BASE).href);
  await page.getByLabel('School email address').fill(process.env.PERF_STUDENT_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(process.env.PERF_STUDENT_PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL(/\/check-in$/);
  report(
    'check-in',
    await measure(context, '/check-in', (p) =>
      p.getByRole('button', { name: 'Save check-in' }).waitFor(),
    ),
  );
  report(
    'resources',
    await measure(context, '/resources', (p) =>
      p.getByRole('heading', { level: 1, name: 'Suggested for you' }).waitFor(),
    ),
  );
});

test('Guidance request list (staff)', async ({ context, page }) => {
  test.skip(
    !process.env.PERF_STAFF_EMAIL,
    'set PERF_STAFF_EMAIL, PERF_STAFF_PASSWORD, PERF_STAFF_TOTP_SECRET',
  );
  await page.goto(new URL('/staff/login', BASE).href);
  await page.getByLabel('Work email address').fill(process.env.PERF_STAFF_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(process.env.PERF_STAFF_PASSWORD);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page
    .getByLabel('Security verification code')
    .fill(totp(process.env.PERF_STAFF_TOTP_SECRET));
  await page.getByRole('button', { name: 'Verify' }).click();
  await page.waitForURL(/\/staff\/queue$/);
  report(
    'queue',
    await measure(context, '/staff/queue', (p) =>
      p.getByRole('heading', { level: 1, name: 'Support requests' }).waitFor(),
    ),
  );
});
```

Run:

```bash
npm run verify               # 292 tests; ends with check:bundle OK
npm run check:placeholders   # refreshes docs/placeholders.md (133 today: 30 GUIDANCE, 102 TEAM, 1 SCHOOL)
npm run build:pilot          # must FAIL today and list what is missing (see §7.1)
```

The full end-to-end suite runs from a fresh database because the Phase 04, 05, 07, 08, and 09 specs change seed data:

```bash
npx supabase db reset && node scripts/dev-enrol-totp.js
# terminal 2: npx supabase functions serve --env-file supabase/functions/.env
npm run test:e2e -- e2e/phase-02 e2e/phase-03
for p in 04 05 06 07 08 09; do npx supabase db reset && node scripts/dev-enrol-totp.js && npm run test:e2e -- e2e/phase-$p; done
```

(On Windows PowerShell run the loop's three commands once per phase number instead.) `e2e/phase-10` skips itself unless `PERF_BASE_URL` is set (Step 10).

### Step 9 — GitHub

1. Push to `main`. Actions → **CI** runs and passes.
2. Settings → Secrets and variables → Actions → New repository secret: `SUPABASE_URL` (Project settings → Data API → URL) and `SUPABASE_PUBLISHABLE_KEY` (Project settings → API Keys → publishable key). Never add the secret key or the database password.
3. Actions → **Keep-alive** → Run workflow. It passes and prints "Database answered at …".

### Step 10 — Vercel

1. Vercel → Add New → Project → import the GitHub repository. Framework preset: **Vite** (`vercel.json` sets the build command and output folder). Project settings → General → Node.js Version **24.x**. Plan **Hobby**.
2. Settings → Environment Variables, for **Production** and **Preview**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (the same two values as Step 9). Nothing else; never a secret key.
3. Create a `staging` branch and push it. Vercel builds it as a preview with the stable address `https://<project>-git-staging-<team>.vercel.app` (shown under Deployments → Domains). Until go-live this is where the team tests (P10-D9):
   - `npx supabase secrets set ALLOWED_ORIGIN=https://<project>-git-staging-<team>.vercel.app SITE_URL=https://<project>-git-staging-<team>.vercel.app`
   - Supabase → Authentication → URL Configuration: Site URL = that address; Redirect URLs: add `https://<project>-git-staging-<team>.vercel.app/**`.
4. A production deployment of `main` fails until §7.1 is done; that is expected (P10-D8). The build log says exactly what is missing.
5. Performance check on the staging address, with TEST accounts made there (a test student who completed the walkthrough with test consent, and a test guidance account with its authenticator secret):

```bash
PERF_BASE_URL=https://<project>-git-staging-<team>.vercel.app \
PERF_STUDENT_EMAIL=<test student> PERF_STUDENT_PASSWORD=<…> \
PERF_STAFF_EMAIL=<test guidance> PERF_STAFF_PASSWORD=<…> PERF_STAFF_TOTP_SECRET=<…> \
npx playwright test e2e/phase-10/performance.spec.js --project=desktop
```

### Step 11 — Supabase hosted project

1. `npx supabase db push` (applies the queue index). Never run `seed.sql` or `npm run test:db` against it.
2. Check 00 §14 is still true: region Singapore, Free plan, Confirm email on, minimum password length 12, MFA TOTP enabled, JWT expiry 3600.
3. All five functions are deployed: `npx supabase functions deploy evaluate-checkin notify-crisis rank-resources submit-support-request admin-accounts`.
4. Secrets: `npx supabase secrets list` shows `WEBHOOK_SECRET`, `ALLOWED_ORIGIN`, `SITE_URL` (SMS secrets only once the gateway exists).
5. Database → Webhooks shows `notify_crisis` (Phase 05). Database → Publications → `supabase_realtime` lists `crisis_events` only (Phase 01).
6. First weekly backup by the custodian (runbook §2), then a restore test (runbook §3) before real students are invited.

---

## 5. Who can see or do what

No new roles or permissions. New in this phase:

| Thing | Who | Can it read student data? |
|---|---|---|
| CI workflow | GitHub, on every push | No. Uses no secrets and no database |
| Keep-alive workflow | GitHub, daily | Reads one resource id with the publishable key, the same public read a visitor makes |
| `npm run backup` | The custodian only, on their own computer | Yes, the whole database, so it needs the database connection string, and the output is encrypted before it is written to the school folder |
| Vercel | Serves the built site | No. It holds only the publishable key |

---

## 6. Must never (this phase)

1. Never split `CrisisPage`, `CheckInPage`, `HelpPage`, `directory.js`, or the copy files into a lazy chunk.
2. Never raise `BUDGET_BYTES` or remove a core view from `check:bundle` to make it pass; make the view smaller.
3. Never put the secret key, the database password, the webhook secret, or the SMS token in Vercel, in a `VITE_` variable, in GitHub secrets, or in the repository.
4. Never add a backup workflow, or upload a dump or `.hwbak` file to GitHub, chat, or any service the school does not control.
5. Never keep a plain (unencrypted) dump; never store the backup passphrase next to the backups.
6. Never restore a backup into the live project; use a throw-away project and delete it afterwards.
7. Never loosen the Content-Security-Policy (no `unsafe-eval`, no inline scripts, no outside script or font hosts), and never add analytics.
8. Never let a production deployment skip `build:pilot`, and never "fill" a placeholder with a guess to get past it.
9. Never run the performance spec with a real student's or staff member's account; use test accounts on the staging address.
10. Never run `seed.sql`, `npm run test:db`, or `08_queue_load.test.sql` against the hosted project.
11. Never lower a performance threshold (3 s, 5 s, 1 s, 500 KB) in a test.
12. Never delete the hosted project, backups, or the passphrase except at the end of the pilot as runbook §8 describes.

---

## 7. Pilot checklist (before real students are invited)

### 7.1 Fill in and finalise (then `npm run build:pilot` passes)

| Owner | What | Where | How it is checked |
|---|---|---|---|
| GUIDANCE | Office open and close times, holiday dates, room and building, office hours text | `src/config/site.js` | `build:pilot` |
| GUIDANCE | Hotline names, numbers, dial digits, descriptions; guidance person and role; office phone; IPBM description, number, email; external professional | `src/content/directory.js` | `build:pilot` |
| GUIDANCE | The crisis item set and protocol steps | entered on the hosted site at `/admin/reference` (P09-D10), never in code | an administrator sees them listed; a test student sees them on `/check-in` |
| SCHOOL | IT contact for a lost authenticator | `src/config/site.js` | `build:pilot` |
| SCHOOL | Backup storage folder, retention rule, data protection officer | `docs/runbook.md` | read by the custodian (not checked by the build) |
| TEAM | Every Cebuano and Tagalog string, from the team, never machine-translated | `src/copy/ceb.js`, `src/copy/tl.js` | `build:pilot`; `assent.test.jsx`, `crisis.test.jsx` |
| TEAM + validator panel | Assent wording confirmed, then `ASSENT_COPY_STATUS = 'final'` | `src/config/consent.js` | `build:pilot` |
| TEAM + guidance office | Co-designed check-in items, then `CHECKIN_ITEMS_STATUS = 'final'` | `src/config/checkin-items.js` | `build:pilot` |
| TEAM + raters | Scoring session (runbook §6), then `PROVISIONAL = false` | `supabase/functions/_shared/scoring-config.js` | `build:pilot`; `npm run verify` |
| TEAM | Resources added, tagged, verified, and published | `/admin/resources` on the hosted site | they appear on `/guides` |

After the scoring session, redeploy the two scoring functions: `npx supabase functions deploy evaluate-checkin submit-support-request`.

### 7.2 First administrator (once, P10-D10)

1. Supabase → **Authentication → Users → Add user → Create new user**: the custodian's own work email, a password of at least 12 characters that only they know, **Auto Confirm User** ticked. Leave user metadata empty (so no student row is created).
2. Supabase → **SQL Editor**, with the real name and email:

```sql
insert into public.staff_accounts (id, role, display_name)
select id, 'administrator', '<Full name>' from auth.users where email = '<work email>';
```

3. The custodian signs in at `/staff/login`. The site sends them to `/staff/setup` to register their authenticator app, then to `/admin/accounts`.
4. From there, invite every guidance account and the second administrator (so the office is never locked out if one phone is lost).

### 7.3 Go live

1. Every row of §7.1 and §7.2 is done; `npm run build:pilot` passes locally; `npm run verify` passes.
2. Merge `staging` into `main`. Vercel's production build passes.
3. Vercel → Settings → Domains: add the production domain (or use `https://<project>.vercel.app`).
4. `npx supabase secrets set ALLOWED_ORIGIN=https://<production domain> SITE_URL=https://<production domain>`.
5. Supabase → Authentication → URL Configuration: Site URL = production domain; Redirect URLs = `https://<production domain>/**` (remove the staging address once testing ends).
6. Set up the external uptime monitor on the two addresses in runbook §4.
7. Smoke test on production with TEST accounts only: register a test student, confirm the email, walk through assent, record test parental consent as the administrator, check in, open `/crisis` (do **not** tick a crisis item on production unless the guidance office expects it, P05 Step 11 item 5), send a support request, see it in the guidance queue, open it, then check the audit trail.
8. Delete or deactivate the test staff accounts. Test student rows cannot be deleted by any app role; tell the guidance office which names are test rows.

---

## 8. Acceptance checklist

Record `phase-10: acceptance passed (checks 1–13)` in the commit message.

| # | Check | How to test | Pass when |
|---|---|---|---|
| 1 | Repository checks | `npm run verify` | 292 tests pass; lint, copy, colours OK; build OK; `check:bundle: OK` with four views each under 500 KB |
| 2 | Crisis code never lazy | move the `CrisisPage` import in `src/routes.jsx` into a `lazyNamed(...)`, run `npm run build && npm run check:bundle`, then undo | `check:bundle failed` naming `src/features/crisis/CrisisPage.jsx`; passes again after undoing |
| 3 | Secret scan | add the line `console.log('service_role');` to `src/main.jsx`, run `npm run build && npm run check:bundle`, then undo | it fails naming `assets/index-….js` and the pattern `/service_role/i` |
| 4 | Pilot gate | `npm run build:pilot` | fails with the placeholder count and the three provisional flags; no `dist` is produced by it |
| 5 | Chunk failure | local stack running; `npm run build && npm run preview`; sign in as `student.full` at `http://localhost:4173`; DevTools → Application → Service workers → tick **Bypass for network**; Network → **Offline**; click "My Trends" | "Something went wrong." / "This page could not load. Your information has not changed." with "Try again". Set Network back to No throttling and click "Try again": "Your check-ins over time" opens |
| 6 | Request list at scale | `npm run test:db` | eight files pass; `08_queue_load` prints a time well under 1000 ms |
| 7 | CI and keep-alive | Step 9 | both workflows green |
| 8 | Headers | on the staging address: DevTools → Network → the document → Response headers; Console while visiting `/`, `/help`, `/check-in`, `/crisis`, `/staff/queue`, `/admin/accounts` | `content-security-policy`, `strict-transport-security`, `x-frame-options: DENY` present; no "Refused to …" CSP message in the Console |
| 9 | Preview vs production build | Vercel → Deployments: the `staging` preview and a production build of `main` | the preview log says `preview -> build` and succeeds; production says `production -> build:pilot` and fails listing what is missing (until §7.1 is done) |
| 10 | Performance | Step 10 item 5 | four views: FCP median ≤ 3000 ms and usable median ≤ 5000 ms (the log prints all five runs) |
| 11 | Backup | runbook §2 against the hosted project | a `hingaweb-YYYY-MM-DD.hwbak` file in the school folder, its sha256 printed, `data.sql has auth.users rows: yes`; no `.sql` file left anywhere |
| 12 | Restore test | runbook §3 | counts in the throw-away project match the live counts; the throw-away project and decrypted folder are deleted |
| 13 | Wrong passphrase | `BACKUP_PASSPHRASE='wrong passphrase 123' npm run backup -- --decrypt <file> --out <empty folder>` | it prints `backup: Unsupported state or unable to authenticate data`, exits with an error, and the folder stays empty |

When all thirteen pass and §7 is complete, the build matches this plan.
