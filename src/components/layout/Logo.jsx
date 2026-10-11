import { Link } from 'react-router';
import { SITE } from '../../config/site.js';

/**
 * HingaWeb mark, wordmark, and the "Start with a breath" caption (00 Section 8.5; caption and mark
 * changed at the user's request). The mark (public/hingaweb-mark.svg) has its own pink circle, so it
 * has no background; alt="" because the wordmark beside it already says HingaWeb. 36 px on phones,
 * 44 px from 640 px. It is a plain image (same origin, precached), never lazy-loaded.
 */
export function Logo({ to = '/' }) {
  return (
    <Link
      to={to}
      className="flex min-h-11 items-center gap-2 rounded-control"
      aria-label={`${SITE.appName} home`}
    >
      <img
        src="/hingaweb-mark.svg"
        alt=""
        width="44"
        height="44"
        className="size-9 shrink-0 sm:size-11"
      />
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
