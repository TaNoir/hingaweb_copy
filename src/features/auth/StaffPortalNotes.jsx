import { ShieldCheck } from 'lucide-react';
import { t } from '../../copy/index.js';

/** The two notes under the staff sign-in card (Figs 19-20). */
export function StaffPortalNotes() {
  return (
    <>
      <p className="text-center text-[14px] text-ink-muted">{t('staff.login.timeoutNote')}</p>
      <div className="rounded-card border border-line bg-surface p-5 text-center">
        <p className="flex items-center justify-center gap-2 text-[13px] font-semibold tracking-[0.12em] text-ink">
          <ShieldCheck aria-hidden="true" className="size-4" />
          {t('staff.login.obligationTitle')}
        </p>
        <p className="mt-2 text-[14px] text-ink">{t('staff.login.obligationBody')}</p>
      </div>
    </>
  );
}

export function StaffPortalHeading() {
  return (
    <div className="mb-2 text-center">
      <h1 className="text-[28px] font-semibold leading-9 text-ink md:text-[36px] md:leading-[44px]">
        {t('staff.login.title')}
      </h1>
      <p className="mx-auto mt-2 max-w-md text-base text-ink-muted">{t('staff.login.lead')}</p>
    </div>
  );
}
