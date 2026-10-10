import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { renderWithAuth, fakeAuth, GUIDANCE, AAL2 } from '../../test/renderWithAuth.jsx';
import { guidanceClient } from './testClient.js';
import { CrisisFeedContext } from './crisisFeed.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { QueuePage } = await import('./QueuePage.jsx');

const base = {
  concern_type: 'academic',
  follow_up_at: null,
  has_other_open_request: false,
  first_contact_at: null,
  is_overdue: false,
  grade_level: 12,
  class_adviser: 'Mr. Ramon Cruz',
};
const ROWS = [
  {
    ...base,
    id: '00000000-0000-4000-8000-000000000001',
    band: 'P2',
    status: 'pending',
    full_name: 'Paolo Diaz',
    section: 'HUMSS-B',
    created_at: '2026-10-12T01:00:00Z',
  },
  {
    ...base,
    id: '00000000-0000-4000-8000-000000000002',
    band: 'P1',
    status: 'reviewed',
    full_name: 'Ana Reyes',
    section: 'HUMSS-A',
    created_at: '2026-10-12T03:00:00Z',
    has_other_open_request: true,
  },
  {
    ...base,
    id: '00000000-0000-4000-8000-000000000003',
    band: 'FR',
    status: 'pending',
    full_name: 'Miguel Tan',
    section: 'ABM-B',
    created_at: '2026-10-11T03:00:00Z',
    concern_type: 'wellness',
  },
  {
    ...base,
    id: '00000000-0000-4000-8000-000000000004',
    band: 'P3',
    status: 'resolved',
    full_name: 'Sam Villanueva',
    section: 'TVL-A',
    created_at: '2026-10-10T03:00:00Z',
  },
];

function renderQueue(activeCount = 0) {
  const { client, queries } = guidanceClient({
    tables: { support_queue: { data: ROWS, error: null } },
  });
  mock.client = client;
  renderWithAuth(
    <Route
      path="/staff/queue"
      element={
        <CrisisFeedContext.Provider
          value={{ activeCount, version: 0, alert: false, dismissAlert: () => {} }}
        >
          <QueuePage />
        </CrisisFeedContext.Provider>
      }
    />,
    { path: '/staff/queue', auth: fakeAuth({ account: GUIDANCE, aal: AAL2 }) },
  );
  return queries;
}

describe('QueuePage (Fig 21; 2.1.3.7; 2.1.5.2.2; D-14)', () => {
  it('reads the queue view with no note column', async () => {
    const queries = renderQueue();
    await screen.findByRole('table');
    const select = queries.support_queue[0].calls[0][1];
    expect(select).not.toMatch(/note/);
    expect(select).toMatch(/full_name/);
  });

  it('lists open priority requests P1 first, with only the allowed columns', async () => {
    renderQueue();
    const table = await screen.findByRole('table', {
      name: 'Support requests, in the order they should be seen',
    });
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(headers).toEqual([
      'Priority',
      'Student',
      'Class adviser',
      'Submitted',
      'Concern',
      'Status',
      'Notes',
      'Action',
    ]);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getAllByRole('cell')[1].textContent)).toEqual([
      'Ana ReyesGrade 12 · HUMSS-A',
      'Paolo DiazGrade 12 · HUMSS-B',
    ]);
    expect(within(rows[0]).getByText('Has another open request')).toBeInTheDocument();
    expect(
      within(rows[0]).getByRole('link', { name: 'Open the request from Ana Reyes' }),
    ).toHaveAttribute('href', '/staff/requests/00000000-0000-4000-8000-000000000002');
    expect(screen.queryByText('Sam Villanueva')).not.toBeInTheDocument(); // resolved, hidden by "Open"
    expect(screen.queryByText('Miguel Tan')).not.toBeInTheDocument(); // For Review queue
    expect(
      screen.getByText(
        "Priorities are computed from the student's submitted request. They indicate how soon a request should be seen. They are not an assessment of the student and carry no clinical meaning.",
      ),
    ).toBeInTheDocument();
  });

  it('For Review requests sit in their own queue', async () => {
    const user = userEvent.setup();
    renderQueue();
    await screen.findByRole('table');
    expect(screen.getByRole('radio', { name: 'Priority queue (2)' })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'For Review (1)' }));
    const table = screen.getByRole('table');
    expect(within(table).getByText('Miguel Tan')).toBeInTheDocument();
    expect(within(table).getByText('For Review')).toBeInTheDocument();
    expect(within(table).getByText("Something else about how I'm doing")).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'P1' })).not.toBeInTheDocument();
  });

  it('filters by priority and status', async () => {
    const user = userEvent.setup();
    renderQueue();
    await screen.findByRole('table');
    await user.click(screen.getByRole('radio', { name: 'P2' }));
    expect(screen.queryByText('Ana Reyes')).not.toBeInTheDocument();
    expect(screen.getByText('Paolo Diaz')).toBeInTheDocument();
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Priority' })).getByRole('radio', {
        name: 'All',
      }),
    );
    await user.click(screen.getByRole('radio', { name: 'Resolved' }));
    expect(screen.getByText('Sam Villanueva')).toBeInTheDocument();
  });

  it('holds crisis events outside the queue in a banner', async () => {
    renderQueue(2);
    expect(await screen.findByText('2 crisis events need attention')).toBeInTheDocument();
    expect(screen.getByText('Outside the priority queue')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open crisis channel/ })).toHaveAttribute(
      'href',
      '/staff/crisis',
    );
  });
});
