// File name starts with OfficeTag, so it may name the office's tag values (00 Section 10.4).
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
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
const { OfficeTagPage } = await import('./OfficeTagPage.jsx');
const { OfficeTagBadge } = await import('./OfficeTagBadge.jsx');

const RID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const HEADER = {
  data: { id: RID, full_name: 'Ana Reyes', grade_level: 12, section: 'HUMSS-A' },
  error: null,
};

function renderTag({
  latest = { data: null, error: null },
  insert = { data: { id: 'x' }, error: null },
} = {}) {
  const { client, queries } = guidanceClient({
    tables: { support_queue: HEADER, office_tags: [latest, insert] },
  });
  mock.client = client;
  renderWithAuth(
    [
      <Route key="t" path="/staff/requests/:id/tag" element={<OfficeTagPage />} />,
      <Route key="d" path="/staff/requests/:id" element={<p>detail page</p>} />,
    ],
    { path: `/staff/requests/${RID}/tag`, auth: fakeAuth({ account: GUIDANCE, aal: AAL2 }) },
  );
  return { client, queries };
}

describe('OfficeTagPage (Fig 25; 2.1.3.4; 2.1.5.2.5; D-33)', () => {
  it('offers the three tags with none selected and Save disabled', async () => {
    renderTag();
    expect(await screen.findByRole('heading', { name: 'Assign office tag' })).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.value)).toEqual(['green', 'yellow', 'red']);
    for (const r of radios) expect(r).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Save tag' })).toBeDisabled();
    expect(screen.getByText('No office tag has been assigned yet.')).toBeInTheDocument();
    expect(
      screen.getByText(
        "This is the guidance office's own tag. HingaWeb never computes, suggests, or changes it.",
      ),
    ).toBeInTheDocument();
  });

  it('never reads the band, score, ratings, or note', async () => {
    const { queries } = renderTag();
    await screen.findByRole('heading', { name: 'Assign office tag' });
    expect(queries.support_queue[0].calls[0]).toEqual([
      'select',
      'id, full_name, grade_level, section',
    ]);
    expect(JSON.stringify(queries)).not.toMatch(/\bband\b|score|triage|\bnote\b|\bc1\b/);
  });

  it('saves only the chosen tag, then returns to the request', async () => {
    const { queries } = renderTag();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('radio', { name: 'Yellow' }));
    await user.click(screen.getByRole('button', { name: 'Save tag' }));
    expect(await screen.findByText('detail page')).toBeInTheDocument();
    expect(queries.office_tags[1].calls).toEqual([
      ['insert', { request_id: RID, tag: 'yellow' }],
      ['select', 'id'],
      ['single'],
    ]);
  });

  it('shows the current tag and who set it, but still preselects nothing', async () => {
    renderTag({
      latest: {
        data: {
          tag: 'red',
          assigned_at: '2026-10-12T02:00:00Z',
          staff_accounts: { display_name: 'Guidance Associate (dev)' },
        },
        error: null,
      },
    });
    expect(
      await screen.findByText(
        'Current tag: Red, assigned by Guidance Associate (dev) on 12 Oct 2026, 10:00 AM.',
      ),
    ).toBeInTheDocument();
    for (const r of screen.getAllByRole('radio')) expect(r).not.toBeChecked();
  });

  it('says so when the tag was not saved', async () => {
    renderTag({ insert: { data: null, error: { code: '42501' } } });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('radio', { name: 'Green' }));
    await user.click(screen.getByRole('button', { name: 'Save tag' }));
    expect(await screen.findByText('The tag was not saved. Try again.')).toBeInTheDocument();
  });

  it('the badge shows the label staff chose', () => {
    renderWithAuth(<Route path="/" element={<OfficeTagBadge tag="green" />} />);
    expect(screen.getByText('Green')).toBeInTheDocument();
  });
});
