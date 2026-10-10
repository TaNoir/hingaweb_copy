import { describe, it, expect } from 'vitest';
import { t } from './index.js';
import { en } from './en.js';
import { findViolations } from '../../scripts/check-copy.js';
import { ALLOWLIST } from './allowlist.js';

describe('t()', () => {
  it('returns text and fills {tokens}', () => {
    expect(t('auth.register.sentBody', { email: 'a@b.test' })).toBe(
      'We sent a link to a@b.test. Open it to confirm your account. Then come back and log in.',
    );
  });
  it('throws on a missing key during development and tests', () => {
    expect(() => t('no.such.key')).toThrow('Missing copy key: no.such.key');
  });
});

describe('copy rules (00 Section 10.3)', () => {
  it('en.js has no banned words', () => {
    expect(findViolations(en, ALLOWLIST)).toEqual([]);
  });
});
