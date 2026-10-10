// admin-accounts (2.1.5.3.1, 2.1.6.2.9; Figs 27-28). Administrator only, at aal2.
//   { action: 'list' }   -> staff accounts with their sign-in email and last sign-in time
//   { action: 'create', email, display_name, role } -> invites a staff member by email
// Staff accounts are never self-registered. The invitation creates the account WITHOUT a
// password; the staff member sets one and enrols TOTP at /staff/setup (Phase 02).
// Service-client use, named here as 00 Section 5.2 requires:
//   - auth.admin.getUserById for STAFF ids only (email, last sign-in). Never student users.
//   - auth.admin.inviteUserByEmail, then an insert into staff_accounts, then (only if that
//     insert fails) auth.admin.deleteUser to undo the half-made account.
// Role changes and deactivation are plain updates from the browser (RLS: administrator only).
import { bearer, makeHttp, readJson } from '../_shared/http.js';

/**
 * @param {{ z: object, makeUserClient: (auth: string) => object, makeServiceClient: () => object,
 *   siteUrl: string, allowedOrigin?: string }} deps
 */
export function makeAdminAccounts({
  z,
  makeUserClient,
  makeServiceClient,
  siteUrl,
  allowedOrigin = '*',
}) {
  const http = makeHttp(allowedOrigin);
  const Input = z.discriminatedUnion('action', [
    z.object({ action: z.literal('list') }).strict(),
    z
      .object({
        action: z.literal('create'),
        email: z.email().max(254),
        display_name: z.string().trim().min(2).max(120),
        role: z.enum(['guidance', 'administrator']),
      })
      .strict(),
  ]);

  return async function adminAccounts(req) {
    if (req.method === 'OPTIONS') return http.preflight();
    if (req.method !== 'POST') return http.json({ error: 'method_not_allowed' }, 405);
    const auth = bearer(req);
    if (!auth) return http.json({ error: 'unauthorized' }, 401);

    const input = Input.safeParse(await readJson(req));
    if (!input.success) return http.json({ error: 'bad_request' }, 400);

    // is_admin() is true only for an active administrator at aal2 (Phase 01).
    const db = makeUserClient(auth);
    const check = await db.rpc('is_admin');
    if (check.error || check.data !== true) return http.json({ error: 'not_allowed' }, 403);

    const service = makeServiceClient();

    if (input.data.action === 'list') {
      const staff = await db
        .from('staff_accounts')
        .select('id, role, display_name, is_active')
        .order('display_name', { ascending: true });
      if (staff.error) return http.json({ error: 'read_failed' }, 500);
      const accounts = [];
      for (const s of staff.data ?? []) {
        const { data } = await service.auth.admin.getUserById(s.id);
        accounts.push({
          ...s,
          email: data?.user?.email ?? null,
          last_sign_in_at: data?.user?.last_sign_in_at ?? null,
        });
      }
      return http.json({ accounts });
    }

    const { email, display_name, role } = input.data;
    const invited = await service.auth.admin.inviteUserByEmail(email, {
      data: { account_type: 'staff' },
      redirectTo: `${siteUrl.replace(/\/$/, '')}/staff/setup`,
    });
    if (invited.error) {
      const taken = invited.error.status === 422 || /already/i.test(invited.error.message ?? '');
      return http.json({ error: taken ? 'email_taken' : 'invite_failed' }, taken ? 409 : 500);
    }
    const userId = invited.data.user.id;
    const row = await service
      .from('staff_accounts')
      .insert({ id: userId, role, display_name })
      .select('id')
      .single();
    if (row.error) {
      await service.auth.admin.deleteUser(userId);
      return http.json({ error: 'invite_failed' }, 500);
    }
    return http.json({ id: userId, email, role, display_name });
  };
}
