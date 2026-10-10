// Display formatting. All times are shown in Asia/Manila (00 Section 6.2).
import { format } from 'date-fns';
import { TZDate } from '@date-fns/tz';
import { SITE } from '../config/site.js';

/** "12 Oct 2026, 8:14 AM" in Manila time. */
export function formatDateTime(value) {
  return format(new TZDate(new Date(value).getTime(), SITE.timeZone), 'd MMM yyyy, h:mm a');
}

/** "12 Oct 2026" in Manila time. */
export function formatDate(value) {
  return format(new TZDate(new Date(value).getTime(), SITE.timeZone), 'd MMM yyyy');
}

/** "Ref 1a2b3c4d" — the only way a row id is ever shown (D-16). */
export function shortRef(uuid) {
  return `Ref ${String(uuid).slice(0, 8)}`;
}
