// notify-crisis (2.1.6.1.6 staff half; 2.1.6.4.7). Called by a Supabase Database Webhook on every
// INSERT into crisis_events. Sends one text message to the on-duty guidance contact through an
// SMS gateway. The text-or-call channel is a Capstone 2 build item: until the three SMS secrets
// are set, this function does nothing and says so.
//
// The crisis event is ALREADY saved before this runs, so a failure here never loses the event
// (2.1.6.4.7). The dashboard alert (Phase 08) does not depend on this function.
//
// Privacy: the message carries NO student name, grade, section, adviser, or crisis item. It says
// only that an event exists and gives its Ref, so the on-duty contact opens the crisis channel.
// Never log the request body: the webhook payload contains the disclosed copy.
import { makeHttp, readJson } from '../_shared/http.js';

/**
 * @param {{ z: object, env: { get: (k: string) => string|undefined }, fetchImpl: typeof fetch }} deps
 */
export function makeNotifyCrisis({ z, env, fetchImpl }) {
  const http = makeHttp('*');
  const Payload = z.object({
    type: z.literal('INSERT'),
    table: z.literal('crisis_events'),
    record: z.looseObject({ id: z.guid() }),
  });

  return async function notifyCrisis(req) {
    if (req.method !== 'POST') return http.json({ error: 'method_not_allowed' }, 405);

    // Only the database webhook knows this secret. Fail closed when it is not set.
    const secret = env.get('WEBHOOK_SECRET');
    if (!secret || req.headers.get('x-hingaweb-webhook-secret') !== secret) {
      return http.json({ error: 'unauthorized' }, 401);
    }

    const payload = Payload.safeParse(await readJson(req));
    if (!payload.success) return http.json({ error: 'bad_request' }, 400);

    const url = env.get('SMS_GATEWAY_URL');
    const token = env.get('SMS_GATEWAY_TOKEN');
    const to = env.get('ONCALL_CONTACT_NUMBER');
    if (!url || !token || !to) return http.json({ sent: false, reason: 'sms_not_configured' });

    const ref = `Ref ${payload.data.record.id.slice(0, 8)}`;
    const message = `HingaWeb: a crisis event was raised (${ref}). Open the crisis channel now.`;
    try {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message }),
      });
      if (!res.ok) return http.json({ sent: false, reason: 'gateway_error' }, 502);
      return http.json({ sent: true });
    } catch {
      return http.json({ sent: false, reason: 'gateway_unreachable' }, 502);
    }
  };
}
