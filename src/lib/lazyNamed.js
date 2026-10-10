// Phase 10 · code splitting (2.1.6.1.2). Loads a named export as a lazy React component.
import { lazy } from 'react';

/** lazyNamed(() => import('./X.jsx'), 'X') */
export function lazyNamed(loader, name) {
  return lazy(() => loader().then((m) => ({ default: m[name] })));
}
