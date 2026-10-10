import { cx } from '../ui/cx.js';
import { OfflineBanner } from '../ui/OfflineBanner.jsx';

/** Page body container. width 'reading' = 768px, 'wide' = 1200px (00 Section 8.3). */
export function Main({ width = 'reading', children }) {
  return (
    <>
      <OfflineBanner />
      <main
        id="main"
        tabIndex={-1}
        className={cx(
          'mx-auto w-full px-4 py-8 md:px-6',
          width === 'wide' ? 'max-w-[1200px]' : 'max-w-[768px]',
        )}
      >
        {children}
      </main>
    </>
  );
}
