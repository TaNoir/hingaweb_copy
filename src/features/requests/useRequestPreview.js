import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';

/**
 * The student's own latest check-in, shown on the request screen so the student sees exactly
 * which answers will be shared (2.1.5.1.6; D-10). Owner-only RLS. Never reads the note.
 * @returns {{ status: 'loading'|'error'|'ready', checkin: object|null, reload: () => void }}
 */
export function useRequestPreview(owner) {
  const [attempt, setAttempt] = useState(0);
  const key = `${owner}|${attempt}`;
  const [state, setState] = useState({ key: null, status: 'loading', checkin: null });
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    supabase
      .from('checkins')
      .select('id, created_at, c1, c2, c3, c4')
      .eq('student_id', owner)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        setState({
          key,
          status: error ? 'error' : 'ready',
          checkin: error ? null : (data ?? null),
        });
      });
    return () => {
      active = false;
    };
  }, [owner, key]);

  if (state.key !== key) return { status: 'loading', checkin: null, reload };
  return { status: state.status, checkin: state.checkin, reload };
}
