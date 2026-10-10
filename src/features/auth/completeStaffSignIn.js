import { supabase } from '../../lib/supabase.js';
import { setLastActivity } from '../../lib/storage.js';
import { timeoutFlag } from '../../lib/auth/idle.js';
import { homePathFor } from '../../lib/auth/homePath.js';

/** After the second factor succeeds: start the idle clock fresh, reload the account, go home. */
export async function completeStaffSignIn({ refresh, navigate }) {
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
  navigate(homePathFor(loaded.account, loaded.aal), { replace: true });
}
