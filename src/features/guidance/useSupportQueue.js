import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';

/** Columns of the support_queue view (Phase 01). There is no note column (2.1.3.7). */
export const QUEUE_COLUMNS =
  'id, created_at, status, concern_type, follow_up_at, full_name, grade_level, section, class_adviser, band, has_other_open_request, first_contact_at, is_overdue';
export const QUEUE_POLL_MS = 60000;

/**
 * The guidance queue. support_requests is not on Realtime (Phase 01), so the list reloads every
 * 60 seconds, when the window regains focus, and on "Refresh". Rows already shown stay on screen
 * while a reload runs or fails.
 */
export function useSupportQueue() {
  const [state, setState] = useState({ status: 'loading', rows: [], loadedAt: null });
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    supabase
      .from('support_queue')
      .select(QUEUE_COLUMNS)
      .then(({ data, error }) => {
        if (!active) return;
        setState((s) =>
          error
            ? { ...s, status: s.loadedAt ? 'stale' : 'error' }
            : { status: 'ready', rows: data ?? [], loadedAt: new Date() },
        );
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  useEffect(() => {
    const timer = setInterval(reload, QUEUE_POLL_MS);
    window.addEventListener('focus', reload);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', reload);
    };
  }, [reload]);

  return { ...state, reload };
}
