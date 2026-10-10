import { cx } from './cx.js';

const TONES = {
  blush: 'bg-blush text-ink',
  strong: 'bg-blush-strong text-ink',
  ink: 'bg-action text-action-ink',
};

export function Chip({ tone = 'blush', className = '', children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
