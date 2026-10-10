import { supabase } from '../../lib/supabase.js';
import { setLastActivity } from '../../lib/storage.js';
import { timeoutFlag } from '../../lib/auth/idle.js';
import { homePathFor } from '../../lib/auth/homePath.js';

/** After the second factor succeeds: start the idle clock fresh, reload the account, go home. */
export async function completeStaffSignIn({ refresh, navigate }) {
  // Called only from /staff/verify and /staff/setup, so this is the sign-in step's path.
  const signInPath = window.location.pathname;
  setLastActivity(Date.now());
  timeoutFlag.clear();
  // Team decision (Phase 08): supabase-js 2.117.3 does not pass the new aal2 token to Realtime
  // after MFA verify, so the crisis alert subscription would join at aal1 and receive nothing.
  // Refreshing emits TOKEN_REFRESHED, which updates Realtime. A failure here does not undo the
  // sign-in, and the 60-second poll still keeps the crisis count current, so continue anyway.
  try {
    await supabase.auth.refreshSession();
  } catch {
    // ignore
  }
  const loaded = await refresh();
  // Team decision (Phase 09): the sign-in step's guard may already have sent the user home, and
  // they may have opened another page since. Navigate only while still on the sign-in step, so a
  // fast click elsewhere is never undone.
  if (window.location.pathname === signInPath) {
    navigate(homePathFor(loaded.account, loaded.aal), { replace: true });
  }
}
