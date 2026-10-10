import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, act } from '@testing-library/react';
import { Route } from 'react-router';
import {
  renderWithAuth,
  fakeAuth,
  STUDENT_T2,
  GUIDANCE,
  AAL2,
} from '../../test/renderWithAuth.jsx';
import { StudentLayout } from './StudentLayout.jsx';
import { StaffLayout } from './StaffLayout.jsx';
import { AdminLayout } from './AdminLayout.jsx';
import { RequireStaff } from '../../lib/auth/guards.jsx';
import { clearLastActivity } from '../../lib/storage.js';
import { timeoutFlag } from '../../lib/auth/idle.js';

afterEach(() => {
  vi.useRealTimers();
  clearLastActivity();
  timeoutFlag.clear();
});

describe('StudentLayout (00 Section 8.5)', () => {
  it('shows the five student nav items and marks the current one', () => {
    renderWithAuth(
      <Route element={<StudentLayout />}>
        <Route path="/check-in" element={<p>body</p>} />
      </Route>,
      { path: '/check-in', auth: fakeAuth({ account: STUDENT_T2 }) },
    );
    const nav = screen.getByRole('navigation', { name: 'Student' });
    const links = nav.querySelectorAll('a');
    expect([...links].map((a) => a.textContent)).toEqual([
      'Home',
      'Check-in',
      'My Trends',
      'Resources',
      'Where to get help',
    ]);
    expect(screen.getByRole('link', { name: 'Check-in' })).toHaveAttribute('aria-current', 'page');
    expect(
      screen.getByText('Rizal Memorial Colleges, Inc. senior high school guidance office.'),
    ).toBeInTheDocument();
  });
});

describe('AdminLayout', () => {
  it('shows the ADMIN CONSOLE chip and the five admin nav items', () => {
    renderWithAuth(
      <Route element={<AdminLayout />}>
        <Route path="/admin/accounts" element={<p>body</p>} />
      </Route>,
      {
        path: '/admin/accounts',
        auth: fakeAuth({
          account: { kind: 'administrator', is_active: true, display_name: 'Admin' },
          aal: AAL2,
        }),
      },
    );
    expect(screen.getByText('ADMIN CONSOLE')).toBeInTheDocument();
    const links = screen.getByRole('navigation', { name: 'Administrator' }).querySelectorAll('a');
    expect([...links].map((a) => a.textContent)).toEqual([
      'Accounts',
      'Consent',
      'Reference data',
      'Resources',
      'Audit',
    ]);
  });
});

describe('Staff idle timeout (Fig 22, 2.1.6.2.9)', () => {
  it('signs out after 15 minutes without activity and removes the screen content', async () => {
    vi.useFakeTimers({
      toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'],
    });
    const auth = fakeAuth({ account: GUIDANCE, aal: AAL2 });
    renderWithAuth(
      <Route element={<RequireStaff role="guidance" />}>
        <Route element={<StaffLayout />}>
          <Route path="/staff/queue" element={<p>student names here</p>} />
        </Route>
      </Route>,
      { path: '/staff/queue', auth },
    );
    expect(screen.getByText('student names here')).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(14 * 60 * 1000);
    });
    expect(screen.getByText('student names here')).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(60 * 1000 + 15 * 1000);
    });
    expect(screen.getByRole('heading', { name: 'Your session has ended' })).toBeInTheDocument();
    expect(screen.queryByText('student names here')).toBeNull();
    expect(auth.signOut).toHaveBeenCalled();
  });
});
