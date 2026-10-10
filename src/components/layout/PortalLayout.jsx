import { Outlet } from 'react-router';
import { Lock } from 'lucide-react';
import { t } from '../../copy/index.js';
import { Footer } from './Footer.jsx';
import { Logo } from './Logo.jsx';
import { Main } from './Main.jsx';
import { SkipLink } from './SkipLink.jsx';

/** Staff portal frame for sign in, verify, and setup (Figs 19-20). */
export function PortalLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <SkipLink />
      <header className="border-b border-line bg-canvas">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-2 md:px-6">
          <div className="flex items-center gap-4">
            <Logo to="/staff/login" />
            <span className="hidden border-l border-line pl-4 text-[13px] tracking-[0.14em] text-ink-muted sm:inline">
              {t('staff.portal.label')}
            </span>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[13px] tracking-[0.14em] text-ink">
            <Lock aria-hidden="true" className="size-4" />
            {t('staff.portal.label')}
          </span>
        </div>
      </header>
      <div className="flex-1">
        <Main>
          <Outlet />
        </Main>
      </div>
      <Footer />
    </div>
  );
}
