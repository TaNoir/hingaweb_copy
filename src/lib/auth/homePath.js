// Where each kind of user belongs (00 Section 7). Pure function; tested in homePath.test.js.

/**
 * @param {object} account  result of my_account(): { kind, ... }
 * @param {{ current: string|null, next: string|null }|null} aal
 * @returns {string} path
 */
export function homePathFor(account, aal) {
  const kind = account?.kind ?? 'anonymous';
  if (kind === 'student') {
    if (account.assent !== 'granted') return '/welcome';
    if (!account.tier2) return '/waiting-for-consent';
    return '/check-in';
  }
  if (kind === 'guidance' || kind === 'administrator') {
    if (!account.is_active) return '/staff/login';
    if (aal?.current !== 'aal2') return aal?.next === 'aal2' ? '/staff/verify' : '/staff/setup';
    return kind === 'guidance' ? '/staff/queue' : '/admin/accounts';
  }
  return '/login';
}

export function isStaffKind(kind) {
  return kind === 'guidance' || kind === 'administrator';
}
