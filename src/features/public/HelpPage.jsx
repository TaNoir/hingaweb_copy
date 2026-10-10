// Fig 14 · where to get help (2.1.5.1.8; four referral targets from 1.4). Fully static: works offline.
import {
  Building2,
  Clock,
  HeartHandshake,
  Lock,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { t } from '../../copy/index.js';
import { GUIDANCE_OFFICE, SPECIALISTS } from '../../content/directory.js';
import { Card, Chip, LinkButton, PageHeader, buttonClasses } from '../../components/ui/index.js';
import { HotlineList } from './HotlineList.jsx';
import { EmergencyNotice } from './EmergencyNotice.jsx';

function Detail({ icon: Icon, label, value, note }) {
  return (
    <div className="flex gap-2">
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-muted" />
      <div>
        <p className="text-[12px] text-ink-muted">{label}</p>
        <p className="text-[15px] text-ink">{value}</p>
        {note && <p className="text-[12px] text-ink-muted">{note}</p>}
      </div>
    </div>
  );
}

export function HelpPage() {
  const o = GUIDANCE_OFFICE;
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={t('public.help.chip')}
        title={t('public.help.title')}
        lead={t('public.help.lead')}
      />

      <Card aria-labelledby="office-title" className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-control bg-blush"
          >
            <HeartHandshake className="size-5 text-ink" />
          </span>
          <div>
            <p className="text-[12px] font-semibold tracking-[0.14em] text-ink-muted">
              {t('public.help.office.eyebrow')}
            </p>
            <h2 id="office-title" className="text-[20px] font-semibold text-ink">
              {t('public.help.office.title')}
            </h2>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Detail
            icon={Building2}
            label={t('public.help.office.personLabel')}
            value={o.personInCharge}
            note={o.roleTitle}
          />
          <Detail icon={MapPin} label={t('public.help.office.locationLabel')} value={o.location} />
          <Detail icon={Clock} label={t('public.help.office.hoursLabel')} value={o.hours} />
          <Detail
            icon={Lock}
            label={t('public.help.office.privacyLabel')}
            value={t('public.help.office.privacyValue')}
            note={t('public.help.office.privacyNote')}
          />
        </div>
        <p className="rounded-control bg-surface-muted px-4 py-3 text-[14px] text-ink">
          {t('public.help.office.visit')}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <LinkButton to="/request">
            <Send aria-hidden="true" className="size-4" />
            {t('public.help.office.send')}
          </LinkButton>
          <a href={`tel:${o.dial}`} className={buttonClasses('outline', 'md')}>
            <Phone aria-hidden="true" className="size-4" />
            <span>{t('public.help.office.call')}</span>
          </a>
        </div>
        <p className="text-[13px] text-ink-muted">{t('public.help.office.sendNote')}</p>
      </Card>

      <section aria-labelledby="specialists-title" className="flex flex-col gap-3">
        <h2 id="specialists-title" className="text-[20px] font-semibold text-ink">
          {t('public.help.specialists.title')}
        </h2>
        <p className="text-[14px] text-ink-muted">{t('public.help.specialists.lead')}</p>
        <ul className="grid gap-4 md:grid-cols-2">
          {SPECIALISTS.map((s) => (
            <li key={s.id}>
              <Card className="flex h-full flex-col gap-2">
                <Chip className="self-start">
                  {s.kind === 'partner'
                    ? t('public.help.specialists.partner')
                    : t('public.help.specialists.external')}
                </Chip>
                <h3 className="text-[17px] font-semibold text-ink">{s.name}</h3>
                <p className="text-[14px] text-ink-muted">{s.description}</p>
                <p className="text-[14px] text-ink">
                  {t('public.help.specialists.phoneLabel')}: {s.phone}
                </p>
                <p className="text-[14px] text-ink">
                  {t('public.help.specialists.emailLabel')}: {s.email}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <Card aria-labelledby="hotlines-title" className="flex flex-col gap-4">
        <p className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.14em] text-ink-muted">
          <ShieldCheck aria-hidden="true" className="size-4" />
          {t('public.help.hotlines.eyebrow')}
        </p>
        <h2 id="hotlines-title" className="text-[20px] font-semibold text-ink">
          {t('public.help.hotlines.title')}
        </h2>
        <HotlineList />
        <EmergencyNotice />
      </Card>

      <p className="rounded-card bg-blush px-4 py-4 text-center text-[14px] text-ink">
        {t('public.help.closing')}
      </p>
    </div>
  );
}
