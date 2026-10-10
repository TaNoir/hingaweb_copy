import { cx } from './cx.js';

/** A small radio group shown as joined buttons. options: { value, label }[] */
export function SegmentedControl({ label, options, value, onChange }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex flex-wrap gap-1 rounded-control bg-blush p-1"
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cx(
              'min-h-11 rounded-control px-4 text-[14px] font-semibold',
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
