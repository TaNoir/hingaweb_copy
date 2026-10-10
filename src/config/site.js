// 00 Section 6.2. Values in [[...]] are placeholders filled by the guidance office or school.
export const SITE = Object.freeze({
  appName: 'HingaWeb',
  tagline: 'SENIOR HIGH GUIDANCE',
  schoolName: 'Rizal Memorial Colleges, Inc.',
  footerLine: 'Rizal Memorial Colleges, Inc. senior high school guidance office.',
  timeZone: 'Asia/Manila',
  schoolDays: Object.freeze([1, 2, 3, 4, 5]), // Monday..Friday (ISO weekday)
  officeOpens: '[[GUIDANCE:office_opens_hhmm]]',
  officeCloses: '[[GUIDANCE:office_closes_hhmm]]',
  holidays: Object.freeze(['[[GUIDANCE:holiday_dates_iso]]']),
  officeLocation: '[[GUIDANCE:office_room_and_building]]',
  officeHoursText: '[[GUIDANCE:office_hours_text]]',
  staffSupportContact: '[[SCHOOL:it_contact_for_lost_authenticator]]',
});

// Staff inactivity limit (2.1.6.2.9). Not a scoring number; lives here, not in scoring-config.js.
export const STAFF_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
