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
const { AccountsPage } = await import('./AccountsPage.jsx');

const ME = '66666666-6666-4666-8666-666666666666';
const ACCOUNTS = [
  {
    id: '55555555-5555-4555-8555-555555555555',
    role: 'guidance',
    display_name: 'Guidance Associate (dev)',
    is_active: true,
    email: 'guidance.one@example.test',
    last_sign_in_at: '2026-10-10T00:02:00Z',
  },
  {
    id: ME,
    role: 'administrator',
    display_name: 'Administrator (dev)',
    is_active: true,
    email: 'admin.one@example.test',
    last_sign_in_at: null,
  },
];

function renderAccounts({ invoke = [], update } = {}) {
  const { client, queries } = guidanceClient({
    tables: {
      students: { count: 4, data: null, error: null },
      staff_accounts: update ?? { data: null, error: null },
    },
  });
  client.functions.invoke.mockResolvedValueOnce({ data: { accounts: ACCOUNTS }, error: null });
  for (const r of invoke) client.functions.invoke.mockResolvedValueOnce(r);
  client.functions.invoke.mockResolvedValue({ data: { accounts: ACCOUNTS }, error: null });
  mock.client = client;
  renderWithAuth(<Route path="/admin/accounts" element={<AccountsPage />} />, {
    path: '/admin/accounts',
    auth: fakeAuth({
      account: ADMIN,
      aal: AAL2,
      session: { user: { id: ME, email: 'admin.one@example.test' } },
    }),
  });
  return { client, queries };
}

describe('AccountsPage (Figs 27-28; 2.1.5.3.1)', () => {
  it('lists staff from admin-accounts with counts, and lists no students', async () => {
    const { client } = renderAccounts();
    const table = await screen.findByRole('table', { name: 'Staff accounts' });
    expect(client.functions.invoke).toHaveBeenCalledWith('admin-accounts', {
      body: { action: 'list' },
    });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('guidance.one@example.test')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Not yet')).toBeInTheDocument();
    expect(within(rows[1]).getByText('This is your account')).toBeInTheDocument();
    expect(within(rows[1]).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Students').nextSibling).toHaveTextContent('4');
    expect(screen.getByText("Read any student's check-ins.")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/written to the audit trail/i); // D-04
  });

  it('changes a role and confirms only when the row comes back', async () => {
    const { queries } = renderAccounts({
      update: { data: { id: ACCOUNTS[0].id, role: 'administrator', is_active: true }, error: null },
    });
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', { name: 'Change the role of Guidance Associate (dev)' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Change role' });
    await user.click(within(dialog).getByRole('radio', { name: /Administrator/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Save role' }));
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    expect(queries.staff_accounts[0].calls).toEqual([
      ['update', { role: 'administrator' }],
      ['eq', 'id', ACCOUNTS[0].id],
      ['select', 'id, role, is_active'],
      ['single'],
    ]);
  });

  it('explains the last-administrator rule when the database refuses', async () => {
    renderAccounts({
      update: {
        data: null,
        error: { message: 'staff_accounts: at least one active administrator is required' },
      },
    });
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', { name: 'Deactivate Guidance Associate (dev)' }),
    );
    await user.click(screen.getByRole('button', { name: 'Deactivate account' }));
    expect(
      await screen.findByText('There must always be at least one active administrator.'),
    ).toBeInTheDocument();
  });

  it('creates a staff account by invitation, checking the form first', async () => {
    const { client } = renderAccounts({
      invoke: [
        {
          data: { id: '77777777-7777-4777-8777-777777777777', email: 'new@example.test' },
          error: null,
        },
      ],
    });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Create staff account' }));
    const dialog = screen.getByRole('dialog', { name: 'Create staff account' });
    await user.click(within(dialog).getByRole('button', { name: 'Create account' }));
    expect(
      within(dialog).getByText('Enter the full name (2 to 120 characters).'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Choose a role.')).toBeInTheDocument();
    expect(within(dialog).getByText(/created without a password/)).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Full name'), 'New Staff');
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Work email address' }),
      'new@example.test',
    );
    await user.click(within(dialog).getByRole('radio', { name: /^Guidance/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Invitation sent to new@example.test.')).toBeInTheDocument();
    expect(client.functions.invoke).toHaveBeenCalledWith('admin-accounts', {
      body: {
        action: 'create',
        email: 'new@example.test',
        display_name: 'New Staff',
        role: 'guidance',
      },
    });
  });

  it('says when the email already has an account', async () => {
    renderAccounts({ invoke: [{ data: null, error: { context: { status: 409 } } }] });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Create staff account' }));
    const dialog = screen.getByRole('dialog', { name: 'Create staff account' });
    await user.type(within(dialog).getByLabelText('Full name'), 'New Staff');
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Work email address' }),
      'guidance.one@example.test',
    );
    await user.click(within(dialog).getByRole('radio', { name: /^Administrator/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Create account' }));
    expect(
      await within(dialog).findByText('That email address already has an account.'),
    ).toBeInTheDocument();
  });
});
