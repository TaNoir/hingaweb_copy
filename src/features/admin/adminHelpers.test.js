import { describe, it, expect } from 'vitest';
import {
  consentRows,
  countBy,
  staffUpdateErrorKey,
  toCsv,
  validAttributes,
} from './adminHelpers.js';

const s = (id, full_name) => ({ id, full_name, grade_level: 12, section: 'A' });
const r = (student_id, type, status, signed_at) => ({
  id: `${student_id}-${type}-${signed_at}`,
  student_id,
  type,
  status,
  signed_at,
  instrument_version: 'v1',
});

describe('consentRows (Fig 29; D-27)', () => {
  it('uses the newest record of each type and sorts by name', () => {
    const rows = consentRows(
      [s('b', 'Miguel'), s('a', 'Ana'), s('c', 'Paolo'), s('d', 'Sam')],
      [
        r('a', 'assent', 'granted', '2026-08-01'),
        r('a', 'parental', 'granted', '2026-08-02'),
        r('b', 'assent', 'granted', '2026-08-01'),
        r('d', 'assent', 'granted', '2026-08-01'),
        r('d', 'parental', 'withdrawn', '2026-08-02'),
        r('d', 'parental', 'granted', '2026-09-01'),
      ],
    );
    expect(rows.map((x) => [x.full_name, x.category])).toEqual([
      ['Ana', 'both'],
      ['Miguel', 'awaiting'],
      ['Paolo', 'noAssent'],
      ['Sam', 'both'], // a newer parental consent after a withdrawal
    ]);
    expect(countBy(rows, 'category')).toEqual({ both: 2, awaiting: 1, noAssent: 1 });
  });

  it('a withdrawn assent or parental consent puts the student in Withdrawn', () => {
    const rows = consentRows(
      [s('a', 'Ana')],
      [r('a', 'assent', 'withdrawn', '2026-08-01'), r('a', 'parental', 'granted', '2026-08-02')],
    );
    expect(rows[0].category).toBe('withdrawn');
  });
});

describe('small helpers', () => {
  it('maps the Phase 01 staff trigger messages', () => {
    expect(
      staffUpdateErrorKey({ message: 'staff_accounts: you cannot change your own role or status' }),
    ).toBe('admin.accounts.errors.own');
    expect(
      staffUpdateErrorKey({
        message: 'staff_accounts: at least one active administrator is required',
      }),
    ).toBe('admin.accounts.errors.lastAdmin');
    expect(staffUpdateErrorKey({ message: 'x' })).toBe('admin.accounts.errors.generic');
  });

  it('validates resource attributes like the Table 16 CHECK', () => {
    expect(validAttributes({ school_work: 5, home_family: 0, future: 0, managing: 0 })).toBe(true);
    expect(validAttributes({ school_work: 0, home_family: 0, future: 0, managing: 0 })).toBe(false);
    expect(validAttributes({ school_work: 6, home_family: 0, future: 0, managing: 0 })).toBe(false);
    expect(validAttributes({ school_work: 1.5, home_family: 0, future: 0, managing: 0 })).toBe(
      false,
    );
  });

  it('writes CSV with quoting', () => {
    expect(toCsv(['a', 'b'], [['x', 'he said "hi", ok']])).toBe(
      'a,b\r\nx,"he said ""hi"", ok"\r\n',
    );
  });
});
