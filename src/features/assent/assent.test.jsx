import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import {
  renderWithAuth,
  fakeAuth,
  STUDENT_NO_ASSENT,
  STUDENT_NO_PARENT,
  STUDENT_T2,
} from '../../test/renderWithAuth.jsx';
import { createMockSupabase, queryResult } from '../../test/mockSupabase.js';
import { assentCopy } from '../../copy/en/assent.js';
import { ceb } from '../../copy/ceb.js';
import { tl } from '../../copy/tl.js';

const mock = vi.hoisted(() => ({ client: null }));
vi.mock('../../lib/supabase.js', () => ({
  get supabase() {
    return mock.client;
  },
}));
const { AssentPage } = await import('./AssentPage.jsx');
const { WaitingForConsentPage } = await import('./WaitingForConsentPage.jsx');

const studentAuth = (account, more = {}) =>
  fakeAuth({
    account,
    session: { user: { id: '22222222-2222-4222-8222-222222222222', email: 'x@example.test' } },
    ...more,
  });

describe('translation files (00 Section 10.2)', () => {
  it('ceb and tl have exactly the English assent keys, all as team placeholders', () => {
    const keys = Object.keys(assentCopy).sort();
    expect(Object.keys(ceb.assent).sort()).toEqual(keys);
    expect(Object.keys(tl.assent).sort()).toEqual(keys);
    for (const k of keys) {
      expect(ceb.assent[k]).toBe(`[[TEAM:CEB:assent.${k}]]`);
      expect(tl.assent[k]).toBe(`[[TEAM:TL:assent.${k}]]`);
    }
  });
});

describe('AssentPage (Fig 10, 2.1.5.1.1)', () => {
  beforeEach(() => {
    mock.client = createMockSupabase();
  });

  it('states the limits of confidentiality before anything is written', () => {
    renderWithAuth(<Route path="/welcome" element={<AssentPage />} />, {
      path: '/welcome',
      auth: studentAuth(STUDENT_NO_ASSENT),
    });
    expect(
      screen.getByRole('heading', { level: 1, name: 'What we keep private, and what we cannot' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your check-ins are yours.' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'You decide when to ask for help.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'One thing we must act on.' })).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('keeps Continue disabled until the student ticks the box', async () => {
    renderWithAuth(<Route path="/welcome" element={<AssentPage />} />, {
      path: '/welcome',
      auth: studentAuth(STUDENT_NO_ASSENT),
    });
    const btn = screen.getByRole('button', { name: 'Continue' });
    expect(btn).toBeDisabled();
    await userEvent.click(screen.getByLabelText('I have read this and I understand.'));
    expect(btn).toBeEnabled();
  });

  it('switches language to the team-written text (placeholders until filled)', async () => {
    renderWithAuth(<Route path="/welcome" element={<AssentPage />} />, {
      path: '/welcome',
      auth: studentAuth(STUDENT_NO_ASSENT),
    });
    await userEvent.click(screen.getByRole('radio', { name: 'Bisaya' }));
    expect(
      screen.getByRole('heading', { level: 1, name: '[[TEAM:CEB:assent.title]]' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Tagalog' }));
    expect(
      screen.getByRole('heading', { level: 1, name: '[[TEAM:TL:assent.title]]' }),
    ).toBeInTheDocument();
  });

  it('records the assent with the language version, then routes by consent state', async () => {
    const q = queryResult({ error: null });
    mock.client.from.mockReturnValue(q);
    const auth = studentAuth(STUDENT_NO_ASSENT);
    auth.refresh = vi.fn(async () => ({
      account: { ...STUDENT_NO_ASSENT, assent: 'granted' },
      aal: null,
    }));
    renderWithAuth(<Route path="/welcome" element={<AssentPage />} />, { path: '/welcome', auth });
    await userEvent.click(screen.getByRole('radio', { name: 'Tagalog' }));
    await userEvent.click(screen.getByLabelText('[[TEAM:TL:assent.understand]]'));
    await userEvent.click(screen.getByRole('button', { name: '[[TEAM:TL:assent.continue]]' }));
    expect(mock.client.from).toHaveBeenCalledWith('consent_records');
    expect(q.calls[0]).toEqual([
      'insert',
      {
        student_id: '22222222-2222-4222-8222-222222222222',
        type: 'assent',
        instrument_version: 'assent-v1-tl',
      },
    ]);
    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe('/waiting-for-consent'),
    );
  });

  it('shows an error and stays when saving fails', async () => {
    mock.client.from.mockReturnValue(queryResult({ error: { code: '42501' } }));
    renderWithAuth(<Route path="/welcome" element={<AssentPage />} />, {
      path: '/welcome',
      auth: studentAuth(STUDENT_NO_ASSENT),
    });
    await userEvent.click(screen.getByLabelText('I have read this and I understand.'));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(
      await screen.findByText('We could not save this. Check your connection and try again.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('location').textContent).toBe('/welcome');
  });

  it('sends a student who already assented away', () => {
    renderWithAuth(<Route path="/welcome" element={<AssentPage />} />, {
      path: '/welcome',
      auth: studentAuth(STUDENT_T2),
    });
    expect(screen.getByTestId('location').textContent).toBe('/check-in');
  });

  it('"Not now" goes to the home page without saving', async () => {
    renderWithAuth(<Route path="/welcome" element={<AssentPage />} />, {
      path: '/welcome',
      auth: studentAuth(STUDENT_NO_ASSENT),
    });
    await userEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(screen.getByTestId('location').textContent).toBe('/');
    expect(mock.client.from).not.toHaveBeenCalled();
  });
});

describe('WaitingForConsentPage (2.1.6.2.3, D-27)', () => {
  it('explains the parental form and keeps Tier 1 open', () => {
    renderWithAuth(<Route path="/waiting-for-consent" element={<WaitingForConsentPage />} />, {
      path: '/waiting-for-consent',
      auth: studentAuth(STUDENT_NO_PARENT),
    });
    expect(
      screen.getByRole('heading', { name: 'One more step before your first check-in' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Read guides' })).toHaveAttribute('href', '/guides');
    expect(screen.getByRole('link', { name: 'See where to get help' })).toHaveAttribute(
      'href',
      '/help',
    );
    expect(screen.getByText(/HingaWeb is not for emergencies\./)).toBeInTheDocument();
  });

  it('shows the closed message when parental consent was withdrawn, with no Check again', () => {
    renderWithAuth(<Route path="/waiting-for-consent" element={<WaitingForConsentPage />} />, {
      path: '/waiting-for-consent',
      auth: studentAuth({ ...STUDENT_NO_PARENT, parental: 'withdrawn' }),
    });
    expect(
      screen.getByRole('heading', { name: 'Private check-ins are closed' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check again' })).toBeNull();
  });

  it('Check again moves on once consent is recorded, or says it is not recorded yet', async () => {
    const auth = studentAuth(STUDENT_NO_PARENT);
    auth.refresh = vi
      .fn()
      .mockResolvedValueOnce({ account: STUDENT_NO_PARENT, aal: null })
      .mockResolvedValueOnce({ account: STUDENT_T2, aal: null });
    renderWithAuth(<Route path="/waiting-for-consent" element={<WaitingForConsentPage />} />, {
      path: '/waiting-for-consent',
      auth,
    });
    await userEvent.click(screen.getByRole('button', { name: 'Check again' }));
    expect(
      await screen.findByText('Not recorded yet. Please check again later.'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Check again' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/check-in'));
  });

  it('redirects a student who does not belong here', () => {
    renderWithAuth(<Route path="/waiting-for-consent" element={<WaitingForConsentPage />} />, {
      path: '/waiting-for-consent',
      auth: studentAuth(STUDENT_NO_ASSENT),
    });
    expect(screen.getByTestId('location').textContent).toBe('/welcome');
  });
});
