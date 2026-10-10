import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { makeAdminAccounts } from './handler.js';

const STAFF = [
  {
    id: '55555555-5555-4555-8555-555555555555',
    role: 'guidance',
    display_name: 'Guidance Associate (dev)',
    is_active: true,
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    role: 'administrator',
    display_name: 'Administrator (dev)',
    is_active: true,
  },
];
const NEW_ID = '77777777-7777-4777-8777-777777777777';

function setup({
  isAdmin = { data: true, error: null },
  invite,
  insert = { data: { id: NEW_ID }, error: null },
} = {}) {
  const userCalls = [];
  const q = {
    select: (...a) => (userCalls.push(['select', ...a]), q),
    order: (...a) => (userCalls.push(['order', ...a]), q),
    then: (ok, bad) => Promise.resolve({ data: STAFF, error: null }).then(ok, bad),
  };
  const userClient = { rpc: vi.fn(async () => isAdmin), from: vi.fn(() => q) };
  const insertCalls = [];
  const iq = {
    insert: (...a) => (insertCalls.push(['insert', ...a]), iq),
    select: (...a) => (insertCalls.push(['select', ...a]), iq),
    single: async () => insert,
  };
  const admin = {
    getUserById: vi.fn(async (id) => ({
      data: {
        user: {
          id,
          email: `${id.slice(0, 4)}@example.test`,
          last_sign_in_at: '2026-10-10T00:00:00Z',
        },
      },
    })),
    inviteUserByEmail: vi.fn(async () => invite ?? { data: { user: { id: NEW_ID } }, error: null }),
    deleteUser: vi.fn(async () => ({ error: null })),
  };
  const service = { auth: { admin }, from: vi.fn(() => iq) };
  const handler = makeAdminAccounts({
    z,
    makeUserClient: () => userClient,
    makeServiceClient: () => service,
    siteUrl: 'https://hingaweb.example.test/',
  });
  return { handler, userClient, service, admin, insertCalls };
}

const post = (body, auth = 'Bearer admin-jwt') =>
  new Request('http://local/admin-accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
    body: JSON.stringify(body),
  });
const CREATE = {
  action: 'create',
  email: 'new.staff@example.test',
  display_name: 'New Staff',
  role: 'guidance',
};

describe('admin-accounts (2.1.5.3.1; Figs 27-28)', () => {
  it('needs a JWT, a known action, and an administrator at aal2', async () => {
    const { handler, admin } = setup({ isAdmin: { data: false, error: null } });
    expect((await handler(post({ action: 'list' }, null))).status).toBe(401);
    expect((await handler(post({ action: 'delete' }))).status).toBe(400);
    expect((await handler(post({ ...CREATE, role: 'student' }))).status).toBe(400);
    expect((await handler(post({ action: 'list' }))).status).toBe(403);
    expect((await handler(post(CREATE))).status).toBe(403);
    expect(admin.inviteUserByEmail).not.toHaveBeenCalled();
  });

  it('lists staff with email and last sign-in, looking up staff ids only', async () => {
    const { handler, admin } = setup();
    const res = await handler(post({ action: 'list' }));
    const body = await res.json();
    expect(body.accounts).toHaveLength(2);
    expect(body.accounts[0]).toMatchObject({
      role: 'guidance',
      email: '5555@example.test',
      last_sign_in_at: '2026-10-10T00:00:00Z',
    });
    expect(admin.getUserById.mock.calls.map(([id]) => id)).toEqual(STAFF.map((s) => s.id));
  });

  it('invites without a password, marks the account as staff, then adds the staff row', async () => {
    const { handler, admin, insertCalls } = setup();
    const res = await handler(post(CREATE));
    expect(res.status).toBe(200);
    expect(admin.inviteUserByEmail).toHaveBeenCalledWith('new.staff@example.test', {
      data: { account_type: 'staff' },
      redirectTo: 'https://hingaweb.example.test/staff/setup',
    });
    expect(insertCalls[0]).toEqual([
      'insert',
      { id: NEW_ID, role: 'guidance', display_name: 'New Staff' },
    ]);
    expect(await res.json()).toEqual({
      id: NEW_ID,
      email: 'new.staff@example.test',
      role: 'guidance',
      display_name: 'New Staff',
    });
  });

  it('reports an email that already has an account', async () => {
    const { handler } = setup({
      invite: {
        data: null,
        error: {
          status: 422,
          message: 'A user with this email address has already been registered',
        },
      },
    });
    const res = await handler(post(CREATE));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'email_taken' });
  });

  it('undoes the invitation when the staff row cannot be saved', async () => {
    const { handler, admin } = setup({ insert: { data: null, error: { code: '23514' } } });
    const res = await handler(post(CREATE));
    expect(res.status).toBe(500);
    expect(admin.deleteUser).toHaveBeenCalledWith(NEW_ID);
  });
});
