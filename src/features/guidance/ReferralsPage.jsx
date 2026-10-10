// Fig 26 · partner directory only (2.1.5.2.4; D-02 team decision: no referral notes; D-03 static).
// The four referral targets of manuscript 1.4, from src/content/directory.js. No student data.
import { Link, useSearchParams } from 'react-router';
import { ArrowLeft, Building2, Mail, Phone } from 'lucide-react';
import { t } from '../../copy/index.js';
import { GUIDANCE_OFFICE, HOTLINES, SPECIALISTS } from '../../content/directory.js';
import { Card, Chip } from '../../components/ui/index.js';
import { EmergencyNotice } from '../public/EmergencyNotice.jsx';

export function ReferralsPage() {
  const [params] = useSearchParams();
  const requestId = params.get('request');
  return (
    <div className="flex flex-col gap-6">
      {requestId && /^[0-9a-f-]{36}$/i.test(requestId) && (
        <Link
          to={`/staff/requests/${requestId}`}
          className="inline-flex min-h-11 items-center gap-2 text-[15px] text-ink"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t('guidance.referrals.back')}
        </Link>
      )}
      <header className="flex flex-col gap-2">
        <h1 className="text-[28px] font-semibold leading-9 text-ink md:text-[32px] md:leading-10">
          {t('guidance.referrals.title')}
        </h1>
        <p className="max-w-3xl text-base text-ink-muted">{t('guidance.referrals.lead')}</p>
        <p className="max-w-3xl text-[14px] text-ink">{t('guidance.referrals.noNotes')}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-2">
          <Chip className="self-start">
            <Building2 aria-hidden="true" className="size-4" />
            {t('guidance.referrals.office')}
          </Chip>
          <p className="font-semibold text-ink">
            {t('guidance.referrals.inCharge', {
              name: GUIDANCE_OFFICE.personInCharge,
              role: GUIDANCE_OFFICE.roleTitle,
            })}
          </p>
          <p className="text-[14px] text-ink">
            {t('guidance.referrals.location', { value: GUIDANCE_OFFICE.location })}
          </p>
          <p className="text-[14px] text-ink">
            {t('guidance.referrals.hours', { value: GUIDANCE_OFFICE.hours })}
          </p>
          <ContactLine
            icon={Phone}
            href={`tel:${GUIDANCE_OFFICE.dial}`}
            text={t('guidance.referrals.contact', { value: GUIDANCE_OFFICE.phone })}
          />
        </Card>
        {SPECIALISTS.map((s) => (
          <Card key={s.id} className="flex flex-col gap-2">
            <Chip className="self-start">
              {s.kind === 'partner'
                ? t('guidance.referrals.partner')
                : t('guidance.referrals.external')}
            </Chip>
            <p className="font-semibold text-ink">{s.name}</p>
            <p className="text-[14px] text-ink-muted">{s.description}</p>
            <ContactLine icon={Phone} text={t('guidance.referrals.contact', { value: s.phone })} />
            <ContactLine icon={Mail} text={t('guidance.referrals.email', { value: s.email })} />
          </Card>
        ))}
        <Card className="flex flex-col gap-3">
          <Chip className="self-start">{t('guidance.referrals.hotlines')}</Chip>
          <ul className="flex flex-col gap-2">
            {HOTLINES.map((h) => (
              <li key={h.id} className="rounded-control bg-surface-muted p-3">
                <p className="font-semibold text-ink">{h.name}</p>
                <p className="text-[14px] text-ink-muted">{h.note}</p>
                <ContactLine icon={Phone} href={`tel:${h.dial}`} text={h.number} />
              </li>
            ))}
          </ul>
          <EmergencyNotice />
        </Card>
      </div>
    </div>
  );
}

function ContactLine({ icon: Icon, text, href }) {
  const body = (
    <>
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span>{text}</span>
    </>
  );
  return href ? (
    <a
      href={href}
      className="inline-flex min-h-11 items-center gap-2 text-[14px] font-semibold text-ink underline"
    >
      {body}
    </a>
  ) : (
    <p className="flex items-center gap-2 text-[14px] text-ink">{body}</p>
  );
}
