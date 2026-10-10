// The route table from 00 Section 7. Every route now has its real screen (Phase 09).
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
import { LandingPage } from './features/public/LandingPage.jsx';
import { GuidesPage } from './features/public/GuidesPage.jsx';
import { HelpPage } from './features/public/HelpPage.jsx';
import { AssentPage } from './features/assent/AssentPage.jsx';
import { WaitingForConsentPage } from './features/assent/WaitingForConsentPage.jsx';
import { CheckInPage } from './features/checkin/CheckInPage.jsx';
import { CrisisPage } from './features/crisis/CrisisPage.jsx';
import { TrendsPage } from './features/trends/TrendsPage.jsx';
import { ResourcesPage } from './features/resources/ResourcesPage.jsx';
import { RequestPage } from './features/requests/RequestPage.jsx';
import { RequestSentPage } from './features/requests/RequestSentPage.jsx';
import { GuidanceLayout } from './features/guidance/GuidanceLayout.jsx';
import { QueuePage } from './features/guidance/QueuePage.jsx';
import { RequestDetailPage } from './features/guidance/RequestDetailPage.jsx';
import { OfficeTagPage } from './features/guidance/OfficeTagPage.jsx';
import { CrisisChannelPage } from './features/guidance/CrisisChannelPage.jsx';
import { ReferralsPage } from './features/guidance/ReferralsPage.jsx';
import { AccountsPage } from './features/admin/AccountsPage.jsx';
import { ConsentPage } from './features/admin/ConsentPage.jsx';
import { ReferencePage } from './features/admin/ReferencePage.jsx';
import { ResourceLibraryPage } from './features/admin/ResourceLibraryPage.jsx';
import { ResourceEditPage } from './features/admin/ResourceEditPage.jsx';
import { AuditPage } from './features/admin/AuditPage.jsx';

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
          <Route path="trends" element={<TrendsPage />} />
          <Route path="resources" element={<ResourcesPage />} />
          <Route path="request" element={<RequestPage />} />
          <Route path="request/sent" element={<RequestSentPage />} />
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
        <Route element={<GuidanceLayout />}>
          <Route path="staff/queue" element={<QueuePage />} />
          <Route path="staff/requests/:id" element={<RequestDetailPage />} />
          <Route path="staff/requests/:id/tag" element={<OfficeTagPage />} />
          <Route path="staff/crisis" element={<CrisisChannelPage />} />
          <Route path="staff/referrals" element={<ReferralsPage />} />
        </Route>
      </Route>

      {/* Administrator (aal2) */}
      <Route element={<RequireStaff role="administrator" />}>
        <Route element={<AdminLayout />}>
          <Route path="admin" element={<Navigate to="/admin/accounts" replace />} />
          <Route path="admin/accounts" element={<AccountsPage />} />
          <Route path="admin/consent" element={<ConsentPage />} />
          <Route path="admin/reference" element={<ReferencePage />} />
          <Route path="admin/resources" element={<ResourceLibraryPage />} />
          <Route path="admin/resources/new" element={<ResourceEditPage />} />
          <Route path="admin/resources/:id" element={<ResourceEditPage />} />
          <Route path="admin/audit" element={<AuditPage />} />
        </Route>
      </Route>

      <Route element={<PublicLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
