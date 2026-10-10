import { describe, it, expect, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
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
const { CrisisChannelPage } = await import('./CrisisChannelPage.jsx');
const { GuidanceLayout } = await import('./GuidanceLayout.jsx');

const ev = (n, extra = {}) => ({
  id: `ccccccc${n}-0000-4000-8000-00000000000${n}`,
  created_at: `2026-10-12T0${n}:00:00Z`,
  full_name: `Student ${n}`,
  grade_level: 11,
  section: 'ABM-A',
  class_adviser: 'Ms. Liza Uy',
  protocol_ref: '[[GUIDANCE:crisis_protocol_step_1]]',
  item_label: '[[GUIDANCE:crisis_item_1]]',
  acknowledged_at: null,
  acknowledged_by: null,
  resolved_at: null,
  resolved_by: null,
  ...extra,
});

function renderChannel({
  active = [ev(2), ev(1, { acknowledged_at: '2026-10-12T01:05:00Z', acknowledged_by: 'GA' })],
  resolved = [],
  rpc = {},
} = {}) {
  const { client, queries, channel } = guidanceClient({
    tables: {
      crisis_channel: (calls) => {
        const select = calls.find((c) => c[0] === 'select');
        if (select[2]?.head) return { count: active.length, data: null, error: null };
        return calls.some((c) => c[0] === 'gte')
          ? { data: resolved, error: null }
          : { data: active, error: null };
      },
    },
    rpc,
  });
  mock.client = client;
  renderWithAuth(
    <Route element={<GuidanceLayout />}>
      <Route path="/staff/crisis" element={<CrisisChannelPage />} />
    </Route>,
    { path: '/staff/crisis', auth: fakeAuth({ account: GUIDANCE, aal: AAL2 }) },
  );
  return { client, queries, channel };
}

describe('CrisisChannelPage (Fig 24; 2.1.3.8; 2.1.5.2.3; D-05)', () => {
  it('shows active events, new ones first, each with the item and protocol step; no priority', async () => {
    renderChannel();
    const cards = await screen.findAllByRole('article');
    expect(cards.map((c) => within(c).getByRole('heading').textContent)).toEqual([
      'Student 2',
      'Student 1',
    ]);
    expect(within(cards[0]).getByText('New')).toBeInTheDocument();
    expect(within(cards[0]).getByText('[[GUIDANCE:crisis_item_1]]')).toBeInTheDocument();
    expect(within(cards[0]).getByText('[[GUIDANCE:crisis_protocol_step_1]]')).toBeInTheDocument();
    expect(within(cards[1]).getByText(/Acknowledged by GA/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\bP1\b|\bP2\b|score/);
    expect(
      screen.getByText(
        'Raised when a student selects an explicit high-risk item on their check-in. These events are never given a priority number and never queue behind ordinary requests.',
      ),
    ).toBeInTheDocument();
  });

  it('records one view per event shown', async () => {
    const { client } = renderChannel();
    await screen.findAllByRole('article');
    await waitFor(() =>
      expect(
        client.rpc.mock.calls.filter(([n]) => n === 'log_crisis_view').map(([, a]) => a.p_event_id),
      ).toEqual([ev(2).id, ev(1).id]),
    );
  });

  it('acknowledge, then resolve, through the audited RPCs', async () => {
    const { client } = renderChannel({
      rpc: { acknowledge_crisis_event: { data: '2026-10-12T02:01:00Z', error: null } },
    });
    const user = userEvent.setup();
    const cards = await screen.findAllByRole('article');
    await user.click(within(cards[0]).getByRole('button', { name: 'Acknowledge' }));
    expect(client.rpc).toHaveBeenCalledWith('acknowledge_crisis_event', { p_event_id: ev(2).id });
    await user.click(within(cards[1]).getByRole('button', { name: 'Mark resolved' }));
    expect(client.rpc).toHaveBeenCalledWith('resolve_crisis_event', { p_event_id: ev(1).id });
  });

  it('the layout subscribes to new crisis events and alerts on any guidance screen', async () => {
    const { client, channel } = renderChannel();
    await screen.findAllByRole('article');
    expect(client.channel).toHaveBeenCalledWith('guidance-crisis-events');
    const [event, filter, onInsert] = channel.on.mock.calls[0];
    expect(event).toBe('postgres_changes');
    expect(filter).toEqual({ event: 'INSERT', schema: 'public', table: 'crisis_events' });
    await act(async () => onInsert({ new: {} }));
    expect(screen.getByText('A new crisis event was raised.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /2 active crisis events/ }).length).toBeGreaterThan(
      0,
    );
  });
});
