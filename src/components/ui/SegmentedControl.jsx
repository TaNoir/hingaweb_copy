import { useLayoutEffect, useRef, useState } from 'react';
import { cx } from './cx.js';

/**
 * A small radio group shown as joined buttons. options: { value, label }[]
 * One Tab stop (roving tabindex). Arrow keys and Home/End move focus only; Enter, Space, or a
 * click selects. Team decision (Phase 06): selection never happens just by moving focus, because
 * Phase 08 uses this control for request status, where every change is saved and audited.
 * nowrap (the language switcher): from 640 px every option stays on one line and the group never
 * shrinks; below 640 px the group fills its row as equal-width columns (one per option), so there
 * is no blank space beside it. Without it the options wrap onto more rows when space runs out.
 * The dark "selected" pill is one element that slides to the chosen option (200 ms ease-out; no
 * movement with reduced motion). Until it has been measured, the selected button paints its own
 * dark background, so the selection is never invisible.
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
  const groupRef = useRef(null);
  const [pill, setPill] = useState(null); // { left, top, width, height } of the selected button

  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current[index];
      setPill(
        el && el.offsetWidth > 0
          ? {
              left: el.offsetLeft,
              top: el.offsetTop,
              width: el.offsetWidth,
              height: el.offsetHeight,
            }
          : null,
      );
    };
    measure();
    if (typeof ResizeObserver === 'undefined' || !groupRef.current) return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(groupRef.current);
    return () => ro.disconnect();
  }, [index, options.length]);

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
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      className={cx(
        'relative gap-1 rounded-control bg-blush p-1',
        nowrap
          ? 'grid w-full grid-cols-[repeat(var(--seg-cols),minmax(0,1fr))] sm:inline-flex sm:w-auto sm:shrink-0 sm:flex-nowrap sm:whitespace-nowrap'
          : 'inline-flex flex-wrap',
        className,
      )}
      style={nowrap ? { '--seg-cols': options.length } : undefined}
    >
      {pill && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute rounded-control bg-action transition-[left,top,width,height] duration-200 ease-out motion-reduce:transition-none"
          style={pill}
        />
      )}
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
              'relative min-h-11 rounded-control px-4 text-[14px] font-semibold',
              nowrap && 'justify-center text-center whitespace-nowrap sm:shrink-0',
              selected
                ? cx(
                    'text-action-ink transition-colors duration-200',
                    pill ? 'bg-transparent' : 'bg-action',
                  )
                : 'bg-transparent text-ink transition-colors duration-200',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
