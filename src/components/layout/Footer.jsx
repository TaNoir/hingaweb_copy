import { Link } from 'react-router';
import { t } from '../../copy/index.js';

/**
 * variant 'plain' (staff, portal, and logo-only screens): one line, the school's guidance office.
 * variant 'site' (public and student pages, ui-landing-v2): the dark footer from the design with
 * "Hinga muna.", the tagline, and links. The school line stays under it. There is no privacy page,
 * so there is no Privacy link.
 */
export function Footer({ variant = 'plain' }) {
  if (variant !== 'site') {
    return (
      <footer className="mt-16 border-t border-line bg-canvas-alt px-4 py-6 text-center text-[13px] text-ink-muted">
        {t('common.footer')}
      </footer>
    );
  }
  const links = [
    { to: '/#how', label: t('nav.public.how') },
    { to: '/guides', label: t('nav.public.guides') },
    { to: '/help', label: t('nav.public.getHelp') },
  ];
  return (
    <footer className="mt-16 bg-footer text-white">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-10 md:flex-row md:items-end md:justify-between md:px-6">
        <div className="flex flex-col gap-1">
          <p className="font-display text-[20px] font-bold">{t('nav.footer.title')}</p>
          <p className="text-[14px] text-white/85">{t('nav.footer.tagline')}</p>
          <p className="mt-2 text-[12px] text-white/70">{t('common.footer')}</p>
        </div>
        <nav aria-label={t('nav.footer.label')}>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {links.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="inline-flex min-h-11 items-center text-[14px] underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
