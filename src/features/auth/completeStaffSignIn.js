import { setLastActivity } from '../../lib/storage.js';
import { timeoutFlag } from '../../lib/auth/idle.js';
import { homePathFor } from '../../lib/auth/homePath.js';

/** After the second factor succeeds: start the idle clock fresh, reload the account, go home. */
export async function completeStaffSignIn({ refresh, navigate }) {
  setLastActivity(Date.now());
  timeoutFlag.clear();
  const loaded = await refresh();
  navigate(homePathFor(loaded.account, loaded.aal), { replace: true });
}
