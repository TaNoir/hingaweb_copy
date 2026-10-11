import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { staffLogin, studentLogin } from '../helpers/auth.js';

// Needs the local stack, `npx supabase functions serve`, and `node scripts/dev-enrol-totp.js`.
// Run right after `npx supabase db reset`. Adds rows, so it runs once (desktop project only).
test.describe.configure({ mode: 'serial' });
test.beforeEach(() => {
  test.skip(test.info().project.name !== 'desktop', 'adds rows; runs once');
});

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const NOTE = 'Phase 08 E2E note. Please ignore.';

test.describe('Phase 08 · guidance dashboard (Figs 21, 23, 24, 25, 26)', () => {
  test('setup: a student sends a request after a check-in', async ({ page }) => {
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
    await page.getByLabel('What is this mostly about?').selectOption('academic');
    await page.getByLabel(/Is there anything you want them to know/).fill(NOTE);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByRole('heading', { name: 'Your request was sent' })).toBeVisible();
  });

  test('the queue lists the request without the note', async ({ page }) => {
    await staffLogin(page, 'guidance.one@example.test');
    await expect(page).toHaveURL(/\/staff\/queue$/);
    const row = page.getByRole('row', { name: /Ana Reyes/ });
    await expect(row).toBeVisible();
    await expect(row.getByText('P1')).toBeVisible(); // stored (5, 5, 1, 5): S = 4.5272 -> P1
    await expect(row.getByText('School work')).toBeVisible();
    await expect(page.getByText(NOTE)).toHaveCount(0);
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });

  test('opening shows the note, records the access, and status changes are saved', async ({
    page,
  }) => {
    await staffLogin(page, 'guidance.one@example.test');
    const opened = page.waitForResponse((r) =>
      r.url().includes('/rest/v1/rpc/open_support_request'),
    );
    await page
      .getByRole('row', { name: /Ana Reyes/ })
      .getByRole('link', { name: 'Open the request from Ana Reyes' })
      .click();
    expect((await opened).status()).toBe(200);
    await expect(page.getByText(NOTE)).toBeVisible();
    await expect(page.getByText(/Your access to this request was recorded at/)).toBeVisible();
    await expect(
      page.getByRole('table', { name: 'Ratings and weights used for this request' }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
    await page.getByRole('radio', { name: 'Reviewed' }).click();
    await expect(page.getByText('Status saved.')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('radio', { name: 'Reviewed' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('assigning an office tag starts with nothing selected', async ({ page }) => {
    await staffLogin(page, 'guidance.one@example.test');
    await page
      .getByRole('row', { name: /Ana Reyes/ })
      .getByRole('link', { name: /Open the request/ })
      .click();
    await page.getByRole('link', { name: 'Assign office tag' }).click();
    const radios = page.getByRole('radio');
    await expect(radios).toHaveCount(3);
    for (let i = 0; i < 3; i += 1) await expect(radios.nth(i)).not.toBeChecked();
    await expect(page.getByRole('button', { name: 'Save tag' })).toBeDisabled();
    await radios.nth(1).check();
    await page.getByRole('button', { name: 'Save tag' }).click();
    await expect(page.getByText('Office tag saved.')).toBeVisible();
  });

  test('a crisis tick reaches an open dashboard at once, then is acknowledged and resolved', async ({
    page,
    browser,
  }) => {
    await staffLogin(page, 'guidance.one@example.test');
    await expect(page).toHaveURL(/\/staff\/queue$/);
    await page.waitForTimeout(1500); // let the Realtime subscription join

    const studentContext = await browser.newContext();
    const student = await studentContext.newPage();
    await studentLogin(student, 'student.full@example.test');
    await student.getByLabel('[[GUIDANCE:crisis_item_1]]').click();
    await expect(student.getByText('The guidance office has been told.')).toBeVisible();
    await studentContext.close();

    await expect(page.getByText('A new crisis event was raised.')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/crisis events? needs? attention/)).toBeVisible();
    await page.getByRole('link', { name: 'Open crisis channel' }).first().click();
    const card = page.getByRole('article').filter({ hasText: 'Ana Reyes' }).first();
    await expect(card.getByText('[[GUIDANCE:crisis_item_1]]')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
    await card.getByRole('button', { name: 'Acknowledge' }).click();
    await expect(card.getByText(/Acknowledged by/)).toBeVisible();
    await card.getByRole('button', { name: 'Mark resolved' }).click();
    await expect(
      page.getByRole('table', { name: 'Crisis events resolved in the last 7 days' }),
    ).toContainText('Ana Reyes');
  });

  test('the partner directory has no note form', async ({ page }) => {
    await staffLogin(page, 'guidance.one@example.test');
    await page.getByRole('link', { name: 'Referrals' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Partner directory' })).toBeVisible();
    await expect(page.getByRole('textbox')).toHaveCount(0);
  });
});
