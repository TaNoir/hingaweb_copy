import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../supabase.js';
import { AuthContext } from './AuthContext.js';

const ANONYMOUS = Object.freeze({ kind: 'anonymous' });

/** Loads my_account() and the assurance level for a session. */
async function loadFor(session) {
  if (!session) return { account: ANONYMOUS, aal: null, loadError: false };
  const [acc, lvl] = await Promise.all([
    supabase.rpc('my_account'),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if (acc.error || lvl.error) return { account: ANONYMOUS, aal: null, loadError: true };
  return {
    account: acc.data,
    aal: { current: lvl.data.currentLevel, next: lvl.data.nextLevel },
    loadError: false,
  };
}

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    status: 'loading',
    session: null,
    account: ANONYMOUS,
    aal: null,
    loadError: false,
  });
  const seq = useRef(0);
  // While a sign-in page is checking WHO signed in, guards must not redirect (see RequireGuest).
  const [authBusy, setAuthBusy] = useState(false);

  const apply = useCallback(async (session) => {
    const mine = ++seq.current;
    const loaded = await loadFor(session);
    if (mine === seq.current) setState({ status: 'ready', session, ...loaded });
    return loaded;
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) apply(data.session);
    });
    // Never await Supabase calls inside this callback (supabase-js can deadlock); defer instead.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return; // handled by getSession above
      setTimeout(() => {
        if (active) apply(session);
      }, 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [apply]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return apply(data.session);
  }, [apply]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'local' });
    seq.current += 1;
    setState({ status: 'ready', session: null, account: ANONYMOUS, aal: null, loadError: false });
  }, []);

  const value = useMemo(
    () => ({ ...state, refresh, signOut, authBusy, setAuthBusy }),
    [state, refresh, signOut, authBusy],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
