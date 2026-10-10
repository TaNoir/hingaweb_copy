import { describe, it, expect, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Route } from 'react-router';
import { RequireGuest, RequireStaff, RequireStudent } from './guards.jsx';
import { timeoutFlag } from './idle.js';
import {
  renderWithAuth,
  fakeAuth,
  STUDENT_T2,
  STUDENT_NO_PARENT,
  GUIDANCE,
  ADMIN,
  AAL2,
  AAL1_FACTOR,
} from '../../test/renderWithAuth.jsx';

const studentRoutes = (
  <Route element={<RequireStudent tier2 />}>
    <Route path="/check-in" element={<p>check-in screen</p>} />
  </Route>
);
const guidanceRoutes = (
  <Route element={<RequireStaff role="guidance" />}>
    <Route path="/staff/queue" element={<p>queue screen</p>} />
  </Route>
);

afterEach(() => timeoutFlag.clear());

describe('RequireStudent', () => {
  it('lets a Tier 2 student in', () => {
    renderWithAuth(studentRoutes, { path: '/check-in', auth: fakeAuth({ account: STUDENT_T2 }) });
    expect(screen.getByText('check-in screen')).toBeInTheDocument();
  });
  it('sends a student without parental consent to the waiting page', () => {
    renderWithAuth(studentRoutes, {
      path: '/check-in',
      auth: fakeAuth({ account: STUDENT_NO_PARENT }),
    });
    expect(screen.getByTestId('location').textContent).toBe('/waiting-for-consent');
  });
  it('sends an anonymous visitor to log in', () => {
    renderWithAuth(studentRoutes, { path: '/check-in' });
    expect(screen.getByTestId('location').textContent).toBe('/login');
  });
  it('sends staff away from student screens', () => {
    renderWithAuth(studentRoutes, {
      path: '/check-in',
      auth: fakeAuth({ account: GUIDANCE, aal: AAL2 }),
    });
    expect(screen.getByTestId('location').textContent).toBe('/staff/queue');
  });
});

describe('RequireStaff', () => {
  it('lets verified guidance in', () => {
    renderWithAuth(guidanceRoutes, {
      path: '/staff/queue',
      auth: fakeAuth({ account: GUIDANCE, aal: AAL2 }),
    });
    expect(screen.getByText('queue screen')).toBeInTheDocument();
  });
  it('sends guidance without the second factor to verify', () => {
    renderWithAuth(guidanceRoutes, {
      path: '/staff/queue',
      auth: fakeAuth({ account: GUIDANCE, aal: AAL1_FACTOR }),
    });
    expect(screen.getByTestId('location').textContent).toBe('/staff/verify');
  });
  it('sends an administrator to the admin home, not the guidance queue', () => {
    renderWithAuth(guidanceRoutes, {
      path: '/staff/queue',
      auth: fakeAuth({ account: ADMIN, aal: AAL2 }),
    });
    expect(screen.getByTestId('location').textContent).toBe('/admin/accounts');
  });
  it('sends students to the home page', () => {
    renderWithAuth(guidanceRoutes, {
      path: '/staff/queue',
      auth: fakeAuth({ account: STUDENT_T2 }),
    });
    expect(screen.getByTestId('location').textContent).toBe('/');
  });
  it('shows the session-ended screen after an inactivity sign-out (Fig 22)', () => {
    timeoutFlag.set();
    renderWithAuth(guidanceRoutes, { path: '/staff/queue' });
    expect(screen.getByRole('heading', { name: 'Your session has ended' })).toBeInTheDocument();
    expect(screen.queryByText('queue screen')).toBeNull();
  });
});

describe('RequireGuest', () => {
  const guestRoutes = (
    <Route element={<RequireGuest />}>
      <Route path="/login" element={<p>login screen</p>} />
    </Route>
  );
  it('redirects a signed-in student to their home', () => {
    renderWithAuth(guestRoutes, { path: '/login', auth: fakeAuth({ account: STUDENT_T2 }) });
    expect(screen.getByTestId('location').textContent).toBe('/check-in');
  });
  it('stays put while a sign-in page is checking the account', () => {
    renderWithAuth(guestRoutes, {
      path: '/login',
      auth: fakeAuth({ account: GUIDANCE, aal: AAL2, authBusy: true }),
    });
    expect(screen.getByText('login screen')).toBeInTheDocument();
  });
});
