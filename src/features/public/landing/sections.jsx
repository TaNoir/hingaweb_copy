// Landing page sections (ui-landing-v2; design: docs/design/HingaWeb-Landing.pdf).
import { useId, useState } from 'react';
import { Link } from 'react-router';
import { BookOpen, Minus, Phone, Plus } from 'lucide-react';
import { t } from '../../../copy/index.js';
import { HOTLINES, GUIDANCE_OFFICE, emergencyHotline } from '../../../content/directory.js';
import { guideInfo } from '../../../content/guide-summaries.js';
import { useBreathing } from '../../checkin/useBreathing.js';
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/index.js';
import { cx } from '../../../components/ui/cx.js';
import { primaryArea } from '../primaryArea.js';
import {
  BooksArt,
  BubblesArt,
  ChatHeartArt,
  ChecklistArt,
  NightArt,
  WeekChartArt,
} from './illustrations.jsx';

/** Centred content column used by every section. */
export function Container({ className = '', children }) {
  return (
    <div className={cx('mx-auto w-full max-w-[1152px] px-4 md:px-6', className)}>{children}</div>
  );
}

// ---------- How HingaWeb works (#how) ----------
export function HowItWorks() {
  const steps = [
    { n: 1, Art: ChecklistArt, bg: 'bg-lavender', kicker: 'text-accent' },
    { n: 2, Art: WeekChartArt, bg: 'bg-mint', kicker: 'text-mint-ink' },
    { n: 3, Art: ChatHeartArt, bg: 'bg-peach', kicker: 'text-help-ink' },
  ];
  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-6">
      <Container className="flex flex-col gap-8 py-14">
        <div className="flex flex-col gap-2">
          <h2 id="how-title" className="text-[30px] font-extrabold text-ink md:text-[36px]">
            {t('public.landing.how.title')}
          </h2>
          <p className="text-[16px] text-ink-muted">{t('public.landing.how.lead')}</p>
        </div>
        <ul className="grid gap-6 md:grid-cols-3">
          {steps.map(({ n, Art, bg, kicker }) => (
            <li
              key={n}
              className="card-hover flex flex-col gap-2 rounded-[22px] border border-transparent"
            >
              <div
                className={cx(
                  'flex aspect-[3/2] items-center justify-center rounded-[22px] p-4',
                  bg,
                )}
              >
                <Art className="h-full w-full" days={t('public.landing.how.days')} />
              </div>
              <p className={cx('mt-2 text-[13px] font-bold', kicker)}>
                {t(`public.landing.how.step${n}Kicker`)}
              </p>
              <h3 className="text-[20px] font-bold text-ink">
                {t(`public.landing.how.step${n}Title`)}
              </h3>
              <p className="text-[15px] leading-relaxed text-ink-muted">
                {t(`public.landing.how.step${n}Body`)}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

// ---------- Breathe (#breathe) ----------
export function BreatheSection() {
  const { phase, left, done, running, reduced, scale, duration, start, stop } = useBreathing();
  const status = phase
    ? t(`checkin.breath.${phase.key}`)
    : done
      ? t('checkin.breath.done')
      : t('public.landing.breathe.ready');
  return (
    <section
      id="breathe"
      aria-labelledby="breathe-title"
      className="scroll-mt-6 bg-mint text-mint-ink"
    >
      <Container className="grid items-center gap-10 py-16 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h2
            id="breathe-title"
            className="text-[32px] leading-tight font-extrabold md:text-[40px]"
          >
            {t('public.landing.breathe.title1')}
            <br />
            {t('public.landing.breathe.title2')}
          </h2>
          <p className="max-w-[520px] text-[16px] leading-relaxed">
            {t('public.landing.breathe.body')}
          </p>
          <p className="flex flex-wrap gap-x-4 text-[14px]">
            {[
              ['inFor', 4],
              ['holdFor', 4],
              ['outFor', 6],
            ].map(([k, n]) => (
              <span key={k}>
                <strong>{t(`public.landing.breathe.${k}`)}</strong>{' '}
                {t('public.landing.breathe.forSeconds', { n })}
              </span>
            ))}
          </p>
          <button
            type="button"
            onClick={running ? stop : start}
            className="btn-motion inline-flex min-h-11 items-center self-start rounded-control bg-mint-ink px-5 text-[15px] font-semibold text-white shadow-[3px_3px_0_var(--color-surface)]"
          >
            {running ? t('public.landing.breathe.stop') : t('public.landing.breathe.start')}
          </button>
        </div>
        <div className="flex flex-col items-center gap-4">
          {!reduced && (
            <div aria-hidden="true" className="flex size-56 items-center justify-center">
              <div
                className="flex size-56 items-center justify-center rounded-full bg-mint-ink/10"
                style={{
                  scale: String(scale + 0.15),
                  transition: `scale ${duration}s ease-in-out`,
                }}
              >
                <div className="flex size-40 items-center justify-center rounded-full bg-mint-ink/15">
                  <div className="size-28 rounded-full bg-surface shadow-[0_6px_18px_rgb(31_63_50/0.15)]" />
                </div>
              </div>
            </div>
          )}
          <p className="text-center text-[20px] font-semibold">
            <span role="status">{status}</span>
            {phase && reduced && (
              <span aria-hidden="true" className="ml-2 tabular-nums">
                {left}
              </span>
            )}
          </p>
          {!running && !done && (
            <p className="text-center text-[13px]">{t('public.landing.breathe.readyHint')}</p>
          )}
        </div>
      </Container>
    </section>
  );
}

// ---------- Short reads for real days ----------
// Three published guides, in this order of preference (sleep first, as in the design). A draft or
// missing guide is skipped and the next published one takes its place.
const PREFERRED = [
  'sleep-problems',
  'exam-stress',
  'friends',
  'down-and-unable-to-cope',
  'problems-at-school',
  'self-care',
];
const slugOf = (url) => {
  try {
    return new URL(url).pathname.split('/').filter(Boolean).at(-1);
  } catch {
    return '';
  }
};
/** The thumbnail for a guide: night sky for sleep, books for exams, chat bubbles otherwise. */
function ReadArt({ slug, className }) {
  if (slug === 'sleep-problems') return <NightArt className={className} />;
  if (slug === 'exam-stress') return <BooksArt className={className} />;
  return <BubblesArt className={className} />;
}

export function ShortReads({ status, resources, reload }) {
  const ranked = [...resources].sort((a, b) => {
    const ia = PREFERRED.indexOf(slugOf(a.url));
    const ib = PREFERRED.indexOf(slugOf(b.url));
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  const picks = ranked.slice(0, 3);
  return (
    <section aria-labelledby="reads-title">
      <Container className="flex flex-col gap-6 py-14">
        <div className="flex items-end justify-between gap-4">
          <h2 id="reads-title" className="text-[28px] font-extrabold text-ink md:text-[34px]">
            {t('public.landing.reads.title')}
          </h2>
          <Link
            to="/guides"
            className="inline-flex min-h-11 items-center text-[14px] font-semibold text-accent underline"
          >
            {t('public.landing.reads.browse')}
          </Link>
        </div>
        {status === 'loading' && <Skeleton lines={4} />}
        {status === 'error' && <ErrorState onRetry={reload} />}
        {status === 'ready' && picks.length === 0 && (
          <EmptyState
            icon={BookOpen}
            title={t('public.guides.emptyTitle')}
            body={t('public.guides.emptyBody')}
          />
        )}
        {status === 'ready' && picks.length > 0 && (
          <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
            <ReadCard resource={picks[0]} large />
            {picks.length > 1 && (
              <ul className="flex flex-col gap-5">
                {picks.slice(1).map((r) => (
                  <li key={r.id}>
                    <ReadCard resource={r} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Container>
    </section>
  );
}

function ReadCard({ resource, large = false }) {
  const slug = slugOf(resource.url);
  const { summary } = guideInfo(resource.url);
  const area = primaryArea(resource.attributes);
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('public.guides.readLabel', { title: resource.title })}
      className={cx(
        'card-hover flex gap-4 rounded-[22px] border border-transparent p-1',
        large ? 'flex-col' : 'flex-row items-start',
      )}
    >
      {large ? (
        // The night sky fills the frame; the other pictures sit centred on a matching tint.
        <span
          className={cx(
            'flex aspect-[16/10] w-full shrink-0 items-center justify-center overflow-hidden rounded-[22px]',
            slug === 'sleep-problems'
              ? ''
              : slug === 'exam-stress'
                ? 'bg-butter/50'
                : 'bg-blush-strong/50',
          )}
        >
          <ReadArt
            slug={slug}
            className={slug === 'sleep-problems' ? 'h-full w-full' : 'h-3/4 w-auto'}
          />
        </span>
      ) : (
        <span className="block size-20 shrink-0 overflow-hidden rounded-[16px]">
          <ReadArt slug={slug} className="h-full w-full" />
        </span>
      )}
      <span className="flex flex-col gap-1">
        <span className="text-[13px] font-bold text-accent">{area.label}</span>
        <h3 className={cx('font-bold text-ink', large ? 'text-[22px]' : 'text-[17px]')}>
          {resource.title}
        </h3>
        {summary && <span className="line-clamp-2 text-[14px] text-ink-muted">{summary}</span>}
      </span>
    </a>
  );
}

// ---------- If you need help right now (#help) ----------
export function HelpPanel() {
  const emergency = emergencyHotline();
  const office = [GUIDANCE_OFFICE.location, GUIDANCE_OFFICE.hours].filter(Boolean).join(' · ');
  return (
    <section id="help" className="scroll-mt-6">
      <Container className="py-6">
        <aside
          aria-labelledby="help-title"
          className="grid gap-8 rounded-[28px] bg-help-bg p-6 text-help-ink md:grid-cols-[1fr_1.25fr] md:p-10"
        >
          <div className="flex flex-col gap-3">
            <h2 id="help-title" className="text-[30px] leading-tight font-extrabold md:text-[34px]">
              {t('public.landing.help.title')}
            </h2>
            <p className="text-[15px] leading-relaxed">
              {t('public.landing.help.lead')}{' '}
              {t('public.emergency.notice', { number: emergency.number })}
            </p>
          </div>
          <ul className="flex flex-col">
            {HOTLINES.map((h, i) => (
              <li
                key={h.id}
                className="flex flex-col gap-3 border-b border-help-strip py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h3 className="text-[16px] font-bold">{h.name}</h3>
                  <p className="text-[13px]">{h.note}</p>
                </div>
                <a
                  href={`tel:${h.dial}`}
                  aria-label={t('public.hotlines.callLabel', { name: h.name, number: h.number })}
                  className={cx(
                    'btn-motion inline-flex min-h-11 max-w-full shrink-0 items-center gap-2 self-start rounded-control px-4 py-2 text-left text-[14px] leading-snug font-semibold sm:self-auto',
                    i === 0
                      ? 'bg-help-ink text-white'
                      : 'border border-help-ink bg-surface text-help-ink',
                  )}
                >
                  <Phone aria-hidden="true" className="size-4 shrink-0" />
                  {t('public.hotlines.call', { number: h.number })}
                </a>
              </li>
            ))}
            <li className="flex flex-col gap-3 py-4 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-[16px] font-bold">{t('public.landing.help.officeTitle')}</h3>
                <p className="text-[13px]">{office}</p>
              </div>
              <Link
                to="/request"
                className="btn-motion inline-flex min-h-11 shrink-0 items-center self-start rounded-control border border-help-ink bg-surface px-4 text-[14px] font-semibold text-help-ink sm:self-auto"
              >
                {t('public.landing.help.request')}
              </Link>
            </li>
          </ul>
        </aside>
      </Container>
    </section>
  );
}

// ---------- Questions students ask ----------
export function Faq() {
  const number = emergencyHotline().number;
  return (
    <section aria-labelledby="faq-title">
      <Container className="max-w-[760px] py-14">
        <h2 id="faq-title" className="mb-6 text-[28px] font-extrabold text-ink md:text-[34px]">
          {t('public.landing.faq.title')}
        </h2>
        <ul className="border-t border-line">
          {[1, 2, 3, 4].map((n) => (
            <FaqItem
              key={n}
              question={t(`public.landing.faq.q${n}`)}
              answer={t(`public.landing.faq.a${n}`, { number })}
            />
          ))}
        </ul>
      </Container>
    </section>
  );
}

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <li className="border-b border-line">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          id={`${id}-button`}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-14 w-full items-center justify-between gap-4 py-3 text-left font-sans text-[15px] font-bold text-ink"
        >
          {question}
          {open ? (
            <Minus aria-hidden="true" className="size-5 shrink-0 text-accent" />
          ) : (
            <Plus aria-hidden="true" className="size-5 shrink-0 text-accent" />
          )}
        </button>
      </h3>
      {/* Smooth open: the row grows from 0 to its natural height (no movement with reduced motion). */}
      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-button`}
        inert={!open}
        className={cx(
          'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <p className="pb-4 text-[15px] leading-relaxed text-ink-muted">{answer}</p>
        </div>
      </div>
    </li>
  );
}
