// Decorative breathing animation in the landing hero (replaces the three-wave picture).
// Loaded on demand (React.lazy in LandingPage), so it never slows the first page load.
// Everything is served from this site: the .lottie file from public/animations, and the player's
// WebAssembly renderer from our own build (the player would otherwise fetch it from a CDN).
import { DotLottieReact, setWasmUrl } from '@lottiefiles/dotlottie-react';
// The .wasm is not in the package's exports map, so it is imported by path; Vite copies it into
// dist/assets and gives back its URL, always matching the installed player version.
import wasmUrl from '../../../node_modules/@lottiefiles/dotlottie-web/dist/dotlottie-player.wasm?url';

setWasmUrl(wasmUrl);

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

export function BreathAnimation() {
  const still = reducedMotion();
  return (
    <DotLottieReact
      src="/animations/hinga-breath.lottie"
      loop={!still}
      autoplay={!still}
      className="size-full"
    />
  );
}
