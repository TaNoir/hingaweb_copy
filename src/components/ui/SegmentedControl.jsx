import { useRef } from 'react';
import { cx } from './cx.js';

/**
 * A small radio group shown as joined buttons. options: { value, label }[]
 * One Tab stop (roving tabindex). Arrow keys and Home/End move focus only; Enter, Space, or a
 * click selects. Team decision (Phase 06): selection never happens just by moving focus, because
 * Phase 08 uses this control for request status, where every change is saved and audited.
 * nowrap: keep every option on one line, never shrunk (the language switcher; its labels are
 * short). Without it the options wrap onto more rows when space runs out.
 */
export function SegmentedControl({
  label,
  options,
  value,
  onChange,
  className = '',
  nowrap = false,
}) {
  const refs = useRef([]);
  const index = options.findIndex((o) => o.value === value);
  const focusable = index === -1 ? 0 : index;

  const focusAt = (to) => {
    const i = (to + options.length) % options.length;
    refs.current[i]?.focus();
  };

  const onKeyDown = (e, i) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      focusAt(i + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      focusAt(i - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusAt(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusAt(options.length - 1);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx(
        'inline-flex gap-1 rounded-control bg-blush p-1',
        nowrap ? 'shrink-0 flex-nowrap whitespace-nowrap' : 'flex-wrap',
        className,
      )}
    >
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
              'min-h-11 rounded-control px-4 text-[14px] font-semibold',
              nowrap && 'shrink-0 whitespace-nowrap',
              selected ? 'bg-action text-action-ink' : 'bg-transparent text-ink',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
