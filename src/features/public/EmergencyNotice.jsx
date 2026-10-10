// "Not for emergencies" notice (2.1.5.1.8, 2.1.6.4.6). Static; never needs the backend.
import { Info } from 'lucide-react';
import { t } from '../../copy/index.js';
import { emergencyHotline } from '../../content/directory.js';

export function EmergencyNotice({ lang = 'en' }) {
  return (
    <p className="flex items-start gap-2 text-[14px] text-ink">
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{t('public.emergency.notice', { number: emergencyHotline().number }, lang)}</span>
    </p>
  );
}
