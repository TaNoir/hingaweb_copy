import { useEffect } from 'react';
import { SITE } from '../config/site.js';

/**
 * Sets the browser tab title to "<the page's h1 text> · HingaWeb" (ui-students item 5).
 * Pass the same text the page shows in its h1. With no text the title is just "HingaWeb", and it
 * goes back to "HingaWeb" when the page closes, so screens without a title never keep an old one.
 */
export function usePageTitle(heading) {
  useEffect(() => {
    document.title = heading ? `${heading} · ${SITE.appName}` : SITE.appName;
    return () => {
      document.title = SITE.appName;
    };
  }, [heading]);
}
