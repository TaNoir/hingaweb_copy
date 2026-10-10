import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import * as config from '../_shared/scoring-config.js';
import { makeSubmitSupportRequest } from './handler.js';
import { triage } from '../_shared/saw.js';

const UID = '11111111-1111-4111-8111-111111111111';
const CID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const RID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

function setup({
  user = { data: { user: { id: UID } }, error: null },
  latest = { data: { id: CID, c1: 5, c2: 5, c3: 1, c4: 1 }, error: null },
  rpc = { data: { request_id: RID, created_at: '2026-10-12T01:00:00Z' }, error: null },
} = {}) {
  const calls = [];
  const q = {
    select: (...a) => (calls.push(['select', ...a]), q),
    order: (...a) => (calls.push(['order', ...a]), q),
    limit: (...a) => (calls.push(['limit', ...a]), q),
    maybeSingle: async () => latest,
  };
  const userClient = {
    auth: { getUser: vi.fn(async () => user) },
    from: (t) => (calls.push(['from', t]), q),
  };
  const service = { rpc: vi.fn(async () => rpc) };
  const makeUserClient = vi.fn(() => userClient);
  const makeServiceClient = vi.fn(() => service);
  const handler = makeSubmitSupportRequest({ z, makeUserClient, makeServiceClient, config });
  return { handler, calls, service, makeServiceClient, userClient };
}

const post = (body, auth = 'Bearer student-jwt') =>
  new Request('http://local/submit-support-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
    body: JSON.stringify(body),
  });
const BODY = { checkin_id: CID, concern_type: 'academic', note: 'my own words' };

describe('submit-support-request (2.1.5.1.6; 2.1.6.1.4)', () => {
  it('needs a JWT and an exact body', async () => {
    const { handler, makeServiceClient } = setup();
    expect((await handler(post(BODY, null))).status).toBe(401);
    expect((await handler(post({ ...BODY, band: 'P1' }))).status).toBe(400);
    expect((await handler(post({ ...BODY, concern_type: 'future' }))).status).toBe(400);
    expect((await handler(post({ ...BODY, note: 'x'.repeat(2001) }))).status).toBe(400);
    expect(makeServiceClient).not.toHaveBeenCalled();
  });

  it('reads the latest check-in as the student', async () => {
    const { handler, calls, userClient } = setup();
    await handler(post(BODY));
    expect(userClient.auth.getUser).toHaveBeenCalledWith('student-jwt');
    expect(calls).toEqual([
      ['from', 'checkins'],
      ['select', 'id, c1, c2, c3, c4'],
      ['order', 'created_at', { ascending: false }],
      ['limit', 1],
    ]);
  });

  it('refuses when the student was shown a different check-in than the latest', async () => {
    const { handler, service } = setup();
    const res = await handler(post({ ...BODY, checkin_id: null }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'stale_checkin' });
    expect(service.rpc).not.toHaveBeenCalled();
  });

  it('saves the SAW decision server-side and returns only the reference', async () => {
    const { handler, service } = setup();
    const res = await handler(post(BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ request_id: RID, created_at: '2026-10-12T01:00:00Z' });
    const [name, args] = service.rpc.mock.calls[0];
    expect(name).toBe('create_support_request');
    const decision = triage({ c1: 5, c2: 5, c3: 1, c4: 1 }, config);
    expect(args).toEqual({
      p_student_id: UID,
      p_checkin_id: CID,
      p_note: 'my own words',
      p_concern_type: 'academic',
      p_score: decision.score,
      p_band: decision.band,
      p_guardrails: decision.guardrails,
    });
    if (config.PROVISIONAL === true) {
      // Manuscript worked example (5, 5, 1, 1) with the placeholder values.
      expect([args.p_score, args.p_band]).toEqual([3.8588, 'P1']);
      expect(args.p_guardrails.fired).toEqual(['anySingleAtMax', 'twoOrMoreHigh']);
    }
  });

  it('with no check-in, sends For Review with no score', async () => {
    const { handler, service } = setup({ latest: { data: null, error: null } });
    const res = await handler(post({ ...BODY, checkin_id: null, note: null }));
    expect(res.status).toBe(200);
    expect(service.rpc.mock.calls[0][1]).toMatchObject({
      p_checkin_id: null,
      p_score: null,
      p_band: 'FR',
      p_note: null,
    });
  });

  it.each([
    ['40001', 409, 'stale_checkin'],
    ['42501', 403, 'not_allowed'],
    ['P0002', 403, 'not_allowed'],
    ['XX000', 500, 'save_failed'],
  ])('maps database error %s to %i %s, never a raw message', async (code, status, error) => {
    const { handler } = setup({ rpc: { data: null, error: { code, message: 'secret detail' } } });
    const res = await handler(post(BODY));
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ error });
  });
});
