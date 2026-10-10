// Playwright helpers. LOCAL stack only (seed accounts from 00 Section 13.4).
import { readFileSync } from 'node:fs';
import { expect } from '@playwright/test';
import { totp } from '../../scripts/totp.js';

export const PASSWORD = 'LocalOnly-Pass-2026';

export function staffSecret(email) {
  const saved = JSON.parse(readFileSync('.dev-totp.json', 'utf8'));
  if (!saved[email])
    throw new Error(`No TOTP secret for ${email}. Run: node scripts/dev-enrol-totp.js`);
  return saved[email];
}

export async function studentLogin(page, email) {
  await page.goto('/login');
  await page.getByLabel('School email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
}

export async function staffLogin(page, email) {
  await page.goto('/staff/login');
  await page.getByLabel('Work email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/staff\/verify$/);
  await page.getByLabel('Security verification code').fill(totp(staffSecret(email)));
  await page.getByRole('button', { name: 'Verify' }).click();
}

/** Latest email sent to `to` through the local Mailpit (port 54324). Returns the first auth link. */
export async function latestAuthLink(to) {
  const base = 'http://127.0.0.1:54324/api/v1';
  for (let i = 0; i < 20; i += 1) {
    const res = await fetch(`${base}/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const body = await res.json();
    if (body.messages?.length) {
      const msg = await (await fetch(`${base}/message/${body.messages[0].ID}`)).json();
      const link = (msg.Text || msg.HTML).match(/https?:\/\/[^\s"<>]+\/auth\/v1\/verify[^\s"<>]+/);
      if (link) return link[0].replace(/&amp;/g, '&');
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No auth email found for ${to}`);
}
