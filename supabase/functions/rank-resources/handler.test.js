import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { makeRankResources } from './handler.js';

const R = (n, title, a) => ({
  id: `bbbbbbb1-0000-4000-8000-00000000000${n}`,
  title,
  url: `https://example.org/${n}`,
  attributes: { school_work: a[0], home_family: a[1], future: a[2], managing: a[3] },
});
const LIB = [
  R(1, 'Managing exam pressure', [5, 1, 1, 2]),
  R(2, 'Talking to family about money worries', [1, 5, 1, 1]),
  R(3, 'When everything feels like too much', [1, 1, 1, 5]),
];

function fake({
  latest = { data: { c1: 1, c2: 5, c3: 1, c4: 1 }, error: null },
  lib = { data: LIB, error: null },
} = {}) {
  const calls = { checkins: [], resources: [] };
  const builder = (table, result) => {
    const q = {
      then: (ok, bad) => Promise.resolve(result).then(ok, bad),
      maybeSingle: async () => result,
    };
    for (const m of ['select', 'order', 'limit', 'not', 'eq']) {
      q[m] = (...a) => (calls[table].push([m, ...a]), q);
    }
    return q;
  };
  const client = { from: (t) => builder(t, t === 'checkins' ? latest : lib) };
  const makeUserClient = vi.fn(() => client);
  return { handler: makeRankResources({ z, makeUserClient }), makeUserClient, calls };
}

const post = (auth = 'Bearer jwt') =>
  new Request('http://local/rank-resources', {
    method: 'POST',
    headers: auth ? { Authorization: auth } : {},
    body: '{}',
  });

describe('rank-resources (2.1.5.1.5; 2.1.6.1.5)', () => {
  it('needs a JWT', async () => {
    const { handler, makeUserClient } = fake();
    expect((await handler(post(null))).status).toBe(401);
    expect(makeUserClient).not.toHaveBeenCalled();
  });

  it('reads the latest check-in and published resources as the caller', async () => {
    const { handler, makeUserClient, calls } = fake();
    await handler(post());
    expect(makeUserClient).toHaveBeenCalledWith('Bearer jwt');
    expect(calls.checkins).toEqual([
      ['select', 'c1, c2, c3, c4'],
      ['order', 'created_at', { ascending: false }],
      ['limit', 1],
    ]);
    expect(calls.resources).toEqual([
      ['select', 'id, title, url, attributes'],
      ['not', 'verified_at', 'is', null],
    ]);
  });

  it('returns the ranked order with areas, and no similarity or vectors', async () => {
    const { handler } = fake();
    const body = await (await handler(post())).json();
    expect(body.basis).toBe('latest_checkin');
    expect(body.resources.map((r) => r.title)[0]).toBe('Talking to family about money worries');
    expect(body.resources[0]).toEqual({
      id: LIB[1].id,
      title: LIB[1].title,
      url: LIB[1].url,
      area: 'home_family',
    });
    expect(JSON.stringify(body)).not.toMatch(/attributes|similar|score|0\.\d/);
  });

  it('says basis none (and ranks nothing) when there is no check-in yet', async () => {
    const { handler, calls } = fake({ latest: { data: null, error: null } });
    expect(await (await handler(post())).json()).toEqual({ basis: 'none', resources: [] });
    expect(calls.resources).toEqual([]);
  });

  it('fails with no detail when a read fails', async () => {
    const { handler } = fake({ lib: { data: null, error: { message: 'boom' } } });
    const res = await handler(post());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'read_failed' });
  });
});
