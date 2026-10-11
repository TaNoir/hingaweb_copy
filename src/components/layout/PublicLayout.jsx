import { Outlet } from 'react-router';
import { t } from '../../copy/index.js';
import { LinkButton } from '../ui/LinkButton.jsx';
import { AppHeader } from './AppHeader.jsx';
import { Footer } from './Footer.jsx';
import { Main } from './Main.jsx';
import { SkipLink } from './SkipLink.jsx';

/** width: 'reading' (768px), 'wide' (1200px), or 'full' (the landing page: each section sets its own width). */
export function PublicLayout({ width = 'reading' }) {
  const items = [
    // ui-landing-v2: How it works and Breathe jump to sections of the landing page.
    { to: '/#how', label: t('nav.public.how'), hash: true },
    { to: '/#breathe', label: t('nav.public.breathe'), hash: true },
    { to: '/guides', label: t('nav.public.guides') },
    { to: '/help', label: t('nav.public.getHelp') },
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
      <Footer variant="site" />
    </div>
  );
}
