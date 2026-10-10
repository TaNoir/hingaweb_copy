// User request: the student log in always offers a link to the staff sign-in.
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route } from 'react-router';
import { renderWithAuth } from '../../test/renderWithAuth.jsx';
import { createMockSupabase } from '../../test/mockSupabase.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { LoginPage } = await import('./LoginPage.jsx');

describe('LoginPage staff link', () => {
  it('links to the staff sign-in', () => {
    mock.client = createMockSupabase();
    renderWithAuth(<Route path="/login" element={<LoginPage />} />, { path: '/login' });
    expect(screen.getByRole('link', { name: 'Guidance office sign in' })).toHaveAttribute(
      'href',
      '/staff/login',
    );
  });
});
