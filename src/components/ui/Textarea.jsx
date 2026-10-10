import { forwardRef } from 'react';
import { cx } from './cx.js';

// Free text is stored, never analyzed (2.1.6.2.7). This component does nothing with the text
// except show it and report its length.
export const Textarea = forwardRef(function Textarea(
  { invalid = false, rows = 5, maxLength = 2000, className = '', ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      maxLength={maxLength}
      className={cx(
        'w-full rounded-control border bg-surface px-4 py-3 text-base text-ink placeholder:text-ink-muted',
        invalid ? 'border-2 border-ink' : 'border-line',
        className,
      )}
      {...rest}
    />
  );
});
