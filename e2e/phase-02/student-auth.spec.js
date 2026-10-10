import { test, expect } from '@playwright/test';
import { studentLogin, latestAuthLink, PASSWORD } from '../helpers/auth.js';

test.describe('Phase 02 · student accounts', () => {
  test('a new student registers, confirms the email, and lands on the walkthrough (Fig 8, D-01)', async ({
    page,
  }) => {
    const email = `e2e.${Date.now()}@example.test`;
    await page.goto('/register');
    await page.getByLabel('Full name').fill('Test Student');
    await page.getByLabel('School email address').fill(email);
    await page.getByLabel('Grade level').selectOption('11');
    await page.getByLabel('Section').fill('STEM-A');
    await page.getByLabel('Class adviser').fill('Ms. Test Adviser');
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByLabel('Confirm password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();

    await page.goto(await latestAuthLink(email));
    await expect(page).toHaveURL(/\/auth\/confirmed/);
    await expect(page.getByRole('heading', { name: 'Your email is confirmed' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/\/welcome$/);
  });

  test('routes each seed student by consent state', async ({ page }) => {
    await studentLogin(page, 'student.full@example.test');
    await expect(page).toHaveURL(/\/check-in$/);
    await page
      .getByRole('button', { name: 'Account' })
      .or(page.getByRole('button', { name: 'Menu' }))
      .first()
      .click();
    await page
      .getByRole('menuitem', { name: 'Log out' })
      .or(page.getByRole('button', { name: 'Log out' }))
      .first()
      .click();
    await studentLogin(page, 'student.noparent@example.test');
    await expect(page).toHaveURL(/\/waiting-for-consent$/);
  });

  test('refuses staff credentials on the student page', async ({ page }) => {
    await studentLogin(page, 'guidance.one@example.test');
    await expect(
      page.getByText('This is the student log in. Staff sign in through the staff portal.'),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('shows a plain message for a wrong password', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('School email address').fill('student.full@example.test');
    await page.getByLabel('Password', { exact: true }).fill('wrong-password-123');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByText('That email and password do not match. Try again.')).toBeVisible();
  });

  test('a signed-out visitor cannot open student screens', async ({ page }) => {
    await page.goto('/check-in');
    await expect(page).toHaveURL(/\/login$/);
  });
});
