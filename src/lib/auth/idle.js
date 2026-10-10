// Staff inactivity rule (2.1.6.2.9; N-03). Pure helpers + a tiny shared flag.

/** True when more than timeoutMs has passed since lastActivity. Unknown last activity is not expired. */
export function isExpired(lastActivity, now, timeoutMs) {
  if (lastActivity == null) return false;
  return now - lastActivity >= timeoutMs;
}

// Remembers that the last sign-out was a timeout, so the guard shows Fig 22 instead of
// silently redirecting. In memory only: a page reload simply shows the sign-in screen.
let timedOut = false;
export const timeoutFlag = {
  get: () => timedOut,
  set: () => {
    timedOut = true;
  },
  clear: () => {
    timedOut = false;
  },
};
