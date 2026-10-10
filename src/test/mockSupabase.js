// Test helper: a fake Supabase client. Each test sets the return values it needs.
import { vi } from 'vitest';

export function createMockSupabase() {
  return {
    rpc: vi.fn(),
    from: vi.fn(),
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
