import { Link } from 'react-router';
import { buttonClasses } from './classes.js';

export function LinkButton({
  to,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}) {
  return (
    <Link to={to} className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
