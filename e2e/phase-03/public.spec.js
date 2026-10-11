import { test, expect } from '@playwright/test';

test.describe('Phase 03 · public pages (Tier 1)', () => {
  test('landing shows the hero, the hotline card, and the not-for-emergencies notice (Fig 7)', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: 'A private place to check in with yourself.' }),
    ).toBeVisible();
    // ui-landing-v2: the hotline card is now the "If you need help right now" section.
    const card = page.getByRole('complementary', { name: 'If you need help right now' });
    await expect(card).toBeVisible();
    await expect(card.getByText(/HingaWeb is not for emergencies\./)).toBeVisible();
    await expect(page.getByRole('textbox')).toHaveCount(0); // D-19: no demo check-in
  });

  test('where to get help lists the four referral targets (Fig 14, 1.4)', async ({ page }) => {
    await page.goto('/help');
    await expect(page.getByRole('heading', { name: 'Your school guidance office' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Institute of Psychiatric and Behavioral Medicine' }),
    ).toBeVisible();
    await expect(page.getByText('External professionals')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Crisis hotlines, available 24 hours' }),
    ).toBeVisible();
  });

  test('no horizontal scrolling on public pages', async ({ page }) => {
    for (const path of ['/', '/guides', '/help']) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });

  test('sending a request from the directory asks a signed-out visitor to log in', async ({
    page,
  }) => {
    await page.goto('/help');
    await page.getByRole('link', { name: /Send a support request/ }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
