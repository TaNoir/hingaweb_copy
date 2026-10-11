// Fig 7 · public landing (Tier 1, 2.1.5.1.2), rebuilt to the ui-landing-v2 design
// (docs/design/HingaWeb-Landing.pdf). The plan's hero text (title, lead, "not a diagnosis" sentence,
// reassurance line) is unchanged. Nothing a visitor picks here is saved or sent.
import { Suspense, useEffect } from 'react';
import { useLocation } from 'react-router';
import { ArrowRight, Sprout } from 'lucide-react';
import { t } from '../../copy/index.js';
import { LinkButton, buttonClasses } from '../../components/ui/index.js';
import { lazyNamed } from '../../lib/lazyNamed.js';
import { usePublishedResources } from './usePublishedResources.js';
import { MoodPicker } from './landing/MoodPicker.jsx';
import {
  BreatheSection,
  Container,
  Faq,
  HelpPanel,
  HowItWorks,
  ShortReads,
} from './landing/sections.jsx';

// Loaded on first visit to the landing page, after the page itself (not in the first load).
const BreathAnimation = lazyNamed(() => import('./BreathAnimation.jsx'), 'BreathAnimation');

export function LandingPage() {
  const { status, resources, reload } = usePublishedResources();
  const { hash } = useLocation();

  // "/#how", "/#breathe", "/#help" from the header, footer, or another page: scroll to the section.
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el?.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }, [hash]);

  return (
    <div className="flex flex-col">
      <Container className="grid items-center gap-10 pt-10 pb-12 lg:grid-cols-[1.05fr_1fr] lg:pt-14">
        <div className="flex flex-col gap-5">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-mint-ink">
            <span
              aria-hidden="true"
              className="flex size-6 items-center justify-center rounded-full bg-mint"
            >
              <Sprout className="size-4" />
            </span>
            {t('public.landing.label')}
          </p>
          <h1 className="text-[40px] leading-[1.03] font-extrabold tracking-tight text-ink sm:text-[52px] lg:text-[60px]">
            {t('public.landing.title')}
          </h1>
          <p className="max-w-[560px] text-[16px] leading-relaxed text-ink-muted">
            {t('public.landing.lead')} {t('public.landing.leadNot')}
          </p>
          <div className="flex flex-wrap gap-3">
            <LinkButton to="/check-in" className="shadow-[3px_3px_0_var(--color-blush-strong)]">
              {t('public.landing.tryCheckin')}
              <ArrowRight aria-hidden="true" className="size-4" />
            </LinkButton>
            <a href="#how" className={buttonClasses('outline', 'md')}>
              {t('public.landing.seeHow')}
            </a>
          </div>
          <p className="text-[14px] text-ink-muted">{t('public.landing.listenNote')}</p>
        </div>
        {/* Decorative: a soft lavender blob with the meditation animation centred on it. The box
            reserves its size so nothing moves while the lazy player loads; hidden from screen
            readers; still frame with reduced motion. */}
        <div
          aria-hidden="true"
          className="pointer-events-none relative mx-auto aspect-square w-full max-w-[300px] sm:max-w-[420px] lg:max-w-[520px]"
        >
          <div className="absolute inset-0 rounded-[46%_54%_52%_48%/55%_45%_55%_45%] bg-lavender" />
          <div className="absolute inset-[6%] scale-[1.12]">
            <Suspense fallback={null}>
              <BreathAnimation />
            </Suspense>
          </div>
        </div>
      </Container>

      <Container className="pb-6">
        <MoodPicker />
      </Container>

      <HowItWorks />
      <BreatheSection />
      <ShortReads status={status} resources={resources} reload={reload} />
      <HelpPanel />
      <Faq />
    </div>
  );
}
