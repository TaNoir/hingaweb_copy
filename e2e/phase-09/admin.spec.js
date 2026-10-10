import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { PASSWORD, latestAuthLink, staffLogin, studentLogin } from '../helpers/auth.js';

// Needs the local stack, `npx supabase functions serve`, and `node scripts/dev-enrol-totp.js`.
// Run right after `npx supabase db reset`. Changes seed data, so it runs once (desktop only).
test.describe.configure({ mode: 'serial' });
test.beforeEach(() => {
  test.skip(test.info().project.name !== 'desktop', 'changes seed data; runs once');
});

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
async function noAxeViolations(page) {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(results.violations).toEqual([]);
}

test.describe('Phase 09 · administrator console (Figs 27-33)', () => {
  test('accounts: lists staff and invites a new guidance account', async ({ page }) => {
    await staffLogin(page, 'admin.one@example.test');
    await expect(page).toHaveURL(/\/admin\/accounts$/);
    const table = page.getByRole('table', { name: 'Staff accounts' });
    await expect(table).toContainText('guidance.one@example.test');
    await noAxeViolations(page);
    await page.getByRole('button', { name: 'Create staff account' }).click();
    const dialog = page.getByRole('dialog', { name: 'Create staff account' });
    await dialog.getByLabel('Full name').fill('E2E Guidance');
    await dialog
      .getByRole('textbox', { name: 'Work email address' })
      .fill('e2e.guidance@example.test');
    await dialog.getByRole('radio', { name: /^Guidance/ }).check();
    await dialog.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Invitation sent to e2e.guidance@example.test.')).toBeVisible();
    await expect(table).toContainText('E2E Guidance');

    // The invitation link opens first-time setup (Phase 02) in a fresh browser.
    const link = await latestAuthLink('e2e.guidance@example.test');
    const fresh = await page.context().browser().newContext();
    const invited = await fresh.newPage();
    await invited.goto(link);
    await expect(invited).toHaveURL(/\/staff\/setup/);
    await fresh.close();
  });

  test('accounts: a deactivated staff member cannot sign in; reactivating restores access', async ({
    page,
    browser,
  }) => {
    await staffLogin(page, 'admin.one@example.test');
    await page.getByRole('button', { name: 'Deactivate Guidance Associate (dev)' }).click();
    await page.getByRole('button', { name: 'Deactivate account' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();

    const other = await browser.newContext();
    const g = await other.newPage();
    await g.goto('/staff/login');
    await g.getByLabel('Work email address').fill('guidance.one@example.test');
    await g.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await g.getByRole('button', { name: 'Continue' }).click();
    await expect(g).toHaveURL(/\/staff\/login$/);
    await other.close();

    await page.getByRole('button', { name: 'Reactivate Guidance Associate (dev)' }).click();
    await page.getByRole('button', { name: 'Reactivate account' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();
  });

  test('consent: recording parental consent opens check-ins for that student', async ({
    page,
    browser,
  }) => {
    await staffLogin(page, 'admin.one@example.test');
    await page.getByRole('link', { name: 'Consent' }).click();
    await expect(
      page.getByRole('table', { name: 'Consent and assent for each student' }),
    ).toBeVisible();
    await noAxeViolations(page);
    await page.getByRole('button', { name: 'Record parental consent for Paolo Diaz' }).click();
    const dialog = page.getByRole('dialog', { name: 'Record parental consent' });
    await dialog.getByLabel('Form version').fill('parental-v1');
    await dialog.getByRole('checkbox').check();
    await dialog.getByRole('button', { name: 'Record consent' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();

    const other = await browser.newContext();
    const s = await other.newPage();
    await studentLogin(s, 'student.noparent@example.test');
    await expect(s).toHaveURL(/\/check-in$/);
    await other.close();
  });

  test('reference data: an added item shows on the check-in; a retired one disappears', async ({
    page,
    browser,
  }) => {
    await staffLogin(page, 'admin.one@example.test');
    await page.getByRole('link', { name: 'Reference data' }).click();
    await noAxeViolations(page);
    await page.getByRole('button', { name: 'Add agreed item' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add agreed item' });
    await dialog.getByLabel('Item text').fill('E2E agreed item');
    await dialog.getByLabel('Set version').fill('v-e2e');
    await dialog.getByRole('checkbox').check();
    await dialog.getByRole('button', { name: 'Add item' }).click();
    await expect(page.getByRole('table', { name: 'Crisis items' })).toContainText(
      'E2E agreed item',
    );

    const other = await browser.newContext();
    const s = await other.newPage();
    await studentLogin(s, 'student.full@example.test');
    await expect(s.getByLabel('E2E agreed item')).toBeVisible();

    await page.getByRole('button', { name: 'Retire the item E2E agreed item' }).click();
    await page.getByRole('button', { name: 'Retire item' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();
    // "Saved." is still on screen from adding the item; wait until the retire itself is stored.
    await expect(
      page.getByRole('button', { name: 'Retire the item E2E agreed item' }),
    ).toHaveCount(0);
    await s.reload();
    await expect(s.getByLabel('[[GUIDANCE:crisis_item_1]]')).toBeVisible();
    await expect(s.getByLabel('E2E agreed item')).toHaveCount(0);
    await other.close();
  });

  test('resources: a published resource appears on the public guides page', async ({
    page,
    browser,
  }) => {
    await staffLogin(page, 'admin.one@example.test');
    await page.getByRole('link', { name: 'Resources' }).click();
    await noAxeViolations(page);
    await page.getByRole('link', { name: 'Add resource' }).click();
    await page.getByLabel('Title').fill('E2E published guide');
    await page.getByLabel('Source URL').fill('https://example.org/hingaweb-dev/e2e');
    await page
      .getByRole('radiogroup', { name: 'Future' })
      .getByRole('radio', { name: '4' })
      .click();
    await page.getByRole('radio', { name: 'Published' }).click();
    await page.getByLabel('Verified by').selectOption({ label: 'Guidance Associate (dev)' });
    await page.getByRole('checkbox').check();
    await noAxeViolations(page);
    await page.getByRole('button', { name: 'Save resource' }).click();
    await expect(page.getByRole('table', { name: 'Resources' })).toContainText(
      'E2E published guide',
    );

    const anon = await browser.newContext();
    const p = await anon.newPage();
    await p.goto('/guides');
    await expect(p.getByRole('heading', { name: 'E2E published guide' })).toBeVisible();
    await anon.close();
  });

  test('audit trail: read-only, with no delete or edit', async ({ page }) => {
    await staffLogin(page, 'admin.one@example.test');
    await page.getByRole('link', { name: 'Audit' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Audit trail' })).toBeVisible();
    await expect(page.getByText('Why there is no delete')).toBeVisible();
    await expect(page.getByRole('button', { name: /delete|edit/i })).toHaveCount(0);
    await noAxeViolations(page);
  });
});
