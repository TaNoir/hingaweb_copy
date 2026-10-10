import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import * as config from '../_shared/scoring-config.js';
import { makeEvaluateCheckin } from './handler.js';
import { checkinPrompt } from '../_shared/saw.js';

const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';

function fakeClient(result) {
  const calls = [];
  const q = {
    select: (...a) => (calls.push(['select', ...a]), q),
    eq: (...a) => (calls.push(['eq', ...a]), q),
    maybeSingle: async () => result,
  };
  return { calls, client: { from: (t) => (calls.push(['from', t]), q) } };
}

function setup(result) {
  const fake = fakeClient(result);
  const makeUserClient = vi.fn(() => fake.client);
  const handler = makeEvaluateCheckin({ z, makeUserClient, config });
  return { handler, makeUserClient, calls: fake.calls };
}

const post = (body, auth = 'Bearer student-jwt') =>
  new Request('http://local/evaluate-checkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
    body: JSON.stringify(body),
  });

describe('evaluate-checkin (2.1.5.1.7; N-01)', () => {
  it('answers the CORS preflight', async () => {
    const { handler } = setup({ data: null, error: null });
    const res = await handler(new Request('http://local/x', { method: 'OPTIONS' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('rejects a call with no JWT and never creates a client', async () => {
    const { handler, makeUserClient } = setup({ data: null, error: null });
    const res = await handler(post({ checkin_id: ID }, null));
    expect(res.status).toBe(401);
    expect(makeUserClient).not.toHaveBeenCalled();
  });

  it('rejects a body that is not exactly { checkin_id: uuid }', async () => {
    const { handler } = setup({ data: null, error: null });
    expect((await handler(post({ checkin_id: 'nope' }))).status).toBe(400);
    expect((await handler(post({ checkin_id: ID, score: 1 }))).status).toBe(400);
  });

  it('reads only c1-c4 of that one check-in, as the caller (RLS)', async () => {
    const { handler, makeUserClient, calls } = setup({
      data: { c1: 1, c2: 1, c3: 1, c4: 1 },
      error: null,
    });
    await handler(post({ checkin_id: ID }));
    expect(makeUserClient).toHaveBeenCalledWith('Bearer student-jwt');
    expect(calls).toEqual([
      ['from', 'checkins'],
      ['select', 'c1, c2, c3, c4'],
      ['eq', 'id', ID],
    ]);
  });

  it('returns 404 when RLS hides the row (not the owner, or staff)', async () => {
    const { handler } = setup({ data: null, error: null });
    const res = await handler(post({ checkin_id: ID }));
    expect(res.status).toBe(404);
  });

  it('returns 500 with no detail when the read fails', async () => {
    const { handler } = setup({ data: null, error: { message: 'secret detail' } });
    const res = await handler(post({ checkin_id: ID }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'read_failed' });
  });

  it.each([
    { c1: 1, c2: 1, c3: 1, c4: 5 },
    { c1: 2, c2: 2, c3: 2, c4: 3 },
    { c1: 1, c2: 1, c3: 1, c4: 1 },
    { c1: 4, c2: 3, c3: 2, c4: 2 },
  ])('ratings %j give exactly the prompt saw.js decides, and nothing else', async (row) => {
    const { handler } = setup({ data: row, error: null });
    const res = await handler(post({ checkin_id: ID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ prompt: checkinPrompt(row, config) });
    expect(Object.keys(body)).toEqual(['prompt']); // never a score, band, or rule
  });

  // With the placeholder values (Phase 10: skipped once the scoring session sets real ones).
  it.runIf(config.PROVISIONAL === true)(
    'placeholder values: max_sev, gray_zone, null',
    async () => {
      for (const [row, prompt] of [
        [{ c1: 1, c2: 1, c3: 1, c4: 5 }, 'max_sev'],
        [{ c1: 2, c2: 2, c3: 2, c4: 3 }, 'gray_zone'],
        [{ c1: 1, c2: 1, c3: 1, c4: 1 }, null],
      ]) {
        const { handler } = setup({ data: row, error: null });
        expect(await (await handler(post({ checkin_id: ID }))).json()).toEqual({ prompt });
      }
    },
  );
});
