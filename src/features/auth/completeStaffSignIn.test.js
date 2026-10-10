import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabase } from '../../test/mockSupabase.js';
import { getLastActivity, clearLastActivity } from '../../lib/storage.js';
import { GUIDANCE, AAL2 } from '../../test/renderWithAuth.jsx';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { completeStaffSignIn } = await import('./completeStaffSignIn.js');

const GUIDANCE_AAL2 = { account: GUIDANCE, aal: AAL2 };

describe('completeStaffSignIn (Realtime gets the aal2 token after MFA verify)', () => {
  beforeEach(() => {
    mock.client = createMockSupabase();
    clearLastActivity();
  });

  it('refreshes the session before reloading the account and navigating', async () => {
    const order = [];
    mock.client.auth.refreshSession = vi.fn(async () => {
      order.push('refreshSession');
      return { data: {}, error: null };
    });
    const refresh = vi.fn(async () => {
      order.push('refresh');
      return GUIDANCE_AAL2;
    });
    const navigate = vi.fn(() => order.push('navigate'));
    await completeStaffSignIn({ refresh, navigate });
    expect(order).toEqual(['refreshSession', 'refresh', 'navigate']);
    expect(navigate).toHaveBeenCalledWith('/staff/queue', { replace: true });
    expect(getLastActivity()).not.toBeNull();
  });

  it('still navigates when refreshSession returns an error', async () => {
    mock.client.auth.refreshSession = vi.fn(async () => ({
      data: { session: null },
      error: new Error('refresh failed'),
    }));
    const navigate = vi.fn();
    await completeStaffSignIn({ refresh: async () => GUIDANCE_AAL2, navigate });
    expect(mock.client.auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/staff/queue', { replace: true });
  });

  it('still navigates when refreshSession throws', async () => {
    mock.client.auth.refreshSession = vi.fn(async () => {
      throw new Error('network down');
    });
    const navigate = vi.fn();
    await completeStaffSignIn({ refresh: async () => GUIDANCE_AAL2, navigate });
    expect(navigate).toHaveBeenCalledWith('/staff/queue', { replace: true });
  });
});
