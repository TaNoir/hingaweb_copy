import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { renderWithAuth } from '../../test/renderWithAuth.jsx';
import { createMockSupabase } from '../../test/mockSupabase.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { RegisterPage } = await import('./RegisterPage.jsx');

describe('RegisterPage (Fig 8, 2.1.5.1.1, D-01)', () => {
  beforeEach(() => {
    mock.client = createMockSupabase();
  });

  it('shows every field, including section and class adviser', () => {
    renderWithAuth(<Route path="/register" element={<RegisterPage />} />, { path: '/register' });
    for (const label of [
      'Full name',
      'School email address',
      'Grade level',
      'Section',
      'Class adviser',
      'Password',
      'Confirm password',
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByText('Step 1 of 2 · Student Registration')).toBeInTheDocument();
  });

  it('blocks submission and explains each missing field', async () => {
    renderWithAuth(<Route path="/register" element={<RegisterPage />} />, { path: '/register' });
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Enter your full name.')).toBeInTheDocument();
    expect(screen.getByText('Choose your grade level.')).toBeInTheDocument();
    expect(
      screen.getByText('Use at least 12 characters.', { selector: '[role=alert]' }),
    ).toBeInTheDocument();
    expect(mock.client.auth.signUp).not.toHaveBeenCalled();
  });

  it('signs up with exactly the student metadata the database trigger reads', async () => {
    mock.client.auth.signUp.mockResolvedValue({ data: { session: null, user: {} }, error: null });
    renderWithAuth(<Route path="/register" element={<RegisterPage />} />, { path: '/register' });
    await userEvent.type(screen.getByLabelText('Full name'), 'Ana Reyes');
    await userEvent.type(screen.getByLabelText('School email address'), 'Ana@Example.test');
    await userEvent.selectOptions(screen.getByLabelText('Grade level'), '12');
    await userEvent.type(screen.getByLabelText('Section'), 'HUMSS-A');
    await userEvent.type(screen.getByLabelText('Class adviser'), 'Mr. Ramon Cruz');
    await userEvent.type(screen.getByLabelText('Password'), 'a-long-password');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'a-long-password');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(mock.client.auth.signUp).toHaveBeenCalledWith({
      email: 'ana@example.test',
      password: 'a-long-password',
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirmed`,
        data: {
          account_type: 'student',
          full_name: 'Ana Reyes',
          grade_level: 12,
          section: 'HUMSS-A',
          class_adviser: 'Mr. Ramon Cruz',
        },
      },
    });
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
  });
});
