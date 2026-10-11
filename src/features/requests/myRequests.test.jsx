// User request 2026-10-11 ("My requests"): the check-in page shows the student's own requests as
// Sent / Seen by the guidance office / Closed, and nothing else about them.
import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { renderWithAuth, fakeAuth, STUDENT_T2 } from '../../test/renderWithAuth.jsx';
import { createMockSupabase, queryResult } from '../../test/mockSupabase.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { MyRequests } = await import('./MyRequests.jsx');
const { CheckInPage } = await import('../checkin/CheckInPage.jsx');

const SENT = {
  id: 'aaaaaaa1-0000-4000-8000-000000000003',
  created_at: '2026-10-09T01:00:00Z',
  stage: 'sent',
  seen_at: null,
  closed_at: null,
};
const SEEN = {
  id: 'bbbbbbb2-0000-4000-8000-000000000002',
  created_at: '2026-10-05T01:00:00Z',
  stage: 'seen',
  seen_at: '2026-10-06T02:00:00Z',
  closed_at: null,
};
const CLOSED = {
  id: 'ccccccc3-0000-4000-8000-000000000001',
  created_at: '2026-09-28T01:00:00Z',
  stage: 'closed',
  seen_at: '2026-09-29T02:00:00Z',
  closed_at: '2026-10-01T03:00:00Z',
};

function setup(rpcResult) {
  const client = createMockSupabase();
  client.rpc.mockResolvedValue(rpcResult);
  client.from.mockImplementation(() => queryResult({ data: [], error: null }));
  mock.client = client;
  renderWithAuth(<Route path="/" element={<MyRequests />} />, { path: '/' });
  return client;
}

describe('MyRequests', () => {
  it('shows nothing when the student has not sent a request', async () => {
    const client = setup({ data: [], error: null });
    await vi.waitFor(() => expect(client.rpc).toHaveBeenCalledWith('my_support_requests'));
    expect(
      screen.queryByRole('heading', { name: 'My requests to the guidance office' }),
    ).toBeNull();
  });

  it('shows each request with its step, its reference, and its dates', async () => {
    setup({ data: [SENT, SEEN, CLOSED], error: null });
    await screen.findByRole('heading', { level: 2, name: 'My requests to the guidance office' });

    const sent = screen.getByRole('list', { name: 'Progress of Ref aaaaaaa1' });
    expect(within(sent).getByText('Sent').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(within(sent).getByText(/Seen by the guidance office/)).toHaveTextContent('(not yet)');
    expect(screen.getByText('Ref aaaaaaa1 • Sent 9 Oct 2026')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The guidance office has not opened it yet. Someone from the office will follow up with you at school.',
      ),
    ).toBeInTheDocument();

    const seen = screen.getByRole('list', { name: 'Progress of Ref bbbbbbb2' });
    expect(
      within(seen)
        .getByText(/Seen by the guidance office/)
        .closest('li'),
    ).toHaveAttribute('aria-current', 'step');
    expect(within(seen).getByText(/^Sent/)).toHaveTextContent('(done)');
    expect(
      screen.getByText(/The guidance office opened your request on 6 Oct 2026\./),
    ).toBeInTheDocument();

    const closed = screen.getByRole('list', { name: 'Progress of Ref ccccccc3' });
    expect(
      within(closed)
        .getByText(/Closed/)
        .closest('li'),
    ).toHaveAttribute('aria-current', 'step');
    expect(
      screen.getByText(/The guidance office closed this request on 1 Oct 2026\./),
    ).toBeInTheDocument();
  });

  it('never shows the office status words', async () => {
    setup({ data: [SENT, SEEN, CLOSED], error: null });
    await screen.findByRole('heading', { name: 'My requests to the guidance office' });
    expect(document.body.textContent).not.toMatch(/referred|reviewed|resolved|pending/i);
  });

  it('says so and offers a retry when the requests cannot be loaded', async () => {
    const client = setup({ data: null, error: { message: 'down' } });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not load your requests right now.',
    );
    client.rpc.mockResolvedValue({ data: [SEEN], error: null });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('list', { name: 'Progress of Ref bbbbbbb2' }),
    ).toBeInTheDocument();
  });

  it('appears on the check-in page', async () => {
    const client = createMockSupabase();
    client.rpc.mockResolvedValue({ data: [SEEN], error: null });
    client.from.mockImplementation(() => queryResult({ data: [], error: null }));
    mock.client = client;
    renderWithAuth(<Route path="/check-in" element={<CheckInPage />} />, {
      path: '/check-in',
      auth: fakeAuth({
        account: STUDENT_T2,
        session: { user: { id: '11111111-1111-1111-1111-111111111111', email: 'x@example.test' } },
      }),
    });
    expect(
      await screen.findByRole('heading', { level: 2, name: 'My requests to the guidance office' }),
    ).toBeInTheDocument();
  });
});
