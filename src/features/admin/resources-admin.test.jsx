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
const { ResourceLibraryPage } = await import('./ResourceLibraryPage.jsx');
const { ResourceEditPage } = await import('./ResourceEditPage.jsx');

const RES = [
  {
    id: 'r1',
    title: 'Managing exam pressure',
    url: 'https://example.org/1',
    attributes: { school_work: 5, home_family: 1, future: 1, managing: 2 },
    verified_at: '2026-07-20T02:00:00Z',
    staff_accounts: { display_name: 'Guidance Associate (dev)' },
  },
  {
    id: 'r5',
    title: 'Sleep and routine',
    url: null,
    attributes: { school_work: 0, home_family: 0, future: 0, managing: 4 },
    verified_at: null,
    staff_accounts: null,
  },
];
const STAFF = [
  { id: '55555555-5555-4555-8555-555555555555', display_name: 'Guidance Associate (dev)' },
];

function setup(resources = {}) {
  const { client, queries } = guidanceClient({
    tables: {
      staff_accounts: { data: STAFF, error: null },
      resources: (calls) => {
        const op = calls[0][0];
        if (op === 'insert' || op === 'update')
          return resources.write ?? { data: { id: 'r1' }, error: null };
        if (op === 'delete') return { data: [{ id: 'r1' }], error: null };
        if (calls.some((c) => c[0] === 'maybeSingle'))
          return {
            data: {
              id: 'r1',
              title: RES[0].title,
              url: RES[0].url,
              attributes: RES[0].attributes,
              verified_by: STAFF[0].id,
            },
            error: null,
          };
        return { data: RES, error: null };
      },
    },
  });
  mock.client = client;
  return queries;
}

const auth = () => fakeAuth({ account: ADMIN, aal: AAL2 });
const routes = [
  <Route key="l" path="/admin/resources" element={<ResourceLibraryPage />} />,
  <Route key="n" path="/admin/resources/new" element={<ResourceEditPage />} />,
  <Route key="e" path="/admin/resources/:id" element={<ResourceEditPage />} />,
];

describe('ResourceLibraryPage (Fig 31)', () => {
  it('shows drafts and published resources with who verified them', async () => {
    const queries = setup();
    renderWithAuth(routes, { path: '/admin/resources', auth: auth() });
    const table = await screen.findByRole('table', { name: 'Resources' });
    expect(queries.resources[0].calls[0]).toEqual([
      'select',
      'id, title, url, attributes, verified_at, staff_accounts(display_name)',
    ]);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(within(rows[0]).getByText('Guidance Associate (dev)')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Published')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Draft')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Managing')).toBeInTheDocument();
  });
});

describe('ResourceEditPage (Fig 32; D-07)', () => {
  it('a new draft saves title, url, and attributes with no verifier', async () => {
    const queries = setup();
    const user = userEvent.setup();
    renderWithAuth(routes, { path: '/admin/resources/new', auth: auth() });
    await user.type(await screen.findByLabelText('Title'), 'New guide');
    await user.click(screen.getByRole('button', { name: 'Save resource' }));
    expect(screen.getByText('At least one area must be above 0.')).toBeInTheDocument();
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Future' })).getByRole('radio', { name: '4' }),
    );
    expect(screen.getByText('Resource vector: 0, 0, 4, 0')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save resource' }));
    expect(await screen.findByRole('table', { name: 'Resources' })).toBeInTheDocument();
    const insert = queries.resources.find((q) => q.calls[0][0] === 'insert');
    expect(insert.calls[0]).toEqual([
      'insert',
      {
        title: 'New guide',
        url: null,
        attributes: { school_work: 0, home_family: 0, future: 4, managing: 0 },
        verified_by: null,
      },
    ]);
  });

  it('publishing needs an https URL, a verifier, and the confirmation', async () => {
    setup();
    const user = userEvent.setup();
    renderWithAuth(routes, { path: '/admin/resources/new', auth: auth() });
    await user.type(await screen.findByLabelText('Title'), 'New guide');
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'School work' })).getByRole('radio', {
        name: '3',
      }),
    );
    await user.click(screen.getByRole('radio', { name: 'Published' }));
    await user.click(screen.getByRole('button', { name: 'Save resource' }));
    expect(screen.getByText('Enter a link that starts with https://')).toBeInTheDocument();
    expect(screen.getByText('Choose who verified this resource.')).toBeInTheDocument();
    expect(screen.getByText('Tick the box to publish.')).toBeInTheDocument();
  });

  it('editing loads the resource; unpublishing clears the verifier; delete asks first', async () => {
    const queries = setup();
    const user = userEvent.setup();
    renderWithAuth(routes, { path: '/admin/resources/r1', auth: auth() });
    expect(await screen.findByDisplayValue('Managing exam pressure')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Published' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await user.click(screen.getByRole('radio', { name: 'Draft' }));
    await user.click(screen.getByRole('button', { name: 'Save resource' }));
    await screen.findByRole('table', { name: 'Resources' });
    const update = queries.resources.find((q) => q.calls[0][0] === 'update');
    expect(update.calls[0][1].verified_by).toBeNull();
    expect(update.calls[1]).toEqual(['eq', 'id', 'r1']);
  });
});
