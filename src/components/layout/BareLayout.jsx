import { Outlet } from 'react-router';
import { Footer } from './Footer.jsx';
import { Logo } from './Logo.jsx';
import { Main } from './Main.jsx';
import { SkipLink } from './SkipLink.jsx';

/** Logo-only frame for registration, log in, password reset, and the assent walkthrough. */
export function BareLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <SkipLink />
      <header className="mx-auto flex w-full max-w-[1200px] items-center px-4 py-3 md:px-6">
        <Logo to="/" />
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
