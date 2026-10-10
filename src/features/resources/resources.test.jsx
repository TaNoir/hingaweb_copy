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
const { ResourcesPage } = await import('./ResourcesPage.jsx');

const UID = '11111111-1111-1111-1111-111111111111';
const auth = () =>
  fakeAuth({ account: STUDENT_T2, session: { user: { id: UID, email: 'x@example.test' } } });
const RANKED = [
  {
    id: 'r2',
    title: 'Talking to family about money worries',
    url: 'https://example.org/2',
    area: 'home_family',
  },
  { id: 'r1', title: 'Managing exam pressure', url: 'https://example.org/1', area: 'school_work' },
  {
    id: 'r3',
    title: 'When everything feels like too much',
    url: 'https://example.org/3',
    area: 'managing',
  },
];

function setup(...results) {
  const c = createMockSupabase();
  for (const r of results) c.functions.invoke.mockResolvedValueOnce(r);
  c.from.mockImplementation(() => queryResult({ data: null, error: null }));
  mock.client = c;
  return c;
}
const renderPage = () =>
  renderWithAuth(<Route path="/resources" element={<ResourcesPage />} />, {
    path: '/resources',
    auth: auth(),
  });

describe('ResourcesPage (Fig 13; 2.1.5.1.5)', () => {
  it('asks the server to rank and shows guides in that order, with no number', async () => {
    const c = setup({ data: { basis: 'latest_checkin', resources: RANKED }, error: null });
    renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Suggested for you' }),
    ).toBeInTheDocument();
    const list = await screen.findByRole('list');
    expect(
      within(list)
        .getAllByRole('heading')
        .map((h) => h.textContent),
    ).toEqual(RANKED.map((r) => r.title));
    expect(c.functions.invoke).toHaveBeenCalledWith('rank-resources', { body: {} });
    expect(list.textContent).not.toMatch(/\d+%|0\.\d|match|score|similar/i);
    expect(
      screen.getByText(
        'Chosen by matching your latest check-in to the topics of each guide. You are never compared to other students.',
      ),
    ).toBeInTheDocument();
  });

  it('filters by area and keeps the ranked order', async () => {
    setup({ data: { basis: 'latest_checkin', resources: RANKED }, error: null });
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('list');
    await user.click(screen.getByRole('radio', { name: 'School work' }));
    expect(
      within(screen.getByRole('list'))
        .getAllByRole('heading')
        .map((h) => h.textContent),
    ).toEqual(['Managing exam pressure']);
    await user.click(screen.getByRole('radio', { name: 'Future' }));
    expect(screen.getByText('No suggested guides on this topic')).toBeInTheDocument();
  });

  it('records an owner-only view when a guide is opened', async () => {
    const c = setup({ data: { basis: 'latest_checkin', resources: RANKED }, error: null });
    const user = userEvent.setup();
    renderPage();
    const link = (await screen.findAllByRole('link', { name: /Read/ }))[0];
    link.addEventListener('click', (e) => e.preventDefault());
    await user.click(link);
    expect(c.from).toHaveBeenCalledWith('resource_views');
    const q = c.from.mock.results.find(
      (r, i) => c.from.mock.calls[i][0] === 'resource_views',
    ).value;
    expect(q.calls).toEqual([['insert', { student_id: UID, resource_id: 'r2' }]]);
  });

  it('with no check-in yet, points to a check-in and the unranked guides', async () => {
    setup({ data: { basis: 'none', resources: [] }, error: null });
    renderPage();
    expect(await screen.findByText('Do a check-in first')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start a check-in' })).toHaveAttribute(
      'href',
      '/check-in',
    );
    expect(screen.getByRole('link', { name: 'Browse all guides' })).toHaveAttribute(
      'href',
      '/guides',
    );
  });

  it('empty library and error states', async () => {
    setup(
      { data: null, error: { message: 'down' } },
      { data: { basis: 'latest_checkin', resources: [] }, error: null },
    );
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No guides have been published yet')).toBeInTheDocument();
  });

  it('the closing card asks for support without promising a session (D-20)', async () => {
    setup({ data: { basis: 'latest_checkin', resources: RANKED }, error: null });
    renderPage();
    await screen.findByRole('list');
    expect(
      screen.getByRole('link', { name: 'Ask the guidance office for support' }),
    ).toHaveAttribute('href', '/request');
    expect(document.body.textContent).not.toMatch(
      /private session|scheduled|counselors are available/i,
    );
  });
});
