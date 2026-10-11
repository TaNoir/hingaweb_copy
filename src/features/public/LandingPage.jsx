// Fig 7 · public landing (Tier 1, 2.1.5.1.2). D-18, D-19, D-20, D-30 applied.
import { Suspense } from 'react';
import { Link } from 'react-router';
import { ArrowRight, CalendarHeart, GraduationCap, Lock, NotebookPen } from 'lucide-react';
import { t } from '../../copy/index.js';
import {
  Card,
  Chip,
  EmptyState,
  ErrorState,
  LinkButton,
  Skeleton,
  buttonClasses,
} from '../../components/ui/index.js';
import { SITE } from '../../config/site.js';
import { NeedHelpCard } from './NeedHelpCard.jsx';
import { ResourceCard } from './ResourceCard.jsx';
import { usePublishedResources } from './usePublishedResources.js';
import { lazyNamed } from '../../lib/lazyNamed.js';

// Loaded on first visit to the landing page, after the page itself (not in the first load).
const BreathAnimation = lazyNamed(() => import('./BreathAnimation.jsx'), 'BreathAnimation');

const STEPS = [
  { icon: NotebookPen, n: 1 },
  { icon: CalendarHeart, n: 2 },
  { icon: GraduationCap, n: 3 },
];

export function LandingPage() {
  const { status, resources, reload } = usePublishedResources();
  return (
    <div className="flex flex-col gap-12">
      {/* The row stretches so the left column fills its height; the animation is centred in the
          space left under the text. The help card keeps its own height (self-start). */}
      <section className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-stretch">
        <div className="flex flex-col gap-4">
          <Chip className="self-start">{t('public.landing.chip')}</Chip>
          <h1 className="text-[32px] font-semibold leading-10 text-ink md:text-[40px] md:leading-[48px]">
            {t('public.landing.title')}
          </h1>
          <p className="text-base text-ink">
            {t('public.landing.lead')} {t('public.landing.leadNot')}
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#how" className={buttonClasses('primary', 'md')}>
              {t('public.landing.explore')}
              <ArrowRight aria-hidden="true" className="size-4" />
            </a>
            <LinkButton to="/guides" variant="outline">
              {t('public.landing.readGuides')}
            </LinkButton>
          </div>
          <p className="flex items-center gap-2 text-[14px] text-ink-muted">
            <Lock aria-hidden="true" className="size-4 shrink-0" />
            {t('public.landing.listenNote')}
          </p>
          {/* Decorative breathing animation, the hero's main visual. Hidden from screen readers, never
              focusable, no pointer events (the scaled canvas is transparent around the figure).
              The box reserves its size (260 px phones, 360 px from 640 px, 480×360 from 1024 px) so
              nothing moves while the lazy player loads; reduced motion shows a still frame. The
              player is scaled up because the .lottie has empty space around the figure; sideways it
              is clipped to the column (only transparent edges), so the page never scrolls sideways. */}
          <div
            aria-hidden="true"
            className="pointer-events-none flex flex-1 items-center justify-center overflow-x-clip py-2"
          >
            <div className="relative aspect-square w-full max-w-[260px] sm:max-w-[360px] lg:aspect-[4/3] lg:max-w-[480px]">
              <span className="absolute top-1/2 left-1/2 aspect-square h-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blush" />
              <div className="absolute inset-0 scale-[1.4]">
                <Suspense fallback={null}>
                  <BreathAnimation />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
        <div className="md:self-start">
          <NeedHelpCard />
        </div>
      </section>

      <section id="how" aria-labelledby="how-title" className="flex flex-col gap-4 scroll-mt-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[12px] font-semibold tracking-[0.14em] text-ink-muted">
              {t('public.landing.how.eyebrow')}
            </p>
            <h2 id="how-title" className="text-[20px] font-semibold text-ink">
              {t('public.landing.how.title')}
            </h2>
          </div>
          <p className="text-[13px] text-ink-muted">{t('public.landing.how.side')}</p>
        </div>
        <ul className="grid gap-4 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, n }) => (
            <li key={n}>
              <Card className="flex h-full flex-col gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-10 items-center justify-center rounded-control bg-blush"
                >
                  <Icon className="size-5 text-ink" />
                </span>
                <h3 className="text-[17px] font-semibold text-ink">
                  {t(`public.landing.how.step${n}Title`)}
                </h3>
                <p className="text-[14px] text-ink-muted">{t(`public.landing.how.step${n}Body`)}</p>
                <p className="mt-auto border-t border-line pt-3 text-[13px] text-ink">
                  {t(`public.landing.how.step${n}Foot`)}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="guides-title" className="flex flex-col gap-4">
        <Chip className="self-start">{t('public.landing.guides.chip')}</Chip>
        <h2 id="guides-title" className="text-[24px] font-semibold text-ink">
          {t('public.landing.guides.title')}
        </h2>
        <p className="text-base text-ink-muted">{t('public.landing.guides.lead')}</p>
        {status === 'loading' && <Skeleton lines={4} />}
        {status === 'error' && <ErrorState onRetry={reload} />}
        {status === 'ready' && resources.length === 0 && (
          <EmptyState title={t('public.guides.emptyTitle')} body={t('public.guides.emptyBody')} />
        )}
        {status === 'ready' && resources.length > 0 && (
          <>
            <ul className="grid gap-4 md:grid-cols-2">
              {resources.slice(0, 4).map((r) => (
                <li key={r.id}>
                  <ResourceCard resource={r} />
                </li>
              ))}
            </ul>
            <Link
              to="/guides"
              className="inline-flex min-h-11 items-center gap-1 self-start font-semibold text-ink underline"
            >
              {t('public.landing.guides.seeAll')}
            </Link>
          </>
        )}
      </section>

      <Card className="text-center">
        <p className="font-semibold text-ink">{t('public.landing.office.title')}</p>
        <p className="mt-1 text-[14px] text-ink-muted">
          {t('public.landing.office.hours', {
            hours: SITE.officeHoursText,
            location: SITE.officeLocation,
          })}
        </p>
        <p className="text-[14px] text-ink-muted">{t('public.landing.office.visit')}</p>
      </Card>
    </div>
  );
}
