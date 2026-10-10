import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { t } from '../../copy/index.js';
import { inputClasses } from './classes.js';

export const PasswordInput = forwardRef(function PasswordInput({ invalid = false, ...rest }, ref) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input
        ref={ref}
        type={shown ? 'text' : 'password'}
        className={`${inputClasses(invalid)} pr-14`}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? t('common.hidePassword') : t('common.showPassword')}
        aria-pressed={shown}
        className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center rounded-control"
      >
        {shown ? (
          <EyeOff aria-hidden="true" className="size-5" />
        ) : (
          <Eye aria-hidden="true" className="size-5" />
        )}
      </button>
    </div>
  );
});
