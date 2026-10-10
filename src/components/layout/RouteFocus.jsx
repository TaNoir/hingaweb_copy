import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

// Pages that load on first visit may show their h1 a moment after the path changes.
const WAIT_FOR_HEADING_MS = 5000;

/**
 * On every route path change (not the first page load, not hash links such as "#how"), scrolls to
 * the top and moves focus to the page's h1, so screen reader and keyboard users start at the new
 * page. /crisis focuses its own heading. Focus is never taken from a control inside the page the
 * person is already using. The heading gets tabindex="-1" and data-route-focus (no outline, see
 * index.css: a heading is not a control).
 */
export function RouteFocus() {
  const { pathname, hash } = useLocation();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }
    if (hash || pathname === '/crisis') return undefined;
    window.scrollTo(0, 0);

    const tryFocus = () => {
      const heading = document.querySelector('main h1');
      if (!heading) return false;
      const active = document.activeElement;
      const main = document.querySelector('main');
      if (active && active !== main && main?.contains(active)) return true; // already in use
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.setAttribute('data-route-focus', '');
      heading.focus({ preventScroll: true });
      return true;
    };
    if (tryFocus()) return undefined;

    const observer = new MutationObserver(() => {
      if (tryFocus()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = setTimeout(() => observer.disconnect(), WAIT_FOR_HEADING_MS);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [pathname, hash]);

  return null;
}
