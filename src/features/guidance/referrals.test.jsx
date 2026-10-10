import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AuthContext } from '../../lib/auth/AuthContext.js';
import { renderWithAuth, fakeAuth, GUIDANCE, AAL2 } from '../../test/renderWithAuth.jsx';
import { guidanceClient } from './testClient.js';
import { SPECIALISTS } from '../../content/directory.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { ReferralsPage } = await import('./ReferralsPage.jsx');

describe('ReferralsPage (Fig 26 directory only; D-02, D-03)', () => {
  it('shows the static partners and hotlines, no note form, and reads nothing', () => {
    const { client } = guidanceClient();
    mock.client = client;
    renderWithAuth(<Route path="/staff/referrals" element={<ReferralsPage />} />, {
      path: '/staff/referrals',
      auth: fakeAuth({ account: GUIDANCE, aal: AAL2 }),
    });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Partner directory' }),
    ).toBeInTheDocument();
    for (const s of SPECIALISTS) expect(screen.getByText(s.name)).toBeInTheDocument();
    expect(screen.getByText(/Referral notes are not kept in HingaWeb/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(client.from).not.toHaveBeenCalled();
  });

  it('links back to the request it was opened from', () => {
    mock.client = guidanceClient().client;
    const id = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
    // renderWithAuth takes a pathname only, so this test builds its own router with a query string.
    render(
      <AuthContext.Provider value={fakeAuth({ account: GUIDANCE, aal: AAL2 })}>
        <MemoryRouter initialEntries={[`/staff/referrals?request=${id}`]}>
          <Routes>
            <Route path="/staff/referrals" element={<ReferralsPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.getByRole('link', { name: 'Back to support request' })).toHaveAttribute(
      'href',
      `/staff/requests/${id}`,
    );
  });
});
