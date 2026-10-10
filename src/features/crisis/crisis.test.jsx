import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { renderWithAuth, fakeAuth, STUDENT_T2 } from '../../test/renderWithAuth.jsx';
import { createMockSupabase, queryResult } from '../../test/mockSupabase.js';
import { crisisCopy } from '../../copy/en/checkin.js';
import { ceb } from '../../copy/ceb.js';
import { tl } from '../../copy/tl.js';
import { HOTLINES, GUIDANCE_OFFICE, emergencyHotline } from '../../content/directory.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { CrisisPage } = await import('./CrisisPage.jsx');
const report = await import('./crisisReport.js');

const UID = '11111111-1111-1111-1111-111111111111';
const ITEM = 'aaaaaaa1-0000-4000-8000-000000000001';
const auth = () =>
  fakeAuth({ account: STUDENT_T2, session: { user: { id: UID, email: 'x@example.test' } } });
const renderCrisis = () =>
  renderWithAuth(<Route path="/crisis" element={<CrisisPage />} />, {
    path: '/crisis',
    auth: auth(),
  });

let inserts;
function client(results) {
  inserts = [];
  const c = createMockSupabase();
  c.from.mockImplementation(() => {
    const q = queryResult(results.length > 1 ? results.shift() : results[0]);
    inserts.push(q);
    return q;
  });
  mock.client = c;
  return c;
}

beforeEach(() => {
  report.resetCrisisReport();
});

describe('translation files: crisis keys (00 Section 10.2)', () => {
  it('ceb and tl have exactly the English crisis keys, all as team placeholders', () => {
    const keys = Object.keys(crisisCopy).sort();
    expect(Object.keys(ceb.crisis).sort()).toEqual(keys);
    expect(Object.keys(tl.crisis).sort()).toEqual(keys);
    for (const k of keys) {
      expect(ceb.crisis[k]).toBe(`[[TEAM:CEB:crisis.${k}]]`);
      expect(tl.crisis[k]).toBe(`[[TEAM:TL:crisis.${k}]]`);
    }
  });
});

describe('CrisisPage (Fig 18; 2.1.6.1.6; 2.1.6.4.6)', () => {
  it('renders hotlines, the office, and the notice from the bundle with no server call', () => {
    const c = client([{ data: null, error: null }]);
    renderCrisis();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Help is available right now' }),
    ).toHaveFocus();
    expect(screen.getByText(/This service is not for emergencies/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: emergencyHotline().number })).toHaveAttribute(
      'href',
      `tel:${emergencyHotline().dial}`,
    );
    for (const h of HOTLINES) {
      expect(screen.getByRole('link', { name: `Call ${h.name} at ${h.number}` })).toHaveAttribute(
        'href',
        `tel:${h.dial}`,
      );
    }
    expect(
      screen.getByRole('link', { name: `Call the guidance office at ${GUIDANCE_OFFICE.phone}` }),
    ).toHaveAttribute('href', `tel:${GUIDANCE_OFFICE.dial}`);
    expect(screen.getByRole('link', { name: 'Back to my check-in' })).toHaveAttribute(
      'href',
      '/check-in',
    );
    expect(c.from).not.toHaveBeenCalled();
    expect(c.rpc).not.toHaveBeenCalled();
    // Opened directly (nothing ticked in this page session): no claim that the office was told.
    expect(screen.queryByText('What happens next')).not.toBeInTheDocument();
  });

  it('switches every crisis text to Bisaya or Tagalog (team placeholders until filled)', async () => {
    client([{ data: null, error: null }]);
    const user = userEvent.setup();
    const { container } = renderCrisis();
    await user.click(screen.getByRole('radio', { name: 'Bisaya' }));
    expect(
      screen.getByRole('heading', { level: 1, name: '[[TEAM:CEB:crisis.title]]' }),
    ).toBeInTheDocument();
    expect(container.querySelector('[lang="ceb"]')).not.toBeNull();
    await user.click(screen.getByRole('radio', { name: 'Tagalog' }));
    expect(screen.getByText('[[TEAM:TL:crisis.lead]]')).toBeInTheDocument();
  });

  it('after a tick, says what happens next and when the office has been told', async () => {
    client([{ data: null, error: null }]);
    renderCrisis();
    await act(async () => report.reportCrisisItem(UID, ITEM));
    expect(screen.getByText('What happens next')).toBeInTheDocument();
    expect(await screen.findByText('The guidance office has been told.')).toBeInTheDocument();
  });
});

describe('crisisReport (Table 11; 2.1.6.4.7)', () => {
  afterEach(() => vi.useRealTimers());

  it('inserts once per item with only student_id and trigger_item_id', async () => {
    client([{ data: null, error: null }]);
    report.reportCrisisItem(UID, ITEM);
    report.reportCrisisItem(UID, ITEM);
    await vi.waitFor(() => expect(report.getCrisisReport().status).toBe('sent'));
    expect(inserts).toHaveLength(1);
    expect(inserts[0].calls).toEqual([['insert', { student_id: UID, trigger_item_id: ITEM }]]);
  });

  it('retries a temporary failure until it is saved', async () => {
    vi.useFakeTimers();
    client([
      { data: null, error: { code: '', message: 'Failed to fetch' } },
      { data: null, error: null },
    ]);
    report.reportCrisisItem(UID, ITEM);
    await vi.waitFor(() => expect(report.getCrisisReport().status).toBe('retrying'));
    await vi.advanceTimersByTimeAsync(report.RETRY_DELAYS[0]);
    await vi.waitFor(() => expect(report.getCrisisReport().status).toBe('sent'));
    expect(inserts).toHaveLength(2);
  });

  it('waits for the network to come back when offline', async () => {
    client([
      { data: null, error: { code: '', message: 'Failed to fetch' } },
      { data: null, error: null },
    ]);
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    report.reportCrisisItem(UID, ITEM);
    await vi.waitFor(() => expect(report.getCrisisReport().status).toBe('offline'));
    online.mockReturnValue(true);
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(report.getCrisisReport().status).toBe('sent'));
    online.mockRestore();
  });

  it('stops and says so when the item can never be saved (retired item)', async () => {
    client([{ data: null, error: { code: '23514', message: 'retired' } }]);
    report.reportCrisisItem(UID, ITEM);
    await vi.waitFor(() => expect(report.getCrisisReport().status).toBe('failed'));
    expect(inserts).toHaveLength(1);
  });

  it('never shows one student the report of another', () => {
    client([{ data: null, error: null }]);
    report.reportCrisisItem(UID, ITEM);
    expect(report.getCrisisReport().owner).toBe(UID);
    report.reportCrisisItem('22222222-2222-2222-2222-222222222222', ITEM);
    expect(report.getCrisisReport().owner).toBe('22222222-2222-2222-2222-222222222222');
    expect(report.getCrisisReport().sent).toEqual([]);
  });
});
