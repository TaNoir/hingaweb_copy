// submit-support-request (2.1.5.1.6, 2.1.6.1.4, 2.1.6.4.5, 2.1.6.4.7; Equation 1; Tables 9-10).
// 1. Reads the caller's own latest check-in AS THE STUDENT (RLS, owner only).
// 2. Refuses if the browser showed a different check-in than the latest (the student must see
//    exactly what is shared, 2.1.5.1.6).
// 3. Computes the triage decision with saw.js (server-side, 2.1.6.1.4).
// 4. Saves the request and the decision in ONE database transaction through
//    create_support_request() with the service client. This is the only service-client write.
// Returns only { request_id, created_at }: never the score, band, or rule (00 must-never 4).
// Never log the request body: it holds the student's note.
import { bearer, makeHttp, readJson } from '../_shared/http.js';
import { triage } from '../_shared/saw.js';

const CONCERNS = ['academic', 'peer', 'family', 'wellness'];

/**
 * @param {{ z: object, makeUserClient: (auth: string) => object, makeServiceClient: () => object,
 *   config: object, allowedOrigin?: string }} deps
 */
export function makeSubmitSupportRequest({
  z,
  makeUserClient,
  makeServiceClient,
  config,
  allowedOrigin = '*',
}) {
  const http = makeHttp(allowedOrigin);
  const Input = z
    .object({
      checkin_id: z.guid().nullable(),
      concern_type: z.enum(CONCERNS),
      note: z.string().max(2000).nullable(),
    })
    .strict();
  const Rating = z.number().int().min(1).max(5);
  const Checkin = z.object({ id: z.guid(), c1: Rating, c2: Rating, c3: Rating, c4: Rating });
  const Saved = z.object({ request_id: z.guid(), created_at: z.string() });

  return async function submit(req) {
    if (req.method === 'OPTIONS') return http.preflight();
    if (req.method !== 'POST') return http.json({ error: 'method_not_allowed' }, 405);
    const auth = bearer(req);
    if (!auth) return http.json({ error: 'unauthorized' }, 401);

    const input = Input.safeParse(await readJson(req));
    if (!input.success) return http.json({ error: 'bad_request' }, 400);

    const db = makeUserClient(auth);
    const who = await db.auth.getUser(auth.replace(/^Bearer\s+/, ''));
    const userId = who?.data?.user?.id;
    if (who?.error || !userId) return http.json({ error: 'unauthorized' }, 401);

    // The student's own latest check-in, read through RLS (staff get none).
    const latest = await db
      .from('checkins')
      .select('id, c1, c2, c3, c4')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest.error) return http.json({ error: 'save_failed' }, 500);
    let checkin = null;
    if (latest.data) {
      const parsed = Checkin.safeParse(latest.data);
      if (!parsed.success) return http.json({ error: 'save_failed' }, 500);
      checkin = parsed.data;
    }
    if ((checkin?.id ?? null) !== input.data.checkin_id) {
      return http.json({ error: 'stale_checkin' }, 409);
    }

    const decision = triage(checkin, config); // no check-in -> For Review with no score
    const { data, error } = await makeServiceClient().rpc('create_support_request', {
      p_student_id: userId,
      p_checkin_id: checkin?.id ?? null,
      p_note: input.data.note,
      p_concern_type: input.data.concern_type,
      p_score: decision.score,
      p_band: decision.band,
      p_guardrails: decision.guardrails,
    });
    if (error) {
      if (error.code === '40001') return http.json({ error: 'stale_checkin' }, 409);
      if (error.code === '42501' || error.code === 'P0002') {
        return http.json({ error: 'not_allowed' }, 403);
      }
      return http.json({ error: 'save_failed' }, 500);
    }
    const saved = Saved.safeParse(data);
    if (!saved.success) return http.json({ error: 'save_failed' }, 500);
    return http.json(saved.data);
  };
}
