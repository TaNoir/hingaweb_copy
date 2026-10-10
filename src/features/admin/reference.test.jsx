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
const { ReferencePage } = await import('./ReferencePage.jsx');

const ITEMS = [
  {
    id: 'i1',
    label: '[[GUIDANCE:crisis_item_1]]',
    protocol_ref: '[[GUIDANCE:crisis_protocol_step_1]]',
    set_version: 'v0-placeholder',
    is_active: true,
  },
  { id: 'i9', label: 'Old item', protocol_ref: null, set_version: 'v0', is_active: false },
];

function renderRef() {
  const { client, queries } = guidanceClient({
    tables: {
      crisis_items: (calls) => {
        if (calls[0][0] === 'insert') return { data: { id: 'new' }, error: null };
        if (calls[0][0] === 'update') return { data: { id: 'i1', is_active: false }, error: null };
        return { data: ITEMS, error: null };
      },
    },
  });
  mock.client = client;
  renderWithAuth(<Route path="/admin/reference" element={<ReferencePage />} />, {
    path: '/admin/reference',
    auth: fakeAuth({ account: ADMIN, aal: AAL2 }),
  });
  return { queries };
}

describe('ReferencePage (Fig 30; Table 12)', () => {
  it('lists active and retired items; only active ones can be retired; nothing can be edited', async () => {
    renderRef();
    const table = await screen.findByRole('table', { name: 'Crisis items' });
    expect(screen.getByText('1 active, 1 retired')).toBeInTheDocument();
    const rows = within(table).getAllByRole('row').slice(1);
    expect(
      within(rows[0]).getByRole('button', { name: 'Retire the item [[GUIDANCE:crisis_item_1]]' }),
    ).toBeInTheDocument();
    expect(within(rows[1]).queryByRole('button')).not.toBeInTheDocument();
    expect(within(rows[1]).getByText('Retired')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit|delete/i })).not.toBeInTheDocument();
    expect(screen.getByText(/never scans or matches words/)).toBeInTheDocument();
  });

  it('adds an agreed item only after the co-design confirmation', async () => {
    const { queries } = renderRef();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Add agreed item' }));
    const dialog = screen.getByRole('dialog', { name: 'Add agreed item' });
    expect(within(dialog).getByRole('button', { name: 'Add item' })).toBeDisabled();
    await user.type(within(dialog).getByLabelText('Item text'), '  Agreed wording  ');
    await user.type(within(dialog).getByLabelText('Set version'), 'v1');
    await user.click(within(dialog).getByRole('checkbox'));
    await user.click(within(dialog).getByRole('button', { name: 'Add item' }));
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    const insert = queries.crisis_items.find((q) => q.calls[0][0] === 'insert');
    expect(insert.calls[0]).toEqual([
      'insert',
      { label: 'Agreed wording', protocol_ref: null, set_version: 'v1' },
    ]);
  });

  it('retires through is_active only', async () => {
    const { queries } = renderRef();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Retire the item/ }));
    await user.click(screen.getByRole('button', { name: 'Retire item' }));
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    const update = queries.crisis_items.find((q) => q.calls[0][0] === 'update');
    expect(update.calls.slice(0, 2)).toEqual([
      ['update', { is_active: false }],
      ['eq', 'id', 'i1'],
    ]);
  });
});
