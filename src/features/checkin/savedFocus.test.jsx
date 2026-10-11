// ui-students item 11: after a check-in is saved, focus moves to the "saved" heading.
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

function setup(prompt = null) {
  const client = createMockSupabase();
  client.from.mockImplementation((table) =>
    queryResult(
      table === 'checkins'
        ? { data: { id: '0f8fad5b-d9cb-469f-a165-70867728950e' }, error: null }
        : { data: table === 'crisis_items' ? [] : null, error: null },
    ),
  );
  client.functions.invoke.mockResolvedValue({ data: { prompt }, error: null });
  mock.client = client;
  renderWithAuth(<Route path="/check-in" element={<CheckInPage />} />, {
    path: '/check-in',
    auth: fakeAuth({
      account: STUDENT_T2,
      session: { user: { id: '11111111-1111-1111-1111-111111111111', email: 'x@example.test' } },
    }),
  });
}

async function answerAndSave(user) {
  const picks = ['Not at all', 'Not at all', 'Not at all', 'Very much', 'Okay', 'A little'];
  for (let i = 0; i < 6; i += 1) {
    await user.click(within(screen.getByRole('radiogroup')).getByRole('radio', { name: picks[i] }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
  }
  await user.click(screen.getByRole('button', { name: 'Save check-in' }));
}

beforeEach(() => clearDraft());

describe('focus after saving a check-in', () => {
  it('moves to "Your check-in is saved"', async () => {
    const user = userEvent.setup();
    setup();
    await answerAndSave(user);
    expect(await screen.findByRole('heading', { name: 'Your check-in is saved' })).toHaveFocus();
  });

  it('also after "Not now" on the prompt', async () => {
    const user = userEvent.setup();
    setup('gray_zone');
    await answerAndSave(user);
    await user.click(await screen.findByRole('button', { name: 'Not now' }));
    expect(await screen.findByRole('heading', { name: 'Your check-in is saved' })).toHaveFocus();
  });
});
