import { describe, it, expect } from 'vitest';
import { totp, base32Decode } from './totp.js';

// RFC 6238 Appendix B, SHA-1 seed "12345678901234567890" (base32 below).
const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('totp (RFC 6238 test vectors)', () => {
  it('decodes base32', () => {
    expect(base32Decode(SECRET).toString('ascii')).toBe('12345678901234567890');
  });
  it.each([
    [59, '94287082'],
    [1111111109, '07081804'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
  ])('at %i seconds gives %s', (seconds, expected) => {
    expect(totp(SECRET, seconds * 1000, 8)).toBe(expected);
  });
});
