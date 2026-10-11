import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { renderWithAuth, fakeAuth, STUDENT_T2 } from '../../test/renderWithAuth.jsx';
import { createMockSupabase, queryResult } from '../../test/mockSupabase.js';
import { HOTLINES } from '../../content/directory.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { LandingPage } = await import('./LandingPage.jsx');
const { GuidesPage } = await import('./GuidesPage.jsx');
const { HelpPage } = await import('./HelpPage.jsx');

const RESOURCES = [
  {
    id: 'r1',
    title: 'Managing exam pressure',
    url: 'https://example.org/a',
    attributes: { school_work: 5, home_family: 1, future: 1, managing: 2 },
  },
  {
    id: 'r2',
    title: 'Talking to family about money worries',
    url: 'https://example.org/b',
    attributes: { school_work: 0, home_family: 5, future: 1, managing: 1 },
  },
  {
    id: 'r3',
    title: 'Thinking about life after senior high',
    url: 'https://example.org/c',
    attributes: { school_work: 1, home_family: 1, future: 5, managing: 0 },
  },
];

describe('LandingPage (Fig 7)', () => {
  beforeEach(() => {
    mock.client = createMockSupabase();
  });

  it('shows the hero, the hotlines, and published guides', async () => {
    const q = queryResult({ data: RESOURCES, error: null });
    mock.client.from.mockReturnValue(q);
    renderWithAuth(<Route path="/" element={<LandingPage />} />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'A private place to check in with yourself.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /It is not a diagnosis and it is not a replacement for talking to someone\./,
      ),
    ).toBeInTheDocument();
    // ui-landing-v2: the hotline card is now the "If you need help right now" section (it also
    // links to Request a talk, so only the Call links are counted).
    const help = screen.getByRole('complementary', { name: 'If you need help right now' });
    expect(
      within(help)
        .getAllByRole('link')
        .filter((a) => a.getAttribute('href').startsWith('tel:')),
    ).toHaveLength(HOTLINES.length);
    expect(
      await screen.findByRole('heading', { name: 'Managing exam pressure' }),
    ).toBeInTheDocument();
    expect(mock.client.from).toHaveBeenCalledWith('resources');
    expect(q.calls[0]).toEqual(['select', 'id, title, url, attributes']);
  });

  it('still shows the hotlines when the guides cannot load', async () => {
    mock.client.from.mockReturnValue(queryResult({ data: null, error: { message: 'offline' } }));
    renderWithAuth(<Route path="/" element={<LandingPage />} />);
    expect(await screen.findByText('Something went wrong.')).toBeInTheDocument();
    expect(
      screen.getByRole('complementary', { name: 'If you need help right now' }),
    ).toBeInTheDocument();
  });

  it('has no 30-second demo check-in and no free-text box (D-19)', async () => {
    mock.client.from.mockReturnValue(queryResult({ data: [], error: null }));
    renderWithAuth(<Route path="/" element={<LandingPage />} />);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByText(/30-second/i)).toBeNull();
    expect(await screen.findByText('No guides yet')).toBeInTheDocument();
  });
});

describe('GuidesPage', () => {
  beforeEach(() => {
    mock.client = createMockSupabase();
    mock.client.from.mockReturnValue(queryResult({ data: RESOURCES, error: null }));
  });

  it('filters guides by area', async () => {
    renderWithAuth(<Route path="/guides" element={<GuidesPage />} />, { path: '/guides' });
    expect(await screen.findAllByRole('article')).toHaveLength(3);
    await userEvent.click(screen.getByRole('radio', { name: 'Future' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(
      screen.getByRole('heading', { name: 'Thinking about life after senior high' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Managing' }));
    expect(screen.getByText('No guides in this area yet')).toBeInTheDocument();
  });

  it('opens guides in a new tab without sending the referrer', async () => {
    renderWithAuth(<Route path="/guides" element={<GuidesPage />} />, { path: '/guides' });
    const link = (await screen.findAllByRole('link', { name: /Read guide/ }))[0];
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('points a Tier 2 student to their matched resources', async () => {
    renderWithAuth(<Route path="/guides" element={<GuidesPage />} />, {
      path: '/guides',
      auth: fakeAuth({ account: STUDENT_T2 }),
    });
    expect(screen.getByRole('link', { name: 'Go to Resources' })).toHaveAttribute(
      'href',
      '/resources',
    );
  });
});

describe('HelpPage (Fig 14, 2.1.5.1.8)', () => {
  it('shows all four referral targets and the not-for-emergencies notice, with no network call', () => {
    mock.client = createMockSupabase();
    renderWithAuth(<Route path="/help" element={<HelpPage />} />, { path: '/help' });
    expect(
      screen.getByRole('heading', { name: 'Your school guidance office' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Institute of Psychiatric and Behavioral Medicine' }),
    ).toBeInTheDocument();
    expect(screen.getByText('External professionals')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Crisis hotlines, available 24 hours' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/HingaWeb is not for emergencies\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Send a support request/ })).toHaveAttribute(
      'href',
      '/request',
    );
    expect(mock.client.from).not.toHaveBeenCalled();
    expect(mock.client.rpc).not.toHaveBeenCalled();
  });

  it('renders hotline dial links from the static directory', () => {
    mock.client = createMockSupabase();
    renderWithAuth(<Route path="/help" element={<HelpPage />} />, { path: '/help' });
    for (const h of HOTLINES) {
      expect(
        screen.getAllByRole('link', { name: `Call ${h.name} at ${h.number}` })[0],
      ).toHaveAttribute('href', `tel:${h.dial}`);
    }
  });
});
