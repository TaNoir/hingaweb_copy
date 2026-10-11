// ui-students item 9: closing or reloading the tab with an unsaved check-in asks first.
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
const { CheckInPage } = await import('./CheckInPage.jsx');
const { clearDraft } = await import('./checkinDraft.js');

const UID = '11111111-1111-1111-1111-111111111111';
const ITEM = { id: 'aaaaaaa1-0000-4000-8000-000000000001', label: '[[GUIDANCE:crisis_item_1]]' };

function setup() {
  const client = createMockSupabase();
  client.from.mockImplementation((table) =>
    queryResult(
      table === 'checkins'
        ? { data: { id: '0f8fad5b-d9cb-469f-a165-70867728950e' }, error: null }
        : table === 'crisis_items'
          ? { data: [ITEM], error: null }
          : { data: null, error: null },
    ),
  );
  client.functions.invoke.mockResolvedValue({ data: { prompt: null }, error: null });
  mock.client = client;
  renderWithAuth(
    [
      <Route key="c" path="/check-in" element={<CheckInPage />} />,
      <Route key="x" path="/crisis" element={<p>crisis screen</p>} />,
    ],
    {
      path: '/check-in',
      auth: fakeAuth({
        account: STUDENT_T2,
        session: { user: { id: UID, email: 'x@example.test' } },
      }),
    },
  );
}

/** True when the page asked the browser to confirm leaving. */
function leaving() {
  const e = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(e);
  return e.defaultPrevented;
}

beforeEach(() => clearDraft());

describe('unsaved check-in warning', () => {
  it('does not ask while nothing is answered or written', () => {
    setup();
    expect(leaving()).toBe(false);
  });

  it('asks once there is an answer or note text, and stops once saved', async () => {
    const user = userEvent.setup();
    setup();
    for (let i = 0; i < 6; i += 1) await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByLabelText('Optional note'), 'x');
    expect(leaving()).toBe(true);
    for (let i = 0; i < 6; i += 1) await user.click(screen.getByRole('button', { name: 'Back' }));
    const picks = ['Not at all', 'Not at all', 'Not at all', 'Very much', 'Okay', 'A little'];
    for (let i = 0; i < 6; i += 1) {
      await user.click(
        within(screen.getByRole('radiogroup')).getByRole('radio', { name: picks[i] }),
      );
      await user.click(screen.getByRole('button', { name: 'Next' }));
    }
    await user.click(screen.getByRole('button', { name: 'Save check-in' }));
    await screen.findByRole('heading', { name: 'Your check-in is saved' });
    expect(leaving()).toBe(false);
    // About 26 clicks through the one-question-per-screen steps; 5 s was too tight under load.
  }, 15000);

  it('ticking a safety item moves to /crisis in the app without unloading the page', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(
      within(screen.getByRole('radiogroup')).getByRole('radio', { name: 'Somewhat' }),
    );
    const unload = vi.fn();
    window.addEventListener('beforeunload', unload);
    await user.click(await screen.findByLabelText(ITEM.label));
    expect(await screen.findByText('crisis screen')).toBeInTheDocument();
    expect(unload).not.toHaveBeenCalled();
    window.removeEventListener('beforeunload', unload);
  });
});
