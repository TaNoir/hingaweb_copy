import { cx } from './cx.js';

const TONES = {
  blush: 'bg-blush text-ink',
  strong: 'bg-blush-strong text-ink',
  ink: 'bg-action text-action-ink',
};

/**
 * shape: 'pill' (default) or 'wrap' for a chip whose text may run to two lines (for example a
 * translated chip): a rounded box instead of a stretched pill, 6px 14px padding, line-height 1.4.
 */
export function Chip({ tone = 'blush', shape = 'pill', className = '', children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 text-[13px] font-medium',
        shape === 'wrap'
          ? 'max-w-full rounded-2xl px-3.5 py-1.5 leading-[1.4]'
          : 'rounded-full px-3 py-1',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
