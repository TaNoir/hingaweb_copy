import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { makeNotifyCrisis } from './handler.js';

const EVENT = {
  type: 'INSERT',
  table: 'crisis_events',
  schema: 'public',
  record: {
    id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    student_id: '11111111-1111-1111-1111-111111111111',
    disclosed: {
      full_name: 'Ana Reyes',
      grade_level: 12,
      section: 'HUMSS-A',
      class_adviser: 'Mr. Ramon Cruz',
    },
    trigger_item_id: 'aaaaaaa1-0000-0000-0000-000000000001',
  },
  old_record: null,
};

const ALL = {
  WEBHOOK_SECRET: 's3cret',
  SMS_GATEWAY_URL: 'https://sms.example.test/send',
  SMS_GATEWAY_TOKEN: 'tok',
  ONCALL_CONTACT_NUMBER: '+630000000000',
};

function setup(values = ALL, fetchResult = { ok: true }) {
  const env = { get: (k) => values[k] };
  const fetchImpl = vi.fn(async () => fetchResult);
  return { handler: makeNotifyCrisis({ z, env, fetchImpl }), fetchImpl };
}

const post = (body, secret = 's3cret') =>
  new Request('http://local/notify-crisis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'x-hingaweb-webhook-secret': secret } : {}),
    },
    body: JSON.stringify(body),
  });

describe('notify-crisis (2.1.6.1.6; 2.1.6.4.7)', () => {
  it('rejects a call without the webhook secret', async () => {
    const { handler, fetchImpl } = setup();
    expect((await handler(post(EVENT, null))).status).toBe(401);
    expect((await handler(post(EVENT, 'wrong'))).status).toBe(401);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fails closed when WEBHOOK_SECRET is not set', async () => {
    const { handler } = setup({ ...ALL, WEBHOOK_SECRET: undefined });
    expect((await handler(post(EVENT, 'anything'))).status).toBe(401);
  });

  it('rejects anything that is not a crisis_events INSERT', async () => {
    const { handler } = setup();
    expect((await handler(post({ ...EVENT, table: 'support_requests' }))).status).toBe(400);
    expect((await handler(post({ ...EVENT, type: 'UPDATE' }))).status).toBe(400);
  });

  it('does nothing (and says so) until the SMS gateway is configured', async () => {
    const { handler, fetchImpl } = setup({ WEBHOOK_SECRET: 's3cret' });
    const res = await handler(post(EVENT));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: false, reason: 'sms_not_configured' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('sends one text with the Ref only: no name, grade, section, adviser, or item', async () => {
    const { handler, fetchImpl } = setup();
    const res = await handler(post(EVENT));
    expect(await res.json()).toEqual({ sent: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(ALL.SMS_GATEWAY_URL);
    expect(init.headers.Authorization).toBe('Bearer tok');
    const body = JSON.parse(init.body);
    expect(body).toEqual({
      to: ALL.ONCALL_CONTACT_NUMBER,
      message: 'HingaWeb: a crisis event was raised (Ref 7c9e6679). Open the crisis channel now.',
    });
    for (const word of ['Ana', 'Reyes', 'HUMSS', 'Cruz', '12', 'aaaaaaa1']) {
      expect(body.message).not.toContain(word);
    }
  });

  it('reports a gateway failure without throwing', async () => {
    const { handler } = setup(ALL, { ok: false });
    const res = await handler(post(EVENT));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ sent: false, reason: 'gateway_error' });
  });
});
