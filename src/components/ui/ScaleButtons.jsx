import { useRef } from 'react';
import { cx } from './cx.js';

/**
 * A row of answer buttons that behaves as a radio group (arrow keys move the choice).
 * options: { value, label }[]; value: selected value or null.
 */
export function ScaleButtons({ name, legend, hint = '', options, value, onChange }) {
  const refs = useRef([]);
  const index = options.findIndex((o) => o.value === value);
  const focusable = index === -1 ? 0 : index;

  const move = (to) => {
    const i = (to + options.length) % options.length;
    onChange(options[i].value);
    refs.current[i]?.focus();
  };

  const onKeyDown = (e, i) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      move(i + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(i - 1);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={`${name}-legend`}
      aria-describedby={hint ? `${name}-hint` : undefined}
    >
      <p id={`${name}-legend`} className="text-[16px] font-semibold text-ink">
        {legend}
      </p>
      {hint && (
        <p id={`${name}-hint`} className="mt-1 text-[13px] text-ink-muted">
          {hint}
        </p>
      )}
      <div className="mt-3 grid grid-cols-5 gap-1.5 sm:gap-2">
        {options.map((o, i) => {
          const selected = o.value === value;
          return (
            <button
              key={o.value}
              ref={(el) => (refs.current[i] = el)}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={i === focusable ? 0 : -1}
              onClick={() => onChange(o.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cx(
                'min-h-11 rounded-control border px-1 py-1 text-[13px] leading-tight hyphens-auto [overflow-wrap:anywhere] sm:px-2 sm:text-[14px]',
                selected
                  ? 'border-action bg-action font-semibold text-action-ink'
                  : 'border-line bg-blush text-ink',
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
