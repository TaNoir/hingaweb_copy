// Guidance helpers (Phase 08). Queue order (2.1.5.2.2): P1, then P2, then P3; within a priority, the request that has waited
// longest comes first. For Review requests sit in their own queue, oldest first.
// Office tags are never read here (2.1.5.2.5).
import { OPEN_STATES } from '../../config/vocabulary.js';
import { isFirstContactLate } from '../../lib/time.js';

const RANK = { P1: 0, P2: 1, P3: 2 };

function oldestFirst(a, b) {
  return new Date(a.created_at) - new Date(b.created_at) || (a.id < b.id ? -1 : 1);
}

/** Splits rows into { priority, review }, each in display order. */
export function splitQueue(rows) {
  const priority = rows
    .filter((r) => r.band in RANK)
    .sort((a, b) => RANK[a.band] - RANK[b.band] || oldestFirst(a, b));
  const review = rows.filter((r) => !(r.band in RANK)).sort(oldestFirst);
  return { priority, review };
}

/** status filter: 'open' (pending, reviewed, referred), 'all', or one status value. */
export function matchesStatus(row, filter) {
  if (filter === 'all') return true;
  if (filter === 'open') return OPEN_STATES.includes(row.status);
  return row.status === filter;
}

/** The markers shown in the Notes column, in this order. */
export function markersFor(row, now = new Date()) {
  const out = [];
  if (row.has_other_open_request) out.push('otherOpen');
  if (row.is_overdue) out.push('followUpOverdue');
  if (
    OPEN_STATES.includes(row.status) &&
    isFirstContactLate(row.created_at, row.first_contact_at, now)
  ) {
    out.push('firstContactLate');
  }
  return out;
}

/** Crisis channel order: unacknowledged first, then the longest waiting. */
export function orderActive(rows) {
  return [...rows].sort(
    (a, b) =>
      Number(Boolean(a.acknowledged_at)) - Number(Boolean(b.acknowledged_at)) ||
      new Date(a.created_at) - new Date(b.created_at),
  );
}

/** A follow-up date means "by the end of that Manila day" (2.1.5.2.7). */
export function followUpTimestamp(isoDate) {
  return `${isoDate}T23:59:59+08:00`;
}
