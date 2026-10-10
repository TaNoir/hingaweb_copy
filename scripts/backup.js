// Phase 10 · 2.1.6.4.3 weekly backup, run by the custodian (the proponent who holds the
// administrator role) on their own computer. The dump never passes through GitHub or any
// third-party service: it goes straight from Supabase to an encrypted file in the folder you name,
// which must be storage the school controls.
//
//   Back up:  SUPABASE_DB_URL=... BACKUP_PASSPHRASE=... node scripts/backup.js --out "<school folder>"
//   Decrypt:  BACKUP_PASSPHRASE=... node scripts/backup.js --decrypt <file.hwbak> --out <empty folder>
//
// The backup is three `supabase db dump` files (roles, schema, data) bundled and encrypted with
// AES-256-GCM. The key comes from the passphrase through scrypt. `supabase db dump` runs pg_dump in a
// Docker container, so Docker Desktop must be running. Plain dumps are written only to
// a private temporary folder and deleted at the end, even on failure.
// Storage files are not included (2.1.6.4.3): HingaWeb stores no student files.
import { execFileSync } from 'node:child_process';
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const MAGIC = Buffer.from('HWB1');
const FILES = ['roles.sql', 'schema.sql', 'data.sql'];
export const MIN_PASSPHRASE = 16;

function keyFrom(passphrase, salt) {
  return scryptSync(passphrase, salt, 32, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
}

/** files: { name: string contents } -> encrypted Buffer (MAGIC | salt16 | iv12 | tag16 | ciphertext). */
export function encryptBundle(files, passphrase) {
  if (!passphrase || passphrase.length < MIN_PASSPHRASE) {
    throw new Error(`BACKUP_PASSPHRASE must be at least ${MIN_PASSPHRASE} characters`);
  }
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFrom(passphrase, salt), iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify({ version: 1, files }), 'utf8'),
    cipher.final(),
  ]);
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), body]);
}

/** Encrypted Buffer -> { name: contents }. Throws on a wrong passphrase or a damaged file. */
export function decryptBundle(buf, passphrase) {
  if (!buf.subarray(0, 4).equals(MAGIC)) throw new Error('Not a HingaWeb backup file');
  const salt = buf.subarray(4, 20);
  const iv = buf.subarray(20, 32);
  const tag = buf.subarray(32, 48);
  const decipher = createDecipheriv('aes-256-gcm', keyFrom(passphrase, salt), iv);
  decipher.setAuthTag(tag);
  const text = Buffer.concat([decipher.update(buf.subarray(48)), decipher.final()]).toString(
    'utf8',
  );
  return JSON.parse(text).files;
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}

function run() {
  const passphrase = process.env.BACKUP_PASSPHRASE;
  const out = arg('--out');
  if (!out) throw new Error('Give --out <folder>');

  const encrypted = arg('--decrypt');
  if (encrypted) {
    mkdirSync(out, { recursive: true });
    if (readdirSync(out).length) throw new Error(`${out} must be empty`);
    const files = decryptBundle(readFileSync(encrypted), passphrase);
    for (const [name, text] of Object.entries(files))
      writeFileSync(join(out, name), text, { mode: 0o600 });
    console.log(`backup: decrypted ${Object.keys(files).join(', ')} into ${out}`);
    return;
  }

  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl)
    throw new Error('Set SUPABASE_DB_URL (Supabase → Connect → Session pooler connection string)');
  if (!passphrase || passphrase.length < MIN_PASSPHRASE) {
    throw new Error(`Set BACKUP_PASSPHRASE (at least ${MIN_PASSPHRASE} characters)`);
  }
  if (!existsSync(out)) throw new Error(`${out} does not exist`);

  const work = mkdtempSync(join(tmpdir(), 'hingaweb-backup-'));
  try {
    const dump = (file, extra) =>
      execFileSync(
        'npx',
        ['supabase', 'db', 'dump', '--db-url', dbUrl, '-f', join(work, file), ...extra],
        {
          stdio: ['ignore', 'inherit', 'inherit'],
          shell: process.platform === 'win32',
        },
      );
    dump('roles.sql', ['--role-only']);
    dump('schema.sql', []);
    dump('data.sql', ['--use-copy', '--data-only']);
    const files = Object.fromEntries(FILES.map((f) => [f, readFileSync(join(work, f), 'utf8')]));
    const stamp = new Date().toISOString().slice(0, 10);
    const target = join(out, `hingaweb-${stamp}.hwbak`);
    const buf = encryptBundle(files, passphrase);
    writeFileSync(target, buf, { mode: 0o600 });
    const sha = createHash('sha256').update(buf).digest('hex');
    console.log(`backup: wrote ${target}`);
    console.log(`backup: sha256 ${sha}`);
    console.log(
      `backup: data.sql has auth.users rows: ${/COPY "?auth"?\."?users"?/i.test(files['data.sql']) ? 'yes' : 'NO - see the runbook'}`,
    );
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

if (process.argv[1] && process.argv[1].endsWith('backup.js')) {
  try {
    run();
  } catch (e) {
    console.error(`backup: ${e.message}`);
    process.exit(1);
  }
}
