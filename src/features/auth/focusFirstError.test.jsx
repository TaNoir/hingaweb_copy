// ui-students item 10: a submit with problems moves focus to the first field with an error.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
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
const { LoginPage } = await import('./LoginPage.jsx');

beforeEach(() => {
  mock.client = createMockSupabase();
  Element.prototype.scrollIntoView = vi.fn();
});

describe('focus moves to the first field with an error', () => {
  it('register: an empty form focuses Full name', async () => {
    renderWithAuth(<Route path="/register" element={<RegisterPage />} />, { path: '/register' });
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByLabelText('Full name')).toHaveFocus());
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('register: with the name filled in, focus goes to the next field with an error', async () => {
    renderWithAuth(<Route path="/register" element={<RegisterPage />} />, { path: '/register' });
    await userEvent.type(screen.getByLabelText('Full name'), 'Ana Reyes');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByLabelText('School email address')).toHaveFocus());
  });

  it('login: an empty form focuses the email field', async () => {
    renderWithAuth(<Route path="/login" element={<LoginPage />} />, { path: '/login' });
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() => expect(screen.getByLabelText('School email address')).toHaveFocus());
  });
});
