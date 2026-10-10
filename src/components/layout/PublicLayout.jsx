import { Outlet } from 'react-router';
import { t } from '../../copy/index.js';
import { LinkButton } from '../ui/LinkButton.jsx';
import { AppHeader } from './AppHeader.jsx';
import { Footer } from './Footer.jsx';
import { Main } from './Main.jsx';
import { SkipLink } from './SkipLink.jsx';

/** width: 'reading' (768px) or 'wide' (1200px; the landing page). */
export function PublicLayout({ width = 'reading' }) {
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
        <Main width={width}>
          <Outlet />
        </Main>
      </div>
      <Footer />
    </div>
  );
}
