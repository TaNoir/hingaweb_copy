import { describe, it, expect } from 'vitest';
import {
  followUpTimestamp,
  markersFor,
  matchesStatus,
  orderActive,
  splitQueue,
} from './guidanceHelpers.js';

const row = (id, band, created_at, extra = {}) => ({
  id,
  band,
  created_at,
  status: 'pending',
  has_other_open_request: false,
  is_overdue: false,
  first_contact_at: null,
  ...extra,
});

describe('queue order (2.1.5.2.2)', () => {
  it('P1, P2, P3, oldest first within each; For Review in its own queue, oldest first', () => {
    const rows = [
      row('a', 'P3', '2026-10-12T01:00:00Z'),
      row('b', 'P1', '2026-10-12T03:00:00Z'),
      row('c', 'FR', '2026-10-12T02:00:00Z'),
      row('d', 'P1', '2026-10-12T02:00:00Z'),
      row('e', 'P2', '2026-10-11T02:00:00Z'),
      row('f', 'FR', '2026-10-11T02:00:00Z'),
      row('g', null, '2026-10-10T02:00:00Z'),
    ];
    const { priority, review } = splitQueue(rows);
    expect(priority.map((r) => r.id)).toEqual(['d', 'b', 'e', 'a']);
    expect(review.map((r) => r.id)).toEqual(['g', 'f', 'c']);
  });

  it('never reads an office tag', () => {
    const a = row('a', 'P2', '2026-10-12T01:00:00Z', { office_tag: 'x' });
    const b = row('b', 'P2', '2026-10-12T02:00:00Z');
    expect(splitQueue([b, a]).priority.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('status filters: open means pending, reviewed, referred', () => {
    expect(matchesStatus({ status: 'referred' }, 'open')).toBe(true);
    expect(matchesStatus({ status: 'resolved' }, 'open')).toBe(false);
    expect(matchesStatus({ status: 'resolved' }, 'resolved')).toBe(true);
    expect(matchesStatus({ status: 'resolved' }, 'all')).toBe(true);
  });
});

describe('markers (2.1.3.7, 2.1.3.8, 2.1.5.2.7)', () => {
  // Friday 16 Oct 2026, 10:00 Manila; due by the end of Tuesday 20 Oct (holidays not set).
  const created = '2026-10-16T02:00:00Z';
  it('shows each marker that applies, in a fixed order', () => {
    const r = row('a', 'P2', created, { has_other_open_request: true, is_overdue: true });
    expect(markersFor(r, new Date('2026-10-21T01:00:00Z'))).toEqual([
      'otherOpen',
      'followUpOverdue',
      'firstContactLate',
    ]);
  });
  it('no first-contact marker before the due day ends, after a first contact, or once resolved', () => {
    expect(markersFor(row('a', 'P2', created), new Date('2026-10-20T08:00:00Z'))).toEqual([]);
    expect(
      markersFor(
        row('a', 'P2', created, { first_contact_at: '2026-10-16T03:00:00Z' }),
        new Date('2026-10-30T01:00:00Z'),
      ),
    ).toEqual([]);
    expect(
      markersFor(row('a', 'P2', created, { status: 'resolved' }), new Date('2026-10-30T01:00:00Z')),
    ).toEqual([]);
  });
});

describe('crisis order and follow-up', () => {
  it('unacknowledged first, then longest waiting', () => {
    const rows = [
      { id: 'a', created_at: '2026-10-12T01:00:00Z', acknowledged_at: '2026-10-12T01:05:00Z' },
      { id: 'b', created_at: '2026-10-12T03:00:00Z', acknowledged_at: null },
      { id: 'c', created_at: '2026-10-12T02:00:00Z', acknowledged_at: null },
    ];
    expect(orderActive(rows).map((r) => r.id)).toEqual(['c', 'b', 'a']);
  });
  it('a follow-up date ends at 23:59:59 Manila time', () => {
    expect(followUpTimestamp('2026-10-20')).toBe('2026-10-20T23:59:59+08:00');
  });
});
