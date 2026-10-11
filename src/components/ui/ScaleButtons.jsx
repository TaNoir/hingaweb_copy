import { useRef } from 'react';
import { Check, CircleCheck } from 'lucide-react';
import { cx } from './cx.js';

/**
 * A row of answer buttons that behaves as a radio group (arrow keys move the choice).
 * options: { value, label }[]; value: selected value or null.
 * icon (optional): a lucide icon shown beside the question as a visual anchor (aria-hidden).
 * markAnswered: show a small check (aria-hidden) once a value is chosen.
 * The chosen answer is highlighted at once: blush-strong background, ink border, and a small check
 * badge centred above it (aria-checked carries the state for screen readers).
 */
export function ScaleButtons({
  name,
  legend,
  hint = '',
  options,
  value,
  onChange,
  icon: Icon = null,
  markAnswered = false,
}) {
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
      <div className="flex items-start gap-3">
        {Icon && (
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-control bg-blush"
          >
            <Icon className="size-[18px] text-ink" />
          </span>
        )}
        <p id={`${name}-legend`} className="flex-1 text-[16px] font-semibold text-ink">
          {legend}
        </p>
        {markAnswered && value != null && (
          <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ink" />
        )}
      </div>
      {hint && (
        <p id={`${name}-hint`} className="mt-1 text-[13px] text-ink-muted">
          {hint}
        </p>
      )}
      {/* Below sm the gap and side padding are tight and the text is 12 px so the longest answer
          ("Somewhat") fits whole at 390 px. Words never break mid-word; on narrower screens a word
          that still does not fit breaks only with a hyphen. */}
      <div className="mt-3 grid grid-cols-5 gap-[3px] sm:gap-2">
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
                'relative min-h-11 rounded-control border px-0 py-1 text-[12px] leading-tight hyphens-auto transition-colors duration-150 ease-out [overflow-wrap:normal] [word-break:normal] sm:px-2 sm:text-[14px]',
                selected
                  ? 'border-ink bg-blush-strong font-semibold text-ink'
                  : 'border-line bg-blush text-ink',
              )}
            >
              {selected && (
                <span
                  aria-hidden="true"
                  className="absolute -top-2 left-1/2 flex size-4 -translate-x-1/2 items-center justify-center rounded-full bg-action text-action-ink"
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
              )}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
