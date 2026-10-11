// A one-line hotline strip at the top of every public page (ui-landing-v2). Names and numbers come
// from the hotline directory (demo values in demo mode, placeholders otherwise); nothing is
// hard-coded here. From 640 px it is one line: lead, main hotline, emergency number. On phones it
// is two lines: the lead with the emergency number, then the main hotline.
import { t } from '../../copy/index.js';
import { HOTLINES, emergencyHotline } from '../../content/directory.js';

export function CrisisStrip() {
  const emergency = emergencyHotline();
  const main = HOTLINES.find((h) => !h.emergency) ?? emergency;
  return (
    <div className="bg-help-strip text-help-ink">
      <p className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-2.5 px-3 text-center text-[12px] leading-snug sm:gap-x-3 sm:px-4 sm:text-[13px] md:px-6">
        <span className="order-1 font-semibold">{t('nav.strip.lead')}</span>
        <a
          href={`tel:${main.dial}`}
          className="order-3 inline-flex min-h-11 basis-full items-center justify-center font-semibold underline sm:order-2 sm:basis-auto"
        >
          {main.name} {main.number}
        </a>
        <span aria-hidden="true" className="hidden sm:order-3 sm:inline">
          ·
        </span>
        <span className="order-2 sm:order-4">
          {t('nav.strip.emergencies')}{' '}
          <a
            href={`tel:${emergency.dial}`}
            className="inline-flex min-h-11 items-center font-semibold underline"
          >
            {emergency.number}
          </a>
        </span>
      </p>
    </div>
  );
}
