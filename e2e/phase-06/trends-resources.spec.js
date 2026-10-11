import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { studentLogin } from '../helpers/auth.js';

// Needs the local stack AND `npx supabase functions serve`. Adds one check-in for student.full,
// so it runs once (desktop project only).
test.describe.configure({ mode: 'serial' });
test.beforeEach(() => {
  test.skip(test.info().project.name !== 'desktop', 'adds rows; runs once');
});

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

test.describe('Phase 06 · trends and ranked resources (Figs 12, 13)', () => {
  test('a home-and-family check-in puts the family guide first, fast, with no numbers', async ({
    page,
  }) => {
    await studentLogin(page, 'student.full@example.test');
    await expect(page).toHaveURL(/\/check-in$/);
    const picks = ['Not at all', 'Very much', 'Not at all', 'Very much', 'Okay', 'Somewhat'];
    const groups = page.getByRole('radiogroup');
    for (let i = 0; i < picks.length; i += 1) {
      // One question per screen (ui-interactive Part 2): answer the visible question, then Next.
      await groups.first().getByRole('radio', { name: picks[i], exact: true }).click();
      await page.getByRole('button', { name: 'Next' }).click();
    }
    await page.getByRole('button', { name: 'Save check-in' }).click();
    await page.getByRole('button', { name: 'Not now' }).click();
    await expect(page.getByRole('heading', { name: 'Your check-in is saved' })).toBeVisible();

    const started = Date.now();
    const ranked = page.waitForResponse((r) => r.url().includes('/functions/v1/rank-resources'));
    await page.getByRole('link', { name: 'See suggested guides' }).click();
    const body = await (await ranked).json();
    expect(Date.now() - started).toBeLessThan(2000); // 2.1.6.1.5
    expect(JSON.stringify(body)).not.toMatch(/attributes|similar|score/);
    const titles = page.getByRole('list').getByRole('heading');
    await expect(titles.first()).toHaveText('Talking to family about money worries');
    await expect(page.getByText('Sleep and routine')).toHaveCount(0); // unpublished
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });

  test('opening a guide records a private view', async ({ page }) => {
    await studentLogin(page, 'student.full@example.test');
    await expect(page).toHaveURL(/\/check-in$/);
    await page.goto('/resources');
    const viewed = page.waitForResponse(
      (r) => r.url().includes('/rest/v1/resource_views') && r.request().method() === 'POST',
    );
    const popup = page.waitForEvent('popup');
    await page.getByRole('link', { name: /Talking to family about money worries/ }).click();
    await (await popup).close();
    expect((await viewed).status()).toBe(201);
  });

  test('trends show six charts, Managing as tapped, and an accessible table', async ({ page }) => {
    await studentLogin(page, 'student.full@example.test');
    await expect(page).toHaveURL(/\/check-in$/);
    await page.goto('/trends');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Your check-ins over time' }),
    ).toBeVisible();
    for (const name of ['Mood', 'Stress', 'School work', 'Home and family', 'Future', 'Managing']) {
      await expect(page.getByRole('img', { name })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Show my answers as a table' }).click();
    const table = page.getByRole('table', { name: 'Your answers on each check-in' });
    await expect(table).toBeVisible();
    // The check-in above tapped "Very much" for Managing (stored 1): the table shows what was tapped.
    await expect(table.getByRole('row').last()).toContainText('Very much');
    await expect(page.getByText(/Heavier|Holding steady|lighter|same as last/i)).toHaveCount(0);
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });
});
