import { forwardRef } from 'react';
import { inputClasses } from './classes.js';

/** Native select. options: { value, label }[] */
export const Select = forwardRef(function Select(
  { options, placeholder = '', invalid = false, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={`${inputClasses(invalid)} pr-10`} {...rest}>
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
});
