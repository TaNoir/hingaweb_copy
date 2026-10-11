import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Vitest runs without globals, so Testing Library cannot register its own cleanup.
afterEach(() => cleanup());

// The landing page's decorative breathing animation (lazy-loaded) uses a WebAssembly player that
// needs IntersectionObserver and a real canvas, which jsdom does not have. On a slow machine (CI)
// the lazy load finished mid-test and threw "IntersectionObserver is not defined". No test checks
// the animation (it is aria-hidden), so the player is a no-op in unit tests; e2e uses the real one.
vi.mock('@lottiefiles/dotlottie-react', () => ({
  DotLottieReact: () => null,
  setWasmUrl: () => {},
}));
