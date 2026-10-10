// One line saying whether the crisis event has reached the guidance office (2.1.6.4.7).
// Shown on the crisis screen and under the safety items. Nothing shows until an item is ticked.
import { t } from '../../copy/index.js';

const KEYS = {
  sending: 'crisis.statusSending',
  sent: 'crisis.statusSent',
  retrying: 'crisis.statusRetrying',
  offline: 'crisis.statusOffline',
  failed: 'crisis.statusFailed',
};

export function CrisisStatus({ report, lang = 'en' }) {
  const key = KEYS[report.status];
  return (
    <p role="status" aria-live="polite" className="text-[14px] font-semibold text-ink">
      {key ? t(key, {}, lang) : ''}
    </p>
  );
}
