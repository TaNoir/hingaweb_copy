import { describe, it, expect, vi } from 'vitest';
import { StrictMode } from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { renderWithAuth, fakeAuth, GUIDANCE, AAL2 } from '../../test/renderWithAuth.jsx';
import { guidanceClient } from './testClient.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { RequestDetailPage } = await import('./RequestDetailPage.jsx');

const RID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const REQUEST = {
  id: RID,
  created_at: '2026-10-12T00:14:00Z',
  status: 'pending',
  concern_type: 'family',
  follow_up_at: null,
  note: 'Please help.\nSecond line.',
  disclosed: {
    full_name: 'Ana Reyes',
    grade_level: 12,
    section: 'HUMSS-A',
    class_adviser: 'Mr. Ramon Cruz',
    c1: 5,
    c2: 5,
    c3: 1,
    c4: 1,
  },
  triage: {
    score: 3.8588,
    band: 'P1',
    computed_at: '2026-10-12T00:14:01Z',
    guardrails: {
      fired: ['anySingleAtMax', 'twoOrMoreHigh'],
      weights: { c1: 0.2616, c2: 0.4531, c3: 0.1182, c4: 0.1671 },
      thresholds: { P2_MIN: 2.25, P1_MIN: 3.5 },
      grayZoneHalfWidth: 0.1,
      provisional: true,
    },
  },
  office_tag: null,
  has_other_open_request: false,
  viewed_at: '2026-10-12T00:22:00Z',
};

function renderDetail({
  rpc = { data: REQUEST, error: null },
  tables = {},
  strict = false,
  state,
} = {}) {
  const { client, queries } = guidanceClient({ rpc: { open_support_request: rpc }, tables });
  mock.client = client;
  const page = strict ? (
    <StrictMode>
      <RequestDetailPage />
    </StrictMode>
  ) : (
    <RequestDetailPage />
  );
  renderWithAuth(<Route path="/staff/requests/:id" element={page} />, {
    path: `/staff/requests/${RID}`,
    auth: fakeAuth({ account: GUIDANCE, aal: AAL2 }),
    state,
  });
  return { client, queries };
}

describe('RequestDetailPage (Fig 23; 2.1.3.6; 2.1.3.7)', () => {
  it('opens through open_support_request exactly once, even in StrictMode', async () => {
    const { client } = renderDetail({ strict: true });
    await screen.findByText(/Ana Reyes • Grade 12 · HUMSS-A/);
    expect(client.rpc).toHaveBeenCalledTimes(1);
    expect(client.rpc).toHaveBeenCalledWith('open_support_request', { p_request_id: RID });
    expect(client.from).not.toHaveBeenCalled(); // the note is never read any other way
  });

  it('shows the note as written, the audit notice, and what is not available', async () => {
    renderDetail();
    expect(await screen.findByText(/Please help\.\s+Second line\./)).toBeInTheDocument();
    expect(
      screen.getByText(/Your access to this request was recorded at 12 Oct 2026, 8:22 AM/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Submitted 12 Oct 2026, 8:14 AM • Ref 7c9e6679/)).toBeInTheDocument();
    expect(screen.getByText('Home and family')).toBeInTheDocument();
    expect(screen.getByText(/These are not readable by any staff account/)).toBeInTheDocument();
  });

  it('shows the stored computation without recomputing it', async () => {
    renderDetail();
    const table = await screen.findByRole('table', {
      name: 'Ratings and weights used for this request',
    });
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(headers).toEqual(['Criterion', "Student's answer", 'Rating used (1–5)', 'Weight']);
    const c4 = within(table)
      .getByRole('rowheader', { name: 'C4 · Manageability / coping capacity' })
      .closest('tr');
    expect(
      within(c4)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['Very much', '1', '0.1671']);
    expect(within(table).getByText('3.8588')).toBeInTheDocument();
    expect(
      screen.getByText('Floor applied: a criterion at 5 sets at least P2.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('These weights and thresholds are provisional until the scoring session.'),
    ).toBeInTheDocument();
    expect(table.textContent).not.toMatch(/1\.308|Weighted/);
  });

  it('a request sent with no check-in explains For Review with no score', async () => {
    renderDetail({
      rpc: {
        data: {
          ...REQUEST,
          disclosed: { ...REQUEST.disclosed, c1: null, c2: null, c3: null, c4: null },
          triage: { score: null, band: 'FR', guardrails: {} },
        },
        error: null,
      },
    });
    expect(
      await screen.findByText(/had no check-in when they sent this request/),
    ).toBeInTheDocument();
  });

  it('changes status and confirms only after the row comes back', async () => {
    const { queries } = renderDetail({
      tables: { support_requests: { data: { id: RID, status: 'reviewed' }, error: null } },
    });
    const user = userEvent.setup();
    await screen.findByText(/Ana Reyes/);
    await user.click(screen.getByRole('radio', { name: 'Reviewed' }));
    expect(await screen.findByText('Status saved.')).toBeInTheDocument();
    expect(queries.support_requests[0].calls).toEqual([
      ['update', { status: 'reviewed' }],
      ['eq', 'id', RID],
      ['select', 'id, status'],
      ['single'],
    ]);
    expect(screen.getByRole('radio', { name: 'Reviewed' })).toHaveAttribute('aria-checked', 'true');
  });

  it('says so when the status was not saved', async () => {
    renderDetail({ tables: { support_requests: { data: null, error: { code: 'PGRST116' } } } });
    const user = userEvent.setup();
    await screen.findByText(/Ana Reyes/);
    await user.click(screen.getByRole('radio', { name: 'Resolved' }));
    expect(await screen.findByText('The status was not saved. Try again.')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Pending' })).toHaveAttribute('aria-checked', 'true');
  });

  it('sets a follow-up date as the end of that Manila day', async () => {
    const { queries } = renderDetail({
      tables: {
        support_requests: { data: { id: RID, follow_up_at: '2026-10-20T15:59:59Z' }, error: null },
      },
    });
    const user = userEvent.setup();
    await screen.findByText(/Ana Reyes/);
    await user.type(screen.getByLabelText('Follow up by'), '2026-10-20');
    await user.click(screen.getByRole('button', { name: 'Set follow-up date' }));
    expect(await screen.findByText('Follow-up date saved.')).toBeInTheDocument();
    expect(queries.support_requests[0].calls[0]).toEqual([
      'update',
      { follow_up_at: '2026-10-20T23:59:59+08:00' },
    ]);
  });

  it('links to the tag page and the directory; never offers referral notes', async () => {
    renderDetail();
    await screen.findByText(/Ana Reyes/);
    expect(screen.getByRole('link', { name: 'Assign office tag' })).toHaveAttribute(
      'href',
      `/staff/requests/${RID}/tag`,
    );
    expect(screen.getByRole('link', { name: 'Open partner directory' })).toHaveAttribute(
      'href',
      `/staff/referrals?request=${RID}`,
    );
    expect(screen.queryByText(/Add referral note/i)).not.toBeInTheDocument();
    expect(screen.getByText('No office tag yet.')).toBeInTheDocument();
  });

  it('not found and error states', async () => {
    renderDetail({ rpc: { data: null, error: { code: 'P0002' } } });
    expect(await screen.findByText('This request does not exist.')).toBeInTheDocument();
  });
});
