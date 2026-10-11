// "How's today, honestly?" (ui-landing-v2). A friendly first step on the landing page.
// The pick lives in this component's memory only: it is never saved, sent, or scored, and it is not
// part of the check-in. Every face has the same colour (no good/bad colours). Radio group: one Tab
// stop, arrow keys move and select, Enter/Space selects.
import { useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { t } from '../../../copy/index.js';
import { LinkButton } from '../../../components/ui/index.js';
import { cx } from '../../../components/ui/cx.js';
import { MoodFace } from './illustrations.jsx';

const MOODS = ['good', 'okay', 'notSure', 'low', 'overwhelmed'];

export function MoodPicker() {
  const [mood, setMood] = useState(null);
  const refs = useRef([]);
  const index = MOODS.indexOf(mood);
  const focusable = index === -1 ? 0 : index;

  const move = (to) => {
    const i = (to + MOODS.length) % MOODS.length;
    setMood(MOODS[i]);
    refs.current[i]?.focus();
  };
  const onKeyDown = (e, i) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      move(i + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(i - 1);
    }
  };

  return (
    <section
      aria-labelledby="mood-title"
      className="rounded-[24px] border border-line bg-surface p-5 shadow-[8px_8px_0_var(--color-lavender)] md:p-8"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 id="mood-title" className="text-[26px] font-extrabold text-ink md:text-[30px]">
          {t('public.landing.mood.title')}
        </h2>
        <p className="text-[13px] text-ink-muted">{t('public.landing.mood.note')}</p>
      </div>
      <div
        role="radiogroup"
        aria-labelledby="mood-title"
        className="mt-5 grid grid-cols-6 gap-3 sm:grid-cols-5"
      >
        {MOODS.map((m, i) => {
          const selected = m === mood;
          return (
            <button
              key={m}
              ref={(el) => (refs.current[i] = el)}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={i === focusable ? 0 : -1}
              onClick={() => setMood(m)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cx(
                'btn-motion col-span-2 flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-[16px] border px-1 py-3 text-[13px] leading-tight font-semibold text-ink hyphens-auto [overflow-wrap:normal] [word-break:normal] sm:col-span-1 sm:px-2 sm:text-[14px]',
                i === 3 && 'col-start-2 sm:col-start-auto',
                selected ? 'border-2 border-accent bg-lavender' : 'border-line bg-surface',
              )}
            >
              <MoodFace mood={m} className="size-9" />
              {t(`public.landing.mood.${m}`)}
            </button>
          );
        })}
      </div>
      {/* The reply is a polite live region: it is announced when a face is chosen. */}
      <div role="status" className="mt-4 empty:hidden">
        {mood && (
          <div className="flex flex-col gap-3 rounded-[16px] bg-canvas p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-[15px] text-ink">{t(`public.landing.mood.reply.${mood}`)}</p>
              {(mood === 'low' || mood === 'overwhelmed') && (
                <p className="text-[14px] text-ink">
                  {t('public.landing.mood.talkNow')}{' '}
                  <a href="#help" className="font-semibold text-accent underline">
                    {t('public.landing.mood.talkLink')}
                  </a>
                </p>
              )}
            </div>
            <LinkButton to="/check-in" className="shrink-0 self-start sm:self-auto">
              {t('public.landing.tryCheckin')}
              <ArrowRight aria-hidden="true" className="size-4" />
            </LinkButton>
          </div>
        )}
      </div>
    </section>
  );
}
