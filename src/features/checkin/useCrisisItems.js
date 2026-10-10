import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';

/**
 * The active crisis items (Table 12). Labels come from the database, never from code (00 §11.2).
 * RLS shows students only active items. protocol_ref is never read here.
 * @returns {{ status: 'loading'|'error'|'ready', items: {id: string, label: string}[], reload: () => void }}
 */
export function useCrisisItems() {
  const [state, setState] = useState({ status: 'loading', items: [] });
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }));
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let active = true;
    supabase
      .from('crisis_items')
      .select('id, label')
      .eq('is_active', true)
      .order('label', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        setState(error ? { status: 'error', items: [] } : { status: 'ready', items: data ?? [] });
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  return { ...state, reload };
}
