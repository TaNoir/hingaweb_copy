import { forwardRef } from 'react';
import { cx } from './cx.js';
import { inputClasses } from './classes.js';

export const TextInput = forwardRef(function TextInput(
  { invalid = false, className = '', ...rest },
  ref,
) {
  return <input ref={ref} className={cx(inputClasses(invalid), className)} {...rest} />;
});
