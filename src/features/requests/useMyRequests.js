import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';

/**
 * The signed-in student's own support requests, newest first (at most 5), from my_support_requests()
 * (user request 2026-10-11). Each row is { id, created_at, stage: 'sent'|'seen'|'closed', seen_at,
 * closed_at }. The database never returns the office's status words, the note, or anything else.
 * @returns {{ status: 'loading'|'error'|'ready', requests: object[], reload: () => void }}
 */
export function useMyRequests() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ attempt: null, status: 'loading', requests: [] });
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    supabase.rpc('my_support_requests').then(({ data, error }) => {
      if (!active) return;
      setState({
        attempt,
        status: error ? 'error' : 'ready',
        requests: error || !Array.isArray(data) ? [] : data,
      });
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  if (state.attempt !== attempt) return { status: 'loading', requests: [], reload };
  return { status: state.status, requests: state.requests, reload };
}
