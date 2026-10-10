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
