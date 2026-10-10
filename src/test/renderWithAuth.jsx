// Test helper: render a route tree with a fake auth context (no Supabase needed).
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { vi } from 'vitest';
import { AuthContext } from '../lib/auth/AuthContext.js';

export const STUDENT_T2 = {
  kind: 'student',
  full_name: 'Ana Reyes',
  grade_level: 12,
  section: 'HUMSS-A',
  class_adviser: 'Mr. Ramon Cruz',
  assent: 'granted',
  parental: 'granted',
  tier2: true,
  has_checkin: false,
};
export const STUDENT_NO_PARENT = { ...STUDENT_T2, parental: 'none', tier2: false };
export const STUDENT_NO_ASSENT = { ...STUDENT_T2, assent: 'none', parental: 'none', tier2: false };
export const GUIDANCE = {
  kind: 'guidance',
  is_active: true,
  display_name: 'Guidance Associate (dev)',
};
export const ADMIN = {
  kind: 'administrator',
  is_active: true,
  display_name: 'Administrator (dev)',
};
export const AAL2 = { current: 'aal2', next: 'aal2' };
export const AAL1_FACTOR = { current: 'aal1', next: 'aal2' };

export function fakeAuth(overrides = {}) {
  return {
    status: 'ready',
    session:
      overrides.account && overrides.account.kind !== 'anonymous'
        ? { user: { email: 'x@example.test' } }
        : null,
    account: { kind: 'anonymous' },
    aal: null,
    loadError: false,
    refresh: vi.fn(async () => ({
      account: overrides.account ?? { kind: 'anonymous' },
      aal: overrides.aal ?? null,
    })),
    signOut: vi.fn(async () => {}),
    authBusy: false,
    setAuthBusy: vi.fn(),
    ...overrides,
  };
}

/** Shows the current path so tests can assert redirects. */
export function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname}</div>;
}

/**
 * @param {import('react').ReactNode} routes  <Route> elements under test
 * @param {{ auth?: object, path?: string, state?: object }} opts
 */
export function renderWithAuth(routes, { auth = fakeAuth(), path = '/', state } = {}) {
  const utils = render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[{ pathname: path, state }]}>
        <LocationProbe />
        <Routes>
          {routes}
          <Route path="*" element={<p>other page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
  return { ...utils, auth };
}
