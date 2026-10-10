// Fig 7 · public landing (Tier 1, 2.1.5.1.2). D-18, D-19, D-20, D-30 applied.
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

const STEPS = [
  { icon: NotebookPen, n: 1 },
  { icon: CalendarHeart, n: 2 },
  { icon: GraduationCap, n: 3 },
];

export function LandingPage() {
  const { status, resources, reload } = usePublishedResources();
  return (
    <div className="flex flex-col gap-12">
      <p className="flex flex-col gap-1 rounded-card bg-blush px-4 py-2 text-[12px] font-semibold tracking-wide text-ink sm:flex-row sm:justify-between">
        <span>
          {t('public.landing.strip')}{' '}
          <span className="font-normal">· {t('public.landing.stripDept')}</span>
        </span>
        <span className="font-normal">{t('public.landing.stripRight')}</span>
      </p>

      <section className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-start">
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
          {/* Decorative calm waves, like the logo. Colour tokens only; hidden from screen readers. */}
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 400 72"
            fill="none"
            strokeLinecap="round"
            className="mt-2 h-auto w-full max-w-[420px]"
          >
            <path
              d="M4 18 c16 -10 48 -10 64 0 s48 10 64 0 s48 -10 64 0 s48 10 64 0 s48 -10 64 0 s48 10 64 0"
              stroke="var(--color-blush-strong)"
              strokeWidth="6"
            />
            <path
              d="M4 38 c16 -10 48 -10 64 0 s48 10 64 0 s48 -10 64 0 s48 10 64 0 s48 -10 64 0 s48 10 64 0"
              stroke="var(--color-line)"
              strokeWidth="4"
            />
            <path
              d="M4 56 c16 -10 48 -10 64 0 s48 10 64 0 s48 -10 64 0 s48 10 64 0 s48 -10 64 0 s48 10 64 0"
              stroke="var(--color-ink)"
              strokeWidth="2"
            />
          </svg>
        </div>
        <NeedHelpCard />
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
