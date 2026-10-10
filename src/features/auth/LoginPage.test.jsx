import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { renderWithAuth, fakeAuth, STUDENT_T2, GUIDANCE } from '../../test/renderWithAuth.jsx';
import { createMockSupabase } from '../../test/mockSupabase.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { LoginPage } = await import('./LoginPage.jsx');

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText('School email address'), 'ana@example.test');
  await userEvent.type(screen.getByLabelText('Password'), 'LocalOnly-Pass-2026');
  await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
}

describe('LoginPage (Fig 9)', () => {
  beforeEach(() => {
    mock.client = createMockSupabase();
  });

  it('shows the exact Fig 9 copy', () => {
    renderWithAuth(<Route path="/login" element={<LoginPage />} />, { path: '/login' });
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(
      screen.getByText('Take a slow breath. Your thoughts remain your own.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  it('signs a Tier 2 student in and goes to the check-in', async () => {
    mock.client.auth.signInWithPassword.mockResolvedValue({ error: null });
    mock.client.rpc.mockResolvedValue({ data: STUDENT_T2, error: null });
    const auth = fakeAuth();
    auth.refresh = vi.fn(async () => ({ account: STUDENT_T2, aal: null }));
    renderWithAuth(<Route path="/login" element={<LoginPage />} />, { path: '/login', auth });
    await fillAndSubmit();
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/check-in'));
    expect(auth.setAuthBusy).toHaveBeenCalledWith(true);
    expect(auth.setAuthBusy).toHaveBeenLastCalledWith(false);
  });

  it('refuses a staff account and points to the staff portal', async () => {
    mock.client.auth.signInWithPassword.mockResolvedValue({ error: null });
    mock.client.rpc.mockResolvedValue({ data: GUIDANCE, error: null });
    const { auth } = renderWithAuth(<Route path="/login" element={<LoginPage />} />, {
      path: '/login',
    });
    await fillAndSubmit();
    expect(await screen.findByText(/This is the student log in\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the staff portal' })).toHaveAttribute(
      'href',
      '/staff/login',
    );
    expect(auth.signOut).toHaveBeenCalled();
  });

  it('shows a plain message for wrong credentials', async () => {
    mock.client.auth.signInWithPassword.mockResolvedValue({
      error: { code: 'invalid_credentials' },
    });
    renderWithAuth(<Route path="/login" element={<LoginPage />} />, { path: '/login' });
    await fillAndSubmit();
    expect(
      await screen.findByText('That email and password do not match. Try again.'),
    ).toBeInTheDocument();
    expect(mock.client.rpc).not.toHaveBeenCalled();
  });
});
