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
