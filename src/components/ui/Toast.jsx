import { useEffect, useState } from 'react';
import { cx } from './cx.js';

/**
 * A small message at the bottom of the screen (ui-interactive Part 4), e.g. "Saved". It is a polite
 * live region: it mounts empty and the text is filled in a moment later, so screen readers announce
 * it. After 3 s it fades out (300 ms) and is removed. Never used on the crisis screen.
 */
export function Toast({ message }) {
  const [text, setText] = useState('');
  const [phase, setPhase] = useState('shown'); // shown -> fading -> gone
  useEffect(() => {
    const fill = setTimeout(() => setText(message), 50);
    const fade = setTimeout(() => setPhase('fading'), 3000);
    const gone = setTimeout(() => setPhase('gone'), 3300);
    return () => [fill, fade, gone].forEach(clearTimeout);
  }, [message]);
  if (phase === 'gone') return null;
  return (
    <div
      role="status"
      className={cx(
        'pointer-events-none fixed inset-x-0 bottom-6 z-50 mx-auto w-fit max-w-[calc(100%-32px)] rounded-control bg-action px-4 py-3 text-[15px] font-semibold text-action-ink shadow-[0_4px_12px_rgb(0_0_0/0.12)] transition-opacity duration-300 ease-out',
        (phase === 'fading' || !text) && 'opacity-0',
      )}
    >
      {text}
    </div>
  );
}
