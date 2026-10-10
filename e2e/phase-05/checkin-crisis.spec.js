import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { studentLogin } from '../helpers/auth.js';

// Needs the local stack AND the Edge Functions: run `npx supabase functions serve` in a second
// terminal first. These tests add check-ins and crisis events for student.full, so they run once
// (desktop project only).
test.describe.configure({ mode: 'serial' });
test.beforeEach(() => {
  test.skip(test.info().project.name !== 'desktop', 'adds rows; runs once');
});

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function answer(page, picks) {
  const groups = page.getByRole('radiogroup');
  for (let i = 0; i < picks.length; i += 1) {
    await groups.nth(i).getByRole('radio', { name: picks[i], exact: true }).click();
  }
}

test.describe('Phase 05 · check-in, prompt, crisis (Figs 11, 15, 18)', () => {
  test('check-in page is accessible and shows the explicit crisis items', async ({ page }) => {
    await studentLogin(page, 'student.full@example.test');
    await expect(page).toHaveURL(/\/check-in$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'How have things been?' }),
    ).toBeVisible();
    await expect(page.getByLabel('[[GUIDANCE:crisis_item_1]]')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });

  test('a calm check-in saves with no prompt', async ({ page }) => {
    await studentLogin(page, 'student.full@example.test');
    await answer(page, ['Not at all', 'Not at all', 'Not at all', 'Very much', 'Good', 'A little']);
    const saved = page.waitForResponse(
      (r) => r.url().includes('/rest/v1/checkins') && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Save check-in' }).click();
    expect((await saved).status()).toBe(201);
    await expect(page.getByRole('heading', { name: 'Your check-in is saved' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('a "Very much" answer asks; Not now records a private dismissal', async ({ page }) => {
    await studentLogin(page, 'student.full@example.test');
    await answer(page, ['Very much', 'Not at all', 'Not at all', 'Somewhat', 'Low', 'Quite a lot']);
    const evaluated = page.waitForResponse((r) =>
      r.url().includes('/functions/v1/evaluate-checkin'),
    );
    await page.getByRole('button', { name: 'Save check-in' }).click();
    const body = await (await evaluated).json();
    expect(body).toEqual({ prompt: 'max_sev' }); // nothing but the prompt type
    const dialog = page.getByRole('dialog', {
      name: 'Would you like to send this to the guidance office?',
    });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
    const dismissed = page.waitForResponse(
      (r) => r.url().includes('/rest/v1/prompt_events') && r.request().method() === 'POST',
    );
    await dialog.getByRole('button', { name: 'Not now' }).click();
    expect((await dismissed).status()).toBe(201);
    await expect(page.getByRole('heading', { name: 'Your check-in is saved' })).toBeVisible();
  });

  test('Continue opens the request screen', async ({ page }) => {
    await studentLogin(page, 'student.full@example.test');
    await answer(page, ['Not at all', 'Very much', 'Not at all', 'Somewhat', 'Okay', 'Somewhat']);
    await page.getByRole('button', { name: 'Save check-in' }).click();
    await page.getByRole('button', { name: 'Continue to send a request' }).click();
    await expect(page).toHaveURL(/\/request$/);
  });

  test('a crisis item shows help at once and records the event', async ({ page }) => {
    await studentLogin(page, 'student.full@example.test');
    await expect(page.getByLabel('[[GUIDANCE:crisis_item_1]]')).toBeVisible();
    const raised = page.waitForResponse(
      (r) => r.url().includes('/rest/v1/crisis_events') && r.request().method() === 'POST',
    );
    await page.getByLabel('[[GUIDANCE:crisis_item_1]]').click();
    await expect(page).toHaveURL(/\/crisis$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Help is available right now' }),
    ).toBeVisible();
    expect((await raised).status()).toBe(201);
    await expect(page.getByText('The guidance office has been told.')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
    await page.getByRole('link', { name: 'Back to my check-in' }).click();
    await expect(page.getByLabel('[[GUIDANCE:crisis_item_1]]')).toBeChecked();
  });

  test('offline: hotlines still show and the event is sent when the network returns', async ({
    page,
    context,
  }) => {
    await studentLogin(page, 'student.full@example.test');
    await expect(page.getByLabel('[[GUIDANCE:crisis_item_2]]')).toBeVisible();
    await context.setOffline(true);
    await page.getByLabel('[[GUIDANCE:crisis_item_2]]').click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Help is available right now' }),
    ).toBeVisible();
    await expect(page.getByText(/You're offline\. We will tell the guidance office/)).toBeVisible();
    const raised = page.waitForResponse(
      (r) => r.url().includes('/rest/v1/crisis_events') && r.request().method() === 'POST',
    );
    await context.setOffline(false);
    expect((await raised).status()).toBe(201);
    await expect(page.getByText('The guidance office has been told.')).toBeVisible();
  });
});
