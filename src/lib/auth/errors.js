// Maps Supabase Auth errors to copy keys. Never show raw error text (00 Section 9).

/**
 * @param {{ code?: string, status?: number, message?: string }|null} error
 * @param {'student'|'staff'} area
 * @returns {string} copy key
 */
export function authErrorKey(error, area = 'student') {
  const base = area === 'staff' ? 'staff.errors' : 'auth.errors';
  const code = error?.code ?? '';
  if (code === 'invalid_credentials') return `${base}.invalidCredentials`;
  if (code === 'email_not_confirmed' && area === 'student') return 'auth.errors.emailNotConfirmed';
  if (code === 'mfa_verification_failed' || code === 'mfa_challenge_expired')
    return 'staff.errors.invalidCode';
  if (code === 'weak_password') return 'auth.errors.passwordShort';
  if (code.startsWith('over_') || error?.status === 429) return `${base}.rateLimited`;
  return `${base}.generic`;
}
