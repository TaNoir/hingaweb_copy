import { cloneElement, isValidElement } from 'react';

/**
 * Wraps one form control with its label, hint, and error.
 * The child control receives id, aria-describedby, and aria-invalid automatically.
 */
export function Field({ id, label, hint = '', error = '', children }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        invalid: Boolean(error),
      })
    : children;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[14px] font-semibold text-ink">
        {label}
      </label>
      {control}
      {hint && (
        <p id={hintId} className="text-[13px] text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-[13px] font-semibold text-ink">
          {error}
        </p>
      )}
    </div>
  );
}
