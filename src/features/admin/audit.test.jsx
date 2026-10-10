import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { renderWithAuth, fakeAuth, ADMIN, AAL2 } from '../../test/renderWithAuth.jsx';
import { guidanceClient } from '../guidance/testClient.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { AuditPage } = await import('./AuditPage.jsx');

const ROWS = [
  {
    id: 'a1',
    created_at: '2026-10-10T00:22:00Z',
    action: 'view_request',
    actor_id: 'g1',
    request_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    crisis_event_id: null,
    staff_accounts: { display_name: 'Guidance Associate (dev)' },
  },
  {
    id: 'a2',
    created_at: '2026-10-10T00:15:00Z',
    action: 'crisis_acknowledged',
    actor_id: 'g1',
    request_id: null,
    crisis_event_id: 'ccccccc1-0000-4000-8000-000000000001',
    staff_accounts: { display_name: 'Guidance Associate (dev)' },
  },
];

function renderAudit() {
  const { client, queries } = guidanceClient({
    tables: {
      staff_accounts: {
        data: [{ id: 'g1', display_name: 'Guidance Associate (dev)' }],
        error: null,
      },
      staff_access_audit: { data: ROWS, error: null },
    },
  });
  mock.client = client;
  renderWithAuth(<Route path="/admin/audit" element={<AuditPage />} />, {
    path: '/admin/audit',
    auth: fakeAuth({ account: ADMIN, aal: AAL2 }),
  });
  return queries;
}

describe('AuditPage (Fig 33; Table 17; D-04, D-16)', () => {
  it('lists entries newest first with a Ref, never a student name or contents', async () => {
    const queries = renderAudit();
    const table = await screen.findByRole('table', { name: 'Audit entries, newest first' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(within(rows[0]).getByText('Opened support request')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Support request Ref 7c9e6679')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Crisis event Ref ccccccc1')).toBeInTheDocument();
    const select = queries.staff_access_audit[0].calls[0][1];
    expect(select).not.toMatch(/disclosed|note|full_name/);
    expect(screen.queryByRole('button', { name: /delete|edit/i })).not.toBeInTheDocument();
  });

  it('filters by date (Manila day bounds), action, and staff member', async () => {
    const queries = renderAudit();
    const user = userEvent.setup();
    await screen.findByRole('table');
    await user.type(screen.getByLabelText('From'), '2026-10-01');
    await user.selectOptions(screen.getByLabelText('Action'), 'tag');
    await user.selectOptions(screen.getByLabelText('Staff member'), 'g1');
    await screen.findByRole('table');
    const last = queries.staff_access_audit[queries.staff_access_audit.length - 1].calls;
    expect(last).toContainEqual(['gte', 'created_at', '2026-10-01T00:00:00+08:00']);
    expect(last).toContainEqual(['eq', 'action', 'tag']);
    expect(last).toContainEqual(['eq', 'actor_id', 'g1']);
  });

  it('exports the shown entries as CSV', async () => {
    renderAudit();
    const user = userEvent.setup();
    await screen.findByRole('table');
    const blobs = [];
    const create = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation((b) => (blobs.push(b), 'blob:x'));
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await user.click(screen.getByRole('button', { name: 'Export CSV' }));
    const text = await blobs[0].text();
    expect(text.split('\r\n')[0]).toBe('time,staff_member,action,record_type,record_ref');
    expect(text).toContain('view_request,support_request,7c9e6679');
    create.mockRestore();
    revoke.mockRestore();
    click.mockRestore();
  });
});
