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
      <Route element={<PublicOrStudentLayout width="full" />}>
        <Route index element={<LandingPage />} />
      </Route>
      <Route element={<PublicOrStudentLayout width="library" />}>
        <Route path="guides" element={<GuidesPage />} />
      </Route>
      <Route element={<PublicOrStudentLayout />}>
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
        {/* Suggested guides use the same wide grid as /guides (1152 px, three cards per row). */}
        <Route element={<StudentLayout width="library" />}>
          <Route
            path="resources"
            element={
              <LazyPage>
                <ResourcesPage />
              </LazyPage>
            }
          />
        </Route>
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
