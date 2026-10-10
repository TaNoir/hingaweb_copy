import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { renderWithAuth, fakeAuth, STUDENT_T2 } from '../../test/renderWithAuth.jsx';
import { createMockSupabase, queryResult } from '../../test/mockSupabase.js';
import { ANSWER_SCALE } from '../../config/vocabulary.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { TrendsPage } = await import('./TrendsPage.jsx');
const { TrendChart } = await import('./TrendChart.jsx');
const { rangeStart } = await import('./chartDates.js');

const UID = '11111111-1111-1111-1111-111111111111';
const auth = () =>
  fakeAuth({ account: STUDENT_T2, session: { user: { id: UID, email: 'x@example.test' } } });
const ROWS = [
  { created_at: '2026-10-01T01:00:00Z', c1: 2, c2: 3, c3: 4, c4: 1, mood: 2, stress: 4 },
  { created_at: '2026-10-05T01:00:00Z', c1: 4, c2: 3, c3: 2, c4: 5, mood: 4, stress: 2 },
];

let queries;
function setup(results) {
  queries = [];
  const c = createMockSupabase();
  c.from.mockImplementation(() => {
    const q = queryResult(results.length > 1 ? results.shift() : results[0]);
    queries.push(q);
    return q;
  });
  mock.client = c;
}
const renderPage = () =>
  renderWithAuth(<Route path="/trends" element={<TrendsPage />} />, {
    path: '/trends',
    auth: auth(),
  });

beforeEach(() => setup([{ data: ROWS, error: null }]));

describe('TrendsPage (Fig 12; 2.1.5.1.4)', () => {
  it('reads only the student’s own answers, never the note, last 30 days by default', async () => {
    renderPage();
    await screen.findByText('Each area, over time');
    const calls = queries[0].calls;
    expect(calls[0]).toEqual(['select', 'created_at, c1, c2, c3, c4, mood, stress']);
    expect(calls[1]).toEqual(['eq', 'student_id', UID]);
    expect(calls[2][0]).toBe('gte');
    expect(calls.slice(3)).toEqual([
      ['order', 'created_at', { ascending: true }],
      ['limit', 1000],
    ]);
    expect(JSON.stringify(calls)).not.toContain('note');
  });

  it('draws six separate charts: Mood, Stress, and the four areas', async () => {
    renderPage();
    const figures = await screen.findAllByRole('figure');
    expect(
      figures.map((f) => within(f).getByText(/./, { selector: 'figcaption' }).textContent),
    ).toEqual(['Mood', 'Stress', 'School work', 'Home and family', 'Future', 'Managing']);
    expect(screen.getAllByTestId('trend-point')).toHaveLength(12);
  });

  it('has no computed summary phrases (D-25)', async () => {
    const { container } = renderPage();
    await screen.findByText('Each area, over time');
    const text = container.textContent.replace(screen.getByTestId('location').textContent, '');
    expect(text).not.toMatch(
      /heavier|lighter|steady|same as|average|trend|improv|worse|better|score|risk/i,
    );
  });

  it('the table shows Managing as tapped (D-09): stored 1 is "Very much"', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Show my answers as a table' }));
    const table = screen.getByRole('table', { name: 'Your answers on each check-in' });
    const firstRow = within(table).getAllByRole('row')[1];
    const cells = within(firstRow)
      .getAllByRole('cell')
      .map((c) => c.textContent);
    expect(cells).toEqual([
      '1 Oct 2026',
      'Low',
      'Quite a lot',
      'A little',
      'Somewhat',
      'Quite a lot',
      'Very much',
    ]);
  });

  it('changing the range reloads; All time has no date filter', async () => {
    setup([{ data: ROWS, error: null }]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Each area, over time');
    await user.click(screen.getByRole('radio', { name: 'All time' }));
    await screen.findByText('Each area, over time');
    const last = queries[queries.length - 1].calls;
    expect(last.some((c) => c[0] === 'gte')).toBe(false);
  });

  it('empty in a range offers All time; empty overall offers a check-in', async () => {
    setup([{ data: [], error: null }]);
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('No check-ins in this time range')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show all time' }));
    expect(await screen.findByText('No check-ins yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start a check-in' })).toHaveAttribute(
      'href',
      '/check-in',
    );
  });

  it('shows the error state with Try again', async () => {
    setup([
      { data: null, error: { message: 'x' } },
      { data: ROWS, error: null },
    ]);
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Each area, over time')).toBeInTheDocument();
  });

  it('links to the support request, with no scheduling promise (D-20)', async () => {
    renderPage();
    expect(
      screen.getByRole('link', { name: 'Ask the guidance office for support' }),
    ).toHaveAttribute('href', '/request');
    expect(document.body.textContent).not.toMatch(/scheduled|session/i);
  });
});

describe('TrendChart', () => {
  const points = [
    { at: '2026-10-01T01:00:00Z', value: 1 },
    { at: '2026-10-08T01:00:00Z', value: 5 },
  ];

  it('labels the y axis with the answer scale and describes itself for screen readers', () => {
    render(<TrendChart title="School work" levels={ANSWER_SCALE} points={points} />);
    for (const l of ANSWER_SCALE) expect(screen.getByText(l.label)).toBeInTheDocument();
    const img = screen.getByRole('img', { name: 'School work' });
    expect(img).toHaveAccessibleDescription(
      'School work: 2 check-ins from 1 Oct to 8 Oct. Every answer is in the table below the charts.',
    );
  });

  it('a single check-in is one marker and no line', () => {
    const { container } = render(
      <TrendChart title="Mood" levels={ANSWER_SCALE} points={[points[0]]} />,
    );
    expect(container.querySelector('polyline')).toBeNull();
    expect(screen.getAllByTestId('trend-point')).toHaveLength(1);
  });

  it('hover shows the date and the answer in words', () => {
    render(<TrendChart title="Future" levels={ANSWER_SCALE} points={points} />);
    const svg = screen.getByRole('img', { name: 'Future' });
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 320, height: 196 });
    fireEvent.pointerMove(svg, { clientX: 310, clientY: 50 });
    expect(screen.getByTestId('trend-tooltip')).toHaveTextContent('8 Oct: Very much');
    fireEvent.pointerLeave(svg);
    expect(screen.queryByTestId('trend-tooltip')).toBeNull();
  });
});

describe('rangeStart', () => {
  it('is 30 days, 3 months, or nothing', () => {
    const now = new Date('2026-10-10T00:00:00Z');
    expect(rangeStart('days30', now)).toBe('2026-09-10T00:00:00.000Z');
    expect(rangeStart('months3', now)).toBe('2026-07-10T00:00:00.000Z');
    expect(rangeStart('all', now)).toBeNull();
  });
});
