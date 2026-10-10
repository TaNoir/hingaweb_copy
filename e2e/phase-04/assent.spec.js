import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { studentLogin } from '../helpers/auth.js';

// These tests change seed data (they record an assent), so they run once (desktop project only)
// and in order. Run `npx supabase db reset` before them.
test.describe.configure({ mode: 'serial' });
test.beforeEach(() => {
  test.skip(test.info().project.name !== 'desktop', 'changes seed data; runs once');
});

test.describe('Phase 04 · assent and consent gate (Fig 10; 2.1.5.1.1; 2.1.6.2.3)', () => {
  test('a student without assent sees the walkthrough before anything else', async ({ page }) => {
    await studentLogin(page, 'student.noassent@example.test');
    await expect(page).toHaveURL(/\/welcome$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'What we keep private, and what we cannot' }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
    await page.goto('/check-in');
    await expect(page).toHaveURL(/\/welcome$/);
  });

  test('assent is recorded only after the box is ticked, then the parental step shows', async ({
    page,
  }) => {
    await studentLogin(page, 'student.noassent@example.test');
    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await page.getByLabel('I have read this and I understand.').check();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/\/waiting-for-consent$/);
    await expect(
      page.getByRole('heading', { name: 'One more step before your first check-in' }),
    ).toBeVisible();
  });

  test('assent with parental consent missing keeps check-ins closed', async ({ page }) => {
    await studentLogin(page, 'student.noparent@example.test');
    await expect(page).toHaveURL(/\/waiting-for-consent$/);
    await page.getByRole('button', { name: 'Check again' }).click();
    await expect(page.getByText('Not recorded yet. Please check again later.')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('withdrawn parental consent shows the closed message', async ({ page }) => {
    await studentLogin(page, 'student.withdrawn@example.test');
    await expect(page).toHaveURL(/\/waiting-for-consent$/);
    await expect(page.getByRole('heading', { name: 'Private check-ins are closed' })).toBeVisible();
  });

  test('a Tier 2 student never sees the walkthrough again', async ({ page }) => {
    await studentLogin(page, 'student.full@example.test');
    await expect(page).toHaveURL(/\/check-in$/);
    await page.goto('/welcome');
    await expect(page).toHaveURL(/\/check-in$/);
  });
});
