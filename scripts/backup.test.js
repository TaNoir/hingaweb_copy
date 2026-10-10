import { describe, it, expect } from 'vitest';
import { decryptBundle, encryptBundle } from './backup.js';

const FILES = {
  'roles.sql': '-- roles',
  'schema.sql': 'create table x();',
  'data.sql': 'COPY "auth"."users" ...',
};
const PASS = 'correct horse battery staple';

describe('scripts/backup.js (2.1.6.4.3)', () => {
  it('round-trips the three dump files', () => {
    const buf = encryptBundle(FILES, PASS);
    expect(buf.subarray(0, 4).toString()).toBe('HWB1');
    expect(buf.toString('utf8')).not.toContain('create table');
    expect(decryptBundle(buf, PASS)).toEqual(FILES);
  });

  it('uses a fresh salt and IV each time', () => {
    expect(encryptBundle(FILES, PASS).equals(encryptBundle(FILES, PASS))).toBe(false);
  });

  it('refuses a short passphrase, a wrong passphrase, and a damaged file', () => {
    expect(() => encryptBundle(FILES, 'short')).toThrow(/at least 16/);
    const buf = encryptBundle(FILES, PASS);
    expect(() => decryptBundle(buf, 'wrong passphrase here!')).toThrow();
    const damaged = Buffer.from(buf);
    damaged[damaged.length - 1] ^= 1;
    expect(() => decryptBundle(damaged, PASS)).toThrow();
    expect(() => decryptBundle(Buffer.from('nope'), PASS)).toThrow(/Not a HingaWeb backup/);
  });
});
