import { createContext } from 'react';

/**
 * Value shape:
 * {
 *   status: 'loading' | 'ready',
 *   session: object | null,
 *   account: { kind: 'anonymous'|'none'|'student'|'guidance'|'administrator', ... },
 *   aal: { current: string|null, next: string|null } | null,
 *   loadError: boolean,
 *   refresh: () => Promise<{ account, aal }>,
 *   signOut: () => Promise<void>,
 *   authBusy: boolean,               // true while a sign-in page checks the account kind
 *   setAuthBusy: (busy: boolean) => void,
 * }
 */
export const AuthContext = createContext(null);
