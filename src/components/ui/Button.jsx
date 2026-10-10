import { Loader2 } from 'lucide-react';
import { buttonClasses } from './classes.js';

/**
 * @param {{ variant?: 'primary'|'outline'|'ghost', size?: 'md'|'lg', loading?: boolean,
 *   iconLeft?: import('react').ReactNode, iconRight?: import('react').ReactNode,
 *   className?: string } & import('react').ButtonHTMLAttributes<HTMLButtonElement>} props
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  iconLeft = null,
  iconRight = null,
  className = '',
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, className)}
      {...rest}
    >
      {loading ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : iconLeft}
      <span>{children}</span>
      {!loading && iconRight}
    </button>
  );
}
