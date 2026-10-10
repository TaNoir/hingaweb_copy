// Short dates for chart axes and tooltips, in Manila time (00 Section 6.2).
import { format, subDays, subMonths } from 'date-fns';
import { TZDate } from '@date-fns/tz';
import { SITE } from '../../config/site.js';

/** "12 Oct" */
export function shortDate(value) {
  return format(new TZDate(new Date(value).getTime(), SITE.timeZone), 'd MMM');
}

/** ISO start of a range, or null for all time. */
export function rangeStart(range, now = new Date()) {
  if (range === 'days30') return subDays(now, 30).toISOString();
  if (range === 'months3') return subMonths(now, 3).toISOString();
  return null;
}
