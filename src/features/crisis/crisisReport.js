// Sends crisis events (Table 11; 2.1.6.1.6; 2.1.6.4.7) in the background, so the crisis screen
// never waits for the server. Each ticked crisis item becomes one crisis_events row.
// The browser sends ONLY student_id and trigger_item_id; the database fills the disclosed copy
// (N-02). Never chain .select() on this insert: students cannot read crisis_events.
//
// Kept in page memory only (00 must-never 14). If the network is down it waits for 'online';
// if the server fails it keeps retrying while the page is open.
import { useSyncExternalStore } from 'react';
import { supabase } from '../../lib/supabase.js';

/** Errors that will never succeed on retry (missing/retired item, not a student, unknown student). */
const PERMANENT = new Set(['23502', '23503', '23514', '42501']);
/** Wait before each retry, in ms. The last value repeats. */
export const RETRY_DELAYS = [2000, 5000, 10000, 15000];

const IDLE = Object.freeze({ owner: null, status: 'idle', pending: [], sent: [], failed: [] });
let state = IDLE;
let sending = false;
let attempt = 0;
let timer = null;
const listeners = new Set();

function set(patch) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

function offline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function onOnline() {
  void flush();
}

async function flush() {
  if (sending) return;
  sending = true;
  clearTimeout(timer);
  while (state.pending.length) {
    const itemId = state.pending[0];
    set({ status: 'sending' });
    let error;
    try {
      ({ error } = await supabase
        .from('crisis_events')
        .insert({ student_id: state.owner, trigger_item_id: itemId }));
    } catch {
      error = { code: 'network' };
    }
    if (!error) {
      attempt = 0;
      set({ pending: state.pending.slice(1), sent: [...state.sent, itemId] });
      continue;
    }
    if (PERMANENT.has(error.code)) {
      set({ pending: state.pending.slice(1), failed: [...state.failed, itemId] });
      continue;
    }
    // Temporary problem: try again later. Nothing is lost while the page stays open.
    sending = false;
    if (offline()) {
      set({ status: 'offline' });
      window.addEventListener('online', onOnline, { once: true });
    } else {
      set({ status: 'retrying' });
      timer = setTimeout(flush, RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)]);
      attempt += 1;
    }
    return;
  }
  sending = false;
  set({ status: state.failed.length ? 'failed' : 'sent' });
}

/**
 * Raise a crisis event for this item. Returns at once; sending happens in the background.
 * The same item is never sent twice in one page session.
 */
export function reportCrisisItem(owner, itemId) {
  if (state.owner !== owner) {
    clearTimeout(timer);
    state = { ...IDLE, owner };
  }
  if ([...state.pending, ...state.sent, ...state.failed].includes(itemId)) return;
  set({ pending: [...state.pending, itemId], status: 'sending' });
  void flush();
}

export function getCrisisReport() {
  return state;
}

export function subscribeCrisisReport(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The report for this student ('idle' when they have not ticked anything in this page session). */
export function useCrisisReport(owner) {
  const s = useSyncExternalStore(subscribeCrisisReport, getCrisisReport);
  return s.owner === owner ? s : IDLE;
}

/** Tests only. */
export function resetCrisisReport() {
  clearTimeout(timer);
  if (typeof window !== 'undefined') window.removeEventListener('online', onOnline);
  sending = false;
  attempt = 0;
  state = IDLE;
  for (const l of listeners) l();
}
