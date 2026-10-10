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
const { ConsentPage } = await import('./ConsentPage.jsx');

const STUDENTS = [
  { id: 's1', full_name: 'Ana Reyes', grade_level: 12, section: 'HUMSS-A' },
  { id: 's2', full_name: 'Miguel Tan', grade_level: 11, section: 'ABM-B' },
  { id: 's3', full_name: 'Paolo Diaz', grade_level: 11, section: 'HUMSS-B' },
];
const rec = (student_id, type, status, extra = {}) => ({
  id: `${student_id}-${type}`,
  student_id,
  type,
  status,
  instrument_version: `${type}-v1`,
  signed_at: '2026-08-12T02:00:00Z',
  withdrawn_at: status === 'withdrawn' ? '2026-09-02T02:00:00Z' : null,
  ...extra,
});
const RECORDS = [
  rec('s1', 'assent', 'granted'),
  rec('s1', 'parental', 'granted'),
  rec('s2', 'assent', 'granted'),
  rec('s3', 'assent', 'granted'),
  rec('s3', 'parental', 'withdrawn'),
];

function renderConsent(write = { data: [{ id: 'x' }], error: null }) {
  const { client, queries } = guidanceClient({
    tables: {
      students: { data: STUDENTS, error: null },
      consent_records: (calls) =>
        calls.some((c) => c[0] === 'insert' || c[0] === 'update')
          ? calls.some((c) => c[0] === 'single')
            ? { data: { id: 'n' }, error: write.error }
            : write
          : { data: RECORDS, error: null },
    },
  });
  mock.client = client;
  renderWithAuth(<Route path="/admin/consent" element={<ConsentPage />} />, {
    path: '/admin/consent',
    auth: fakeAuth({ account: ADMIN, aal: AAL2 }),
  });
  return { client, queries };
}

describe('ConsentPage (Fig 29; 2.1.5.3.2; D-26, D-27)', () => {
  it('shows each student once with both records and the summary counts', async () => {
    renderConsent();
    const table = await screen.findByRole('table', { name: 'Consent and assent for each student' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getAllByRole('cell')[0].textContent)).toEqual([
      'Ana Reyes',
      'Miguel Tan',
      'Paolo Diaz',
    ]);
    expect(within(rows[0]).getAllByText('Recorded 12 Aug 2026 · form parental-v1').length).toBe(1);
    expect(within(rows[1]).getByText('Not recorded')).toBeInTheDocument();
    expect(
      within(rows[2]).getByText('Withdrawn 2 Sep 2026 · form parental-v1'),
    ).toBeInTheDocument();
    expect(screen.getByText('Both recorded', { selector: 'p' }).nextSibling).toHaveTextContent('1');
    expect(screen.getByText('Awaiting parental consent').nextSibling).toHaveTextContent('1');
  });

  it('records parental consent only after the form version and confirmation', async () => {
    const { queries } = renderConsent();
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', { name: 'Record parental consent for Miguel Tan' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Record parental consent' });
    const save = within(dialog).getByRole('button', { name: 'Record consent' });
    expect(save).toBeDisabled();
    await user.click(within(dialog).getByRole('checkbox'));
    await user.click(save);
    expect(
      within(dialog).getByText('Enter the form version (1 to 40 characters).'),
    ).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Form version'), 'parental-v1');
    await user.click(save);
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    const insert = queries.consent_records.find((q) => q.calls[0][0] === 'insert');
    expect(insert.calls[0]).toEqual([
      'insert',
      { student_id: 's2', type: 'parental', instrument_version: 'parental-v1' },
    ]);
  });

  it('records a withdrawal on every granted record of that type', async () => {
    const { queries } = renderConsent();
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', { name: 'Record a withdrawal for Ana Reyes' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Record withdrawal' });
    await user.click(within(dialog).getByRole('radio', { name: 'Parental consent' }));
    await user.click(within(dialog).getByRole('checkbox'));
    await user.click(within(dialog).getByRole('button', { name: 'Record withdrawal' }));
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    const update = queries.consent_records.find((q) => q.calls[0][0] === 'update');
    expect(update.calls).toEqual([
      ['update', { status: 'withdrawn' }],
      ['eq', 'student_id', 's1'],
      ['eq', 'type', 'parental'],
      ['eq', 'status', 'granted'],
      ['select', 'id'],
    ]);
  });

  it('filters by category and searches by name', async () => {
    renderConsent();
    const user = userEvent.setup();
    await screen.findByRole('table');
    await user.click(screen.getByRole('radio', { name: 'Withdrawn' }));
    expect(screen.getByText('Paolo Diaz')).toBeInTheDocument();
    expect(screen.queryByText('Ana Reyes')).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'All' }));
    await user.type(screen.getByLabelText('Search by student name'), 'mig');
    expect(screen.getByText('Miguel Tan')).toBeInTheDocument();
    expect(screen.queryByText('Paolo Diaz')).not.toBeInTheDocument();
  });
});
