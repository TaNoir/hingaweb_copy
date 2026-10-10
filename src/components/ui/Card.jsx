import { cx } from './cx.js';

export function Card({ as: Tag = 'section', className = '', children, ...rest }) {
  return (
    <Tag
      className={cx(
        'rounded-card border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] md:p-6',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
