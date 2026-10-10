import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { rangeStart } from './chartDates.js';

/** Columns the trends view reads. Never the note (2.1.6.2.7) and never anything derived. */
export const HISTORY_COLUMNS = 'created_at, c1, c2, c3, c4, mood, stress';

/**
 * The signed-in student's own check-ins, oldest first (owner-only RLS, Table 8).
 * @param {string} owner  the student's id
 * @param {'days30'|'months3'|'all'} range
 * @returns {{ status: 'loading'|'error'|'ready', rows: object[], reload: () => void }}
 */
export function useCheckinHistory(owner, range) {
  const [attempt, setAttempt] = useState(0);
  const key = `${owner}|${range}|${attempt}`;
  const [state, setState] = useState({ key: null, status: 'loading', rows: [] });
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    let q = supabase.from('checkins').select(HISTORY_COLUMNS).eq('student_id', owner);
    const since = rangeStart(range);
    if (since) q = q.gte('created_at', since);
    q.order('created_at', { ascending: true })
      .limit(1000)
      .then(({ data, error }) => {
        if (!active) return;
        setState({ key, status: error ? 'error' : 'ready', rows: error ? [] : (data ?? []) });
      });
    return () => {
      active = false;
    };
  }, [owner, range, key]);

  // Until the answer for the current range arrives, report loading (never show stale rows).
  if (state.key !== key) return { status: 'loading', rows: [], reload };
  return { status: state.status, rows: state.rows, reload };
}
