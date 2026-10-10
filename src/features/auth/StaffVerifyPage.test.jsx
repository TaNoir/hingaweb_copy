import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import {
  renderWithAuth,
  fakeAuth,
  GUIDANCE,
  AAL1_FACTOR,
  AAL2,
} from '../../test/renderWithAuth.jsx';
import { createMockSupabase } from '../../test/mockSupabase.js';
import { getLastActivity, clearLastActivity } from '../../lib/storage.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { StaffVerifyPage } = await import('./StaffVerifyPage.jsx');

describe('StaffVerifyPage (Fig 20, 2.1.6.2.9)', () => {
  beforeEach(() => {
    mock.client = createMockSupabase();
    clearLastActivity();
  });

  it('sends staff without a verified authenticator to setup', async () => {
    mock.client.auth.mfa.listFactors.mockResolvedValue({
      data: { all: [], totp: [] },
      error: null,
    });
    renderWithAuth(<Route path="/staff/verify" element={<StaffVerifyPage />} />, {
      path: '/staff/verify',
      auth: fakeAuth({ account: GUIDANCE, aal: AAL1_FACTOR }),
    });
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/staff/setup'));
  });

  it('rejects a wrong code with a plain message', async () => {
    mock.client.auth.mfa.listFactors.mockResolvedValue({
      data: { all: [], totp: [{ id: 'f1' }] },
      error: null,
    });
    mock.client.auth.mfa.challengeAndVerify.mockResolvedValue({
      error: { code: 'mfa_verification_failed' },
    });
    renderWithAuth(<Route path="/staff/verify" element={<StaffVerifyPage />} />, {
      path: '/staff/verify',
      auth: fakeAuth({ account: GUIDANCE, aal: AAL1_FACTOR }),
    });
    await userEvent.type(await screen.findByLabelText('Security verification code'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }));
    expect(
      await screen.findByText('That code did not work. Check your app and enter the newest code.'),
    ).toBeInTheDocument();
  });

  it('on success starts the idle clock and goes to the queue', async () => {
    mock.client.auth.mfa.listFactors.mockResolvedValue({
      data: { all: [], totp: [{ id: 'f1' }] },
      error: null,
    });
    mock.client.auth.mfa.challengeAndVerify.mockResolvedValue({ data: {}, error: null });
    const auth = fakeAuth({ account: GUIDANCE, aal: AAL1_FACTOR });
    auth.refresh = vi.fn(async () => ({ account: GUIDANCE, aal: AAL2 }));
    renderWithAuth(<Route path="/staff/verify" element={<StaffVerifyPage />} />, {
      path: '/staff/verify',
      auth,
    });
    await userEvent.type(await screen.findByLabelText('Security verification code'), '654321');
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/staff/queue'));
    expect(mock.client.auth.mfa.challengeAndVerify).toHaveBeenCalledWith({
      factorId: 'f1',
      code: '654321',
    });
    expect(getLastActivity()).not.toBeNull();
  });
});
