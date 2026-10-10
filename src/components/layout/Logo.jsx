import { Link } from 'react-router';
import { Waves } from 'lucide-react';
import { SITE } from '../../config/site.js';

/** "HingaWeb" wordmark with the "Start with a breath" caption (00 Section 8.5; caption changed at the user's request). */
export function Logo({ to = '/' }) {
  return (
    <Link
      to={to}
      className="flex min-h-11 items-center gap-2 rounded-control"
      aria-label={`${SITE.appName} home`}
    >
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-[10px] bg-blush"
      >
        <Waves className="size-5 text-ink" />
      </span>
      <span aria-hidden="true" className="flex flex-col leading-none">
        <span className="text-[17px] text-ink">
          <span className="font-semibold">Hinga</span>
          <span className="font-normal">Web</span>
        </span>
        <span className="mt-1 text-[10px] font-medium tracking-[0.14em] text-ink-muted">
          {SITE.tagline}
        </span>
      </span>
    </Link>
  );
}
