import { describe, it, expect } from 'vitest';
import {
  firstContactDueDate,
  firstSchoolDayFor,
  formatSchoolDate,
  holidaysConfigured,
  isFirstContactLate,
  isSchoolDay,
  manilaDate,
  nextSchoolDay,
  officeStatus,
  parseHHMM,
} from './time.js';
import { SITE } from '../config/site.js';

// 12 Oct 2026 is a Monday. Manila is UTC+8.
const site = {
  ...SITE,
  officeOpens: '08:00',
  officeCloses: '17:00',
  holidays: ['2026-10-14'],
};
// The office's values before the guidance office fills them in (kept here so this test still
// passes after src/config/site.js has real hours and holidays).
const unfilled = {
  ...SITE,
  officeOpens: '[[GUIDANCE:office_opens_hhmm]]',
  officeCloses: '[[GUIDANCE:office_closes_hhmm]]',
  holidays: ['[[GUIDANCE:holiday_dates_iso]]'],
};
const manila = (date, hhmm) => new Date(`${date}T${hhmm}:00+08:00`);

describe('time.js (2.1.7.3; 2.1.3.8)', () => {
  it('reads HH:MM and ignores placeholders', () => {
    expect(parseHHMM('08:30')).toBe(510);
    expect(parseHHMM('[[GUIDANCE:office_opens_hhmm]]')).toBeNull();
    expect(holidaysConfigured(unfilled)).toBe(false);
    expect(holidaysConfigured(site)).toBe(true);
  });

  it('uses the Manila calendar date', () => {
    expect(manilaDate('2026-10-11T17:00:00Z')).toBe('2026-10-12'); // 1 AM Monday in Manila
  });

  it('knows school days, weekends, and holidays', () => {
    expect(isSchoolDay('2026-10-12', site)).toBe(true);
    expect(isSchoolDay('2026-10-17', site)).toBe(false); // Saturday
    expect(isSchoolDay('2026-10-14', site)).toBe(false); // holiday
    expect(nextSchoolDay('2026-10-16', site)).toBe('2026-10-19'); // Friday -> Monday
    expect(nextSchoolDay('2026-10-13', site)).toBe('2026-10-15'); // skips the holiday
  });

  it('says open, closed, or unknown', () => {
    expect(officeStatus(manila('2026-10-12', '09:00'), site)).toBe('open');
    expect(officeStatus(manila('2026-10-12', '18:30'), site)).toBe('closed');
    expect(officeStatus(manila('2026-10-17', '09:00'), site)).toBe('closed');
    expect(officeStatus(manila('2026-10-12', '09:00'), unfilled)).toBe('unknown');
    expect(officeStatus(manila('2026-10-17', '09:00'), unfilled)).toBe('closed');
  });

  it('starts the clock on the next school day after hours, weekends, and holidays', () => {
    expect(firstSchoolDayFor(manila('2026-10-12', '10:00'), site)).toBe('2026-10-12');
    expect(firstSchoolDayFor(manila('2026-10-12', '17:30'), site)).toBe('2026-10-13');
    expect(firstSchoolDayFor(manila('2026-10-17', '10:00'), site)).toBe('2026-10-19');
    expect(firstSchoolDayFor(manila('2026-10-12', '17:30'), unfilled)).toBe('2026-10-12'); // hours unknown
  });

  it('first contact is due by the third school day', () => {
    expect(firstContactDueDate(manila('2026-10-12', '10:00'), site)).toBe('2026-10-15'); // Mon, Tue, (holiday), Thu
    expect(firstContactDueDate(manila('2026-10-16', '10:00'), site)).toBe('2026-10-20'); // Fri, Mon, Tue
  });

  it('is late only after the due day ends and only with no first contact', () => {
    const at = manila('2026-10-16', '10:00');
    expect(isFirstContactLate(at, null, manila('2026-10-20', '16:00'), site)).toBe(false);
    expect(isFirstContactLate(at, null, manila('2026-10-21', '08:00'), site)).toBe(true);
    expect(
      isFirstContactLate(at, '2026-10-16T05:00:00Z', manila('2026-10-30', '08:00'), site),
    ).toBe(false);
  });

  it('formats a school date', () => {
    expect(formatSchoolDate('2026-10-19')).toBe('Monday, 19 October 2026');
  });
});
