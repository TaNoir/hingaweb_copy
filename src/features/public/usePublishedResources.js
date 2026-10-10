import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';

/**
 * Published resources (Tier 1 public read; RLS returns only rows with verified_at set).
 * @returns {{ status: 'loading'|'error'|'ready', resources: object[], reload: () => void }}
 */
export function usePublishedResources() {
  const [state, setState] = useState({ status: 'loading', resources: [] });
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }));
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let active = true;
    supabase
      .from('resources')
      .select('id, title, url, attributes')
      .not('verified_at', 'is', null)
      .order('title', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        setState(
          error ? { status: 'error', resources: [] } : { status: 'ready', resources: data ?? [] },
        );
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  return { ...state, reload };
}
