// 00 Section 10.3. Fails if UI copy contains diagnostic, clinical, or scoring words.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, flatten } from './lib.js';

export const STUDENT_BANNED = [
  /\bdiagnos\w*/i,
  /\bdisorders?\b/i,
  /\bdepress\w*/i,
  /\banxiety\b/i,
  /\banxious\b/i,
  /\bsymptoms?\b/i,
  /\bpatients?\b/i,
  /\bclinical\b/i,
  /\bclinicians?\b/i,
  /\btherapy\b/i,
  /\btreatments?\b/i,
  /\bscreening\b/i,
  /\bassessments?\b/i,
  /\brisks?\b/i,
  /\bseverity\b/i,
  /\bscor(e|es|ed|ing)\b/i,
  /\bpriorit(y|ies)\b/i,
  /\btriage\b/i,
  /\bP[123]\b/,
  /\bFor Review\b/i,
  /\blabels?\b/i,
  /\bflag\w*/i,
];
export const STAFF_BANNED = [
  /\bdiagnos\w*/i,
  /\bdisorders?\b/i,
  /\bdepress\w*/i,
  /\banxiety\b/i,
  /\bsymptoms?\b/i,
  /\bpatients?\b/i,
  /\brisk scores?\b/i,
  /\brisk levels?\b/i,
  /\bat-risk\b/i,
  /\bscreening\b/i,
  /\bseverity\b/i,
];

/** Returns a list of { key, value, pattern } violations. */
export function findViolations(copy, allowlist) {
  const out = [];
  for (const [key, value] of flatten(copy)) {
    if (allowlist.includes(value)) continue;
    // guidance.* (Phase 08) holds the guidance dashboard copy; it is staff-facing (P08-D1).
    const staff = ['staff.', 'admin.', 'guidance.', 'nav.staff.', 'nav.admin.'].some((p) =>
      key.startsWith(p),
    );
    for (const re of staff ? STAFF_BANNED : STUDENT_BANNED) {
      if (re.test(value)) out.push({ key, value, pattern: String(re) });
    }
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('check-copy.js')) {
  const enPath = join(ROOT, 'src/copy/en.js');
  const allowPath = join(ROOT, 'src/copy/allowlist.js');
  if (!existsSync(enPath)) {
    console.log('check:copy: src/copy/en.js not created yet (Phase 02) — nothing to check');
  } else {
    const { en } = await import(pathToFileURL(enPath).href);
    const allowlist = existsSync(allowPath)
      ? (await import(pathToFileURL(allowPath).href)).ALLOWLIST
      : [];
    const v = findViolations(en, allowlist);
    if (v.length) {
      for (const x of v) console.error(`check:copy: ${x.key} matches ${x.pattern}: "${x.value}"`);
      process.exit(1);
    }
    console.log('check:copy: OK');
  }
}
