import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { studentLogin } from '../helpers/auth.js';

// Needs the local stack AND `npx supabase functions serve`. Run right after `npx supabase db reset`
// (the first test expects student.full to have no check-in yet). Adds rows, so it runs once.
test.describe.configure({ mode: 'serial' });
test.beforeEach(() => {
  test.skip(test.info().project.name !== 'desktop', 'adds rows; runs once');
});

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

test.describe('Phase 07 · support request (Figs 16, 17)', () => {
  test('with no check-in yet, the screen says no answers are shared and the request still sends', async ({
    page,
  }) => {
    await studentLogin(page, 'student.full@example.test');
    await expect(page).toHaveURL(/\/check-in$/);
    await page.goto('/request');
    await expect(
      page.getByText('You have no check-in yet, so no answers are shared.'),
    ).toBeVisible();
    await expect(page.getByText('Ana Reyes')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
    await page.getByLabel('What is this mostly about?').selectOption('academic');
    await page.getByRole('checkbox').check();
    const sent = page.waitForResponse((r) =>
      r.url().includes('/functions/v1/submit-support-request'),
    );
    await page.getByRole('button', { name: 'Send request' }).click();
    const body = await (await sent).json();
    expect(Object.keys(body).sort()).toEqual(['created_at', 'request_id']); // no score, no band
    await expect(page).toHaveURL(/\/request\/sent$/);
    await expect(page.getByRole('heading', { name: 'Your request was sent' })).toBeVisible();
    await expect(page.getByText(/^Ref [0-9a-f]{8} • Sent/)).toBeVisible();
  });

  test('from the prompt: the answers shown are the latest check-in, and request_sent is recorded', async ({
    page,
  }) => {
    await studentLogin(page, 'student.full@example.test');
    const picks = ['Very much', 'Very much', 'Not at all', 'Not at all', 'Low', 'Quite a lot'];
    const groups = page.getByRole('radiogroup');
    for (let i = 0; i < picks.length; i += 1) {
      // One question per screen (ui-interactive Part 2): answer the visible question, then Next.
      await groups.first().getByRole('radio', { name: picks[i], exact: true }).click();
      await page.getByRole('button', { name: 'Next' }).click();
    }
    await page.getByRole('button', { name: 'Save check-in' }).click();
    await page.getByRole('button', { name: 'Continue to send a request' }).click();
    await expect(page).toHaveURL(/\/request$/);
    await expect(
      page.getByText('School work and academic pressure has been affecting me. Very much'),
    ).toBeVisible();
    // Item 4 was answered "Not at all" and is shown exactly as tapped (D-09).
    await expect(
      page.getByText('I have been able to manage what I am carrying. Not at all'),
    ).toBeVisible();
    await page.getByLabel('What is this mostly about?').selectOption('family');
    await page
      .getByLabel(/Is there anything you want them to know/)
      .fill('E2E note, please ignore.');
    await page.getByRole('checkbox').check();
    const recorded = page.waitForResponse(
      (r) => r.url().includes('/rest/v1/prompt_events') && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByRole('heading', { name: 'Your request was sent' })).toBeVisible();
    expect((await recorded).status()).toBe(201);
  });

  test('a failed send keeps the note and says nothing was sent (Fig 17)', async ({ page }) => {
    await studentLogin(page, 'student.full@example.test');
    await expect(page).toHaveURL(/\/check-in$/);
    await page.goto('/request');
    await expect(page.getByText('Ana Reyes')).toBeVisible();
    await page.route('**/functions/v1/submit-support-request', (r) =>
      r.request().method() === 'OPTIONS' ? r.continue() : r.abort('failed'),
    );
    await page.getByLabel('What is this mostly about?').selectOption('peer');
    await page.getByLabel(/Is there anything you want them to know/).fill('keep this text');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByText('We could not send your request. Nothing was sent.')).toBeVisible();
    await expect(page.getByLabel(/Is there anything you want them to know/)).toHaveValue(
      'keep this text',
    );
    await page.unroute('**/functions/v1/submit-support-request');
    await page.getByRole('button', { name: 'Try sending again' }).first().click();
    await expect(page.getByRole('heading', { name: 'Your request was sent' })).toBeVisible();
  });
});
