// Test helper: a fake Supabase client. Each test sets the return values it needs.
import { vi } from 'vitest';

/**
 * A chainable, awaitable fake query: supabase.from('x').select(...).eq(...).order(...) resolves to `result`.
 * Records every call in `calls` so tests can assert the exact query.
 */
export function queryResult(result) {
  const calls = [];
  const q = {
    calls,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  for (const m of [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'neq',
    'not',
    'is',
    'in',
    'gte',
    'lte',
    'lt',
    'gt',
    'order',
    'limit',
    'single',
    'maybeSingle',
    'range',
  ]) {
    q[m] = (...args) => {
      calls.push([m, ...args]);
      return q;
    };
  }
  return q;
}

export function createMockSupabase() {
  return {
    rpc: vi.fn(),
    from: vi.fn(),
    functions: { invoke: vi.fn() },
    channel: vi.fn(),
    removeChannel: vi.fn(),
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(async () => ({ error: null })),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      getSession: vi.fn(async () => ({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      mfa: {
        listFactors: vi.fn(),
        enroll: vi.fn(),
        unenroll: vi.fn(),
        challengeAndVerify: vi.fn(),
        getAuthenticatorAssuranceLevel: vi.fn(),
      },
    },
  };
}
