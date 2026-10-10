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
