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
