// rank-resources (2.1.5.1.5, 2.1.6.1.5; Equation 2). Ranks the published resources against the
// caller's latest check-in. Every read uses the caller's JWT, so RLS decides what is visible
// (2.2.6). Returns the order and each guide's area only: no similarity and no vectors.
import { bearer, makeHttp } from '../_shared/http.js';
import { rankResources } from '../_shared/cbf.js';

/**
 * @param {{ z: object, makeUserClient: (auth: string) => object, allowedOrigin?: string }} deps
 */
export function makeRankResources({ z, makeUserClient, allowedOrigin = '*' }) {
  const http = makeHttp(allowedOrigin);
  const Area = z.enum(['school_work', 'home_family', 'future', 'managing']);
  const Output = z
    .object({
      basis: z.enum(['latest_checkin', 'none']),
      resources: z.array(
        z.object({ id: z.guid(), title: z.string(), url: z.string(), area: Area }).strict(),
      ),
    })
    .strict();
  const Rating = z.number().int().min(1).max(5);
  const Checkin = z.object({ c1: Rating, c2: Rating, c3: Rating, c4: Rating });

  return async function rank(req) {
    if (req.method === 'OPTIONS') return http.preflight();
    if (req.method !== 'POST') return http.json({ error: 'method_not_allowed' }, 405);
    const auth = bearer(req);
    if (!auth) return http.json({ error: 'unauthorized' }, 401);

    const db = makeUserClient(auth);
    // The caller's own latest check-in (owner-only RLS; staff see none).
    const latest = await db
      .from('checkins')
      .select('c1, c2, c3, c4')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest.error) return http.json({ error: 'read_failed' }, 500);
    if (!latest.data) return http.json(Output.parse({ basis: 'none', resources: [] }));
    const checkin = Checkin.safeParse(latest.data);
    if (!checkin.success) return http.json({ error: 'read_failed' }, 500);

    // Published resources only (D-07), even for a caller whose RLS could see drafts.
    const lib = await db
      .from('resources')
      .select('id, title, url, attributes')
      .not('verified_at', 'is', null);
    if (lib.error) return http.json({ error: 'read_failed' }, 500);

    return http.json(
      Output.parse({
        basis: 'latest_checkin',
        resources: rankResources(checkin.data, lib.data ?? []),
      }),
    );
  };
}
