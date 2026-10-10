import { test, expect } from '@playwright/test';
import { staffLogin, PASSWORD } from '../helpers/auth.js';

test.describe('Phase 02 · staff portal (Figs 19-20, 22; 2.1.6.2.9)', () => {
  test('guidance signs in with the second factor and lands on the queue', async ({ page }) => {
    await staffLogin(page, 'guidance.one@example.test');
    await expect(page).toHaveURL(/\/staff\/queue$/);
  });

  test('administrator lands on accounts and cannot open the guidance queue', async ({ page }) => {
    await staffLogin(page, 'admin.one@example.test');
    await expect(page).toHaveURL(/\/admin\/accounts$/);
    await page.goto('/staff/queue');
    await expect(page).toHaveURL(/\/admin\/accounts$/);
  });

  test('staff without the second factor cannot reach staff screens', async ({ page }) => {
    await page.goto('/staff/login');
    await page.getByLabel('Work email address').fill('guidance.one@example.test');
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/\/staff\/verify$/);
    await page.goto('/staff/queue');
    await expect(page).toHaveURL(/\/staff\/verify$/);
  });

  test('student credentials are refused at the staff portal', async ({ page }) => {
    await page.goto('/staff/login');
    await page.getByLabel('Work email address').fill('student.full@example.test');
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(
      page.getByText('This account is not a staff account. Students log in on the student page.'),
    ).toBeVisible();
  });

  test('15 minutes without activity ends the session (Fig 22)', async ({ page }) => {
    await page.clock.install();
    await staffLogin(page, 'guidance.one@example.test');
    await expect(page).toHaveURL(/\/staff\/queue$/);
    await page.clock.fastForward('15:30');
    await expect(page.getByRole('heading', { name: 'Your session has ended' })).toBeVisible();
    await page.getByRole('button', { name: 'Sign in again' }).click();
    await expect(page).toHaveURL(/\/staff\/login$/);
  });
});
