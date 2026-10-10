import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, screen, within } from '@testing-library/react';
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
const { RequestPage, SEND_TIMEOUT_MS } = await import('./RequestPage.jsx');
const { RequestSentPage } = await import('./RequestSentPage.jsx');

const UID = '11111111-1111-1111-1111-111111111111';
const CID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const RID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const CHECKIN = { id: CID, created_at: '2026-10-09T01:00:00Z', c1: 2, c2: 1, c3: 3, c4: 1 };
const auth = () =>
  fakeAuth({ account: STUDENT_T2, session: { user: { id: UID, email: 'x@example.test' } } });

let queries;
function setup({
  checkin = CHECKIN,
  invoke = [{ data: { request_id: RID, created_at: '2026-10-12T01:00:00Z' }, error: null }],
} = {}) {
  queries = { checkins: [], prompt_events: [] };
  const c = createMockSupabase();
  c.from.mockImplementation((table) => {
    const q = queryResult(
      table === 'checkins' ? { data: checkin, error: null } : { data: null, error: null },
    );
    queries[table].push(q);
    return q;
  });
  for (const r of invoke) c.functions.invoke.mockResolvedValueOnce(r);
  mock.client = c;
  return c;
}

function renderPage(state) {
  return renderWithAuth(
    [
      <Route key="r" path="/request" element={<RequestPage />} />,
      <Route key="s" path="/request/sent" element={<RequestSentPage />} />,
    ],
    { path: '/request', auth: auth(), state },
  );
}

async function fill(user, { concern = 'School work', note = '' } = {}) {
  await user.selectOptions(screen.getByLabelText('What is this mostly about?'), concern);
  if (note) await user.type(screen.getByLabelText(/Is there anything you want them to know/), note);
  await user.click(screen.getByRole('checkbox'));
}

beforeEach(() => vi.useRealTimers());

describe('RequestPage (Fig 16; 2.1.5.1.6; D-10, D-11)', () => {
  it('shows the real values that will be shared, including the four latest answers as tapped', async () => {
    setup();
    renderPage();
    const will = (
      await screen.findByRole('heading', { name: 'What the guidance office will see' })
    ).closest('section');
    expect(within(will).getByText('Ana Reyes')).toBeInTheDocument();
    expect(within(will).getByText('Grade 12')).toBeInTheDocument();
    expect(within(will).getByText('HUMSS-A')).toBeInTheDocument();
    expect(within(will).getByText('Mr. Ramon Cruz')).toBeInTheDocument();
    expect(
      within(will).getByText('Your four answers from your latest check-in on 9 Oct 2026'),
    ).toBeInTheDocument();
    const answers = within(will)
      .getAllByRole('listitem')
      .slice(0, 4)
      .map((li) => li.textContent);
    expect(answers).toEqual([
      'School work and academic pressure has been affecting me. A little',
      'Things at home, family, or money have been affecting me. Not at all',
      'Worries about graduating, college, or my future have been affecting me. Somewhat',
      'I have been able to manage what I am carrying. Very much',
    ]);
    expect(queries.checkins[0].calls[0]).toEqual(['select', 'id, created_at, c1, c2, c3, c4']);
    expect(
      screen.getByText(
        /I understand that my name, grade level, section, class adviser, my four latest check-in answers/,
      ),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/priority|score|P1|P2|P3|scheduled|counselor/i);
  });

  it('says no answers are shared when there is no check-in', async () => {
    setup({ checkin: null });
    renderPage();
    expect(
      await screen.findByText('You have no check-in yet, so no answers are shared.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/the kind of concern, and my note will be shared/)).toBeInTheDocument();
  });

  it('cannot send until a concern is chosen and the box is ticked', async () => {
    setup();
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ana Reyes');
    const send = screen.getByRole('button', { name: 'Send request' });
    expect(send).toBeDisabled();
    await user.selectOptions(
      screen.getByLabelText('What is this mostly about?'),
      "Something else about how I'm doing",
    );
    expect(send).toBeDisabled();
    await user.click(screen.getByRole('checkbox'));
    expect(send).toBeEnabled();
  });

  it('sends the shown check-in id, concern, and note exactly as typed; success only after the server answers', async () => {
    const c = setup();
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ana Reyes');
    await fill(user, { note: '  please talk to me  ' });
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    expect(
      await screen.findByRole('heading', { name: 'Your request was sent' }),
    ).toBeInTheDocument();
    expect(c.functions.invoke).toHaveBeenCalledWith('submit-support-request', {
      body: { checkin_id: CID, concern_type: 'academic', note: '  please talk to me  ' },
    });
    expect(screen.getByText(/^Ref 7c9e6679 • Sent/)).toBeInTheDocument();
    expect(queries.prompt_events).toHaveLength(0);
  });

  it('records request_sent for the prompt that led here (Table 19)', async () => {
    setup();
    const user = userEvent.setup();
    renderPage({ promptCheckinId: CID, promptType: 'max_sev' });
    await screen.findByText('Ana Reyes');
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    await screen.findByRole('heading', { name: 'Your request was sent' });
    expect(queries.prompt_events[0].calls).toEqual([
      ['insert', { student_id: UID, checkin_id: CID, type: 'max_sev', outcome: 'request_sent' }],
    ]);
  });

  it('on failure says nothing was sent, keeps the note, and retries (Fig 17; 2.1.6.4.5)', async () => {
    const c = setup({
      invoke: [
        { data: null, error: { context: { status: 500 } } },
        { data: { request_id: RID, created_at: '2026-10-12T01:00:00Z' }, error: null },
      ],
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ana Reyes');
    await fill(user, { note: 'keep me' });
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    expect(
      await screen.findByText('We could not send your request. Nothing was sent.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Is there anything you want them to know/)).toHaveValue('keep me');
    expect(screen.queryByText('Your request was sent')).not.toBeInTheDocument();
    expect(screen.getByText('Need help right now?')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Try sending again' })[0]);
    expect(
      await screen.findByRole('heading', { name: 'Your request was sent' }),
    ).toBeInTheDocument();
    expect(c.functions.invoke).toHaveBeenCalledTimes(2);
  });

  it('a stale check-in reloads what will be shared and asks for the tick again', async () => {
    setup({ invoke: [{ data: null, error: { context: { status: 409 } } }] });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ana Reyes');
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    expect(
      await screen.findByText(/Your latest check-in changed since this page opened/),
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(queries.checkins).toHaveLength(2);
  });

  it('a send that never answers becomes a failure, not a success', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const c = setup({ invoke: [] });
    c.functions.invoke.mockReturnValueOnce(new Promise(() => {}));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await screen.findByText('Ana Reyes');
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SEND_TIMEOUT_MS + 10);
    });
    expect(
      screen.getByText('We could not send your request. Nothing was sent.'),
    ).toBeInTheDocument();
  });
});

describe('RequestSentPage', () => {
  afterEach(() => vi.useRealTimers());
  it('opened directly, goes back to /request', () => {
    setup();
    renderWithAuth(
      [
        <Route key="s" path="/request/sent" element={<RequestSentPage />} />,
        <Route key="r" path="/request" element={<p>request form</p>} />,
      ],
      { path: '/request/sent', auth: auth() },
    );
    expect(screen.getByText('request form')).toBeInTheDocument();
  });
});
