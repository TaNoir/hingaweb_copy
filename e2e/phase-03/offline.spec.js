import { test, expect } from '@playwright/test';

// 2.1.6.4.6: hotlines and the not-for-emergencies notice display when the backend is unreachable.
test('hotlines and the directory still show with no network', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload(); // now controlled by the service worker
  await context.setOffline(true);

  await page.goto('/help');
  await expect(
    page.getByRole('heading', { name: 'Crisis hotlines, available 24 hours' }),
  ).toBeVisible();
  await expect(page.getByText(/HingaWeb is not for emergencies\./)).toBeVisible();

  await page.goto('/');
  // ui-landing-v2: the hotline card is now the "If you need help right now" section.
  await expect(
    page.getByRole('complementary', { name: 'If you need help right now' }),
  ).toBeVisible();
  await context.setOffline(false);
});
