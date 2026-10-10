import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
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
const { resetCrisisReport } = await import('../crisis/crisisReport.js');

const UID = '11111111-1111-1111-1111-111111111111';
const CHECKIN_ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const ITEMS = [
  { id: 'aaaaaaa1-0000-4000-8000-000000000001', label: '[[GUIDANCE:crisis_item_1]]' },
  { id: 'aaaaaaa1-0000-4000-8000-000000000002', label: '[[GUIDANCE:crisis_item_2]]' },
];
const auth = () =>
  fakeAuth({ account: STUDENT_T2, session: { user: { id: UID, email: 'x@example.test' } } });

let queries;
function setupClient({
  checkin = { data: { id: CHECKIN_ID }, error: null },
  prompt = null,
  fnError = null,
  items = { data: ITEMS, error: null },
} = {}) {
  queries = { checkins: [], prompt_events: [], crisis_events: [], crisis_items: [] };
  const client = createMockSupabase();
  client.from.mockImplementation((table) => {
    const result =
      table === 'checkins'
        ? checkin
        : table === 'crisis_items'
          ? items
          : { data: null, error: null };
    const q = queryResult(result);
    queries[table].push(q);
    return q;
  });
  client.functions.invoke.mockResolvedValue(
    fnError ? { data: null, error: fnError } : { data: { prompt }, error: null },
  );
  mock.client = client;
  return client;
}

function renderPage(path = '/check-in') {
  return renderWithAuth(
    [
      <Route key="c" path="/check-in" element={<CheckInPage />} />,
      <Route key="x" path="/crisis" element={<p>crisis screen</p>} />,
      <Route key="r" path="/request" element={<RequestProbe />} />,
    ],
    { path, auth: auth() },
  );
}

function RequestProbe() {
  return <p>request screen</p>;
}

async function answerAll(
  user,
  picks = ['Not at all', 'Not at all', 'Not at all', 'Very much', 'Okay', 'A little'],
) {
  const groups = screen.getAllByRole('radiogroup');
  for (let i = 0; i < 6; i += 1) {
    await user.click(within(groups[i]).getByRole('radio', { name: picks[i] }));
  }
}

beforeEach(() => {
  clearDraft();
  resetCrisisReport();
});

describe('CheckInPage (Fig 11; 2.1.5.1.3)', () => {
  it('shows the six questions in order, the note, and the explicit crisis items from the database', async () => {
    setupClient();
    renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: 'How have things been?' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Private to your account • Staff cannot browse your check-ins'),
    ).toBeInTheDocument();
    const legends = screen.getAllByRole('radiogroup').map((g) => g.getAttribute('aria-labelledby'));
    expect(legends.map((id) => document.getElementById(id).textContent)).toEqual([
      '1. School work and academic pressure has been affecting me.',
      '2. Things at home, family, or money have been affecting me.',
      '3. Worries about graduating, college, or my future have been affecting me.',
      '4. I have been able to manage what I am carrying.',
      '5. How has your mood been today?',
      '6. How stressed have you felt today?',
    ]);
    expect(screen.getByText('Answer honestly. There is no right answer here.')).toBeInTheDocument();
    expect(screen.getByLabelText('Optional note')).toBeInTheDocument();
    expect(
      screen.getByText('This is stored as you write it. Nothing reads it or analyses it.'),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText('[[GUIDANCE:crisis_item_1]]')).not.toBeChecked();
    expect(queries.crisis_items[0].calls).toEqual([
      ['select', 'id, label'],
      ['eq', 'is_active', true],
      ['order', 'label', { ascending: true }],
    ]);
  });

  it('keeps Save disabled until all six are answered', async () => {
    setupClient();
    const user = userEvent.setup();
    renderPage();
    const save = screen.getByRole('button', { name: 'Save check-in' });
    expect(save).toBeDisabled();
    expect(
      screen.getByText('Answer questions 1 to 6 to save. The note is optional.'),
    ).toBeInTheDocument();
    await answerAll(user);
    expect(save).toBeEnabled();
  });

  it('writes stored values (C4 reversed), a null note when blank, then asks only for the prompt type', async () => {
    const client = setupClient({ prompt: null });
    const user = userEvent.setup();
    renderPage();
    await answerAll(user);
    await user.click(screen.getByRole('button', { name: 'Save check-in' }));
    expect(
      await screen.findByRole('heading', { name: 'Your check-in is saved' }),
    ).toBeInTheDocument();
    expect(queries.checkins[0].calls).toEqual([
      ['insert', { student_id: UID, note: null, c1: 1, c2: 1, c3: 1, c4: 1, mood: 3, stress: 2 }],
      ['select', 'id'],
      ['single'],
    ]);
    expect(client.functions.invoke).toHaveBeenCalledWith('evaluate-checkin', {
      body: { checkin_id: CHECKIN_ID },
    });
    expect(
      screen.getByText('Only you can see it. Nothing was sent to the guidance office.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stores the note exactly as written', async () => {
    setupClient();
    const user = userEvent.setup();
    renderPage();
    await answerAll(user);
    await user.type(screen.getByLabelText('Optional note'), '  my own words  ');
    await user.click(screen.getByRole('button', { name: 'Save check-in' }));
    await screen.findByRole('heading', { name: 'Your check-in is saved' });
    expect(queries.checkins[0].calls[0][1].note).toBe('  my own words  ');
  });

  it('on a failed save says so, shows no success, and keeps the answers', async () => {
    setupClient({ checkin: { data: null, error: { message: 'x' } } });
    const user = userEvent.setup();
    renderPage();
    await answerAll(user);
    await user.click(screen.getByRole('button', { name: 'Save check-in' }));
    expect(
      await screen.findByText(
        'Your check-in was not saved. Check your connection and try again. Your answers are still here.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Your check-in is saved')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Okay' })).toHaveAttribute('aria-checked', 'true');
    expect(mock.client.functions.invoke).not.toHaveBeenCalled();
  });

  it('shows the saved state (no prompt) when the prompt check cannot run', async () => {
    setupClient({ fnError: { message: 'down' } });
    const user = userEvent.setup();
    renderPage();
    await answerAll(user);
    await user.click(screen.getByRole('button', { name: 'Save check-in' }));
    expect(
      await screen.findByRole('heading', { name: 'Your check-in is saved' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Ask the guidance office for support' }),
    ).toHaveAttribute('href', '/request');
  });
});

describe('Prompt dialog (Fig 15; 2.1.5.1.7; D-13)', () => {
  it('asks with two equal buttons and cannot be closed any other way', async () => {
    setupClient({ prompt: 'max_sev' });
    const user = userEvent.setup();
    renderPage();
    await answerAll(user);
    await user.click(screen.getByRole('button', { name: 'Save check-in' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Would you like to send this to the guidance office?',
    });
    expect(
      within(dialog).getByRole('button', { name: 'Continue to send a request' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Not now' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'If you choose Not now, nobody is told. Only you can see that you chose it.',
      ),
    ).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(dialog.textContent).not.toMatch(/score|priority|max_sev|gray/i);
  });

  it('Not now records an owner-only dismissal, then shows the saved state', async () => {
    setupClient({ prompt: 'gray_zone' });
    const user = userEvent.setup();
    renderPage();
    await answerAll(user);
    await user.click(screen.getByRole('button', { name: 'Save check-in' }));
    await user.click(await screen.findByRole('button', { name: 'Not now' }));
    expect(
      await screen.findByRole('heading', { name: 'Your check-in is saved' }),
    ).toBeInTheDocument();
    expect(queries.prompt_events[0].calls).toEqual([
      [
        'insert',
        { student_id: UID, checkin_id: CHECKIN_ID, type: 'gray_zone', outcome: 'dismissed' },
      ],
    ]);
  });

  it('Continue opens the request screen and sends nothing by itself', async () => {
    setupClient({ prompt: 'max_sev' });
    const user = userEvent.setup();
    renderPage();
    await answerAll(user);
    await user.click(screen.getByRole('button', { name: 'Save check-in' }));
    await user.click(await screen.findByRole('button', { name: 'Continue to send a request' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/request');
    expect(queries.prompt_events).toHaveLength(0);
  });
});

describe('Crisis items (2.1.6.1.6; Table 11)', () => {
  it('opens the crisis screen at once and sends only student_id and trigger_item_id', async () => {
    setupClient();
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByLabelText('[[GUIDANCE:crisis_item_2]]'));
    expect(screen.getByTestId('location')).toHaveTextContent('/crisis');
    await waitFor(() => expect(queries.crisis_events).toHaveLength(1));
    expect(queries.crisis_events[0].calls).toEqual([
      ['insert', { student_id: UID, trigger_item_id: ITEMS[1].id }],
    ]);
  });

  it('keeps the answers and the ticked item when the student comes back', async () => {
    setupClient();
    const user = userEvent.setup();
    const first = renderPage();
    await user.click(
      within(screen.getAllByRole('radiogroup')[1]).getByRole('radio', { name: 'Quite a lot' }),
    );
    await user.type(screen.getByLabelText('Optional note'), 'draft');
    await user.click(await screen.findByLabelText('[[GUIDANCE:crisis_item_1]]'));
    first.unmount();
    renderPage();
    expect(
      within(screen.getAllByRole('radiogroup')[1]).getByRole('radio', { name: 'Quite a lot' }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText('Optional note')).toHaveValue('draft');
    const box = await screen.findByLabelText('[[GUIDANCE:crisis_item_1]]');
    expect(box).toBeChecked();
    expect(box).toBeDisabled();
  });

  it('when the items cannot load, points to Where to get help', async () => {
    setupClient({ items: { data: null, error: { message: 'x' } } });
    renderPage();
    expect(await screen.findByText('These could not load.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Where to get help' })).toHaveAttribute(
      'href',
      '/help',
    );
  });
});
