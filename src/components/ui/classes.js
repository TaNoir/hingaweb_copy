// Shared class builders (kept out of component files so Fast Refresh works).
import { cx } from './cx.js';

const VARIANTS = {
  primary: 'bg-action text-action-ink border border-action hover:opacity-90',
  outline: 'bg-surface text-ink border border-ink hover:bg-canvas',
  ghost: 'bg-transparent text-ink border border-transparent hover:bg-blush',
};
const SIZES = {
  md: 'min-h-11 px-4 text-[15px]',
  lg: 'min-h-12 px-6 text-base',
};

export const buttonClasses = (variant = 'primary', size = 'md', extra = '') =>
  cx(
    // btn-motion (index.css): lift on hover, press-down on tap; none under reduced motion.
    'btn-motion inline-flex min-w-11 items-center justify-center gap-2 rounded-control font-semibold',
    'disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    extra,
  );

export const inputClasses = (invalid) =>
  cx(
    'min-h-11 w-full rounded-control border bg-surface px-4 text-base text-ink placeholder:text-ink-muted',
    invalid ? 'border-ink border-2' : 'border-line',
  );
