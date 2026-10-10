// LOCAL DEVELOPMENT ONLY. Enrols a TOTP factor for the two seed staff accounts and saves each
// secret to .dev-totp.json (git-ignored) so Playwright can compute codes.
// Usage: npx supabase db reset && node scripts/dev-enrol-totp.js
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { totp } from './totp.js';

const STAFF = ['guidance.one@example.test', 'admin.one@example.test'];
const PASSWORD = 'LocalOnly-Pass-2026';
const OUT = '.dev-totp.json';

function readEnv() {
  if (!existsSync('.env.local')) throw new Error('.env.local is missing (see Phase 01 Step 5).');
  const env = {};
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
  if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(env.VITE_SUPABASE_URL ?? '')) {
    throw new Error('Refusing to run: VITE_SUPABASE_URL is not a local address.');
  }
  return env;
}

const env = readEnv();
const saved = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};

for (const email of STAFF) {
  const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await sb.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInError) throw new Error(`${email}: sign-in failed (${signInError.message})`);
  const { data: list } = await sb.auth.mfa.listFactors();
  if (list.totp.length > 0) {
    if (!saved[email])
      throw new Error(
        `${email} already has a factor but no saved secret. Run: npx supabase db reset`,
      );
    console.log(`${email}: already enrolled`);
    continue;
  }
  for (const f of list.all.filter((x) => x.factor_type === 'totp'))
    await sb.auth.mfa.unenroll({ factorId: f.id });
  const { data, error } = await sb.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'HingaWeb',
    issuer: 'HingaWeb',
  });
  if (error) throw new Error(`${email}: enroll failed (${error.message})`);
  const { error: vErr } = await sb.auth.mfa.challengeAndVerify({
    factorId: data.id,
    code: totp(data.totp.secret),
  });
  if (vErr) throw new Error(`${email}: verify failed (${vErr.message})`);
  saved[email] = data.totp.secret;
  console.log(`${email}: enrolled`);
}
writeFileSync(OUT, JSON.stringify(saved, null, 2));
console.log(`Saved ${OUT}`);
