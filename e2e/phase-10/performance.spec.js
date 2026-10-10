import { test, expect } from '@playwright/test';
import { totp } from '../../scripts/totp.js';

// Phase 10 · 2.1.6.1.1: core views reach first contentful paint within 3 s and become usable within
// 5 s on 1 Mbps down / 0.5 Mbps up / 400 ms round trip; median of five runs per view.
// Runs ONLY against a deployed site (Vercel compresses files; `vite preview` does not), e.g.:
//   PERF_BASE_URL=https://<preview>.vercel.app \
//   PERF_STUDENT_EMAIL=... PERF_STUDENT_PASSWORD=... \
//   PERF_STAFF_EMAIL=... PERF_STAFF_PASSWORD=... PERF_STAFF_TOTP_SECRET=... \
//   npx playwright test e2e/phase-10/performance.spec.js --project=desktop
// Use TEST accounts on a preview deployment, never a real student's account.
const BASE = process.env.PERF_BASE_URL;
test.skip(!BASE, 'set PERF_BASE_URL to a deployed preview to run the performance check');
test.describe.configure({ mode: 'serial', timeout: 180_000 });
test.use({ serviceWorkers: 'block' }); // measure a first visit, not the offline cache

const PROFILE = {
  offline: false,
  latency: 400,
  downloadThroughput: 125_000,
  uploadThroughput: 62_500,
};
const RUNS = 5;
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function measure(context, path, ready) {
  const fcps = [];
  const usable = [];
  for (let i = 0; i < RUNS; i += 1) {
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', PROFILE);
    const start = Date.now();
    await page.goto(new URL(path, BASE).href, { waitUntil: 'commit' });
    await ready(page);
    usable.push(Date.now() - start);
    fcps.push(
      await page.evaluate(
        () => performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? Infinity,
      ),
    );
    await page.close();
  }
  return { fcp: median(fcps), usable: median(usable), fcps, usables: usable };
}

function report(name, r) {
  console.log(`${name}: FCP median ${Math.round(r.fcp)} ms, usable median ${r.usable} ms`, r);
  expect(r.fcp).toBeLessThanOrEqual(3000);
  expect(r.usable).toBeLessThanOrEqual(5000);
}

test('Where to get help (public)', async ({ context }) => {
  report(
    'help',
    await measure(context, '/help', (p) => p.getByRole('heading', { level: 1 }).waitFor()),
  );
});

test('Check-in and resource list (student)', async ({ context, page }) => {
  test.skip(!process.env.PERF_STUDENT_EMAIL, 'set PERF_STUDENT_EMAIL and PERF_STUDENT_PASSWORD');
  await page.goto(new URL('/login', BASE).href);
  await page.getByLabel('School email address').fill(process.env.PERF_STUDENT_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(process.env.PERF_STUDENT_PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL(/\/check-in$/);
  report(
    'check-in',
    await measure(context, '/check-in', (p) =>
      p.getByRole('button', { name: 'Save check-in' }).waitFor(),
    ),
  );
  report(
    'resources',
    await measure(context, '/resources', (p) =>
      p.getByRole('heading', { level: 1, name: 'Suggested for you' }).waitFor(),
    ),
  );
});

test('Guidance request list (staff)', async ({ context, page }) => {
  test.skip(
    !process.env.PERF_STAFF_EMAIL,
    'set PERF_STAFF_EMAIL, PERF_STAFF_PASSWORD, PERF_STAFF_TOTP_SECRET',
  );
  await page.goto(new URL('/staff/login', BASE).href);
  await page.getByLabel('Work email address').fill(process.env.PERF_STAFF_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(process.env.PERF_STAFF_PASSWORD);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page
    .getByLabel('Security verification code')
    .fill(totp(process.env.PERF_STAFF_TOTP_SECRET));
  await page.getByRole('button', { name: 'Verify' }).click();
  await page.waitForURL(/\/staff\/queue$/);
  report(
    'queue',
    await measure(context, '/staff/queue', (p) =>
      p.getByRole('heading', { level: 1, name: 'Support requests' }).waitFor(),
    ),
  );
});
