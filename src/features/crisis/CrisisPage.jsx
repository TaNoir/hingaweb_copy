// Fig 18 · crisis screen (2.1.5.1.8, 2.1.6.1.6, 2.1.6.3.1, 2.1.6.4.6; D-18, D-24, D-31; P05-D4..D6).
// Renders entirely from the bundle: hotlines and the guidance office come from
// src/content/directory.js, text from src/copy. It never waits for, or reads from, the server.
// The crisis event itself is sent by crisisReport.js in the background.
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, Info, Lock, Phone } from 'lucide-react';
import { t } from '../../copy/index.js';
import { LANGUAGES } from '../../config/consent.js';
import { SITE } from '../../config/site.js';
import { GUIDANCE_OFFICE, HOTLINES, emergencyHotline } from '../../content/directory.js';
import { useAuth } from '../../lib/auth/useAuth.js';
import {
  Card,
  Chip,
  LinkButton,
  SegmentedControl,
  buttonClasses,
} from '../../components/ui/index.js';
import { useCrisisReport } from './crisisReport.js';
import { CrisisStatus } from './CrisisStatus.jsx';
import { usePageTitle } from '../../lib/usePageTitle.js';

export function CrisisPage() {
  const { session } = useAuth();
  const report = useCrisisReport(session.user.id);
  const [lang, setLang] = useState('en');
  const heading = useRef(null);
  const c = (key, vars = {}) => t(`crisis.${key}`, vars, lang);
  usePageTitle(c('title'));
  const emergency = emergencyHotline();

  // Move focus to the heading so a screen reader starts here.
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <div lang={lang} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-card border-2 border-ink bg-surface p-4 sm:flex-row sm:items-center">
        <Info aria-hidden="true" className="size-5 shrink-0 text-ink" />
        <p className="flex-1 text-[15px] text-ink">
          {c('notice')}{' '}
          <a href={`tel:${emergency.dial}`} className="font-semibold underline">
            {emergency.number}
          </a>
        </p>
      </div>

      <Card className="flex flex-col gap-6">
        {/* From 640 px: one row, chip left (it may shrink and wrap its text), switcher right (never
            shrinks or wraps). Below 640 px: chip full width, then the switcher full width as three
            equal columns, 12 px apart. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <Chip shape="wrap" className="sm:min-w-0">
            {c('chip', { school: SITE.schoolName })}
          </Chip>
          <SegmentedControl
            label={c('languageLabel')}
            options={LANGUAGES}
            value={lang}
            onChange={setLang}
            nowrap
          />
        </div>

        <div>
          <h1
            ref={heading}
            tabIndex={-1}
            className="text-[28px] font-semibold leading-9 text-ink md:text-[32px] md:leading-10"
          >
            {c('title')}
          </h1>
          <p className="mt-2 text-base text-ink-muted">{c('lead')}</p>
        </div>

        <section aria-labelledby="crisis-hotlines" className="border-t border-line pt-6">
          <h2 id="crisis-hotlines" className="sr-only">
            {c('hotlinesHeading')}
          </h2>
          <ul className="flex flex-col gap-3">
            {HOTLINES.map((h) => (
              <ContactRow
                key={h.id}
                icon={Phone}
                title={h.name}
                lines={[h.note]} // the number is shown once, in the Call button
                href={`tel:${h.dial}`}
                action={c('call', { number: h.number })}
                actionLabel={c('callLabel', { name: h.name, number: h.number })}
              />
            ))}
            <ContactRow
              icon={Building2}
              title={c('officeTitle')}
              lines={[
                `${GUIDANCE_OFFICE.personInCharge} • ${GUIDANCE_OFFICE.roleTitle}`,
                `${GUIDANCE_OFFICE.hours} • ${GUIDANCE_OFFICE.location}`,
              ]}
              href={`tel:${GUIDANCE_OFFICE.dial}`}
              action={c('officeCall')}
              actionLabel={c('officeCallLabel', { number: GUIDANCE_OFFICE.phone })}
            />
          </ul>
        </section>

        {report.status !== 'idle' && (
          <section aria-labelledby="crisis-next" className="rounded-card border border-line p-5">
            <h2
              id="crisis-next"
              className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-ink"
            >
              <Lock aria-hidden="true" className="size-4" />
              {c('nextTitle')}
            </h2>
            <p className="mt-2 text-[15px] text-ink">{c('nextBody')}</p>
            <div className="mt-3">
              <CrisisStatus report={report} lang={lang} />
            </div>
          </section>
        )}

        <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <LinkButton
            to="/check-in"
            variant="outline"
            className="self-start"
            aria-label={c('back')}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            <span>{c('back')}</span>
          </LinkButton>
        </div>
      </Card>
    </div>
  );
}

function ContactRow({ icon: Icon, title, lines, href, action, actionLabel }) {
  return (
    <li className="flex flex-col gap-3 rounded-card border border-line bg-canvas p-4 sm:flex-row sm:items-center">
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-control bg-blush"
      >
        <Icon className="size-5 text-ink" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{title}</p>
        {lines.map((line) => (
          <p key={line} className="text-[14px] text-ink-muted">
            {line}
          </p>
        ))}
      </div>
      <a
        href={href}
        aria-label={actionLabel}
        className={buttonClasses(
          'primary',
          'md',
          'max-w-full self-start py-2 text-left leading-snug sm:self-center',
        )}
      >
        <span>{action}</span>
        <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
      </a>
    </li>
  );
}
