/* eslint-disable no-restricted-globals */
// The ONLY file allowed to touch browser storage (00 must-never 14).
// It stores one non-student value: the staff member's last-activity time, used by the
// 15-minute inactivity rule (2.1.6.2.9, N-03). Never add student text here.

const LAST_ACTIVITY_KEY = 'hw.staff.lastActivity';

/** @returns {number|null} epoch milliseconds, or null when unknown */
export function getLastActivity() {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    const n = raw == null ? NaN : Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** @param {number} ms epoch milliseconds */
export function setLastActivity(ms) {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(ms));
  } catch {
    // storage unavailable (private mode): the in-memory timer still applies
  }
}

export function clearLastActivity() {
  try {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {
    // ignore
  }
}
