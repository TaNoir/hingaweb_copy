import { Link, Outlet, useNavigate } from 'react-router';
import { LifeBuoy } from 'lucide-react';
import { t } from '../../copy/index.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import { Button } from '../ui/Button.jsx';
import { AccountMenu } from './AccountMenu.jsx';
import { AppHeader } from './AppHeader.jsx';
import { Footer } from './Footer.jsx';
import { Main } from './Main.jsx';
import { SkipLink } from './SkipLink.jsx';

/** width: 'reading' (768px), 'wide' (1200px; the landing page), or 'library' (1152px; resources). */
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
        mobileAction={
          // Phones and tablets: help is always one tap away, not only inside the Menu sheet.
          // Below sm only the icon shows (the text does not fit at 360 px); it stays the link's name.
          <Link
            to="/help"
            data-header-help=""
            className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-control border border-line bg-blush px-2.5 text-[14px] font-semibold text-ink"
          >
            <LifeBuoy aria-hidden="true" className="size-5 shrink-0" />
            <span className="max-sm:sr-only">{t('nav.public.needHelp')}</span>
          </Link>
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
      <Footer variant="site" />
    </div>
  );
}
