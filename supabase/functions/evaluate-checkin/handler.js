// evaluate-checkin (2.1.5.1.7; N-01). Decides whether to ask the student about a support request
// after a private check-in. Computes Equation 1 IN MEMORY under the student's own JWT and returns
// only { prompt: 'max_sev' | 'gray_zone' | null }. The score is never returned, logged, or stored.
// The browser stores nothing either, except the prompt_events row the student's answer creates.
import { bearer, makeHttp, readJson } from '../_shared/http.js';
import { checkinPrompt } from '../_shared/saw.js';

/**
 * @param {{ z: object, makeUserClient: (auth: string) => object, config: object, allowedOrigin?: string }} deps
 * @returns {(req: Request) => Promise<Response>}
 */
export function makeEvaluateCheckin({ z, makeUserClient, config, allowedOrigin = '*' }) {
  const http = makeHttp(allowedOrigin);
  const Input = z.object({ checkin_id: z.guid() }).strict();
  const Output = z.object({ prompt: z.enum(['max_sev', 'gray_zone']).nullable() }).strict();
  const Rating = z.number().int().min(1).max(5);
  const Row = z.object({ c1: Rating, c2: Rating, c3: Rating, c4: Rating });

  return async function evaluateCheckin(req) {
    if (req.method === 'OPTIONS') return http.preflight();
    if (req.method !== 'POST') return http.json({ error: 'method_not_allowed' }, 405);

    const auth = bearer(req);
    if (!auth) return http.json({ error: 'unauthorized' }, 401);

    const input = Input.safeParse(await readJson(req));
    if (!input.success) return http.json({ error: 'bad_request' }, 400);

    // Read through RLS as the student: only the owner can see this row (Table 8).
    const db = makeUserClient(auth);
    const { data, error } = await db
      .from('checkins')
      .select('c1, c2, c3, c4')
      .eq('id', input.data.checkin_id)
      .maybeSingle();
    if (error) return http.json({ error: 'read_failed' }, 500);
    if (!data) return http.json({ error: 'not_found' }, 404);

    const row = Row.safeParse(data);
    if (!row.success) return http.json({ error: 'read_failed' }, 500);

    return http.json(Output.parse({ prompt: checkinPrompt(row.data, config) }));
  };
}
