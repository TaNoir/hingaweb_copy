// Live crisis events for the guidance role (2.1.3.8, 2.1.6.1.6 staff half; Table 11).
// One Realtime subscription for every guidance screen: a new crisis_events row reaches the
// browser at once (RLS lets only guidance at aal2 receive it). The count is refreshed on each
// event, every 60 seconds, and when the window regains focus, in case Realtime drops.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';

export const POLL_MS = 60000;
export const CrisisFeedContext = createContext({
  activeCount: 0,
  version: 0,
  alert: false,
  dismissAlert: () => {},
});

export function useCrisisFeed() {
  return useContext(CrisisFeedContext);
}

/** Runs the subscription. Used once, by GuidanceLayout. */
export function useCrisisFeedSource() {
  const [activeCount, setActiveCount] = useState(0);
  const [version, setVersion] = useState(0);
  const [alert, setAlert] = useState(false);

  const refresh = useCallback(() => {
    supabase
      .from('crisis_channel')
      .select('id', { count: 'exact', head: true })
      .is('resolved_at', null)
      .then(({ count, error }) => {
        if (!error && typeof count === 'number') setActiveCount(count);
      });
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel('guidance-crisis-events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crisis_events' }, () => {
        setAlert(true);
        setVersion((v) => v + 1);
        refresh();
      })
      .subscribe();
    const timer = setInterval(refresh, POLL_MS);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const dismissAlert = useCallback(() => setAlert(false), []);
  const bump = useCallback(() => {
    setVersion((v) => v + 1);
    refresh();
  }, [refresh]);
  return { activeCount, version, alert, dismissAlert, refresh: bump };
}
