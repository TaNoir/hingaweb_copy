// Manila time and school days (00 Section 6.2; 2.1.7.3; 2.1.3.8). Pure functions; every one takes
// `site` so tests can pass other hours and holidays. Placeholders in SITE are treated as unknown:
// hours that are not "HH:MM" are ignored, and holiday entries that are not "YYYY-MM-DD" are ignored.
import { format } from 'date-fns';
import { TZDate } from '@date-fns/tz';
import { SITE } from '../config/site.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "08:00" -> 480. Anything else (including a placeholder) -> null. */
export function parseHHMM(value) {
  const m = HHMM.exec(value ?? '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Holiday dates that are real YYYY-MM-DD values. */
export function holidaySet(site = SITE) {
  return new Set(site.holidays.filter((d) => ISO_DATE.test(d)));
}

/** True once the guidance office has filled in at least one holiday date. */
export function holidaysConfigured(site = SITE) {
  return holidaySet(site).size > 0;
}

function inManila(value) {
  return new TZDate(new Date(value).getTime(), SITE.timeZone);
}

/** The Manila calendar date of a moment, "YYYY-MM-DD". */
export function manilaDate(value) {
  return format(inManila(value), 'yyyy-MM-dd');
}

function addIsoDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** ISO weekday of a "YYYY-MM-DD" date: Monday = 1 ... Sunday = 7. */
function isoWeekday(iso) {
  const d = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

export function isSchoolDay(iso, site = SITE) {
  return site.schoolDays.includes(isoWeekday(iso)) && !holidaySet(site).has(iso);
}

/** The first school day strictly after `iso`. */
export function nextSchoolDay(iso, site = SITE) {
  let d = addIsoDays(iso, 1);
  for (let i = 0; i < 400 && !isSchoolDay(d, site); i += 1) d = addIsoDays(d, 1);
  return d;
}

/**
 * Is the office open now? 'open' | 'closed' | 'unknown'.
 * Weekends and holidays are 'closed'. On a school day the answer is 'unknown' until the office
 * hours in SITE are real "HH:MM" values.
 */
export function officeStatus(now = new Date(), site = SITE) {
  if (!isSchoolDay(manilaDate(now), site)) return 'closed';
  const opens = parseHHMM(site.officeOpens);
  const closes = parseHHMM(site.officeCloses);
  if (opens == null || closes == null) return 'unknown';
  const m = inManila(now);
  const minutes = m.getHours() * 60 + m.getMinutes();
  return minutes >= opens && minutes < closes ? 'open' : 'closed';
}

/** The school day on which a request sent at `at` is first seen (2.1.7.3). */
export function firstSchoolDayFor(at, site = SITE) {
  const day = manilaDate(at);
  if (!isSchoolDay(day, site)) return nextSchoolDay(day, site);
  const closes = parseHHMM(site.officeCloses);
  if (closes != null) {
    const m = inManila(at);
    if (m.getHours() * 60 + m.getMinutes() >= closes) return nextSchoolDay(day, site);
  }
  return day;
}

/**
 * The last school day by which a first contact is due (2.1.3.8: "no other request may wait more
 * than three school days for a first contact"): the third school day, counting the day the
 * request is first seen as day one.
 */
export function firstContactDueDate(at, site = SITE) {
  let d = firstSchoolDayFor(at, site);
  for (let i = 1; i < 3; i += 1) d = nextSchoolDay(d, site);
  return d;
}

/** True when there is still no first contact and the due school day has ended (Manila date). */
export function isFirstContactLate(createdAt, firstContactAt, now = new Date(), site = SITE) {
  if (firstContactAt) return false;
  return manilaDate(now) > firstContactDueDate(createdAt, site);
}

/** "Monday, 12 October 2026" for a "YYYY-MM-DD" school date. */
export function formatSchoolDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return format(new TZDate(Date.UTC(y, m - 1, d, 12), 'UTC'), 'EEEE, d MMMM yyyy');
}
