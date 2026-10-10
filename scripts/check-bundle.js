// Phase 10 · 2.1.6.1.2: each core view must load in at most 500 KB COMPRESSED on first load.
// Core views: the student check-in, the resource list, the referral and hotline view, and the
// guidance request list. Run after `vite build` (it reads dist/.vite/manifest.json).
// Also fails if:
//   - the crisis screen, check-in, or help page were split into a lazy chunk (Phase 05 must-never 14)
//   - any server secret appears in the built files (00 Section 5.3).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { ROOT } from './lib.js';

export const BUDGET_BYTES = 500 * 1000;

/** The modules each core view needs beyond the main entry (dynamic entries in the manifest). */
export const CORE_VIEWS = {
  'Check-in (/check-in)': [],
  'Resource list (/resources)': ['src/features/resources/ResourcesPage.jsx'],
  'Where to get help (/help)': [],
  'Guidance request list (/staff/queue)': [
    'src/features/guidance/GuidanceLayout.jsx',
    'src/features/guidance/QueuePage.jsx',
  ],
};

/** Must stay in the main entry, never lazy. */
export const MUST_BE_EAGER = [
  'src/features/crisis/CrisisPage.jsx',
  'src/features/checkin/CheckInPage.jsx',
  'src/features/public/HelpPage.jsx',
  'src/content/directory.js',
];

// A real secret key, or a JWT whose payload says service_role (base64 of "service_role" at its three
// possible alignments). The bare prefix "sb_secret_" appears inside supabase-js itself, so a key is
// matched only with its random tail.
export const SECRET_PATTERNS = [
  /sb_secret_[A-Za-z0-9_-]{16,}/,
  /c2VydmljZV9yb2xl|NlcnZpY2Vfcm9sZ|zZXJ2aWNlX3JvbG/,
  /service_role/i,
  /SUPABASE_SERVICE_ROLE_KEY|WEBHOOK_SECRET|SMS_GATEWAY_TOKEN/,
];

/** All files (JS and CSS) a manifest key loads statically, including itself. */
export function closure(manifest, key, seen = new Set()) {
  if (seen.has(key) || !manifest[key]) return seen;
  seen.add(key);
  for (const imp of manifest[key].imports ?? []) closure(manifest, imp, seen);
  return seen;
}

export function filesFor(manifest, keys) {
  const all = new Set();
  for (const k of ['index.html', ...keys]) for (const c of closure(manifest, k)) all.add(c);
  const files = new Set();
  for (const k of all) {
    files.add(manifest[k].file);
    for (const css of manifest[k].css ?? []) files.add(css);
  }
  return [...files];
}

export function lazyViolations(manifest) {
  return MUST_BE_EAGER.filter((src) => manifest[src]?.isDynamicEntry);
}

if (process.argv[1] && process.argv[1].endsWith('check-bundle.js')) {
  const dist = join(ROOT, 'dist');
  const manifestPath = join(dist, '.vite/manifest.json');
  if (!existsSync(manifestPath)) {
    console.error('check:bundle: run `npm run build` first (dist/.vite/manifest.json is missing)');
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const gz = (file) => gzipSync(readFileSync(join(dist, file))).length;
  // The browser downloads only the Latin subset of Inter for this app's text.
  const fonts = readdirSync(join(dist, 'assets')).filter((f) =>
    /^inter-latin-wght-normal-.*\.woff2$/.test(f),
  );
  const problems = [];

  for (const [view, keys] of Object.entries(CORE_VIEWS)) {
    const missing = keys.filter((k) => !manifest[k]);
    if (missing.length) problems.push(`${view}: not found in manifest: ${missing.join(', ')}`);
    const files = filesFor(manifest, keys);
    const bytes =
      files.reduce((s, f) => s + gz(f), 0) +
      fonts.reduce((s, f) => s + readFileSync(join(dist, 'assets', f)).length, 0);
    const kb = (bytes / 1000).toFixed(1);
    console.log(`check:bundle: ${view}: ${kb} KB compressed (${files.length} files + font)`);
    if (bytes > BUDGET_BYTES) problems.push(`${view} is ${kb} KB, over the 500 KB budget`);
  }

  for (const src of lazyViolations(manifest)) problems.push(`${src} must stay in the main bundle`);

  const builtFiles = readdirSync(join(dist, 'assets')).filter((f) => /\.(js|css|html)$/.test(f));
  for (const f of [...builtFiles.map((x) => `assets/${x}`), 'index.html']) {
    const text = readFileSync(join(dist, f), 'utf8');
    for (const re of SECRET_PATTERNS) if (re.test(text)) problems.push(`${f} contains ${re}`);
  }

  if (problems.length) {
    console.error('check:bundle failed:\n- ' + problems.join('\n- '));
    process.exit(1);
  }
  console.log('check:bundle: OK');
}
