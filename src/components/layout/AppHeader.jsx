import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { t } from '../../copy/index.js';
import { Logo } from './Logo.jsx';
import { NavItems } from './NavItems.jsx';

/**
 * Shared header. Desktop: logo, nav, extras on the right. Mobile (< md): logo + "Menu" sheet.
 * @param {{ logoTo: string, navLabel: string, items: object[], chip?: node, right?: node, mobileExtras?: node }} props
 */
export function AppHeader({
  logoTo,
  navLabel,
  items,
  chip = null,
  right = null,
  mobileExtras = null,
}) {
  const [open, setOpen] = useState(false);
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-2 md:px-6">
        <div className="flex items-center gap-3">
          <Logo to={logoTo} />
          {chip}
        </div>
        <nav aria-label={navLabel} className="hidden md:block">
          <NavItems items={items} />
        </nav>
        <div className="hidden items-center gap-2 md:flex">{right}</div>
        <button
          type="button"
          className="flex min-h-11 items-center gap-2 rounded-control px-3 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? (
            <X aria-hidden="true" className="size-5" />
          ) : (
            <Menu aria-hidden="true" className="size-5" />
          )}
          <span>{t('common.menu')}</span>
        </button>
      </div>
      {open && (
        <div id="mobile-menu" className="border-t border-line px-4 pb-4 md:hidden">
          <nav aria-label={navLabel} className="pt-2">
            <NavItems items={items} vertical onNavigate={() => setOpen(false)} />
          </nav>
          {mobileExtras && <div className="mt-3 flex flex-col gap-2">{mobileExtras}</div>}
        </div>
      )}
    </header>
  );
}
