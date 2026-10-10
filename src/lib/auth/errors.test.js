import { describe, it, expect } from 'vitest';
import { authErrorKey } from './errors.js';

describe('authErrorKey', () => {
  it('maps known codes', () => {
    expect(authErrorKey({ code: 'invalid_credentials' })).toBe('auth.errors.invalidCredentials');
    expect(authErrorKey({ code: 'invalid_credentials' }, 'staff')).toBe(
      'staff.errors.invalidCredentials',
    );
    expect(authErrorKey({ code: 'email_not_confirmed' })).toBe('auth.errors.emailNotConfirmed');
    expect(authErrorKey({ code: 'mfa_verification_failed' }, 'staff')).toBe(
      'staff.errors.invalidCode',
    );
    expect(authErrorKey({ code: 'weak_password' })).toBe('auth.errors.passwordShort');
    expect(authErrorKey({ code: 'over_request_rate_limit' })).toBe('auth.errors.rateLimited');
    expect(authErrorKey({ status: 429 }, 'staff')).toBe('staff.errors.rateLimited');
  });
  it('falls back to a generic message', () => {
    expect(authErrorKey({ code: 'something_new' })).toBe('auth.errors.generic');
    expect(authErrorKey(null, 'staff')).toBe('staff.errors.generic');
  });
});
